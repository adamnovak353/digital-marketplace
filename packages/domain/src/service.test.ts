import { describe, expect, it } from "vitest";
import type { OrderRequestView } from "@marketplace/types";
import { containsPan } from "./crypto";
import { dispatch } from "./http";
import { priceCart } from "./pricing";
import { MarketplaceService } from "./service";

describe("pricing", () => {
  it("calculates the reference cart as $34.97 plus a 3% fee", () => {
    const quote = priceCart(
      [
        { id: "netflix", sellerId: "reseller", platformOwned: false, unitPriceMinor: 499, quantity: 1 },
        { id: "chatgpt", sellerId: "reseller", platformOwned: false, unitPriceMinor: 1999, quantity: 1 },
        { id: "steam", sellerId: "reseller", platformOwned: false, unitPriceMinor: 999, quantity: 1 },
      ],
      { feeBps: 300, commissionBps: 1000 },
    );
    expect(quote.subtotalMinor).toBe(3497);
    expect(quote.discountMinor).toBe(0);
    expect(quote.feeMinor).toBe(105);
    expect(quote.totalMinor).toBe(3602);
    const net = quote.lines.reduce((sum, line) => sum + line.sellerNetMinor + line.platformNetMinor, 0);
    expect(net + quote.feeMinor).toBe(quote.totalMinor);
  });

  it("caps a percentage coupon", () => {
    const quote = priceCart(
      [{ id: "a", sellerId: "s", platformOwned: false, unitPriceMinor: 50000, quantity: 1 }],
      { feeBps: 0, commissionBps: 1000, coupon: { code: "WELCOME10", percent: 10, minSubtotalMinor: 1000, maxDiscountMinor: 2000 } },
    );
    expect(quote.discountMinor).toBe(2000);
    expect(quote.totalMinor).toBe(48000);
  });
});

describe("sensitive inventory", () => {
  it("recognizes a primary account number", () => {
    expect(containsPan("token 4242424242424242")).toBe(true);
    expect(containsPan("DEMO-VOUCHER only")).toBe(false);
  });
});

