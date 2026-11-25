import type { AddressInfo } from "node:net";
import { SMTPServer } from "smtp-server";
import { describe, expect, it } from "vitest";
import { dispatch } from "./http";
import { MemoryMailer, createSmtpMailer, maskEmail } from "./mail";
import { HttpError, MarketplaceService } from "./service";

const base = { demoMode: false, publicUrl: "https://shop.example.com" };

async function placeRequest(svc: MarketplaceService, body: Record<string, string>) {
  const john = svc.actorByEmail("john@example.com");
  const detail = svc.getProduct(svc.listProducts({}).items[0]!.slug);
  await svc.addCartItem(john, "g", { productId: detail.id, variantId: detail.variants[0]!.id, quantity: 1 });
  return dispatch({ method: "POST", path: "/order-requests", query: {}, body, actor: john, guestId: "g" }, svc);
}

describe("email delivery", () => {
  it("emails the sign-in code and never returns it", async () => {
    const mailer = new MemoryMailer();
    const svc = await MarketplaceService.createDemo({ ...base, mailer });
    const result = await svc.login({ email: "admin@demo.marketplace", password: "DemoPass123!" });
    expect(result).not.toHaveProperty("demoCode");
    expect(result.mfaRequired && result.message).toContain("ad");
    const code = mailer.sent[0]?.text.match(/\b(\d{6})\b/)?.[1];
    expect(mailer.sent[0]?.to).toBe("admin@demo.marketplace");
    expect(code).toBeDefined();
    if (!result.mfaRequired) throw new Error("expected MFA");
    const verified = await svc.verifyMfa({ challengeId: result.challengeId, code: code! });
    expect(verified.user.email).toBe("admin@demo.marketplace");
  });

  it("refuses MFA sign-in when email is off outside demo mode", async () => {
    const svc = await MarketplaceService.createDemo({ demoMode: false });
    await expect(svc.login({ email: "seller@premiumstore.demo", password: "DemoPass123!" })).rejects.toMatchObject({ code: "MAIL_UNAVAILABLE" });
  });

  it("drops the challenge when the code email fails", async () => {
    const mailer = new MemoryMailer();
    mailer.failNext = 1;
    const svc = await MarketplaceService.createDemo({ ...base, mailer });
    await expect(svc.login({ email: "admin@demo.marketplace", password: "DemoPass123!" })).rejects.toBeInstanceOf(HttpError);
    const retry = await svc.login({ email: "admin@demo.marketplace", password: "DemoPass123!" });
    expect(retry.mfaRequired).toBe(true);
  });

  it("generates codes across the full six-digit range", async () => {
    const mailer = new MemoryMailer();
    const svc = await MarketplaceService.createDemo({ ...base, mailer });
    const codes = new Set<number>();
    for (let i = 0; i < 40; i++) {
      (svc as unknown as { loginHits: Map<string, number[]> }).loginHits.clear();
      await svc.login({ email: "admin@demo.marketplace", password: "DemoPass123!" }).catch(() => undefined);
      const code = Number(mailer.sent.at(-1)?.text.match(/\b(\d{6})\b/)?.[1]);
      codes.add(code);
      expect(code).toBeGreaterThanOrEqual(100000);
      expect(code).toBeLessThan(1000000);
    }
    expect([...codes].some((code) => code > 165535)).toBe(true);
  });

  it("keeps reset links out of the response", async () => {
    const mailer = new MemoryMailer();
    const svc = await MarketplaceService.createDemo({ ...base, mailer });
    const known = await svc.forgotPassword("john@example.com");
    const unknown = await svc.forgotPassword("nobody@example.com");
    expect(known).toEqual(unknown);
    expect(known).not.toHaveProperty("resetPath");
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.text).toContain("https://shop.example.com/reset-password?token=");
  });

  it("refuses password reset links without email outside demo mode", async () => {
    const svc = await MarketplaceService.createDemo({ demoMode: false });
    await expect(svc.forgotPassword("john@example.com")).rejects.toMatchObject({ code: "MAIL_UNAVAILABLE" });
  });

  it("sends the verification link by email on registration", async () => {
    const mailer = new MemoryMailer();
    const svc = await MarketplaceService.createDemo({ ...base, mailer });
    const result = await svc.register({ name: "New Buyer", email: "new@example.com", password: "a-good-password" });
    expect(result).not.toHaveProperty("verifyPath");
    expect(mailer.sent[0]?.text).toContain("https://shop.example.com/verify-email?token=");
  });

  it("alerts the seller, the ops inbox, and the customer about a new order request", async () => {
    const mailer = new MemoryMailer();
    const svc = await MarketplaceService.createDemo({ ...base, mailer, alertEmail: "ops@example.com" });
    const premium = svc.listProducts({ seller: "premiumstore" }).items[0]!;
    const john = svc.actorByEmail("john@example.com");
    const detail = svc.getProduct(premium.slug);
    await svc.addCartItem(john, "g", { productId: detail.id, variantId: detail.variants[0]!.id, quantity: 1 });
    const placed = await dispatch({ method: "POST", path: "/order-requests", query: {}, body: { email: "buyer@example.com", note: "Evening is best" }, actor: john, guestId: "g" }, svc);
    expect(placed.status).toBe(201);
    await svc.flushMail();
    const to = mailer.sent.map((message) => message.to).sort();
    expect(to).toEqual(["buyer@example.com", "ops@example.com", "seller@premiumstore.demo"]);
    const sellerMail = mailer.sent.find((message) => message.to === "seller@premiumstore.demo")!;
    expect(sellerMail.text).toContain("buyer@example.com");
    expect(sellerMail.text).toContain("Evening is best");
    expect(mailer.sent.find((message) => message.to === "buyer@example.com")!.text).toContain("No payment was taken");
  });

  it("keeps the order request when notification email fails", async () => {
    const mailer = new MemoryMailer();
    mailer.failNext = 10;
    const svc = await MarketplaceService.createDemo({ ...base, mailer });
    const placed = await placeRequest(svc, { telegram: "@still_saved" });
    expect(placed.status).toBe(201);
    await svc.flushMail();
    expect(svc.adminOrderRequests(svc.actorByEmail("admin@demo.marketplace")).some((row) => row.telegram === "@still_saved")).toBe(true);
  }, 15000);

  it("delivers through a real SMTP server", async () => {
    const received: Array<{ to: string[]; data: string }> = [];
    const server = new SMTPServer({
      authOptional: true,
      disabledCommands: ["STARTTLS"],
      onData(stream, session, callback) {
        let data = "";
        stream.on("data", (chunk: Buffer) => (data += chunk.toString()));
        stream.on("end", () => {
          received.push({ to: session.envelope.rcptTo.map((rcpt) => rcpt.address), data });
          callback();
        });
      },
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.server.address() as AddressInfo;
    try {
      const mailer = await createSmtpMailer(`smtp://127.0.0.1:${port}?ignoreTLS=true`, "Marketplace <no-reply@example.com>");
      await mailer.send({ to: "buyer@example.com", subject: "SMTP check", text: "Hello from the adapter" });
      expect(received[0]?.to).toEqual(["buyer@example.com"]);
      expect(received[0]?.data).toContain("Subject: SMTP check");
      expect(received[0]?.data).toContain("Hello from the adapter");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("masks addresses in messages", () => {
    expect(maskEmail("admin@demo.marketplace")).toBe("ad***@demo.marketplace");
    expect(maskEmail("a@x.io")).toBe("a*@x.io");
  });
});
