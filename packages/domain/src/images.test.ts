import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { DiskImageStore, isImageKey, sniffImage, validateImage } from "./images";
import { MarketplaceService } from "./service";

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const WEBP = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const SVG = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");

const dirs: string[] = [];
afterAll(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("image validation", () => {
  it("identifies PNG, JPG, and WEBP by their bytes", () => {
    expect(sniffImage(PNG)).toBe("image/png");
    expect(sniffImage(JPG)).toBe("image/jpeg");
    expect(sniffImage(WEBP)).toBe("image/webp");
  });

  it("rejects SVG, empty, and oversized files", () => {
    expect(validateImage(SVG)).toMatchObject({ ok: false, code: "IMAGE_TYPE" });
    expect(validateImage(new Uint8Array())).toMatchObject({ ok: false, code: "IMAGE_EMPTY" });
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set(PNG);
    expect(validateImage(big)).toMatchObject({ ok: false, code: "IMAGE_TOO_LARGE" });
  });

  it("only accepts generated storage keys", () => {
    const id = "30000000-0000-4000-8000-000000000001";
    expect(isImageKey(`products/${id}/${id}.png`)).toBe(true);
    expect(isImageKey(`products/${id}/../../secret.png`)).toBe(false);
    expect(isImageKey(`products/${id}/${id}.svg`)).toBe(false);
  });
});

describe("disk image store", () => {
  it("writes, reads, and removes, and refuses paths outside the root", async () => {
    const dir = await mkdtemp(join(tmpdir(), "dm-img-"));
    dirs.push(dir);
    const store = new DiskImageStore(dir);
    const id = "30000000-0000-4000-8000-000000000001";
    const key = `products/${id}/${id}.png`;
    await store.put(key, PNG);
    expect(Buffer.from((await store.read(key))!)).toEqual(Buffer.from(PNG));
    await store.remove(key);
    expect(await store.read(key)).toBeNull();
    await expect(store.put("../escape.png", PNG)).rejects.toThrow(/Invalid image key/);
  });
});

describe("product images", () => {
  it("lets the owner attach up to five images and blocks other sellers", async () => {
    const svc = await MarketplaceService.createDemo();
    const seller = svc.actorByEmail("seller@premiumstore.demo");
    const customer = svc.actorByEmail("john@example.com");
    const product = svc.sellerProducts(seller)[0]!;
    expect(() => svc.reserveProductImage(customer, product.id, "image/png")).toThrow(/own listings/);
    for (let i = 0; i < 5; i++) {
      const slot = svc.reserveProductImage(seller, product.id, "image/png");
      svc.attachProductImage(seller, product.id, { ...slot, contentType: "image/png", sizeBytes: 12 });
    }
    expect(() => svc.reserveProductImage(seller, product.id, "image/png")).toThrow(/up to 5/);
    const listing = svc.sellerProduct(seller, product.id);
    expect(listing.images).toHaveLength(5);
    expect(listing.images[0]!.url).toMatch(/^\/media\/products\//);
  });

  it("sends an active listing back to review when the seller changes images", async () => {
    const svc = await MarketplaceService.createDemo();
    const seller = svc.actorByEmail("seller@premiumstore.demo");
    const admin = svc.actorByEmail("admin@demo.marketplace");
    const product = svc.sellerProducts(seller).find((item) => item.status === "ACTIVE")!;
    const slot = svc.reserveProductImage(seller, product.id, "image/webp");
    svc.attachProductImage(seller, product.id, { ...slot, contentType: "image/webp", sizeBytes: 12 });
    expect(svc.sellerProduct(seller, product.id).status).toBe("PENDING_REVIEW");

    svc.moderateProduct(admin, product.id, "ACTIVE");
    const removed = svc.removeProductImage(admin, product.id, slot.id);
    expect(removed.key).toBe(slot.key);
    expect(svc.sellerProduct(seller, product.id).status).toBe("ACTIVE");
  });

  it("rejects a key that was reserved for another product", async () => {
    const svc = await MarketplaceService.createDemo();
    const seller = svc.actorByEmail("seller@premiumstore.demo");
    const [first, second] = svc.sellerProducts(seller);
    const slot = svc.reserveProductImage(seller, first!.id, "image/png");
    expect(() => svc.attachProductImage(seller, second!.id, { ...slot, contentType: "image/png", sizeBytes: 12 })).toThrow(/does not belong/);
  });

  it("does not copy image files when an admin duplicates a listing", async () => {
    const svc = await MarketplaceService.createDemo();
    const admin = svc.actorByEmail("admin@demo.marketplace");
    const seller = svc.actorByEmail("seller@premiumstore.demo");
    const product = svc.sellerProducts(seller)[0]!;
    const slot = svc.reserveProductImage(admin, product.id, "image/png");
    svc.attachProductImage(admin, product.id, { ...slot, contentType: "image/png", sizeBytes: 12 });
    expect(svc.adminDuplicateProduct(admin, product.id).images).toEqual([]);
  });
});