describe("marketplace workflows", () => {
  it("prices from the catalog and ignores a client-supplied price", async () => {
    const svc = await MarketplaceService.createFixture();
    const customer = svc.actorByEmail("john@example.com");
    const result = await dispatch(
      {
        method: "POST",
        path: "/cart/items",
        query: {},
        body: { productId: "prod-instant", variantId: "var-instant", quantity: 1, priceMinor: 1 },
        actor: customer,
        guestId: "g1",
      },
      svc,
    );
    expect(result.status).toBe(200);
    const body = result.body as { items: Array<{ unitPriceMinor: number }>; totalMinor: number };
    expect(body.items[0]?.unitPriceMinor).toBe(499);
    expect(body.totalMinor).toBe(499 + Math.round((499 * 300) / 10_000));
  });

  it("lets only one of two payments take the last unit", async () => {
    const svc = await MarketplaceService.createFixture();
    const customer = svc.actorByEmail("john@example.com");
    await svc.addCartItem(customer, "g", { productId: "prod-instant", variantId: "var-instant", quantity: 1 });
    const first = await svc.placeOrder(customer, "g", { email: customer.email, paymentMethod: "card" });
    await svc.addCartItem(customer, "g", { productId: "prod-instant", variantId: "var-instant", quantity: 1 });
    const second = await svc.placeOrder(customer, "g", { email: customer.email, paymentMethod: "card" });
    const [a, b] = await Promise.all([
      svc.completePayment(first.paymentId, "evt-a"),
      svc.completePayment(second.paymentId, "evt-b"),
    ]);
    const statuses = [a.order.status, b.order.status].sort();
    expect(statuses).toEqual(["DELIVERED", "MANUAL_REVIEW"]);
    expect(svc.inventoryCounts("var-instant")).toMatchObject({ available: 0, delivered: 1, quarantined: 0 });
    expect(svc.trialBalance().balanced).toBe(true);
  });

  it("replays a payment webhook without a second delivery or ledger entry", async () => {
    const svc = await MarketplaceService.createFixture();
    const customer = svc.actorByEmail("john@example.com");
    await svc.addCartItem(customer, "g", { productId: "prod-instant", variantId: "var-instant", quantity: 1 });
    const placed = await svc.placeOrder(customer, "g", { email: customer.email, paymentMethod: "card" });
    const first = await svc.applyWebhook({ provider: "mock", eventId: "evt-1", type: "payment.succeeded", paymentId: placed.paymentId }, svc.webhookSecret);
    const mid = svc.trialBalance();
    const second = await svc.applyWebhook({ provider: "mock", eventId: "evt-1", type: "payment.succeeded", paymentId: placed.paymentId }, svc.webhookSecret);
    expect(first.replay).toBe(false);
    expect(second.replay).toBe(true);
    expect(svc.inventoryCounts("var-instant").delivered).toBe(1);
    expect(svc.trialBalance()).toEqual(mid);
  });

  it("retries fulfillment and delivers the reserved unit once", async () => {
    const svc = await MarketplaceService.createFixture({ deferFulfillment: true });
    const customer = svc.actorByEmail("john@example.com");
    await svc.addCartItem(customer, "g", { productId: "prod-instant", variantId: "var-instant", quantity: 1 });
    const placed = await svc.placeOrder(customer, "g", { email: customer.email, paymentMethod: "card" });
    svc.failNext(2);
    await svc.completePayment(placed.paymentId, "evt-retry");
    expect((await svc.processOutbox()).processed).toBeGreaterThan(0);
    expect(svc.inventoryCounts("var-instant").delivered).toBe(0);
    await svc.processOutbox();
    await svc.processOutbox();
    expect(svc.inventoryCounts("var-instant")).toMatchObject({ delivered: 1, available: 0 });
    const order = svc.getOrder(customer, null, placed.order.id);
    expect(order.status).toBe("DELIVERED");
    expect(svc.trialBalance().balanced).toBe(true);
  });

  it("quarantines a revealed voucher on refund and does not restock it", async () => {
    const svc = await MarketplaceService.createFixture();
    const customer = svc.actorByEmail("john@example.com");
    const admin = svc.actorByEmail("admin@demo.marketplace");
    await svc.addCartItem(customer, "g", { productId: "prod-instant", variantId: "var-instant", quantity: 1 });
    const placed = await svc.placeOrder(customer, "g", { email: customer.email, paymentMethod: "card" });
    await svc.confirmDemoPayment(customer, "g", placed.paymentId);
    const delivery = svc.getDelivery(customer, "g", placed.order.id);
    expect(delivery.items[0]?.payload).toContain("voucher-a");
    expect(() => svc.getDelivery(admin, null, placed.order.id)).toThrow(/cannot access/i);
    const refunded = await svc.refundPayment(admin, placed.paymentId);
    expect(refunded.status).toBe("REFUNDED");
    expect(svc.inventoryCounts("var-instant")).toMatchObject({ available: 0, quarantined: 1, delivered: 0 });
    expect(svc.trialBalance().balanced).toBe(true);
  });

  it("rejects another seller's edit, card data, and an overdrawn payout", async () => {
    const svc = await MarketplaceService.createFixture();
    const seller = svc.actorByEmail("seller@premiumstore.demo");
    const admin = svc.actorByEmail("admin@demo.marketplace");
    expect(() => svc.updateProduct(seller, "prod-platform", { title: "Stolen listing" })).toThrow(/only edit your own/i);
    expect(() => svc.addInventory(seller, { productId: "prod-instant", variantId: "var-instant", payload: "4242424242424242" })).toThrow(/cannot be stored/i);
    expect(() => svc.addInventory(admin, { productId: "prod-platform", variantId: "var-platform", payload: "4111111111111111" })).toThrow(/cannot be stored/i);
    const masked = svc.sellerInventory(seller);
    expect(masked.every((unit) => !("ciphertext" in unit) && !("payload" in unit))).toBe(true);
    expect(masked[0]?.reference.startsWith("unit_")).toBe(true);

    const customer = svc.actorByEmail("john@example.com");
    await svc.addCartItem(customer, "g", { productId: "prod-instant", variantId: "var-instant", quantity: 1 });
    const placed = await svc.placeOrder(customer, "g", { email: customer.email, paymentMethod: "card" });
    await svc.confirmDemoPayment(customer, "g", placed.paymentId);
    const earnings = svc.sellerEarnings(seller);
    expect(earnings.availableMinor).toBeGreaterThan(0);
    await expect(svc.requestPayout(seller, earnings.availableMinor + 1)).rejects.toThrow(/exceeds available/i);
    const payout = await svc.requestPayout(seller, earnings.availableMinor);
    expect(payout.status).toBe("PENDING");
    const paid = await svc.decidePayout(admin, payout.id, "PAID");
    expect(paid.status).toBe("PAID");
    expect(svc.sellerDashboard(seller).availableMinor).toBe(0);
    expect(svc.trialBalance().balanced).toBe(true);
  });

  it("keeps the books balanced for a wallet purchase and a manual fulfillment", async () => {
    const svc = await MarketplaceService.createFixture();
    const customer = svc.actorByEmail("john@example.com");
    await svc.demoTopup(customer, 5000);
    await svc.addCartItem(customer, "g", { productId: "prod-manual", variantId: "var-manual", quantity: 1 });
    const placed = await svc.placeOrder(customer, "g", { email: customer.email, paymentMethod: "wallet" });
    expect(placed.order.status).toBe("AWAITING_SELLER");
    const seller = svc.actorByEmail("seller@premiumstore.demo");
    expect(svc.sellerDashboard(seller).pendingMinor).toBeGreaterThan(0);
    const fulfilled = await svc.fulfillOrder(seller, placed.order.id);
    expect(fulfilled.status).toBe("DELIVERED");
    expect(svc.sellerDashboard(seller).availableMinor).toBeGreaterThan(0);
    expect(svc.getWallet(customer).availableMinor).toBe(5000 - placed.order.totalMinor);
    expect(svc.trialBalance().balanced).toBe(true);
  });
});

