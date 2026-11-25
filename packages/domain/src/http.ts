import { ZodError } from "zod";
import {
  cartItemSchema,
  cartQtySchema,
  checkoutSchema,
  confirmSchema,
  couponSchema,
  disputeResolveSchema,
  forgotSchema,
  inventorySchema,
  loginSchema,
  messageSchema,
  mfaSchema,
  onboardingSchema,
  orderRequestSchema,
  passwordChangeSchema,
  payoutSchema,
  adminCategorySchema,
  adminCustomerSchema,
  adminSellerSchema,
  productFormSchema,
  sellerCustomerSchema,
  sellerOrderRequestSchema,
  sellerRequestStatusSchema,
  profileSchema,
  registerSchema,
  resetSchema,
  reviewSchema,
  settingsSchema,
  ticketSchema,
  verifyEmailSchema,
} from "@marketplace/validation";
import type { RegionCode } from "@marketplace/types";
import { HttpError, MarketplaceService, type Actor, type ProductQuery } from "./service";

export interface HttpRequest {
  method: string;
  path: string;
  query: Record<string, string | string[] | undefined>;
  body: unknown;
  actor: Actor | null;
  guestId: string | null;
}

export interface HttpResult {
  status: number;
  body: unknown;
  session?: Actor | null;
  clearSession?: boolean;
}

export async function dispatch(req: HttpRequest, svc: MarketplaceService): Promise<HttpResult> {
  try {
    return await route(req, svc);
  } catch (error) {
    if (error instanceof HttpError) {
      return { status: error.status, body: { error: { code: error.code, message: error.message } } };
    }
    if (error instanceof ZodError) {
      return { status: 400, body: { error: { code: "VALIDATION", message: error.issues[0]?.message ?? "Invalid request." } } };
    }
    console.error(error);
    return { status: 500, body: { error: { code: "INTERNAL", message: "Unexpected error." } } };
  }
}

