import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, describe, expect, it } from "vitest";
import {
  FileStateStore,
  PostgresStateStore,
  StoreConflictError,
  changesState,
  handleRequest,
  openMarketplace,
  productionConfigErrors,
  type SqlClient,
} from "./persistence";
import { MarketplaceService } from "./service";

const dirs: string[] = [];
afterAll(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function tempFile() {
  const dir = await mkdtemp(join(tmpdir(), "dm-state-"));
  dirs.push(dir);
  return join(dir, "state.json");
}

const env = (extra: Record<string, string> = {}) => ({ PERSISTENCE: "file", DEMO_MODE: "true", ...extra });

describe("state snapshots", () => {
  it("restores every persisted collection and setting", async () => {
    const svc = await MarketplaceService.createDemo();
    const admin = svc.actorByEmail("admin@demo.marketplace");
    svc.updatePlatform(admin, { customerFeeBps: 250, commissionBps: 900, allowSellerRegistration: false });
    const before = svc.exportState();
    const restored = MarketplaceService.restore({}, JSON.parse(JSON.stringify(before)));
    const after = restored.exportState();
    expect(after.data).toEqual(before.data);
    expect(restored.customerFeeBps).toBe(250);
    expect(restored.trialBalance().balanced).toBe(true);
  });

  it("rejects an unknown snapshot format", () => {
    expect(() => MarketplaceService.restore({}, { format: 99, savedAt: "", data: {} as never })).toThrow(/Unsupported/);
  });
});

describe("file store runtime", () => {
  it("keeps an order request across a restart", async () => {
    const STATE_FILE = await tempFile();
    const first = await openMarketplace(env({ STATE_FILE }));
    const john = first.service.actorByEmail("john@example.com");
    const product = first.service.listProducts({}).items[0]!;
    const detail = first.service.getProduct(product.slug);
    const add = await handleRequest(first, { method: "POST", path: "/cart/items", query: {}, body: { productId: detail.id, variantId: detail.variants[0]!.id, quantity: 1 }, actor: john, guestId: "g" });
    expect(add.status).toBe(200);
    const placed = await handleRequest(first, { method: "POST", path: "/order-requests", query: {}, body: { telegram: "@persist_check" }, actor: john, guestId: "g" });
    expect(placed.status).toBe(201);
    const id = (placed.body as { id: string }).id;

    const second = await openMarketplace(env({ STATE_FILE }));
    const request = second.service.getOrderRequest(john, "g", id);
    expect(request.telegram).toBe("@persist_check");
    expect(second.service.getCart(john, "g").items).toHaveLength(0);
  });

  it("refuses to start an empty production database without a bootstrap admin", async () => {
    const STATE_FILE = await tempFile();
    await expect(openMarketplace(env({ STATE_FILE, DEMO_MODE: "false" }))).rejects.toThrow(/BOOTSTRAP_ADMIN_EMAIL/);
  });

  it("creates only the bootstrap administrator when demo data is off", async () => {
    const STATE_FILE = await tempFile();
    const runtime = await openMarketplace(env({ STATE_FILE, DEMO_MODE: "false", BOOTSTRAP_ADMIN_EMAIL: "Owner@Example.com", BOOTSTRAP_ADMIN_PASSWORD: "a-long-bootstrap-pass" }));
    const state = runtime.service.exportState().data;
    expect(state.users.map((user) => [user.email, user.role, user.mfaEnabled])).toEqual([["owner@example.com", "SUPER_ADMIN", true]]);
    expect(state.products).toHaveLength(0);
    expect(state.sellers).toHaveLength(0);
    await expect(runtime.service.login({ email: "owner@example.com", password: "wrong-password" })).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await expect(runtime.service.login({ email: "owner@example.com", password: "a-long-bootstrap-pass" })).rejects.toMatchObject({ code: "MAIL_UNAVAILABLE" });
  });
});

describe("postgres store", () => {
  it("round-trips through SQL and blocks a second writer", async () => {
    const db = new PGlite();
    const client = db as unknown as SqlClient;
    const writer = new PostgresStateStore(client);
    expect(await writer.load()).toBeNull();
    const svc = await MarketplaceService.createFixture();
    await writer.save(svc.exportState());
    await writer.save(svc.exportState());

    const reader = new PostgresStateStore(client);
    const loaded = await reader.load();
    expect(loaded?.data.products).toEqual(svc.exportState().data.products);

    await reader.save(svc.exportState());
    await expect(writer.save(svc.exportState())).rejects.toBeInstanceOf(StoreConflictError);
    await db.close();
  });
});

describe("persistence policy", () => {
  it("saves writes and delivery reveals, skips reads and rejected requests", () => {
    expect(changesState("POST", "/cart/items", 200)).toBe(true);
    expect(changesState("GET", "/products", 200)).toBe(false);
    expect(changesState("GET", "/orders/abc/delivery", 200)).toBe(true);
    expect(changesState("POST", "/auth/login", 401)).toBe(false);
  });

  it("lists unsafe production settings", () => {
    const errors = productionConfigErrors({ NODE_ENV: "production", PERSISTENCE: "memory", SESSION_SECRET: "short" });
    expect(errors.join(" ")).toMatch(/DEMO_MODE/);
    expect(errors.join(" ")).toMatch(/SESSION_SECRET/);
    expect(errors.join(" ")).toMatch(/INVENTORY_ENC_KEY/);
    expect(errors.join(" ")).toMatch(/PERSISTENCE/);
    const ok = productionConfigErrors({
      NODE_ENV: "production",
      DEMO_MODE: "false",
      PERSISTENCE: "postgres",
      DATABASE_URL: "postgresql://u:p@db/marketplace",
      SESSION_SECRET: "s".repeat(40),
      INVENTORY_ENC_KEY: "k".repeat(40),
      WEBHOOK_SECRET: "w".repeat(40),
      SMTP_URL: "smtps://user:pass@smtp.example.com",
      MAIL_FROM: "Marketplace <no-reply@example.com>",
      PUBLIC_URL: "https://shop.example.com",
    });
    expect(ok).toEqual([]);
  });
});