describe("order requests", () => {
  it("saves a contact request without charging or delivering inventory", async () => {
    const svc = await MarketplaceService.createFixture();
    const customer = svc.actorByEmail("john@example.com");
    await svc.addCartItem(customer, "g", { productId: "prod-instant", variantId: "var-instant", quantity: 1 });
    const stock = svc.inventoryCounts("var-instant");
    const books = svc.trialBalance();
    await expect(svc.placeOrderRequest(customer, "g", {})).rejects.toThrow(/email address or a Telegram/i);
    expect(svc.getCart(customer, "g").items).toHaveLength(1);

    const missing = await dispatch({ method: "POST", path: "/order-requests", query: {}, body: { email: " ", telegram: "", totalMinor: 1 }, actor: customer, guestId: "g" }, svc);
    expect(missing.status).toBe(400);
    expect(svc.getCart(customer, "g").items).toHaveLength(1);

    const tooLong = await dispatch({ method: "POST", path: "/order-requests", query: {}, body: { email: "buyer@example.com", note: "x".repeat(501) }, actor: customer, guestId: "g" }, svc);
    expect(tooLong.status).toBe(400);
    expect(svc.getCart(customer, "g").items).toHaveLength(1);

    const saved = await dispatch({ method: "POST", path: "/order-requests", query: {}, body: { email: "buyer@example.com", note: "window seat", totalMinor: 1 }, actor: customer, guestId: "g" }, svc);
    expect(saved.status).toBe(201);
    const body = saved.body as OrderRequestView;
    expect(body.status).toBe("AWAITING_CONTACT");
    expect(body.email).toBe("buyer@example.com");
    expect(body.telegram).toBeUndefined();
    expect(body.note).toBe("window seat");
    expect(body.items[0]?.unitPriceMinor).toBe(499);
    expect(body.subtotalMinor).toBe(499);
    expect(body.feeMinor).toBe(15);
    expect(body.totalMinor).toBe(514);
    expect(body).not.toHaveProperty("paymentId");
    expect(body.items[0]).not.toHaveProperty("payload");
    expect(body.items[0]).not.toHaveProperty("unitIds");
    expect(svc.getCart(customer, "g").items).toHaveLength(0);
    expect(svc.inventoryCounts("var-instant")).toEqual(stock);
    expect(svc.trialBalance()).toEqual(books);
    expect(svc.listOrders(customer)).toHaveLength(0);
    expect(() => svc.getDelivery(customer, "g", body.id)).toThrow(/not found/i);

    const read = await dispatch({ method: "GET", path: `/order-requests/${body.id}`, query: {}, body: undefined, actor: customer, guestId: "g" }, svc);
    expect(read.status).toBe(200);

    await svc.addCartItem(null, "guest-1", { productId: "prod-instant", variantId: "var-instant", quantity: 1 });
    const telegramOnly = await svc.placeOrderRequest(null, "guest-1", { telegram: "@demo_buyer" });
    expect(telegramOnly.status).toBe("AWAITING_CONTACT");
    expect(telegramOnly.email).toBeUndefined();
    expect(telegramOnly.telegram).toBe("@demo_buyer");
    expect(svc.inventoryCounts("var-instant")).toEqual(stock);
    expect(() => svc.getOrderRequest(null, "other-guest", telegramOnly.id)).toThrow(/cannot view/i);
  });
});

describe("demo catalog", () => {
  it("seeds a balanced marketplace without exposing inventory secrets", async () => {
    const svc = await MarketplaceService.createDemo();
    const home = svc.home();
    expect(home.featured.length).toBeGreaterThan(3);
    expect(home.categories).toHaveLength(5);
    const health = svc.health();
    expect(health.books.balanced).toBe(true);
    expect(health.providers.every((provider) => provider.mode === "MOCK")).toBe(true);
    const admin = svc.actorByEmail("admin@demo.marketplace");
    const inventory = svc.adminInventory(admin);
    expect(JSON.stringify(inventory)).not.toContain("DEMO-VOUCHER");
    expect(JSON.stringify(inventory)).not.toContain("provider_token");
    expect(svc.listProducts({ category: "phone-numbers" }).total).toBe(0);
    expect(svc.listProducts({ category: "virtual-cards" }).total).toBe(0);
    expect(() => svc.getProduct("demo-virtual-visa")).toThrow(/licensed provider/i);
  });

  it("shows telecom and card listings only when those flags are on", async () => {
    const svc = await MarketplaceService.createDemo({ telecomEnabled: true, cardsEnabled: true });
    expect(svc.listProducts({ category: "phone-numbers" }).total).toBeGreaterThan(0);
    expect(svc.listProducts({ category: "virtual-cards" }).total).toBeGreaterThan(0);
  });
});