export function listRoutes() {
  return [
    ["POST", "/auth/register", "public"],
    ["POST", "/auth/login", "public"],
    ["POST", "/auth/mfa", "public"],
    ["POST", "/auth/logout", "public"],
    ["GET", "/auth/me", "user"],
    ["POST", "/auth/forgot-password", "public"],
    ["POST", "/auth/reset-password", "public"],
    ["POST", "/auth/verify-email", "public"],
    ["GET", "/categories", "public"],
    ["GET", "/home", "public"],
    ["GET", "/products", "public"],
    ["GET", "/products/:slug", "public"],
    ["GET", "/sellers", "public"],
    ["GET", "/sellers/:slug", "public"],
    ["GET", "/cart", "public"],
    ["POST", "/cart/items", "public"],
    ["PATCH", "/cart/items/:id", "public"],
    ["DELETE", "/cart/items/:id", "public"],
    ["POST", "/cart/coupon", "public"],
    ["DELETE", "/cart/coupon", "public"],
    ["POST", "/order-requests", "public"],
    ["GET", "/order-requests", "user"],
    ["GET", "/order-requests/:id", "owner"],
    ["POST", "/orders", "public"],
    ["GET", "/orders", "user"],
    ["GET", "/orders/:id", "user"],
    ["GET", "/orders/:id/delivery", "owner"],
    ["POST", "/payments/webhook", "webhook"],
    ["POST", "/payments/:id/demo-confirm", "owner"],
    ["GET", "/wallet", "user"],
    ["POST", "/wallet/demo-topup", "user"],
    ["GET", "/favorites", "user"],
    ["POST", "/favorites", "user"],
    ["DELETE", "/favorites/:productId", "user"],
    ["GET", "/tickets", "user"],
    ["POST", "/tickets", "user"],
    ["GET", "/tickets/:id", "user"],
    ["POST", "/tickets/:id/messages", "user"],
    ["POST", "/reviews", "user"],
    ["POST", "/orders/:id/disputes", "user"],
    ["GET", "/seller/dashboard", "seller"],
    ["GET", "/seller/products", "seller"],
    ["POST", "/seller/products", "seller"],
    ["PATCH", "/seller/products/:id", "seller"],
    ["DELETE", "/seller/products/:id", "seller"],
    ["POST", "/seller/order-requests", "seller"],
    ["PATCH", "/seller/order-requests/:id", "seller"],
    ["POST", "/seller/customers", "seller"],
    ["GET", "/seller/inventory", "seller"],
    ["POST", "/seller/inventory", "seller"],
    ["GET", "/seller/orders", "seller"],
    ["POST", "/seller/orders/:id/fulfill", "seller"],
    ["GET", "/seller/earnings", "seller"],
    ["GET", "/seller/payouts", "seller"],
    ["POST", "/seller/payouts", "seller"],
    ["GET", "/seller/reviews", "seller"],
    ["GET", "/seller/settings", "seller"],
    ["PATCH", "/seller/settings", "seller"],
    ["POST", "/seller/onboarding", "user"],
    ["GET", "/admin/analytics", "admin"],
    ["GET", "/admin/users", "admin"],
    ["POST", "/admin/users/:id/status", "admin"],
    ["GET", "/admin/sellers", "admin"],
    ["POST", "/admin/sellers", "admin"],
    ["PATCH", "/admin/sellers/:id", "admin"],
    ["POST", "/admin/sellers/:id/status", "admin"],
    ["GET", "/admin/customers", "admin"],
    ["POST", "/admin/customers", "admin"],
    ["PATCH", "/admin/customers/:id", "admin"],
    ["GET", "/admin/categories", "admin"],
    ["POST", "/admin/categories", "admin"],
    ["DELETE", "/admin/categories/:slug", "admin"],
    ["GET", "/admin/products", "admin"],
    ["POST", "/admin/products/:id/moderation", "admin"],
    ["GET", "/admin/inventory", "admin"],
    ["POST", "/admin/inventory/:id/quarantine", "admin"],
    ["GET", "/admin/orders", "admin"],
    ["GET", "/admin/payments", "admin"],
    ["POST", "/admin/payments/:id/refund", "admin"],
    ["GET", "/admin/payouts", "admin"],
    ["POST", "/admin/payouts/:id/decision", "admin"],
    ["GET", "/admin/disputes", "admin"],
    ["POST", "/admin/disputes/:id/resolve", "admin"],
    ["POST", "/admin/tickets/:id/status", "admin"],
    ["GET", "/admin/settings", "admin"],
    ["PATCH", "/admin/settings", "admin"],
    ["GET", "/admin/audit", "admin"],
    ["GET", "/admin/providers", "admin"],
    ["GET", "/notifications", "user"],
    ["GET", "/health", "public"],
  ].map(([method, path, auth]) => ({ method, path, auth }));
}

async function route(req: HttpRequest, svc: MarketplaceService): Promise<HttpResult> {
  const { method, path } = req;
  const ok = (body: unknown, extra: Partial<HttpResult> = {}): HttpResult => ({ status: 200, body, ...extra });
  const guest = req.guestId ?? "missing-guest";

  if (method === "GET" && path === "/health") return ok(svc.health());
  if (method === "GET" && path === "/categories") return ok(svc.listCategories());
  if (method === "GET" && path === "/home") return ok(svc.home());
  if (method === "GET" && path === "/products") return ok(svc.listProducts(readProductQuery(req)));
  if (method === "GET" && path === "/sellers") return ok(svc.listSellers());

  const product = match(path, "/products/:slug");
  if (method === "GET" && product) return ok(svc.getProduct(product.slug!, req.actor));
  const seller = match(path, "/sellers/:slug");
  if (method === "GET" && seller) return ok(svc.getSeller(seller.slug!));

  if (method === "POST" && path === "/auth/register") {
    const body = registerSchema.parse(req.body);
    return ok(await svc.register(body));
  }
  if (method === "POST" && path === "/auth/login") {
    const body = loginSchema.parse(req.body);
    const result = await svc.login(body);
    if (!result.mfaRequired) return ok(result, { session: result.user });
    return ok(result);
  }
  if (method === "POST" && path === "/auth/mfa") {
    const result = await svc.verifyMfa(mfaSchema.parse(req.body));
    return ok(result, { session: result.user });
  }
  if (method === "POST" && path === "/auth/logout") return ok({ message: "Signed out." }, { clearSession: true });
  if (method === "GET" && path === "/auth/me") return ok({ user: user(req) });
  if (method === "POST" && path === "/auth/forgot-password") return ok(await svc.forgotPassword(forgotSchema.parse(req.body).email));
  if (method === "POST" && path === "/auth/reset-password") {
    const body = resetSchema.parse(req.body);
    return ok(await svc.resetPassword(body.token, body.password));
  }
  if (method === "POST" && path === "/auth/verify-email") return ok(await svc.verifyEmail(verifyEmailSchema.parse(req.body).token));
  if (method === "PATCH" && path === "/auth/profile") {
    const profile = svc.updateProfile(user(req), profileSchema.parse(req.body).name);
    return ok(profile, { session: profile });
  }
  if (method === "POST" && path === "/auth/password") {
    const body = passwordChangeSchema.parse(req.body);
    return ok(await svc.changePassword(user(req), body.currentPassword, body.newPassword));
  }

  if (method === "GET" && path === "/cart") return ok(svc.getCart(req.actor, guest));
  if (method === "POST" && path === "/cart/items") return ok(await svc.addCartItem(req.actor, guest, cartItemSchema.parse(req.body)));
  const cartItem = match(path, "/cart/items/:id");
  if (cartItem && method === "PATCH") return ok(await svc.updateCartItem(req.actor, guest, cartItem.id!, cartQtySchema.parse(req.body).quantity));
  if (cartItem && method === "DELETE") return ok(await svc.removeCartItem(req.actor, guest, cartItem.id!));
  if (method === "POST" && path === "/cart/coupon") return ok(svc.applyCoupon(req.actor, guest, couponSchema.parse(req.body).code));
  if (method === "DELETE" && path === "/cart/coupon") return ok(svc.clearCoupon(req.actor, guest));

  if (method === "POST" && path === "/order-requests") {
    const body = orderRequestSchema.parse(req.body);
    return { status: 201, body: await svc.placeOrderRequest(req.actor, guest, body) };
  }
  if (method === "GET" && path === "/order-requests") return ok(svc.listMyOrderRequests(user(req)));
  const orderRequest = match(path, "/order-requests/:id");
  if (orderRequest && method === "GET") return ok(svc.getOrderRequest(req.actor, guest, orderRequest.id!));

  if (method === "POST" && path === "/orders") {
    const body = checkoutSchema.parse(req.body);
    return { status: 201, body: await svc.placeOrder(req.actor, guest, body) };
  }
  if (method === "GET" && path === "/orders") return ok(svc.listOrders(user(req)));
  const order = match(path, "/orders/:id");
  if (order && method === "GET") return ok(svc.getOrder(req.actor, req.guestId, order.id!));
  const delivery = match(path, "/orders/:id/delivery");
  if (delivery && method === "GET") return ok(svc.getDelivery(req.actor, req.guestId, delivery.id!));
  const dispute = match(path, "/orders/:id/disputes");
  if (dispute && method === "POST") {
    const body = messageSchema.parse(req.body);
    return { status: 201, body: svc.openDispute(user(req), dispute.id!, body.body) };
  }

  if (method === "POST" && path === "/payments/webhook") {
    const body = req.body as { provider?: string; eventId?: string; type?: string; paymentId?: string };
    const secret = typeof req.query["secret"] === "string" ? req.query["secret"] : null;
    return ok(await svc.applyWebhook({
      provider: String(body?.provider ?? ""),
      eventId: String(body?.eventId ?? ""),
      type: String(body?.type ?? ""),
      paymentId: String(body?.paymentId ?? ""),
    }, secret));
  }
  const confirmPay = match(path, "/payments/:id/demo-confirm");
  if (confirmPay && method === "POST") return ok(await svc.confirmDemoPayment(req.actor, guest, confirmPay.id!));

  if (method === "GET" && path === "/wallet") return ok(svc.getWallet(user(req)));
  if (method === "POST" && path === "/wallet/demo-topup") {
    throw new HttpError(403, "WALLET_TOPUP_DISABLED", "Wallet top-ups are not available. The balance only holds refund credits.");
  }
  if (method === "GET" && path === "/favorites") return ok(svc.listFavorites(user(req)));
  if (method === "POST" && path === "/favorites") {
    const body = req.body as { productId?: string };
    return ok(svc.addFavorite(user(req), String(body?.productId ?? "")));
  }
  const favorite = match(path, "/favorites/:productId");
  if (favorite && method === "DELETE") return ok(svc.removeFavorite(user(req), favorite.productId!));

  if (method === "GET" && path === "/tickets") return ok(svc.listTickets(user(req)));
  if (method === "POST" && path === "/tickets") return { status: 201, body: svc.createTicket(user(req), ticketSchema.parse(req.body)) };
  const ticket = match(path, "/tickets/:id");
  if (ticket && method === "GET") return ok(svc.getTicket(user(req), ticket.id!));
  const ticketMessage = match(path, "/tickets/:id/messages");
  if (ticketMessage && method === "POST") return ok(svc.addTicketMessage(user(req), ticketMessage.id!, messageSchema.parse(req.body).body));
  if (method === "POST" && path === "/reviews") return { status: 201, body: svc.createReview(user(req), reviewSchema.parse(req.body)) };
  if (method === "GET" && path === "/notifications") return ok(svc.notifications(user(req)));

  if (method === "GET" && path === "/seller/dashboard") return ok(svc.sellerDashboard(user(req)));
  if (method === "GET" && path === "/seller/products") return ok(svc.sellerProducts(user(req)));
  if (method === "POST" && path === "/seller/products") return { status: 201, body: svc.createProduct(user(req), productFormSchema.parse(req.body)) };
  const sellerProduct = match(path, "/seller/products/:id");
  if (sellerProduct && method === "PATCH") return ok(svc.updateProduct(user(req), sellerProduct.id!, productFormSchema.partial().parse(req.body)));
  if (sellerProduct && method === "DELETE") return ok(svc.deleteProduct(user(req), sellerProduct.id!));
  if (method === "POST" && path === "/seller/order-requests") return { status: 201, body: await svc.sellerCreateOrderRequest(user(req), sellerOrderRequestSchema.parse(req.body)) };
  const sellerRequest = match(path, "/seller/order-requests/:id");
  if (sellerRequest && method === "PATCH") return ok(await svc.sellerUpdateOrderRequest(user(req), sellerRequest.id!, sellerRequestStatusSchema.parse(req.body).status));
  if (method === "POST" && path === "/seller/customers") return ok(svc.sellerUpdateCustomer(user(req), sellerCustomerSchema.parse(req.body)));
  if (method === "GET" && path === "/seller/inventory") return ok(svc.sellerInventory(user(req)));
  if (method === "POST" && path === "/seller/inventory") return { status: 201, body: svc.addInventory(user(req), inventorySchema.parse(req.body)) };
  if (method === "GET" && path === "/seller/orders") return ok(svc.sellerOrders(user(req)));
  if (method === "GET" && path === "/seller/customers") return ok(svc.sellerCustomers(user(req)));
  const fulfill = match(path, "/seller/orders/:id/fulfill");
  if (fulfill && method === "POST") return ok(await svc.fulfillOrder(user(req), fulfill.id!));
  if (method === "GET" && path === "/seller/earnings") return ok(svc.sellerEarnings(user(req)));
  if (method === "GET" && path === "/seller/payouts") return ok(svc.sellerPayouts(user(req)));
  if (method === "POST" && path === "/seller/payouts") return { status: 201, body: await svc.requestPayout(user(req), payoutSchema.parse(req.body).amountMinor) };
  if (method === "GET" && path === "/seller/reviews") return ok(svc.sellerReviews(user(req)));
  if (method === "GET" && path === "/seller/settings") return ok(svc.sellerSettings(user(req)));
  if (method === "PATCH" && path === "/seller/settings") {
    const body = req.body as { bio?: string; businessName?: string };
    return ok(svc.updateSellerSettings(user(req), body));
  }
  if (method === "POST" && path === "/seller/onboarding") {
    const body = onboardingSchema.parse(req.body);
    const result = svc.applyOnboarding(user(req), body);
    const refreshed = svc.actorByEmail(user(req).email);
    return ok(result, { session: refreshed });
  }

  if (method === "GET" && path === "/admin/analytics") return ok(svc.adminAnalytics(user(req)));
  if (method === "GET" && path === "/admin/users") return ok(svc.adminUsers(user(req)));
  const userStatus = match(path, "/admin/users/:id/status");
  if (userStatus && method === "POST") {
    confirmSchema.parse(req.body);
    const body = req.body as { status?: "ACTIVE" | "SUSPENDED" };
    return ok(svc.setUserStatus(user(req), userStatus.id!, body.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE"));
  }
  if (method === "GET" && path === "/admin/sellers") return ok(svc.adminSellerRows(user(req)));
  if (method === "POST" && path === "/admin/sellers") return { status: 201, body: await svc.adminCreateSeller(user(req), adminSellerSchema.parse(req.body)) };
  const sellerUpdate = match(path, "/admin/sellers/:id");
  if (sellerUpdate && method === "PATCH") return ok(svc.adminUpdateSeller(user(req), sellerUpdate.id!, adminSellerSchema.partial().parse(req.body)));
  if (method === "GET" && path === "/admin/customers") return ok(svc.adminCustomerRows(user(req)));
  if (method === "POST" && path === "/admin/customers") return { status: 201, body: await svc.adminCreateCustomer(user(req), adminCustomerSchema.parse(req.body)) };
  const customerUpdate = match(path, "/admin/customers/:id");
  if (customerUpdate && method === "PATCH") return ok(await svc.adminUpdateCustomer(user(req), customerUpdate.id!, adminCustomerSchema.partial().parse(req.body)));
  if (method === "GET" && path === "/admin/categories") return ok(svc.adminCategories(user(req)));
  if (method === "POST" && path === "/admin/categories") return ok(svc.adminSaveCategory(user(req), adminCategorySchema.parse(req.body)));
  const categoryDelete = match(path, "/admin/categories/:slug");
  if (categoryDelete && method === "DELETE") return ok(svc.adminDeleteCategory(user(req), categoryDelete.slug!));
  const sellerStatus = match(path, "/admin/sellers/:id/status");
  if (sellerStatus && method === "POST") {
    confirmSchema.parse(req.body);
    const body = req.body as { status?: "APPROVED" | "SUSPENDED" | "PENDING" };
    return ok(svc.setSellerStatus(user(req), sellerStatus.id!, body.status ?? "APPROVED"));
  }
  if (method === "GET" && path === "/admin/products") return ok(svc.adminProducts(user(req)));
  if (method === "POST" && path === "/admin/products") {
    const body = req.body as { sellerId?: string; status?: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED" | "SUSPENDED" };
    return { status: 201, body: await svc.adminCreateProduct(user(req), body.sellerId ?? "", productFormSchema.parse(req.body), body.status ?? "PENDING_REVIEW") };
  }
  const duplicate = match(path, "/admin/products/:id/duplicate");
  if (duplicate && method === "POST") return { status: 201, body: svc.adminDuplicateProduct(user(req), duplicate.id!) };
  const moderation = match(path, "/admin/products/:id/moderation");
  if (moderation && method === "POST") {
    confirmSchema.parse(req.body);
    const body = req.body as { decision?: "ACTIVE" | "REJECTED" | "SUSPENDED" };
    return ok(svc.moderateProduct(user(req), moderation.id!, body.decision ?? "ACTIVE"));
  }
  if (method === "GET" && path === "/admin/inventory") return ok(svc.adminInventory(user(req)));
  const quarantine = match(path, "/admin/inventory/:id/quarantine");
  if (quarantine && method === "POST") {
    confirmSchema.parse(req.body);
    return ok(svc.quarantineUnit(user(req), quarantine.id!));
  }
  if (method === "GET" && path === "/admin/orders") return ok(svc.adminOrders(user(req)));
  if (method === "GET" && path === "/admin/payments") return ok(svc.adminPayments(user(req)));
  const refund = match(path, "/admin/payments/:id/refund");
  if (refund && method === "POST") {
    confirmSchema.parse(req.body);
    return ok(await svc.refundPayment(user(req), refund.id!));
  }
  if (method === "GET" && path === "/admin/payouts") return ok(svc.adminPayouts(user(req)));
  const payoutDecision = match(path, "/admin/payouts/:id/decision");
  if (payoutDecision && method === "POST") {
    confirmSchema.parse(req.body);
    const body = req.body as { decision?: "PAID" | "REJECTED" };
    return ok(await svc.decidePayout(user(req), payoutDecision.id!, body.decision === "REJECTED" ? "REJECTED" : "PAID"));
  }
  if (method === "GET" && path === "/admin/disputes") return ok(svc.adminDisputes(user(req)));
  const resolve = match(path, "/admin/disputes/:id/resolve");
  if (resolve && method === "POST") {
    const body = disputeResolveSchema.parse(req.body);
    return ok(svc.resolveDispute(user(req), resolve.id!, body.outcome, body.note));
  }
  const ticketStatus = match(path, "/admin/tickets/:id/status");
  if (ticketStatus && method === "POST") {
    const body = req.body as { status?: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" };
    return ok(svc.setTicketStatus(user(req), ticketStatus.id!, body.status ?? "IN_PROGRESS"));
  }
  if (method === "GET" && path === "/admin/settings") return ok(svc.adminSettings(user(req)));
  if (method === "PATCH" && path === "/admin/settings") {
    const fees = settingsSchema.parse(req.body);
    const body = req.body as { allowSellerRegistration?: boolean };
    return ok(svc.updatePlatform(user(req), { ...fees, allowSellerRegistration: body.allowSellerRegistration !== false }));
  }
  if (method === "GET" && path === "/admin/audit") return ok(svc.auditLog(user(req)));
  if (method === "GET" && path === "/admin/providers") return ok(svc.providers(user(req)));

  return { status: 404, body: { error: { code: "NOT_FOUND", message: "Route not found." } } };
}

function user(req: HttpRequest): Actor {
  if (!req.actor) throw new HttpError(401, "AUTH_REQUIRED", "Sign in required.");
  return req.actor;
}

function match(path: string, pattern: string) {
  const a = pattern.split("/").filter(Boolean);
  const b = path.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i += 1) {
    const token = a[i] ?? "";
    const value = b[i] ?? "";
    if (token.startsWith(":")) params[token.slice(1)] = decodeURIComponent(value);
    else if (token !== value) return null;
  }
  return params;
}

function readProductQuery(req: HttpRequest): ProductQuery {
  const num = (key: string) => {
    const raw = one(req, key);
    if (!raw) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
  };
  const region = one(req, "region");
  const delivery = one(req, "delivery");
  const tag = one(req, "tag");
  const sort = one(req, "sort");
  return {
    q: one(req, "q"),
    category: one(req, "category"),
    seller: one(req, "seller"),
    platform: many(req, "platform"),
    region: region === "GLOBAL" || region === "US" || region === "UK" || region === "EU" ? region : undefined,
    delivery: delivery === "INSTANT" || delivery === "MANUAL" ? delivery : undefined,
    tag: tag === "featured" || tag === "best" || tag === "new" || tag === "hot" ? tag : undefined,
    minMinor: num("minMinor"),
    maxMinor: num("maxMinor"),
    inStock: one(req, "inStock") === "1",
    sort: sort === "price_asc" || sort === "price_desc" || sort === "newest" || sort === "rating" || sort === "popular" ? sort : "popular",
    page: num("page") ?? 1,
    pageSize: num("pageSize") ?? 12,
  };
}

function one(req: HttpRequest, key: string) {
  const value = req.query[key];
  return Array.isArray(value) ? value[0] : value;
}

function many(req: HttpRequest, key: string) {
  const value = req.query[key];
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list.flatMap((entry) => entry.split(",")).map((entry) => entry.trim()).filter(Boolean);
}

void 0 as RegionCode | undefined;
