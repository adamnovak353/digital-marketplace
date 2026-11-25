import { randomBytes, randomInt, randomUUID } from "node:crypto";
import type {
  CartQuote,
  Category,
  DashboardSeriesPoint,
  DeliveryView,
  DisputeView,
  ListingStatus,
  OrderStatus,
  OrderRequestView,
  OrderView,
  PaymentStatus,
  PayoutView,
  ProductDetail,
  ProductKind,
  ProductListResponse,
  ProductSummary,
  ProviderView,
  RegionCode,
  Review,
  Role,
  SellerPublic,
  SellerStatus,
  TicketStatus,
  TicketView,
  WalletView,
} from "@marketplace/types";
import { catalogProducts, catalogSellers, categoryMeta, type CatalogProduct } from "./catalog";
import { containsCvv, containsPan, createBox, hashPassword, sha256, verifyPassword, type SecretBox } from "./crypto";
import { maskEmail, type MailMessage, type Mailer } from "./mail";
import { IMAGE_EXTENSIONS, type ImageType } from "./images";
import { COUPONS, priceCart, type CouponRule, type PricedLine } from "./pricing";
import { DEMO_DISCLAIMER, LISTING_DISCLAIMER, PRODUCT_IMAGE_LIMIT } from "@marketplace/types";

export interface Actor {
  id: string;
  email: string;
  name: string;
  role: Role;
  sellerId?: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type AccountType = "asset" | "liability" | "income" | "expense";
type Direction = "DEBIT" | "CREDIT";

interface LedgerLine {
  account: string;
  accountType: AccountType;
  direction: Direction;
  amountMinor: number;
}

interface LedgerTx {
  id: string;
  memo: string;
  orderId?: string;
  createdAt: string;
  lines: LedgerLine[];
}

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: Role;
  emailVerified: boolean;
  mfaEnabled: boolean;
  status: "ACTIVE" | "SUSPENDED";
  note?: string;
  sellerId?: string;
  createdAt: string;
  verifyToken?: string;
  resetToken?: string;
  resetExpires?: string;
}

interface SellerRecord {
  id: string;
  userId?: string;
  slug: string;
  name: string;
  businessName: string;
  country: string;
  bio: string;
  status: SellerStatus;
  platformOwned: boolean;
  memberSince: string;
  verification: "UNVERIFIED" | "PENDING" | "APPROVED" | "REJECTED";
  telegram?: string;
  note?: string;
}

interface VariantRecord {
  id: string;
  name: string;
  priceMinor: number;
  compareAtMinor?: number;
  region: RegionCode;
}

interface ProductRecord {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  kind: ProductKind;
  platform: string;
  sellerId: string;
  summary: string;
  description: string;
  delivery: "INSTANT" | "MANUAL";
  regions: RegionCode[];
  tags: Array<"featured" | "best" | "new" | "hot">;
  monogram: string;
  accent: string;
  gradient: [string, string];
  status: ListingStatus;
  variants: VariantRecord[];
  faqs: Array<{ q: string; a: string }>;
  deliveryNotes: string[];
  createdAt: string;
  images?: ProductImageRecord[];
}

interface ProductImageRecord {
  id: string;
  key: string;
  contentType: ImageType;
  sizeBytes: number;
  createdAt: string;
}

interface UnitRecord {
  id: string;
  productId: string;
  variantId: string;
  sellerId: string;
  state: "AVAILABLE" | "RESERVED" | "DELIVERED" | "QUARANTINED";
  ciphertext: string;
  iv: string;
  tag: string;
  reservedOrderId?: string;
  revealed: boolean;
}

interface CartRecord {
  ownerKey: string;
  couponCode?: string;
  items: Array<{ id: string; productId: string; variantId: string; quantity: number }>;
}

interface OrderItemRecord {
  id: string;
  productId: string;
  slug: string;
  title: string;
  variantId: string;
  variantName: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  discountMinor: number;
  sellerNetMinor: number;
  commissionMinor: number;
  platformNetMinor: number;
  delivery: "INSTANT" | "MANUAL";
  sellerId: string;
  sellerName: string;
  kind: ProductKind;
  monogram: string;
  accent: string;
  unitIds: string[];
  fulfilled: boolean;
}

interface OrderRecord {
  id: string;
  number: string;
  userId: string;
  email: string;
  status: OrderStatus;
  items: OrderItemRecord[];
  subtotalMinor: number;
  discountMinor: number;
  feeMinor: number;
  totalMinor: number;
  couponCode?: string;
  paymentMethod: string;
  createdAt: string;
  releasedSellers: string[];
  fulfillAttempts: number;
  saleTxId?: string;
}

interface OrderRequestItemRecord {
  id: string;
  productId: string;
  slug: string;
  title: string;
  variantName: string;
  sellerName: string;
  sellerId: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  monogram: string;
  accent: string;
}

interface OrderRequestRecord {
  id: string;
  number: string;
  userId: string;
  email?: string;
  telegram?: string;
  note?: string;
  status: "AWAITING_CONTACT" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
  updatedAt?: string;
  currency: "USD";
  items: OrderRequestItemRecord[];
  subtotalMinor: number;
  discountMinor: number;
  feeMinor: number;
  feeBps: number;
  totalMinor: number;
  createdAt: string;
}

interface PaymentRecord {
  id: string;
  orderId: string;
  provider: "mock";
  method: string;
  amountMinor: number;
  status: PaymentStatus;
  createdAt: string;
}

interface ReviewRecord {
  id: string;
  productId: string;
  userId: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface TicketRecord {
  id: string;
  number: string;
  userId: string;
  subject: string;
  status: TicketStatus;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketView["messages"];
}

interface PayoutRecord {
  id: string;
  sellerId: string;
  amountMinor: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  createdAt: string;
}

interface DisputeRecord {
  id: string;
  orderId: string;
  userId: string;
  reason: string;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";
  openedBy: string;
  createdAt: string;
  resolution?: string;
}

interface FavoriteRecord {
  userId: string;
  productId: string;
}

interface ChallengeRecord {
  id: string;
  userId: string;
  codeHash: string;
  expiresAt: number;
}

interface AuditRecord {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
}

interface EventRecord {
  eventId: string;
  paymentId: string;
  createdAt: string;
}

interface OutboxRecord {
  id: string;
  orderId: string;
  status: "PENDING" | "DONE" | "FAILED";
  attempts: number;
  lastError?: string;
  createdAt: string;
}

export interface ServiceOptions {
  customerFeeBps?: number;
  commissionBps?: number;
  demoMode?: boolean;
  telecomEnabled?: boolean;
  cardsEnabled?: boolean;
  encryptionKey?: string;
  webhookSecret?: string;
  deferFulfillment?: boolean;
  seed?: boolean;
  mailer?: Mailer | null;
  /** Absolute site origin used in emailed links, e.g. https://shop.example.com */
  publicUrl?: string;
  /** Optional operations inbox that receives every new order request. */
  alertEmail?: string;
  /** Where state is persisted; shown on the admin system status panel. */
  storage?: "memory" | "file" | "postgres";
}

const DEMO_PASSWORD = "DemoPass123!";

export const SNAPSHOT_FORMAT = 1;

type CategoryPref = { name?: string; description?: string; homepage: boolean; featured: boolean; hidden: boolean };
type ExtraCategory = { slug: string; name: string; description: string; icon: "accounts" };

export interface MarketplaceSnapshot {
  format: number;
  savedAt: string;
  data: {
    users: UserRecord[];
    sellers: SellerRecord[];
    products: ProductRecord[];
    units: UnitRecord[];
    carts: CartRecord[];
    orders: OrderRecord[];
    orderRequests: OrderRequestRecord[];
    payments: PaymentRecord[];
    reviews: ReviewRecord[];
    tickets: TicketRecord[];
    payouts: PayoutRecord[];
    disputes: DisputeRecord[];
    favorites: FavoriteRecord[];
    ledger: LedgerTx[];
    audits: AuditRecord[];
    events: EventRecord[];
    outbox: OutboxRecord[];
    orderSeq: number;
    requestSeq: number;
    ticketSeq: number;
    customerMeta: Array<[string, { note: string; blocked: boolean }]>;
    categoryPrefs: Array<[string, CategoryPref]>;
    extraCategories: ExtraCategory[];
    allowSellerRegistration: boolean;
    customerFeeBps: number;
    commissionBps: number;
  };
}

export class MarketplaceService {
  private chain: Promise<unknown> = Promise.resolve();
  private users: UserRecord[] = [];
  private sellers: SellerRecord[] = [];
  private products: ProductRecord[] = [];
  private units: UnitRecord[] = [];
  private carts: CartRecord[] = [];
  private orders: OrderRecord[] = [];
  private orderRequests: OrderRequestRecord[] = [];
  private payments: PaymentRecord[] = [];
  private reviews: ReviewRecord[] = [];
  private tickets: TicketRecord[] = [];
  private payouts: PayoutRecord[] = [];
  private disputes: DisputeRecord[] = [];
  private favorites: FavoriteRecord[] = [];
  private ledger: LedgerTx[] = [];
  private audits: AuditRecord[] = [];
  private events: EventRecord[] = [];
  private outbox: OutboxRecord[] = [];
  private challenges: ChallengeRecord[] = [];
  private loginHits = new Map<string, number[]>();
  private orderSeq = 10020;
  private requestSeq = 1000;
  private ticketSeq = 1020;
  private failureBudget = 0;
  private customerMeta = new Map<string, { note: string; blocked: boolean }>();
  private categoryPrefs = new Map<string, CategoryPref>();
  private extraCategories: ExtraCategory[] = [];
  private allowSellerRegistration = true;
  private frozenNow: string | null = null;
  private readonly box: SecretBox;
  readonly demoMode: boolean;
  readonly telecomEnabled: boolean;
  readonly cardsEnabled: boolean;
  readonly deferFulfillment: boolean;
  readonly webhookSecret: string;
  readonly mailer: Mailer | null;
  readonly publicUrl: string;
  readonly alertEmail: string | null;
  readonly storage: "memory" | "file" | "postgres";
  customerFeeBps: number;
  commissionBps: number;

  constructor(opts: ServiceOptions = {}) {
    this.mailer = opts.mailer ?? null;
    this.storage = opts.storage ?? "memory";
    this.publicUrl = (opts.publicUrl ?? "http://localhost:3000").replace(/\/$/, "");
    this.alertEmail = opts.alertEmail || null;
    this.customerFeeBps = opts.customerFeeBps ?? 300;
    this.commissionBps = opts.commissionBps ?? 1000;
    this.demoMode = opts.demoMode ?? true;
    this.telecomEnabled = opts.telecomEnabled ?? false;
    this.cardsEnabled = opts.cardsEnabled ?? false;
    this.deferFulfillment = opts.deferFulfillment ?? false;
    this.webhookSecret = opts.webhookSecret ?? "demo-webhook-secret";
    this.box = createBox(opts.encryptionKey ?? "demo-only-inventory-key");
  }

  static async createDemo(opts: ServiceOptions = {}) {
    const service = new MarketplaceService({ ...opts, seed: true });
    await service.seedDemo();
    return service;
  }

  static async createEmpty(opts: ServiceOptions, admin: { email: string; password: string; name: string }) {
    const service = new MarketplaceService({ ...opts, seed: false });
    service.users.push({
      id: randomUUID(),
      email: admin.email.trim().toLowerCase(),
      passwordHash: await hashPassword(admin.password),
      name: admin.name.trim() || "Administrator",
      role: "SUPER_ADMIN",
      emailVerified: true,
      mfaEnabled: true,
      status: "ACTIVE",
      createdAt: service.now(),
    });
    return service;
  }

  static restore(opts: ServiceOptions, snapshot: MarketplaceSnapshot) {
    if (snapshot.format !== SNAPSHOT_FORMAT) {
      throw new Error(`Unsupported marketplace snapshot format ${snapshot.format}. Expected ${SNAPSHOT_FORMAT}.`);
    }
    const service = new MarketplaceService({ ...opts, seed: false });
    const data = snapshot.data;
    service.users = data.users ?? [];
    service.sellers = data.sellers ?? [];
    service.products = data.products ?? [];
    service.units = data.units ?? [];
    service.carts = data.carts ?? [];
    service.orders = data.orders ?? [];
    service.orderRequests = data.orderRequests ?? [];
    service.payments = data.payments ?? [];
    service.reviews = data.reviews ?? [];
    service.tickets = data.tickets ?? [];
    service.payouts = data.payouts ?? [];
    service.disputes = data.disputes ?? [];
    service.favorites = data.favorites ?? [];
    service.ledger = data.ledger ?? [];
    service.audits = data.audits ?? [];
    service.events = data.events ?? [];
    service.outbox = data.outbox ?? [];
    service.orderSeq = data.orderSeq ?? service.orderSeq;
    service.requestSeq = data.requestSeq ?? service.requestSeq;
    service.ticketSeq = data.ticketSeq ?? service.ticketSeq;
    service.customerMeta = new Map(data.customerMeta ?? []);
    service.categoryPrefs = new Map(data.categoryPrefs ?? []);
    service.extraCategories = data.extraCategories ?? [];
    service.allowSellerRegistration = data.allowSellerRegistration ?? true;
    if (typeof data.customerFeeBps === "number") service.customerFeeBps = data.customerFeeBps;
    if (typeof data.commissionBps === "number") service.commissionBps = data.commissionBps;
    return service;
  }

  /** Login challenges and rate-limit counters are short-lived and stay in memory. */
  exportState(): MarketplaceSnapshot {
    return {
      format: SNAPSHOT_FORMAT,
      savedAt: new Date().toISOString(),
      data: {
        users: this.users,
        sellers: this.sellers,
        products: this.products,
        units: this.units,
        carts: this.carts.filter((cart) => cart.items.length || cart.couponCode),
        orders: this.orders,
        orderRequests: this.orderRequests,
        payments: this.payments,
        reviews: this.reviews,
        tickets: this.tickets,
        payouts: this.payouts,
        disputes: this.disputes,
        favorites: this.favorites,
        ledger: this.ledger,
        audits: this.audits,
        events: this.events,
        outbox: this.outbox,
        orderSeq: this.orderSeq,
        requestSeq: this.requestSeq,
        ticketSeq: this.ticketSeq,
        customerMeta: [...this.customerMeta],
        categoryPrefs: [...this.categoryPrefs],
        extraCategories: this.extraCategories,
        allowSellerRegistration: this.allowSellerRegistration,
        customerFeeBps: this.customerFeeBps,
        commissionBps: this.commissionBps,
      },
    };
  }

  failNext(times: number) {
    this.failureBudget = times;
  }

  trialBalance() {
    let debit = 0;
    let credit = 0;
    for (const tx of this.ledger) {
      for (const line of tx.lines) {
        if (line.direction === "DEBIT") debit += line.amountMinor;
        else credit += line.amountMinor;
      }
    }
    return { debit, credit, balanced: debit === credit };
  }

  inventoryCounts(variantId: string) {
    const units = this.units.filter((unit) => unit.variantId === variantId);
    return {
      available: units.filter((unit) => unit.state === "AVAILABLE").length,
      reserved: units.filter((unit) => unit.state === "RESERVED").length,
      delivered: units.filter((unit) => unit.state === "DELIVERED").length,
      quarantined: units.filter((unit) => unit.state === "QUARANTINED").length,
    };
  }

  async register(input: { name: string; email: string; password: string }) {
    const email = input.email.toLowerCase();
    if (this.users.some((user) => user.email === email)) {
      throw new HttpError(409, "EMAIL_IN_USE", "An account with that email already exists.");
    }
    const user: UserRecord = {
      id: randomUUID(),
      email,
      passwordHash: await hashPassword(input.password),
      name: input.name.trim(),
      role: "CUSTOMER",
      emailVerified: false,
      mfaEnabled: false,
      status: "ACTIVE",
      createdAt: this.now(),
      verifyToken: randomBytes(16).toString("base64url"),
    };
    this.users.push(user);
    const verifyPath = `/verify-email?token=${user.verifyToken}`;
    if (this.mailer) {
      try {
        await this.sendMail({
          to: user.email,
          subject: "Confirm your email address",
          text: `Hi ${user.name},\n\nConfirm your email address for your marketplace account:\n${this.publicUrl}${verifyPath}\n\nIf you did not create this account, ignore this email.`,
        });
      } catch {
        this.users = this.users.filter((item) => item.id !== user.id);
        throw new HttpError(503, "MAIL_UNAVAILABLE", "The confirmation email could not be sent. Try again shortly.");
      }
      return { user: this.publicUser(user), delivery: "email" as const, message: `We sent a confirmation link to ${maskEmail(user.email)}.` };
    }
    return {
      user: this.publicUser(user),
      delivery: "inline_demo" as const,
      message: "Email delivery is not configured. Use the demo verification link.",
      verifyPath: this.demoMode ? verifyPath : undefined,
    };
  }

  async login(input: { email: string; password: string }) {
    const email = input.email.toLowerCase();
    this.assertLoginRate(email);
    const user = this.users.find((item) => item.email === email);
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }
    if (user.status !== "ACTIVE") throw new HttpError(403, "ACCOUNT_SUSPENDED", "This account is suspended.");
    if (user.mfaEnabled) {
      if (!this.mailer && !this.demoMode) {
        throw new HttpError(503, "MAIL_UNAVAILABLE", "Sign-in codes cannot be sent because email delivery is not configured.");
      }
      const code = String(randomInt(100000, 1000000));
      const challenge: ChallengeRecord = {
        id: randomUUID(),
        userId: user.id,
        codeHash: sha256(code),
        expiresAt: Date.now() + 10 * 60 * 1000,
      };
      this.challenges = [...this.challenges.filter((item) => item.userId !== user.id && item.expiresAt > Date.now()), challenge];
      if (this.mailer) {
        try {
          await this.sendMail({
            to: user.email,
            subject: `Your sign-in code: ${code}`,
            text: `Your marketplace sign-in code is ${code}.\n\nIt expires in 10 minutes. If you did not try to sign in, change your password.`,
          });
        } catch {
          this.challenges = this.challenges.filter((item) => item.id !== challenge.id);
          throw new HttpError(503, "MAIL_UNAVAILABLE", "The sign-in code could not be sent. Try again shortly.");
        }
        return { mfaRequired: true as const, challengeId: challenge.id, delivery: "email" as const, message: `We sent a 6-digit code to ${maskEmail(user.email)}.` };
      }
      return {
        mfaRequired: true as const,
        challengeId: challenge.id,
        delivery: "inline_demo" as const,
        message: "Email delivery is not configured. Enter the demo verification code.",
        demoCode: code,
      };
    }
    return { mfaRequired: false as const, user: this.publicUser(user) };
  }

  async verifyMfa(input: { challengeId: string; code: string }) {
    const challenge = this.challenges.find((item) => item.id === input.challengeId);
    if (!challenge || challenge.expiresAt < Date.now() || challenge.codeHash !== sha256(input.code)) {
      throw new HttpError(401, "MFA_INVALID", "The verification code is invalid or expired.");
    }
    this.challenges = this.challenges.filter((item) => item.id !== challenge.id);
    const user = this.mustUser(challenge.userId);
    return { user: this.publicUser(user) };
  }

  async forgotPassword(emailRaw: string) {
    const user = this.users.find((item) => item.email === emailRaw.toLowerCase());
    if (user) {
      user.resetToken = randomBytes(16).toString("base64url");
      user.resetExpires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    }
    const resetPath = user?.resetToken ? `/reset-password?token=${user.resetToken}` : undefined;
    if (this.mailer) {
      if (user && resetPath) {
        await this.sendMail({
          to: user.email,
          subject: "Reset your password",
          text: `Someone asked to reset the password for this marketplace account.\n\nChoose a new password within 30 minutes:\n${this.publicUrl}${resetPath}\n\nIf this was not you, ignore this email. Your password stays the same.`,
        }).catch(() => undefined);
      }
      return { message: "If an account exists for that email, we sent a reset link." };
    }
    if (!this.demoMode) {
      throw new HttpError(503, "MAIL_UNAVAILABLE", "Password reset is unavailable because email delivery is not configured.");
    }
    return {
      message: "Email delivery is not configured. If the account exists, a one-time demo reset link is included.",
      resetPath,
    };
  }

  async resetPassword(token: string, password: string) {
    const user = this.users.find((item) => item.resetToken === token);
    if (!user || !user.resetExpires || user.resetExpires < this.now()) {
      throw new HttpError(400, "RESET_INVALID", "This reset link is invalid or expired.");
    }
    user.passwordHash = await hashPassword(password);
    user.resetToken = undefined;
    user.resetExpires = undefined;
    return { message: "Password updated. You can sign in." };
  }

  async verifyEmail(token: string) {
    const user = this.users.find((item) => item.verifyToken === token);
    if (!user) throw new HttpError(400, "VERIFY_INVALID", "This verification link is invalid.");
    user.emailVerified = true;
    user.verifyToken = undefined;
    return { message: "Email verified.", user: this.publicUser(user) };
  }

  async changePassword(actor: Actor, currentPassword: string, newPassword: string) {
    const user = this.mustUser(actor.id);
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new HttpError(400, "PASSWORD_MISMATCH", "Current password is incorrect.");
    }
    user.passwordHash = await hashPassword(newPassword);
    return { message: "Password changed." };
  }

  updateProfile(actor: Actor, name: string) {
    const user = this.mustUser(actor.id);
    user.name = name.trim();
    return this.publicUser(user);
  }

  listCategories(): Category[] {
    return this.allCategoryMeta().map((category) => {
      const available = this.categoryEnabled(category.slug);
      const pref = this.categoryPrefs.get(category.slug);
      return {
        ...category,
        name: pref?.name || category.name,
        description: pref?.description || category.description,
        available,
        productCount: available
          ? this.products.filter((product) => product.categorySlug === category.slug && product.status === "ACTIVE" && this.kindEnabled(product.kind)).length
          : 0,
      };
    });
  }

  home() {
    const products = this.visibleProducts();
    return {
      categories: this.listCategories().filter((category) => this.categoryPrefs.get(category.slug)?.homepage !== false),
      featured: products.filter((product) => product.tags.includes("featured")).map((product) => this.summarize(product)),
      hot: products.filter((product) => product.tags.includes("hot")).map((product) => this.summarize(product)),
      best: products.filter((product) => product.tags.includes("best")).map((product) => this.summarize(product)),
      newest: [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map((product) => this.summarize(product)),
      topSellers: this.topSellers().slice(0, 5),
      disclaimer: this.demoMode ? DEMO_DISCLAIMER : LISTING_DISCLAIMER,
    };
  }

  listProducts(query: ProductQuery): ProductListResponse {
    const base = this.visibleProducts().filter((product) => this.matchesBase(product, query));
    const platforms = new Map<string, number>();
    const sellerCounts = new Map<string, number>();
    const regions = new Map<RegionCode, number>();
    for (const product of base) {
      platforms.set(product.platform, (platforms.get(product.platform) ?? 0) + 1);
      sellerCounts.set(product.sellerId, (sellerCounts.get(product.sellerId) ?? 0) + 1);
      for (const region of product.regions) regions.set(region, (regions.get(region) ?? 0) + 1);
    }
    let items = base.filter((product) => {
      if (query.platform?.length && !query.platform.includes(product.platform)) return false;
      if (query.seller && this.sellerById(product.sellerId)?.slug !== query.seller) return false;
      return true;
    });
    const summaries = items.map((product) => this.summarize(product));
    const sorted = summaries.sort((a, b) => this.compareProducts(a, b, query.sort));
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const start = (page - 1) * pageSize;
    return {
      items: sorted.slice(start, start + pageSize),
      total: sorted.length,
      page,
      pageSize,
      facets: {
        platforms: [...platforms.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name)),
        sellers: [...sellerCounts.entries()].map(([sellerId, count]) => {
          const seller = this.mustSeller(sellerId);
          return { slug: seller.slug, name: seller.name, count };
        }),
        regions: [...regions.entries()].map(([code, count]) => ({ code, count })),
        delivery: (["INSTANT", "MANUAL"] as const).map((mode) => ({ mode, count: base.filter((product) => product.delivery === mode).length })),
      },
    };
  }

  getProduct(slug: string, actor?: Actor | null): ProductDetail {
    const product = this.products.find((item) => item.slug === slug);
    if (!product) throw new HttpError(404, "NOT_FOUND", "Product not found.");
    const owner = actor?.sellerId === product.sellerId || actor?.role === "ADMIN" || actor?.role === "SUPER_ADMIN";
    if (product.status !== "ACTIVE" && !owner) throw new HttpError(404, "NOT_FOUND", "Product not found.");
    if (!owner && !this.kindEnabled(product.kind)) throw new HttpError(404, "CATEGORY_DISABLED", "This category stays off until a licensed provider is approved.");
    const summary = this.summarize(product);
    const related = this.visibleProducts()
      .filter((item) => item.categorySlug === product.categorySlug && item.id !== product.id)
      .slice(0, 4)
      .map((item) => this.summarize(item));
    return {
      ...summary,
      description: product.description,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        priceMinor: variant.priceMinor,
        compareAtMinor: variant.compareAtMinor,
        region: variant.region,
        available: this.availableUnits(variant.id).length,
      })),
      faqs: product.faqs,
      deliveryNotes: product.deliveryNotes,
      disclaimer: this.demoMode ? DEMO_DISCLAIMER : LISTING_DISCLAIMER,
      reviews: this.reviewViews(product.id),
      related,
    };
  }

  listSellers() {
    return this.sellers.filter((seller) => seller.status === "APPROVED").map((seller) => this.publicSeller(seller));
  }

  getSeller(slug: string) {
    const seller = this.sellers.find((item) => item.slug === slug && item.status === "APPROVED");
    if (!seller) throw new HttpError(404, "NOT_FOUND", "Seller not found.");
    const products = this.visibleProducts().filter((product) => product.sellerId === seller.id).map((product) => this.summarize(product));
    return { seller: this.publicSeller(seller), products };
  }

  getCart(actor: Actor | null, guestId: string): CartQuote {
    const ownerKey = actor ? `user:${actor.id}` : `guest:${guestId}`;
    return this.quoteCart(this.carts.find((item) => item.ownerKey === ownerKey) ?? { ownerKey, items: [] });
  }

  addCartItem(actor: Actor | null, guestId: string, input: { productId: string; variantId: string; quantity: number }) {
    return this.exclusive(() => {
      const product = this.publicProduct(input.productId);
      const variant = product.variants.find((item) => item.id === input.variantId);
      if (!variant) throw new HttpError(404, "VARIANT_NOT_FOUND", "That plan is no longer available.");
      const available = this.availableUnits(variant.id).length;
      if (available < 1) throw new HttpError(409, "OUT_OF_STOCK", "This plan is out of stock.");
      const cart = this.cartFor("mutate", actor, guestId);
      const existing = cart.items.find((item) => item.variantId === variant.id);
      const nextQty = Math.min(10, (existing?.quantity ?? 0) + input.quantity);
      if (nextQty > available) throw new HttpError(409, "INSUFFICIENT_STOCK", `Only ${available} units are available.`);
      if (existing) existing.quantity = nextQty;
      else cart.items.push({ id: randomUUID(), productId: product.id, variantId: variant.id, quantity: input.quantity });
      return this.quoteCart(cart);
    });
  }

  updateCartItem(actor: Actor | null, guestId: string, itemId: string, quantity: number) {
    return this.exclusive(() => {
      const cart = this.cartFor("mutate", actor, guestId);
      const item = cart.items.find((entry) => entry.id === itemId);
      if (!item) throw new HttpError(404, "NOT_FOUND", "Cart item not found.");
      const available = this.availableUnits(item.variantId).length;
      if (quantity > available) throw new HttpError(409, "INSUFFICIENT_STOCK", `Only ${available} units are available.`);
      item.quantity = quantity;
      return this.quoteCart(cart);
    });
  }

  removeCartItem(actor: Actor | null, guestId: string, itemId: string) {
    return this.exclusive(() => {
      const cart = this.cartFor("mutate", actor, guestId);
      cart.items = cart.items.filter((item) => item.id !== itemId);
      return this.quoteCart(cart);
    });
  }

  applyCoupon(actor: Actor | null, guestId: string, code: string) {
    const coupon = COUPONS[code.trim().toUpperCase()];
    if (!coupon) throw new HttpError(400, "COUPON_INVALID", "That coupon is not valid.");
    const cart = this.cartFor("coupon", actor, guestId);
    cart.couponCode = coupon.code;
    return this.quoteCart(cart);
  }

  clearCoupon(actor: Actor | null, guestId: string) {
    const cart = this.cartFor("coupon", actor, guestId);
    cart.couponCode = undefined;
    return this.quoteCart(cart);
  }

  placeOrderRequest(actor: Actor | null, guestId: string, input: { email?: string; telegram?: string; note?: string }) {
    return this.exclusive(() => {
      const email = input.email?.trim() || undefined;
      const telegram = input.telegram?.trim() || undefined;
      const note = input.note?.trim() || undefined;
      if (!email && !telegram) throw new HttpError(400, "CONTACT_REQUIRED", "Enter an email address or a Telegram handle.");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "EMAIL_INVALID", "Enter a valid email address.");
      if (telegram && !/^@?[A-Za-z0-9_]{3,32}$/.test(telegram)) {
        throw new HttpError(400, "TELEGRAM_INVALID", "Enter a Telegram username. It is stored as contact text only.");
      }
      if (note && note.length > 500) throw new HttpError(400, "NOTE_TOO_LONG", "Order note must be 500 characters or fewer.");
      const cart = this.cartFor("order-request", actor, guestId);
      const quote = this.quoteCart(cart);
      if (!quote.items.length) throw new HttpError(400, "CART_EMPTY", "Your cart is empty.");
      for (const item of cart.items) {
        const product = this.products.find((entry) => entry.id === item.productId);
        if (product && !this.kindEnabled(product.kind)) {
          throw new HttpError(403, "CATEGORY_DISABLED", `${product.title} cannot be requested until that provider is approved.`);
        }
      }
      for (const item of quote.items) {
        if (item.quantity > item.available) throw new HttpError(409, "INSUFFICIENT_STOCK", `${item.title} does not have enough stock.`);
      }
      const request: OrderRequestRecord = {
        id: randomUUID(),
        number: `REQ-${++this.requestSeq}`,
        userId: actor?.id ?? `guest:${guestId}`,
        email,
        telegram,
        note,
        status: "AWAITING_CONTACT",
        currency: "USD",
        items: quote.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          slug: item.slug,
          title: item.title,
          variantName: item.variantName,
          sellerName: item.sellerName,
          sellerId: this.products.find((entry) => entry.id === item.productId)?.sellerId ?? "",
          quantity: item.quantity,
          unitPriceMinor: item.unitPriceMinor,
          lineTotalMinor: item.lineTotalMinor,
          monogram: item.monogram,
          accent: item.accent,
        })),
        subtotalMinor: quote.subtotalMinor,
        discountMinor: quote.discountMinor,
        feeMinor: quote.feeMinor,
        feeBps: quote.feeBps,
        totalMinor: quote.totalMinor,
        createdAt: this.now(),
      };
      this.orderRequests.push(request);
      cart.items = [];
      cart.couponCode = undefined;
      this.notifyOrderRequest(request);
      return this.viewOrderRequest(request);
    });
  }

  /** Waits for queued notification emails. Used by tests and graceful shutdown. */
  flushMail() {
    return this.mailQueue;
  }

  private mailQueue: Promise<void> = Promise.resolve();

  private sendMail(message: MailMessage) {
    if (!this.mailer) return Promise.resolve();
    return this.mailer.send(message).catch((error: Error) => {
      console.error(JSON.stringify({ time: new Date().toISOString(), event: "mail_failed", recipientDomain: message.to.split("@")[1] ?? "", message: error.message }));
      throw error;
    });
  }

  /** Notification failures are logged and never undo the saved request. */
  private queueMail(message: MailMessage) {
    if (!this.mailer) return;
    this.mailQueue = this.mailQueue.then(async () => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await this.sendMail(message);
          return;
        } catch {
          if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        }
      }
    });
  }

  private notifyOrderRequest(request: OrderRequestRecord) {
    const money = (minor: number) => `$${(minor / 100).toFixed(2)}`;
    const contact = [request.email ? `Email: ${request.email}` : "", request.telegram ? `Telegram: ${request.telegram}` : ""].filter(Boolean).join("\n");
    const lines = (items: OrderRequestItemRecord[]) => items.map((item) => `- ${item.title} (${item.variantName}) x${item.quantity}: ${money(item.lineTotalMinor)}`).join("\n");
    const note = request.note ? `\nCustomer note:\n${request.note}\n` : "";
    if (request.email) {
      this.queueMail({
        to: request.email,
        subject: `We received order request ${request.number}`,
        text: `Thanks. Your order request ${request.number} was received.\n\n${lines(request.items)}\nTotal quoted: ${money(request.totalMinor)} USD\n\nNo payment was taken. The seller will contact you to arrange the order.${request.userId.startsWith("guest:") ? "" : `\n\nView it after signing in: ${this.publicUrl}/order-requests/${request.id}`}`,
      });
    }
    for (const sellerId of new Set(request.items.map((item) => item.sellerId))) {
      const seller = this.sellers.find((item) => item.id === sellerId);
      const owner = seller?.userId ? this.users.find((user) => user.id === seller.userId && user.status === "ACTIVE") : undefined;
      if (!owner) continue;
      this.queueMail({
        to: owner.email,
        subject: `New order request ${request.number}`,
        text: `A customer placed order request ${request.number}.\n\n${lines(request.items.filter((item) => item.sellerId === sellerId))}\n\nContact the customer:\n${contact}\n${note}\nOpen it: ${this.publicUrl}/seller/orders/${request.id}`,
      });
    }
    if (this.alertEmail) {
      this.queueMail({
        to: this.alertEmail,
        subject: `New order request ${request.number}`,
        text: `Order request ${request.number} for ${money(request.totalMinor)} USD.\n\n${lines(request.items)}\n\n${contact}\n${note}\nOpen it: ${this.publicUrl}/admin/orders`,
      });
    }
  }

  getOrderRequest(actor: Actor | null, guestId: string | null, id: string) {
    const request = this.orderRequests.find((item) => item.id === id || item.number === id);
    if (!request) throw new HttpError(404, "NOT_FOUND", "Order request not found.");
    const staff = actor?.role === "ADMIN" || actor?.role === "SUPER_ADMIN";
    const guestKey = guestId ? `guest:${guestId}` : "";
    if (!staff && actor?.id !== request.userId && guestKey !== request.userId) {
      throw new HttpError(403, "FORBIDDEN", "You cannot view this order request.");
    }
    return this.viewOrderRequest(request);
  }

  listMyOrderRequests(actor: Actor) {
    return this.orderRequests
      .filter((request) => request.userId === actor.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((request) => this.viewOrderRequest(request));
  }

  /** Only the mock payment adapter exists, so paid checkout is limited to demo mode. */
  get paymentsEnabled() {
    return this.demoMode;
  }

  placeOrder(actor: Actor | null, guestId: string, input: { email: string; paymentMethod: string }) {
    if (!this.paymentsEnabled) {
      throw new HttpError(403, "PAYMENTS_UNAVAILABLE", "Online payment is not available. Submit an order request from your cart instead.");
    }
    return this.exclusive(() => this.placeOrderLocked(actor, guestId, input));
  }

  confirmDemoPayment(actor: Actor | null, guestId: string, paymentId: string) {
    if (!this.demoMode) throw new HttpError(403, "DEMO_DISABLED", "Demo payment confirmation is disabled.");
    const payment = this.payments.find((item) => item.id === paymentId);
    if (!payment || payment.provider !== "mock") throw new HttpError(404, "NOT_FOUND", "Payment not found.");
    const order = this.mustOrder(payment.orderId);
    this.assertOwner(order, actor, guestId);
    return this.completePayment(payment.id, `demo-confirm:${payment.id}`);
  }

  applyWebhook(input: { provider: string; eventId: string; type: string; paymentId: string }, secret: string | null) {
    if (!secret || secret !== this.webhookSecret) {
      throw new HttpError(401, "WEBHOOK_UNAUTHORIZED", "Invalid webhook secret.");
    }
    if (input.provider !== "mock") {
      throw new HttpError(400, "PROVIDER_NOT_LIVE", "Only the mock payment provider is configured.");
    }
    if (input.type === "payment.succeeded") return this.completePayment(input.paymentId, input.eventId);
    if (input.type === "payment.failed") return this.failPayment(input.paymentId, input.eventId);
    throw new HttpError(400, "UNSUPPORTED_EVENT", "This webhook type is not handled.");
  }

  completePayment(paymentId: string, eventId: string) {
    return this.exclusive(() => this.completePaymentLocked(paymentId, eventId));
  }

  async processOutbox() {
    return this.exclusive(() => {
      const pending = this.outbox.filter((event) => event.status === "PENDING" || event.status === "FAILED");
      const results = [];
      for (const event of pending) {
        if (event.status === "DONE") continue;
        const order = this.mustOrder(event.orderId);
        if (order.status === "REFUNDED" || order.status === "DELIVERED" || order.status === "MANUAL_REVIEW") {
          event.status = "DONE";
          continue;
        }
        results.push(this.fulfillLocked(order, event));
      }
      return { processed: results.length };
    });
  }

  listOrders(actor: Actor) {
    return this.orders.filter((order) => order.userId === actor.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((order) => this.viewOrder(order));
  }

  getOrder(actor: Actor | null, guestId: string | null, id: string) {
    const order = this.orders.find((item) => item.id === id || item.number === id);
    if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found.");
    const staff = actor?.role === "ADMIN" || actor?.role === "SUPER_ADMIN" || (actor?.sellerId && order.items.some((item) => item.sellerId === actor.sellerId));
    if (!staff) this.assertOwner(order, actor, guestId);
    return this.viewOrder(order);
  }

  getDelivery(actor: Actor | null, guestId: string | null, id: string): DeliveryView {
    const order = this.orders.find((item) => item.id === id || item.number === id);
    if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found.");
    this.assertOwner(order, actor, guestId);
    return {
      orderId: order.id,
      status: order.status,
      items: order.items.map((item) => {
        if (!item.fulfilled) {
          return {
            title: item.title,
            kind: item.kind,
            delivery: item.delivery,
            state: order.status === "MANUAL_REVIEW" ? ("UNAVAILABLE" as const) : ("WAITING_FOR_SELLER" as const),
            notice:
              order.status === "MANUAL_REVIEW"
                ? "This order is in manual review. No demo voucher was released."
                : "Waiting for the seller to confirm fulfillment.",
          };
        }
        const payloads = item.unitIds.map((unitId) => {
          const unit = this.mustUnit(unitId);
          const plain = this.box.decrypt(unit);
          unit.revealed = true;
          return plain;
        });
        return {
          title: item.title,
          kind: item.kind,
          delivery: item.delivery,
          state: "READY" as const,
          payload: payloads.join("\n"),
          notice:
            item.kind === "VIRTUAL_CARD"
              ? "Demo provider token only. PAN and CVV are not stored or shown."
              : "Demo voucher only. This is not a live credential and cannot be redeemed.",
        };
      }),
    };
  }

  getWallet(actor: Actor): WalletView {
    const account = `customer_wallet:${actor.id}`;
    const transactions = this.ledger
      .flatMap((tx) =>
        tx.lines
          .filter((line) => line.account === account)
          .map((line) => ({
            id: tx.id,
            type: line.direction === "CREDIT" ? "Credit" : "Debit",
            description: tx.memo,
            amountMinor: line.direction === "CREDIT" ? line.amountMinor : -line.amountMinor,
            createdAt: tx.createdAt,
            status: "Completed",
          })),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      currency: "USD",
      availableMinor: transactions.reduce((sum, tx) => sum + tx.amountMinor, 0),
      transactions,
    };
  }

  demoTopup(actor: Actor, amountMinor: number) {
    if (!this.demoMode) throw new HttpError(403, "DEMO_DISABLED", "Demo wallet credits are disabled.");
    return this.exclusive(() => {
      this.post({
        memo: "Demo wallet credit. No card was charged.",
        lines: [
          { account: "demo_funding", accountType: "expense", direction: "DEBIT", amountMinor },
          { account: `customer_wallet:${actor.id}`, accountType: "liability", direction: "CREDIT", amountMinor },
        ],
      });
      return this.getWallet(actor);
    });
  }

  listFavorites(actor: Actor) {
    return this.favorites
      .filter((favorite) => favorite.userId === actor.id)
      .map((favorite) => this.products.find((product) => product.id === favorite.productId))
      .filter((product): product is ProductRecord => Boolean(product))
      .map((product) => this.summarize(product));
  }

  addFavorite(actor: Actor, productId: string) {
    this.publicProduct(productId);
    if (!this.favorites.some((favorite) => favorite.userId === actor.id && favorite.productId === productId)) {
      this.favorites.push({ userId: actor.id, productId });
    }
    return this.listFavorites(actor);
  }

  removeFavorite(actor: Actor, productId: string) {
    this.favorites = this.favorites.filter((favorite) => !(favorite.userId === actor.id && favorite.productId === productId));
    return this.listFavorites(actor);
  }

  listTickets(actor: Actor) {
    const rows = actor.role === "ADMIN" || actor.role === "SUPER_ADMIN" ? this.tickets : this.tickets.filter((ticket) => ticket.userId === actor.id);
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((ticket) => this.viewTicket(ticket));
  }

  createTicket(actor: Actor, input: { subject: string; body: string; orderId?: string }) {
    if (input.orderId) this.assertOwner(this.mustOrder(input.orderId), actor, null);
    const ticket: TicketRecord = {
      id: randomUUID(),
      number: `T-${++this.ticketSeq}`,
      userId: actor.id,
      subject: input.subject,
      status: "OPEN",
      orderId: input.orderId,
      createdAt: this.now(),
      updatedAt: this.now(),
      messages: [{ id: randomUUID(), authorName: actor.name, authorRole: actor.role, body: input.body, createdAt: this.now() }],
    };
    this.tickets.push(ticket);
    return this.viewTicket(ticket);
  }

  getTicket(actor: Actor, id: string) {
    const ticket = this.tickets.find((item) => item.id === id || item.number === id);
    if (!ticket) throw new HttpError(404, "NOT_FOUND", "Ticket not found.");
    if (ticket.userId !== actor.id && actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") {
      throw new HttpError(403, "FORBIDDEN", "You cannot view this ticket.");
    }
    return this.viewTicket(ticket);
  }

  addTicketMessage(actor: Actor, id: string, body: string) {
    const ticket = this.tickets.find((item) => item.id === id || item.number === id);
    if (!ticket) throw new HttpError(404, "NOT_FOUND", "Ticket not found.");
    const staff = actor.role === "ADMIN" || actor.role === "SUPER_ADMIN";
    if (ticket.userId !== actor.id && !staff) throw new HttpError(403, "FORBIDDEN", "You cannot reply to this ticket.");
    ticket.messages.push({
      id: randomUUID(),
      authorName: staff && ticket.userId !== actor.id ? "Support" : actor.name,
      authorRole: staff && ticket.userId !== actor.id ? "SUPPORT" : actor.role,
      body,
      createdAt: this.now(),
    });
    ticket.updatedAt = this.now();
    if (staff && ticket.status === "OPEN") ticket.status = "IN_PROGRESS";
    return this.viewTicket(ticket);
  }

  setTicketStatus(actor: Actor, id: string, status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED") {
    this.assertStaff(actor);
    const ticket = this.tickets.find((item) => item.id === id || item.number === id);
    if (!ticket) throw new HttpError(404, "NOT_FOUND", "Ticket not found.");
    ticket.status = status;
    ticket.updatedAt = this.now();
    this.audit(actor, "ticket.status", `${ticket.number}:${status}`);
    return this.viewTicket(ticket);
  }

  createReview(actor: Actor, input: { productId: string; rating: number; comment: string }) {
    const bought = this.orders.some(
      (order) => order.userId === actor.id && order.status === "DELIVERED" && order.items.some((item) => item.productId === input.productId),
    );
    if (!bought) throw new HttpError(403, "REVIEW_NOT_ALLOWED", "You can review a product after its demo order is delivered.");
    if (this.reviews.some((review) => review.userId === actor.id && review.productId === input.productId)) {
      throw new HttpError(409, "REVIEW_EXISTS", "You already reviewed this product.");
    }
    this.reviews.push({
      id: randomUUID(),
      productId: input.productId,
      userId: actor.id,
      author: actor.name,
      rating: input.rating,
      comment: input.comment,
      createdAt: this.now(),
    });
    return this.reviewViews(input.productId);
  }

  openDispute(actor: Actor, orderId: string, reason: string) {
    const order = this.mustOrder(orderId);
    this.assertOwner(order, actor, null);
    if (!["DELIVERED", "AWAITING_SELLER", "MANUAL_REVIEW"].includes(order.status)) {
      throw new HttpError(409, "DISPUTE_NOT_ALLOWED", "This order cannot be disputed.");
    }
    const dispute: DisputeRecord = {
      id: randomUUID(),
      orderId: order.id,
      userId: actor.id,
      reason,
      status: "OPEN",
      openedBy: actor.name,
      createdAt: this.now(),
    };
    this.disputes.push(dispute);
    this.audit(actor, "dispute.open", order.number);
    return this.viewDispute(dispute);
  }

  sellerDashboard(actor: Actor) {
    const seller = this.mustOwnSeller(actor);
    const items = this.sellerOrderItems(seller.id);
    const delivered = items.filter((item) => item.order.status === "DELIVERED");
    const salesMinor = delivered.reduce((sum, item) => sum + item.item.lineTotalMinor, 0);
    const relevant = items.filter((item) => item.order.status !== "PENDING_PAYMENT" && item.order.status !== "CANCELLED");
    const fulfillmentRate = relevant.length ? Math.round((delivered.length / relevant.length) * 1000) / 10 : 0;
    const rows = this.sellerActivity(seller.id);
    const end = Date.parse(this.now());
    const day = 24 * 60 * 60 * 1000;
    const currentWindow = this.windowCounts(rows, end - 30 * day, end);
    const previousWindow = this.windowCounts(rows, end - 60 * day, end - 30 * day);
    const publicSeller = this.publicSeller(seller);
    return {
      seller: publicSeller,
      salesMinor,
      orderCount: new Set(items.map((item) => item.order.id)).size,
      fulfillmentRate,
      pendingMinor: this.balance(`seller_pending:${seller.id}`, "liability"),
      availableMinor: this.balance(`seller_available:${seller.id}`, "liability"),
      heldMinor: this.balance(`seller_payout_hold:${seller.id}`, "liability"),
      paidMinor: this.payouts.filter((payout) => payout.sellerId === seller.id && payout.status === "PAID").reduce((sum, payout) => sum + payout.amountMinor, 0),
      series: this.seriesFor(items.map((item) => item.order)),
      topProducts: this.topProducts(delivered.map((item) => item.item)),
      statusCounts: this.statusCounts(items.map((item) => item.order)),
      recentOrders: this.uniqueOrders(items.map((item) => item.order)).slice(0, 6).map((order) => this.viewOrder(order)),
      openRequestCount: rows.filter((row) => row.status === "PENDING").length,
      requestCount: rows.filter((row) => row.status === "PENDING").length,
      completedCount: rows.filter((row) => row.status === "COMPLETED").length,
      canceledCount: rows.filter((row) => row.status === "CANCELED").length,
      rating: publicSeller.rating,
      reviewCount: publicSeller.reviewCount,
      deltas: {
        requests: this.periodDelta(currentWindow.requests, previousWindow.requests),
        completed: this.periodDelta(currentWindow.completed, previousWindow.completed),
        canceled: this.periodDelta(currentWindow.canceled, previousWindow.canceled),
        total: this.periodDelta(currentWindow.total, previousWindow.total),
        completion: this.periodDelta(currentWindow.completion, previousWindow.completion),
      },
      sparks: {
        requests: this.spark(rows, end, "PENDING"),
        completed: this.spark(rows, end, "COMPLETED"),
        canceled: this.spark(rows, end, "CANCELED"),
        rating: this.spark(rows, end, "COMPLETED"),
      },
      recent: rows.slice(0, 8),
      activity: rows,
      performance: currentWindow,
      topRequestProducts: this.topActivity(rows, end),
    };
  }

  sellerCustomers(actor: Actor) {
    const seller = this.mustOwnSeller(actor);
    const map = new Map<string, { contact: string; orders: number; lastAt: string; firstAt: string; spentMinor: number }>();
    for (const row of this.sellerActivity(seller.id)) {
      const key = row.contact.toLowerCase();
      const spent = row.status === "COMPLETED" && row.source === "order" ? row.amountMinor : 0;
      const current = map.get(key);
      if (!current) map.set(key, { contact: row.contact, orders: 1, lastAt: row.createdAt, firstAt: row.createdAt, spentMinor: spent });
      else {
        current.orders += 1;
        current.spentMinor += spent;
        if (row.createdAt > current.lastAt) current.lastAt = row.createdAt;
        if (row.createdAt < current.firstAt) current.firstAt = row.createdAt;
      }
    }
    return [...map.values()].map((group) => {
      const meta = this.customerMeta.get(`${seller.id}:${group.contact.toLowerCase()}`);
      return { ...group, blocked: meta?.blocked ?? false, note: meta?.note ?? "" };
    }).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
  }

  sellerProducts(actor: Actor) {
    const seller = this.mustOwnSeller(actor);
    return this.products.filter((product) => product.sellerId === seller.id).map((product) => this.sellerListing(product));
  }

  sellerProduct(actor: Actor, id: string) {
    const product = this.mustProduct(id);
    if (product.sellerId !== actor.sellerId && actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") {
      throw new HttpError(403, "FORBIDDEN", "You can only edit your own listings.");
    }
    return this.sellerListing(product);
  }

  deleteProduct(actor: Actor, id: string) {
    const product = this.mustProduct(id);
    if (product.sellerId !== actor.sellerId && actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") {
      throw new HttpError(403, "FORBIDDEN", "You can only remove your own listings.");
    }
    if (product.status === "DRAFT" || product.status === "PENDING_REVIEW" || product.status === "REJECTED") {
      this.products = this.products.filter((item) => item.id !== product.id);
      this.audit(actor, "listing.delete", product.slug);
      return { id: product.id, removed: true };
    }
    product.status = "SUSPENDED";
    this.audit(actor, "listing.hide", product.slug);
    return { id: product.id, removed: false, status: product.status };
  }

  sellerCreateOrderRequest(actor: Actor, input: { productId: string; variantId: string; quantity: number; email?: string; telegram?: string; note?: string }) {
    return this.exclusive(() => {
      const seller = this.mustOwnSeller(actor);
      const email = input.email?.trim() || undefined;
      const telegram = input.telegram?.trim() || undefined;
      const note = input.note?.trim() || undefined;
      if (!email && !telegram) throw new HttpError(400, "CONTACT_REQUIRED", "Enter an email address or a Telegram handle.");
      const product = this.mustProduct(input.productId);
      if (product.sellerId !== seller.id) throw new HttpError(403, "FORBIDDEN", "You can only request your own products.");
      if (product.status !== "ACTIVE" && product.status !== "PENDING_REVIEW") throw new HttpError(409, "LISTING_NOT_READY", "Choose an active or in-review listing.");
      const variant = product.variants.find((item) => item.id === input.variantId) ?? product.variants[0];
      if (!variant) throw new HttpError(404, "VARIANT_NOT_FOUND", "Variant not found.");
      const quantity = input.quantity;
      const unit = variant.priceMinor;
      const line = unit * quantity;
      const request: OrderRequestRecord = {
        id: randomUUID(),
        number: `REQ-${++this.requestSeq}`,
        userId: actor.id,
        email,
        telegram,
        note,
        status: "AWAITING_CONTACT",
        currency: "USD",
        items: [{
          id: randomUUID(),
          productId: product.id,
          slug: product.slug,
          title: product.title,
          variantName: variant.name,
          sellerName: seller.name,
          sellerId: seller.id,
          quantity,
          unitPriceMinor: unit,
          lineTotalMinor: line,
          monogram: product.monogram,
          accent: product.accent,
        }],
        subtotalMinor: line,
        discountMinor: 0,
        feeMinor: 0,
        feeBps: 0,
        totalMinor: line,
        createdAt: this.now(),
      };
      this.orderRequests.push(request);
      this.audit(actor, "order-request.seller-create", request.number);
      return this.viewOrderRequest(request);
    });
  }

  sellerUpdateOrderRequest(actor: Actor, id: string, status: "IN_PROGRESS" | "COMPLETED" | "CANCELED") {
    const seller = this.mustOwnSeller(actor);
    const request = this.orderRequests.find((item) => item.id === id || item.number === id);
    if (!request || !request.items.some((item) => item.sellerId === seller.id)) {
      throw new HttpError(404, "NOT_FOUND", "Order request not found for this store.");
    }
    request.status = status;
    request.updatedAt = this.now();
    this.audit(actor, "order-request.status", `${request.number}:${status}`);
    return this.viewOrderRequest(request);
  }

  sellerCustomer(actor: Actor, contact: string) {
    const seller = this.mustOwnSeller(actor);
    const key = contact.trim().toLowerCase();
    const rows = this.sellerActivity(seller.id).filter((row) => row.contact.toLowerCase() === key);
    if (!rows.length) throw new HttpError(404, "NOT_FOUND", "No orders for that contact.");
    const meta = this.customerMeta.get(`${seller.id}:${key}`);
    const spent = rows.filter((row) => row.status === "COMPLETED" && row.source === "order").reduce((sum, row) => sum + row.amountMinor, 0);
    return {
      contact: rows[0]!.contact,
      orders: rows,
      orderCount: rows.length,
      spentMinor: spent,
      averageMinor: rows.length ? Math.round(spent / rows.filter((row) => row.status === "COMPLETED").length || rows.length) : 0,
      firstAt: [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]!.createdAt,
      lastAt: rows[0]!.createdAt,
      note: meta?.note ?? "",
      blocked: meta?.blocked ?? false,
    };
  }

  sellerUpdateCustomer(actor: Actor, input: { contact: string; note?: string; blocked?: boolean }) {
    const seller = this.mustOwnSeller(actor);
    const key = input.contact.trim().toLowerCase();
    if (!this.sellerActivity(seller.id).some((row) => row.contact.toLowerCase() === key)) {
      throw new HttpError(404, "NOT_FOUND", "No orders for that contact.");
    }
    const current = this.customerMeta.get(`${seller.id}:${key}`) ?? { note: "", blocked: false };
    const next = {
      note: input.note === undefined ? current.note : input.note.slice(0, 300),
      blocked: input.blocked === undefined ? current.blocked : input.blocked,
    };
    this.customerMeta.set(`${seller.id}:${key}`, next);
    return { contact: input.contact.trim(), ...next };
  }

  createProduct(actor: Actor, input: ProductDraft) {
    const seller = this.mustOwnSeller(actor);
    if (seller.status !== "APPROVED") throw new HttpError(403, "SELLER_NOT_APPROVED", "The seller account is not approved.");
    if (!this.kindEnabled(input.kind) || !this.categoryEnabled(input.categorySlug)) {
      throw new HttpError(403, "CATEGORY_DISABLED", "Phone numbers and virtual cards stay disabled until a licensed provider is approved.");
    }
    const slug = `${slugify(input.title)}-${randomBytes(2).toString("hex")}`;
    const product: ProductRecord = {
      id: randomUUID(),
      slug,
      title: input.title,
      categorySlug: input.categorySlug,
      kind: input.kind,
      platform: input.platform,
      sellerId: seller.id,
      summary: input.summary,
      description: input.description,
      delivery: input.delivery,
      regions: [input.region],
      tags: input.tags?.length ? input.tags : ["new"],
      monogram: input.platform.slice(0, 2).toUpperCase(),
      accent: "#FF00C8",
      gradient: ["#241033", "#10131f"],
      status: input.publish === false ? "DRAFT" : "PENDING_REVIEW",
      variants: [{ id: randomUUID(), name: input.variantName, priceMinor: input.priceMinor, region: input.region }],
      faqs: this.demoMode ? [{ q: "Is this live?", a: "No. Seller-submitted demo listings stay in review until an admin approves them." }] : [],
      deliveryNotes: this.demoMode
        ? ["Demo inventory only."]
        : [input.delivery === "INSTANT" ? "Delivered to your account after the order is confirmed." : "The seller contacts you to arrange delivery after your order request."],
      createdAt: this.now(),
    };
    if (!this.allCategoryMeta().some((category) => category.slug === input.categorySlug)) {
      throw new HttpError(400, "CATEGORY_INVALID", "Unknown category.");
    }
    this.products.push(product);
    this.audit(actor, "listing.create", product.slug);
    return this.summarize(product);
  }

  /** Checks permission and the per-product limit, and returns the storage key for a new image. */
  reserveProductImage(actor: Actor, productId: string, contentType: ImageType) {
    const product = this.editableProduct(actor, productId);
    if ((product.images ?? []).length >= PRODUCT_IMAGE_LIMIT) {
      throw new HttpError(409, "IMAGE_LIMIT", `A product can have up to ${PRODUCT_IMAGE_LIMIT} images.`);
    }
    const id = randomUUID();
    return { id, key: `products/${product.id}/${id}.${IMAGE_EXTENSIONS[contentType]}` };
  }

  attachProductImage(actor: Actor, productId: string, input: { id: string; key: string; contentType: ImageType; sizeBytes: number }) {
    const product = this.editableProduct(actor, productId);
    const images = product.images ?? [];
    if (images.length >= PRODUCT_IMAGE_LIMIT) throw new HttpError(409, "IMAGE_LIMIT", `A product can have up to ${PRODUCT_IMAGE_LIMIT} images.`);
    if (!input.key.startsWith(`products/${product.id}/${input.id}.`)) throw new HttpError(400, "IMAGE_KEY", "Image does not belong to this product.");
    product.images = [...images, { ...input, createdAt: this.now() }];
    this.resubmitAfterSellerEdit(actor, product);
    this.audit(actor, "product.image.add", product.id);
    return this.summarize(product).images;
  }

  removeProductImage(actor: Actor, productId: string, imageId: string) {
    const product = this.editableProduct(actor, productId);
    const image = (product.images ?? []).find((item) => item.id === imageId);
    if (!image) throw new HttpError(404, "NOT_FOUND", "Image not found.");
    product.images = (product.images ?? []).filter((item) => item.id !== imageId);
    this.resubmitAfterSellerEdit(actor, product);
    this.audit(actor, "product.image.remove", product.id);
    return { key: image.key, images: this.summarize(product).images };
  }

  private editableProduct(actor: Actor, productId: string) {
    const product = this.mustProduct(productId);
    const staff = actor.role === "ADMIN" || actor.role === "SUPER_ADMIN";
    if (!staff && (!actor.sellerId || product.sellerId !== actor.sellerId)) throw new HttpError(403, "FORBIDDEN", "You can only edit your own listings.");
    return product;
  }

  /** Public listing content changed by a seller goes back to review. */
  private resubmitAfterSellerEdit(actor: Actor, product: ProductRecord) {
    const staff = actor.role === "ADMIN" || actor.role === "SUPER_ADMIN";
    if (!staff && product.status === "ACTIVE") product.status = "PENDING_REVIEW";
  }

  updateProduct(actor: Actor, id: string, input: Partial<ProductDraft>) {
    const product = this.mustProduct(id);
    const staff = actor.role === "ADMIN" || actor.role === "SUPER_ADMIN";
    if (!staff && product.sellerId !== actor.sellerId) throw new HttpError(403, "FORBIDDEN", "You can only edit your own listings.");
    if (input.title) product.title = input.title;
    if (input.summary) product.summary = input.summary;
    if (input.description) product.description = input.description;
    if (input.priceMinor && product.variants[0]) product.variants[0].priceMinor = input.priceMinor;
    if (input.delivery) product.delivery = input.delivery;
    if (input.categorySlug && this.categoryEnabled(input.categorySlug)) product.categorySlug = input.categorySlug;
    if (input.kind && this.kindEnabled(input.kind)) product.kind = input.kind;
    if (input.tags) product.tags = input.tags.length ? input.tags : product.tags;
    if (input.variantName && product.variants[0]) product.variants[0].name = input.variantName;
    if (input.publish === true && product.status !== "ACTIVE") product.status = "PENDING_REVIEW";
    if (input.publish === false && product.status === "ACTIVE") product.status = "SUSPENDED";
    if (input.publish === false && product.status === "PENDING_REVIEW") product.status = "DRAFT";
    if (staff && input.status) {
      if (input.status === "ACTIVE" && !this.categoryEnabled(product.categorySlug)) throw new HttpError(403, "CATEGORY_DISABLED", "Phone numbers and virtual cards stay disabled until a licensed provider is approved.");
      product.status = input.status;
    }
    this.audit(actor, "listing.update", product.slug);
    return this.summarize(product);
  }

  sellerInventory(actor: Actor) {
    const seller = this.mustOwnSeller(actor);
    return this.units.filter((unit) => unit.sellerId === seller.id).map((unit) => this.maskUnit(unit));
  }

  addInventory(actor: Actor, input: { productId: string; variantId: string; payload: string }) {
    const product = this.mustProduct(input.productId);
    if (product.sellerId !== actor.sellerId && actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") {
      throw new HttpError(403, "FORBIDDEN", "You can only add inventory to your own listings.");
    }
    const variant = product.variants.find((item) => item.id === input.variantId);
    if (!variant) throw new HttpError(404, "VARIANT_NOT_FOUND", "Variant not found.");
    this.assertPayloadAllowed(product, input.payload);
    const sealed = this.box.encrypt(input.payload);
    const unit: UnitRecord = {
      id: randomUUID(),
      productId: product.id,
      variantId: variant.id,
      sellerId: product.sellerId,
      state: "AVAILABLE",
      ...sealed,
      revealed: false,
    };
    this.units.push(unit);
    this.audit(actor, "inventory.add", unit.id);
    return this.maskUnit(unit);
  }

  sellerOrders(actor: Actor) {
    const seller = this.mustOwnSeller(actor);
    return this.uniqueOrders(this.sellerOrderItems(seller.id).map((item) => item.order)).map((order) => this.viewOrder(order));
  }

  fulfillOrder(actor: Actor, orderId: string) {
    return this.exclusive(() => {
      const seller = this.mustOwnSeller(actor);
      const order = this.mustOrder(orderId);
      const mine = order.items.filter((item) => item.sellerId === seller.id && item.delivery === "MANUAL");
      if (!mine.length) throw new HttpError(403, "FORBIDDEN", "This order has no manual items for your seller account.");
      if (order.status !== "AWAITING_SELLER" && order.status !== "FULFILLING") {
        throw new HttpError(409, "ORDER_NOT_READY", "This order is not waiting for fulfillment.");
      }
      for (const item of mine) this.markFulfilled(item);
      this.finishIfComplete(order);
      this.audit(actor, "order.fulfill", order.number);
      return this.viewOrder(order);
    });
  }

  sellerEarnings(actor: Actor) {
    const dashboard = this.sellerDashboard(actor);
    const seller = this.mustOwnSeller(actor);
    const entries = this.ledger
      .filter((tx) => tx.lines.some((line) => line.account.endsWith(seller.id)))
      .map((tx) => ({ id: tx.id, memo: tx.memo, createdAt: tx.createdAt, amountMinor: this.signedForSeller(tx, seller.id) }));
    return { ...dashboard, entries };
  }

  sellerPayouts(actor: Actor) {
    const seller = this.mustOwnSeller(actor);
    return this.payouts.filter((payout) => payout.sellerId === seller.id).map((payout) => this.viewPayout(payout));
  }

  requestPayout(actor: Actor, amountMinor: number) {
    return this.exclusive(() => {
      const seller = this.mustOwnSeller(actor);
      const available = this.balance(`seller_available:${seller.id}`, "liability");
      if (amountMinor > available) throw new HttpError(400, "INSUFFICIENT_BALANCE", "Payout exceeds available earnings.");
      this.post({
        memo: `Payout hold for ${seller.name}`,
        lines: [
          { account: `seller_available:${seller.id}`, accountType: "liability", direction: "DEBIT", amountMinor },
          { account: `seller_payout_hold:${seller.id}`, accountType: "liability", direction: "CREDIT", amountMinor },
        ],
      });
      const payout: PayoutRecord = { id: randomUUID(), sellerId: seller.id, amountMinor, status: "PENDING", createdAt: this.now() };
      this.payouts.push(payout);
      this.audit(actor, "payout.request", payout.id);
      return this.viewPayout(payout);
    });
  }

  sellerReviews(actor: Actor) {
    const seller = this.mustOwnSeller(actor);
    const ids = new Set(this.products.filter((product) => product.sellerId === seller.id).map((product) => product.id));
    return this.reviews.filter((review) => ids.has(review.productId)).map((review) => ({ ...review, productTitle: this.mustProduct(review.productId).title }));
  }

  sellerSettings(actor: Actor) {
    const seller = this.mustOwnSeller(actor);
    return { name: seller.name, businessName: seller.businessName, country: seller.country, bio: seller.bio, status: seller.status, verification: seller.verification };
  }

  updateSellerSettings(actor: Actor, input: { bio?: string; businessName?: string }) {
    const seller = this.mustOwnSeller(actor);
    if (input.bio) seller.bio = input.bio;
    if (input.businessName) seller.businessName = input.businessName;
    return this.sellerSettings(actor);
  }

  applyOnboarding(actor: Actor, input: { businessName: string; country: string; bio: string }) {
    if (!this.allowSellerRegistration) throw new HttpError(403, "REGISTRATION_CLOSED", "Seller registration is turned off.");
    if (actor.sellerId || this.sellers.some((seller) => seller.userId === actor.id)) {
      throw new HttpError(409, "SELLER_EXISTS", "This account already has a seller profile.");
    }
    const seller: SellerRecord = {
      id: randomUUID(),
      userId: actor.id,
      slug: slugify(input.businessName),
      name: input.businessName,
      businessName: input.businessName,
      country: input.country,
      bio: input.bio,
      status: "PENDING",
      platformOwned: false,
      memberSince: this.now(),
      verification: "PENDING",
    };
    this.sellers.push(seller);
    const user = this.mustUser(actor.id);
    user.sellerId = seller.id;
    this.audit(actor, "seller.apply", seller.slug);
    return { status: seller.status, message: "Application submitted. An admin must approve it before you can publish listings." };
  }

  adminAnalytics(actor: Actor) {
    this.assertStaff(actor);
    const paid = this.orders.filter((order) => this.paymentFor(order)?.status === "SUCCEEDED" || this.paymentFor(order)?.status === "REFUNDED");
    return {
      gmvMinor: paid.reduce((sum, order) => sum + order.totalMinor, 0),
      orderCount: this.orders.length,
      activeSellers: this.sellers.filter((seller) => seller.status === "APPROVED" && !seller.platformOwned).length,
      customerCount: this.users.filter((user) => user.role === "CUSTOMER").length,
      platformRevenueMinor: this.balance("platform_revenue", "income") + this.balance("platform_fee_income", "income"),
      series: this.seriesFor(this.orders),
      statusCounts: this.statusCounts(this.orders),
      categoryCounts: categoryMeta.map((category) => {
        const lines = this.orders.flatMap((order) => order.items.filter((item) => this.products.find((product) => product.id === item.productId)?.categorySlug === category.slug && order.status === "DELIVERED"));
        return { name: category.name, count: lines.length, gmvMinor: lines.reduce((sum, item) => sum + item.lineTotalMinor, 0) };
      }),
      topSellers: this.topSellers(),
      recentOrders: [...this.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map((order) => this.viewOrder(order)),
      system: this.systemStatus(),
      books: this.trialBalance(),
    };
  }

  adminUsers(actor: Actor) {
    this.assertStaff(actor);
    return this.users.map((user) => ({ ...this.publicUser(user), status: user.status, createdAt: user.createdAt }));
  }

  setUserStatus(actor: Actor, userId: string, status: "ACTIVE" | "SUSPENDED") {
    this.assertStaff(actor);
    const user = this.mustUser(userId);
    if (user.role === "SUPER_ADMIN") throw new HttpError(403, "FORBIDDEN", "This account cannot be changed here.");
    user.status = status;
    this.audit(actor, `user.${status.toLowerCase()}`, user.email);
    return { id: user.id, status: user.status };
  }

  adminSellers(actor: Actor) {
    this.assertStaff(actor);
    return this.sellers.map((seller) => ({ id: seller.id, ...this.publicSeller(seller), verification: seller.verification, userId: seller.userId }));
  }

  setSellerStatus(actor: Actor, sellerId: string, status: SellerStatus) {
    this.assertStaff(actor);
    const seller = this.mustSeller(sellerId);
    seller.status = status;
    seller.verification = status === "APPROVED" ? "APPROVED" : seller.verification;
    if (seller.userId) {
      const user = this.mustUser(seller.userId);
      if (status === "APPROVED") {
        user.role = user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? user.role : "SELLER";
        user.sellerId = seller.id;
        user.mfaEnabled = true;
      }
      if (status === "SUSPENDED") {
        for (const product of this.products.filter((item) => item.sellerId === seller.id && item.status === "ACTIVE")) product.status = "SUSPENDED";
      }
    }
    this.audit(actor, `seller.${status.toLowerCase()}`, seller.slug);
    return { id: seller.id, status: seller.status };
  }

  adminProducts(actor: Actor) {
    this.assertStaff(actor);
    return this.products.map((product) => this.sellerListing(product));
  }

  moderateProduct(actor: Actor, productId: string, decision: "ACTIVE" | "REJECTED" | "SUSPENDED") {
    this.assertStaff(actor);
    const product = this.mustProduct(productId);
    product.status = decision;
    this.audit(actor, `listing.${decision.toLowerCase()}`, product.slug);
    return this.summarize(product);
  }

  adminNav(actor: Actor) {
    this.assertStaff(actor);
    return {
      sellers: this.sellers.length,
      products: this.products.length,
      customers: this.users.filter((user) => user.role === "CUSTOMER").length,
      openOrders: this.orderRequests.filter((request) => request.status === "AWAITING_CONTACT" || request.status === "IN_PROGRESS").length + this.orders.filter((order) => ["PAID", "FULFILLING", "AWAITING_SELLER", "MANUAL_REVIEW"].includes(order.status)).length,
    };
  }

  adminSellerRows(actor: Actor) {
    this.assertStaff(actor);
    return this.sellers.map((seller) => this.adminSellerRow(seller));
  }

  adminSeller(actor: Actor, id: string) {
    this.assertStaff(actor);
    const seller = this.sellers.find((item) => item.id === id || item.slug === id);
    if (!seller) throw new HttpError(404, "NOT_FOUND", "Seller not found.");
    const products = this.products.filter((product) => product.sellerId === seller.id).map((product) => this.sellerListing(product));
    const orders = this.sellerOrderItems(seller.id).map((item) => item.order);
    const unique = this.uniqueOrders(orders).map((order) => this.viewOrder(order));
    const requests = this.orderRequests.filter((request) => request.items.some((item) => item.sellerId === seller.id)).map((request) => this.viewOrderRequest(request));
    return { ...this.adminSellerRow(seller), products, orders: unique, requests, activity: this.audits.filter((entry) => entry.target === seller.slug || entry.target.includes(seller.slug)).slice(-8).reverse() };
  }

  async adminCreateSeller(actor: Actor, input: { name: string; storeName: string; email?: string; password?: string; telegram?: string; bio?: string; note?: string; status: SellerStatus }) {
    this.assertStaff(actor);
    const email = input.email?.trim().toLowerCase() ?? "";
    if (!email) throw new HttpError(400, "EMAIL_REQUIRED", "Enter an email address.");
    if (!input.password || input.password.length < 8) throw new HttpError(400, "PASSWORD_REQUIRED", "Enter a password of at least 8 characters.");
    if (this.users.some((user) => user.email === email)) throw new HttpError(409, "EMAIL_TAKEN", "That email already has an account.");
    const sellerId = randomUUID();
    const userId = randomUUID();
    const approved = input.status === "APPROVED";
    this.users.push({
      id: userId,
      email,
      passwordHash: await hashPassword(input.password),
      name: input.name.trim(),
      role: approved ? "SELLER" : "CUSTOMER",
      emailVerified: true,
      mfaEnabled: approved,
      status: "ACTIVE",
      sellerId: approved ? sellerId : undefined,
      createdAt: this.now(),
    });
    const seller: SellerRecord = {
      id: sellerId,
      userId,
      slug: slugify(input.storeName) || `store-${sellerId.slice(0, 6)}`,
      name: input.storeName.trim(),
      businessName: input.storeName.trim(),
      country: "",
      bio: input.bio?.trim() || "",
      status: input.status,
      platformOwned: false,
      memberSince: this.now(),
      verification: approved ? "APPROVED" : "PENDING",
      telegram: input.telegram?.trim() || undefined,
      note: input.note?.trim() || undefined,
    };
    this.sellers.push(seller);
    this.audit(actor, "seller.create", seller.slug);
    return this.adminSellerRow(seller);
  }

  adminUpdateSeller(actor: Actor, id: string, input: { name?: string; storeName?: string; telegram?: string; bio?: string; note?: string; status?: SellerStatus }) {
    this.assertStaff(actor);
    const seller = this.mustSeller(id);
    if (input.storeName) {
      seller.name = input.storeName.trim();
      seller.businessName = input.storeName.trim();
    }
    if (input.bio !== undefined) seller.bio = input.bio.trim();
    if (input.telegram !== undefined) seller.telegram = input.telegram.trim();
    if (input.note !== undefined) seller.note = input.note.trim();
    if (input.name && seller.userId) {
      const user = this.users.find((item) => item.id === seller.userId);
      if (user) user.name = input.name.trim();
    }
    if (input.status) this.setSellerStatus(actor, seller.id, input.status);
    this.audit(actor, "seller.update", seller.slug);
    return this.adminSellerRow(seller);
  }

  adminCustomerRows(actor: Actor) {
    this.assertStaff(actor);
    return this.users.filter((user) => user.role === "CUSTOMER").map((user) => this.adminCustomerRow(user));
  }

  adminCustomer(actor: Actor, id: string) {
    this.assertStaff(actor);
    const user = this.users.find((item) => item.id === id || item.email === decodeURIComponent(id));
    if (!user || user.role !== "CUSTOMER") throw new HttpError(404, "NOT_FOUND", "Customer not found.");
    const orders = this.orders.filter((order) => order.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((order) => this.viewOrder(order));
    const tickets = this.tickets.filter((ticket) => ticket.userId === user.id).map((ticket) => ({ id: ticket.id, number: ticket.number, subject: ticket.subject, status: ticket.status }));
    return { ...this.adminCustomerRow(user), orders, tickets };
  }

  async adminCreateCustomer(actor: Actor, input: { name: string; email?: string; password?: string; note?: string; status: "ACTIVE" | "SUSPENDED"; emailVerified?: boolean }) {
    this.assertStaff(actor);
    const email = input.email?.trim().toLowerCase() ?? "";
    if (!email) throw new HttpError(400, "EMAIL_REQUIRED", "Enter an email address.");
    if (!input.password || input.password.length < 8) throw new HttpError(400, "PASSWORD_REQUIRED", "Enter a password of at least 8 characters.");
    if (this.users.some((user) => user.email === email)) throw new HttpError(409, "EMAIL_TAKEN", "That email already has an account.");
    const user: UserRecord = {
      id: randomUUID(),
      email,
      passwordHash: await hashPassword(input.password),
      name: input.name.trim(),
      role: "CUSTOMER",
      emailVerified: Boolean(input.emailVerified),
      mfaEnabled: false,
      status: input.status,
      note: input.note?.trim() || undefined,
      createdAt: this.now(),
    };
    this.users.push(user);
    this.audit(actor, "customer.create", user.email);
    return this.adminCustomerRow(user);
  }

  async adminUpdateCustomer(actor: Actor, id: string, input: { name?: string; note?: string; status?: "ACTIVE" | "SUSPENDED"; emailVerified?: boolean; password?: string }) {
    this.assertStaff(actor);
    const user = this.mustUser(id);
    if (user.role !== "CUSTOMER") throw new HttpError(403, "FORBIDDEN", "This form updates customer accounts.");
    if (input.name) user.name = input.name.trim();
    if (input.note !== undefined) user.note = input.note.trim();
    if (input.status) user.status = input.status;
    if (input.emailVerified !== undefined) user.emailVerified = input.emailVerified;
    if (input.password) {
      if (input.password.length < 8) throw new HttpError(400, "PASSWORD_REQUIRED", "Enter a password of at least 8 characters.");
      user.passwordHash = await hashPassword(input.password);
    }
    this.audit(actor, "customer.update", user.email);
    return this.adminCustomerRow(user);
  }

  adminCategories(actor: Actor) {
    this.assertStaff(actor);
    return this.allCategoryMeta().map((category) => {
      const pref = this.categoryPrefs.get(category.slug);
      const products = this.products.filter((product) => product.categorySlug === category.slug);
      const locked = category.slug === "phone-numbers" || category.slug === "virtual-cards";
      return {
        slug: category.slug,
        name: pref?.name || category.name,
        description: pref?.description || category.description,
        icon: category.icon,
        productCount: products.length,
        activeCount: products.filter((product) => product.status === "ACTIVE").length,
        available: this.categoryEnabled(category.slug),
        homepage: pref?.homepage !== false,
        featured: pref?.featured ?? false,
        locked,
        builtin: categoryMeta.some((item) => item.slug === category.slug),
      };
    });
  }

  adminSaveCategory(actor: Actor, input: { slug?: string; name: string; description?: string; homepage: boolean; featured: boolean; hidden: boolean }) {
    this.assertStaff(actor);
    const slug = (input.slug || slugify(input.name)).toLowerCase();
    if (slug === "phone-numbers" || slug === "virtual-cards") throw new HttpError(403, "CATEGORY_DISABLED", "Phone numbers and virtual cards stay disabled until a licensed provider is approved.");
    const existing = this.allCategoryMeta().find((category) => category.slug === slug);
    if (!existing) {
      this.extraCategories.push({ slug, name: input.name.trim(), description: input.description?.trim() || "", icon: "accounts" });
    }
    this.categoryPrefs.set(slug, { name: input.name.trim(), description: input.description?.trim() || "", homepage: input.homepage, featured: input.featured, hidden: input.hidden });
    this.audit(actor, "category.save", slug);
    return this.adminCategories(actor).find((category) => category.slug === slug);
  }

  adminDeleteCategory(actor: Actor, slug: string) {
    this.assertStaff(actor);
    if (categoryMeta.some((category) => category.slug === slug)) throw new HttpError(409, "CATEGORY_BUILTIN", "Built-in categories stay in the catalog. Hide one instead of deleting it.");
    if (this.products.some((product) => product.categorySlug === slug)) throw new HttpError(409, "CATEGORY_IN_USE", "Move the products out of this category before deleting it.");
    this.extraCategories = this.extraCategories.filter((category) => category.slug !== slug);
    this.categoryPrefs.delete(slug);
    this.audit(actor, "category.delete", slug);
    return { slug, removed: true };
  }

  adminProduct(actor: Actor, id: string) {
    this.assertStaff(actor);
    return this.sellerListing(this.mustProduct(id));
  }

  async adminCreateProduct(actor: Actor, sellerId: string, input: ProductDraft, status: ListingStatus) {
    this.assertStaff(actor);
    const seller = this.mustSeller(sellerId);
    const sellerActor: Actor = { id: actor.id, email: actor.email, name: actor.name, role: "SELLER", sellerId: seller.id, emailVerified: true, mfaEnabled: true };
    const created = this.createProduct(sellerActor, { ...input, publish: status !== "DRAFT" });
    const product = this.mustProduct(created.id);
    if (status === "ACTIVE") {
      if (!this.categoryEnabled(product.categorySlug)) throw new HttpError(403, "CATEGORY_DISABLED", "Phone numbers and virtual cards stay disabled until a licensed provider is approved.");
      product.status = "ACTIVE";
    } else product.status = status;
    this.audit(actor, "listing.admin-create", product.slug);
    return this.sellerListing(product);
  }

  adminDuplicateProduct(actor: Actor, id: string) {
    this.assertStaff(actor);
    const source = this.mustProduct(id);
    const copy: ProductRecord = {
      ...source,
      id: randomUUID(),
      slug: `${source.slug}-copy-${randomBytes(2).toString("hex")}`,
      title: `${source.title} copy`,
      status: "DRAFT",
      variants: source.variants.map((variant) => ({ ...variant, id: randomUUID() })),
      faqs: source.faqs.map((item) => ({ ...item })),
      deliveryNotes: [...source.deliveryNotes],
      tags: [...source.tags],
      regions: [...source.regions],
      gradient: [...source.gradient],
      images: [],
      createdAt: this.now(),
    };
    this.products.push(copy);
    this.audit(actor, "listing.duplicate", copy.slug);
    return this.sellerListing(copy);
  }

  adminInventory(actor: Actor) {
    this.assertStaff(actor);
    return this.units.map((unit) => this.maskUnit(unit));
  }

  quarantineUnit(actor: Actor, unitId: string) {
    this.assertStaff(actor);
    const unit = this.mustUnit(unitId);
    if (unit.state === "DELIVERED" || unit.revealed) {
      unit.state = "QUARANTINED";
    } else if (unit.state === "AVAILABLE" || unit.state === "RESERVED") {
      unit.state = "QUARANTINED";
      unit.reservedOrderId = undefined;
    }
    this.audit(actor, "inventory.quarantine", unit.id);
    return this.maskUnit(unit);
  }

  adminOrders(actor: Actor) {
    this.assertStaff(actor);
    return [...this.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((order) => this.viewOrder(order));
  }

  adminOrderRequests(actor: Actor) {
    this.assertStaff(actor);
    return [...this.orderRequests].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((request) => this.viewOrderRequest(request));
  }

  adminPayments(actor: Actor) {
    this.assertStaff(actor);
    return this.payments.map((payment) => ({
      ...payment,
      orderNumber: this.mustOrder(payment.orderId).number,
    }));
  }

  refundPayment(actor: Actor, paymentId: string) {
    return this.exclusive(() => {
      this.assertStaff(actor);
      const payment = this.payments.find((item) => item.id === paymentId);
      if (!payment) throw new HttpError(404, "NOT_FOUND", "Payment not found.");
      if (payment.status === "REFUNDED") throw new HttpError(409, "ALREADY_REFUNDED", "This payment is already refunded.");
      if (payment.status !== "SUCCEEDED") throw new HttpError(409, "NOT_REFUNDABLE", "Only captured payments can be refunded.");
      const order = this.mustOrder(payment.orderId);
      const related = this.ledger.filter((tx) => tx.orderId === order.id);
      for (const tx of related) {
        this.post({
          memo: `Refund reversal ${order.number}`,
          orderId: order.id,
          lines: tx.lines.map((line) => ({ ...line, direction: line.direction === "DEBIT" ? "CREDIT" : "DEBIT" })),
        });
      }
      for (const item of order.items) {
        for (const unitId of item.unitIds) {
          const unit = this.mustUnit(unitId);
          if (unit.state === "DELIVERED" || unit.revealed) unit.state = "QUARANTINED";
          else if (unit.state === "RESERVED") {
            unit.state = "AVAILABLE";
            unit.reservedOrderId = undefined;
          }
        }
      }
      payment.status = "REFUNDED";
      order.status = "REFUNDED";
      this.audit(actor, "payment.refund", order.number);
      return this.viewOrder(order);
    });
  }

  adminPayouts(actor: Actor) {
    this.assertStaff(actor);
    return this.payouts.map((payout) => this.viewPayout(payout));
  }

  decidePayout(actor: Actor, payoutId: string, decision: "PAID" | "REJECTED") {
    return this.exclusive(() => {
      this.assertStaff(actor);
      const payout = this.payouts.find((item) => item.id === payoutId);
      if (!payout || payout.status !== "PENDING") throw new HttpError(409, "PAYOUT_CLOSED", "This payout is not pending.");
      const seller = this.mustSeller(payout.sellerId);
      if (decision === "REJECTED") {
        this.post({
          memo: `Payout rejected for ${seller.name}`,
          lines: [
            { account: `seller_payout_hold:${seller.id}`, accountType: "liability", direction: "DEBIT", amountMinor: payout.amountMinor },
            { account: `seller_available:${seller.id}`, accountType: "liability", direction: "CREDIT", amountMinor: payout.amountMinor },
          ],
        });
        payout.status = "REJECTED";
      } else {
        if (this.balance("platform_cash", "asset") < payout.amountMinor) {
          throw new HttpError(409, "PAYOUT_CASH_SHORT", "Platform cash is below this payout. No bank transfer was sent.");
        }
        this.post({
          memo: `Mock payout disbursed to ${seller.name}. No live payout provider is connected.`,
          lines: [
            { account: `seller_payout_hold:${seller.id}`, accountType: "liability", direction: "DEBIT", amountMinor: payout.amountMinor },
            { account: "platform_cash", accountType: "asset", direction: "CREDIT", amountMinor: payout.amountMinor },
          ],
        });
        payout.status = "PAID";
      }
      this.audit(actor, `payout.${decision.toLowerCase()}`, payout.id);
      return this.viewPayout(payout);
    });
  }

  adminDisputes(actor: Actor) {
    this.assertStaff(actor);
    return this.disputes.map((dispute) => this.viewDispute(dispute));
  }

  resolveDispute(actor: Actor, disputeId: string, outcome: "RESOLVED" | "REJECTED", note: string) {
    this.assertStaff(actor);
    const dispute = this.disputes.find((item) => item.id === disputeId);
    if (!dispute) throw new HttpError(404, "NOT_FOUND", "Dispute not found.");
    dispute.status = outcome;
    dispute.resolution = note;
    this.audit(actor, `dispute.${outcome.toLowerCase()}`, dispute.orderId);
    return this.viewDispute(dispute);
  }

  adminSettings(actor: Actor) {
    this.assertStaff(actor);
    return { customerFeeBps: this.customerFeeBps, commissionBps: this.commissionBps, demoMode: this.demoMode, allowSellerRegistration: this.allowSellerRegistration, providers: this.providerViews() };
  }

  updateSettings(actor: Actor, input: { customerFeeBps: number; commissionBps: number }) {
    this.assertStaff(actor);
    this.customerFeeBps = input.customerFeeBps;
    this.commissionBps = input.commissionBps;
    this.audit(actor, "settings.update", `fee ${input.customerFeeBps} commission ${input.commissionBps}`);
    return this.adminSettings(actor);
  }

  updatePlatform(actor: Actor, input: { customerFeeBps: number; commissionBps: number; allowSellerRegistration: boolean }) {
    this.updateSettings(actor, input);
    this.allowSellerRegistration = input.allowSellerRegistration;
    this.audit(actor, "settings.registration", input.allowSellerRegistration ? "open" : "closed");
    return this.adminSettings(actor);
  }

  auditLog(actor: Actor) {
    this.assertStaff(actor);
    return [...this.audits].reverse();
  }

  providers(actor: Actor) {
    this.assertStaff(actor);
    return this.providerViews();
  }

  notifications(actor: Actor) {
    const orders = this.orders.filter((order) => order.userId === actor.id).slice(-5).map((order) => ({
      id: order.id,
      title: order.number,
      body: `Order is ${order.status.replaceAll("_", " ").toLowerCase()}.`,
      createdAt: order.createdAt,
    }));
    return orders;
  }

  health() {
    return {
      ok: true,
      persistence: "memory",
      demoMode: this.demoMode,
      providers: this.providerViews(),
      books: this.trialBalance(),
    };
  }

  /** Test helper: build a tiny shop without the visual catalog. */
  static async createFixture(opts: ServiceOptions = {}) {
    const service = new MarketplaceService({ ...opts, seed: false, demoMode: opts.demoMode ?? true });
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const sellerId = "10000000-0000-4000-8000-000000000002";
    const platformId = "10000000-0000-4000-8000-000000000001";
    service.sellers.push(
      { id: platformId, slug: "marketplace", name: "Marketplace Official", businessName: "Marketplace", country: "US", bio: "Platform", status: "APPROVED", platformOwned: true, memberSince: service.now(), verification: "APPROVED" },
      { id: sellerId, userId: "seller-user", slug: "premiumstore", name: "PremiumStore", businessName: "PremiumStore", country: "US", bio: "Reseller", status: "APPROVED", platformOwned: false, memberSince: service.now(), verification: "APPROVED" },
    );
    service.users.push(
      { id: "customer-user", email: "john@example.com", passwordHash, name: "John Doe", role: "CUSTOMER", emailVerified: true, mfaEnabled: false, status: "ACTIVE", createdAt: service.now() },
      { id: "seller-user", email: "seller@premiumstore.demo", passwordHash, name: "Premium Seller", role: "SELLER", emailVerified: true, mfaEnabled: true, status: "ACTIVE", sellerId, createdAt: service.now() },
      { id: "admin-user", email: "admin@demo.marketplace", passwordHash, name: "Admin", role: "ADMIN", emailVerified: true, mfaEnabled: true, status: "ACTIVE", createdAt: service.now() },
    );
    service.addCatalogProduct(fixtureProduct(sellerId), ["voucher-a"]);
    service.addCatalogProduct(
      { ...fixtureProduct(platformId), id: "prod-platform", slug: "platform-license", title: "Platform License", priceMinor: 1999, sellerSlug: "marketplace", variantId: "var-platform" },
      ["voucher-b", "voucher-c"],
    );
    const other = fixtureProduct(sellerId);
    service.addCatalogProduct(
      { ...other, id: "prod-manual", slug: "manual-key", title: "Manual Key", delivery: "MANUAL", priceMinor: 999, variantId: "var-manual" },
      ["voucher-m"],
    );
    return service;
  }

  actorByEmail(email: string): Actor {
    return this.publicUser(this.users.find((user) => user.email === email)!);
  }

  private async seedDemo() {
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const sellerUserId = "20000000-0000-4000-8000-000000000002";
    for (const seller of catalogSellers) {
      this.sellers.push({
        id: seller.id,
        userId: seller.slug === "premiumstore" ? sellerUserId : undefined,
        slug: seller.slug,
        name: seller.name,
        businessName: seller.name,
        country: seller.country,
        bio: seller.bio,
        status: "APPROVED",
        platformOwned: seller.platformOwned,
        memberSince: seller.memberSince,
        verification: "APPROVED",
      });
    }
    this.users.push(
      { id: "20000000-0000-4000-8000-000000000001", email: "john@example.com", passwordHash, name: "John Doe", role: "CUSTOMER", emailVerified: true, mfaEnabled: false, status: "ACTIVE", createdAt: "2025-11-02T00:00:00.000Z" },
      { id: sellerUserId, email: "seller@premiumstore.demo", passwordHash, name: "Premium Seller", role: "SELLER", emailVerified: true, mfaEnabled: true, status: "ACTIVE", sellerId: "10000000-0000-4000-8000-000000000002", createdAt: "2024-06-12T00:00:00.000Z" },
      { id: "20000000-0000-4000-8000-000000000003", email: "admin@demo.marketplace", passwordHash, name: "Marketplace Admin", role: "ADMIN", emailVerified: true, mfaEnabled: true, status: "ACTIVE", createdAt: "2024-03-01T00:00:00.000Z" },
    );
    for (const product of catalogProducts) this.addCatalogProduct(product);
    const john = this.actorByEmail("john@example.com");
    this.post({
      memo: "Sample refund credit. Not a stored-value top-up.",
      lines: [
        { account: "demo_funding", accountType: "expense", direction: "DEBIT", amountMinor: 1250 },
        { account: `customer_wallet:${john.id}`, accountType: "liability", direction: "CREDIT", amountMinor: 1250 },
      ],
    });
    const history: Array<{ slug: string; days: number; qty?: number }> = [
      { slug: "netflix-premium", days: 12 },
      { slug: "chatgpt-plus", days: 11 },
      { slug: "spotify-premium", days: 10 },
      { slug: "steam-wallet-10", days: 9 },
      { slug: "disney-plus", days: 8 },
      { slug: "notion-plus", days: 7 },
      { slug: "demo-office-license", days: 6 },
      { slug: "youtube-premium", days: 5 },
      { slug: "canva-pro", days: 4 },
      { slug: "valorant-points-5300", days: 3 },
      { slug: "playstation-plus", days: 2 },
      { slug: "adobe-creative-cloud", days: 1 },
    ];
    for (const entry of history) {
      const product = this.products.find((item) => item.slug === entry.slug)!;
      const variant = product.variants[0]!;
      this.frozenNow = daysAgo(entry.days);
      await this.placeOrderLocked(john, "seed-guest", { email: john.email, paymentMethod: "card", seed: { productId: product.id, variantId: variant.id, quantity: entry.qty ?? 1 } });
      const payment = [...this.payments].reverse().find((item) => item.status === "REQUIRES_ACTION");
      if (payment) await this.completePaymentLocked(payment.id, `seed:${payment.id}`);
      this.frozenNow = null;
    }
    this.reviews.push(
      { id: randomUUID(), productId: "30000000-0000-4000-8000-000000000001", userId: john.id, author: "Demo Buyer 12", rating: 5, comment: "Demo checkout completed and the voucher was labeled as a sample.", createdAt: daysAgo(6) },
      { id: randomUUID(), productId: "30000000-0000-4000-8000-000000000001", userId: "seed-reviewer", author: "Demo Buyer 4", rating: 4, comment: "Listing copy makes it clear this is not a real account.", createdAt: daysAgo(4) },
      { id: randomUUID(), productId: "30000000-0000-4000-8000-000000000005", userId: john.id, author: "John Doe", rating: 5, comment: "Payment stayed pending until the demo webhook, then the order moved to delivered.", createdAt: daysAgo(3) },
      { id: randomUUID(), productId: "30000000-0000-4000-8000-000000000012", userId: john.id, author: "John Doe", rating: 4, comment: "Region badge and stock count matched the order.", createdAt: daysAgo(2) },
    );
    this.favorites.push({ userId: john.id, productId: "30000000-0000-4000-8000-000000000001" }, { userId: john.id, productId: "30000000-0000-4000-8000-000000000002" });
    const opened = this.createTicket(john, { subject: "Need a replacement demo voucher", body: "The sample voucher is visible, but I want to check the replacement flow.", orderId: this.orders[0]?.id });
    const ticket = this.tickets.find((item) => item.id === opened.id);
    if (ticket) {
      ticket.messages.push({ id: randomUUID(), authorName: "Support", authorRole: "SUPPORT", body: "This is a demo ticket. No live entitlement was reissued. Tell us if the sample order should be refunded.", createdAt: this.now() });
      ticket.status = "IN_PROGRESS";
      ticket.updatedAt = this.now();
    }
    const delivered = this.orders.find((order) => order.status === "DELIVERED");
    if (delivered) {
      this.disputes.push({ id: randomUUID(), orderId: delivered.id, userId: john.id, reason: "Demo dispute opened to exercise the admin queue.", status: "OPEN", openedBy: john.name, createdAt: this.now() });
    }
  }

  private async placeOrderLocked(actor: Actor | null, guestId: string, input: { email: string; paymentMethod: string; seed?: { productId: string; variantId: string; quantity: number } }) {
    if (actor) {
      const user = this.mustUser(actor.id);
      if (user.status !== "ACTIVE") throw new HttpError(403, "ACCOUNT_SUSPENDED", "This account is suspended.");
    }
    const cart = input.seed
      ? { ownerKey: "seed", couponCode: undefined, items: [{ id: "seed", ...input.seed }] }
      : this.cartFor("order", actor, guestId);
    const quote = this.quoteCart(cart);
    if (!["card", "paypal", "wallet"].includes(input.paymentMethod)) {
      throw new HttpError(400, "PAYMENT_METHOD", "That payment method is not available. Crypto checkout is not part of this marketplace.");
    }
    if (!quote.items.length) throw new HttpError(400, "CART_EMPTY", "Your cart is empty.");
    for (const item of cart.items) {
      const product = this.products.find((entry) => entry.id === item.productId);
      if (product && !this.kindEnabled(product.kind)) {
        throw new HttpError(403, "CATEGORY_DISABLED", `${product.title} cannot be purchased until that provider is approved.`);
      }
    }
    for (const item of quote.items) {
      if (item.quantity > item.available) throw new HttpError(409, "INSUFFICIENT_STOCK", `${item.title} does not have enough stock.`);
    }
    if (input.paymentMethod === "wallet") {
      if (!actor) throw new HttpError(401, "AUTH_REQUIRED", "Sign in to pay with wallet balance.");
      if (this.getWallet(actor).availableMinor < quote.totalMinor) {
        throw new HttpError(400, "INSUFFICIENT_BALANCE", "Wallet balance is lower than the server total.");
      }
    }
    const priced = this.priceFromCart(cart);
    const order: OrderRecord = {
      id: randomUUID(),
      number: `ORD-${++this.orderSeq}`,
      userId: actor?.id ?? `guest:${guestId}`,
      email: actor?.email ?? input.email,
      status: "PENDING_PAYMENT",
      items: priced.lines.map((line) => {
        const cartItem = cart.items.find((item) => item.variantId === line.id)!;
        const product = this.mustProduct(cartItem.productId);
        const variant = product.variants.find((item) => item.id === line.id)!;
        const seller = this.mustSeller(product.sellerId);
        return {
          id: randomUUID(),
          productId: product.id,
          slug: product.slug,
          title: product.title,
          variantId: variant.id,
          variantName: variant.name,
          quantity: line.quantity,
          unitPriceMinor: line.unitPriceMinor,
          lineTotalMinor: line.lineTotalMinor,
          discountMinor: line.discountMinor,
          sellerNetMinor: line.sellerNetMinor,
          commissionMinor: line.commissionMinor,
          platformNetMinor: line.platformNetMinor,
          delivery: product.delivery,
          sellerId: seller.id,
          sellerName: seller.name,
          kind: product.kind,
          monogram: product.monogram,
          accent: product.accent,
          unitIds: [],
          fulfilled: false,
        };
      }),
      subtotalMinor: priced.subtotalMinor,
      discountMinor: priced.discountMinor,
      feeMinor: priced.feeMinor,
      totalMinor: priced.totalMinor,
      couponCode: priced.couponCode,
      paymentMethod: input.paymentMethod,
      createdAt: this.now(),
      releasedSellers: [],
      fulfillAttempts: 0,
    };
    const payment: PaymentRecord = {
      id: randomUUID(),
      orderId: order.id,
      provider: "mock",
      method: input.paymentMethod,
      amountMinor: order.totalMinor,
      status: "REQUIRES_ACTION",
      createdAt: this.now(),
    };
    this.orders.push(order);
    this.payments.push(payment);
    if (!input.seed) {
      cart.items = [];
      cart.couponCode = undefined;
    }
    if (input.paymentMethod === "wallet" && actor) {
      const result = await this.completePaymentLocked(payment.id, `wallet:${payment.id}`);
      return { order: result.order, paymentId: payment.id };
    }
    return { order: this.viewOrder(order), paymentId: payment.id };
  }

  private async completePaymentLocked(paymentId: string, eventId: string) {
    const seen = this.events.find((event) => event.eventId === eventId);
    const payment = this.payments.find((item) => item.id === paymentId);
    if (!payment) throw new HttpError(404, "NOT_FOUND", "Payment not found.");
    const order = this.mustOrder(payment.orderId);
    if (seen || payment.status === "SUCCEEDED") {
      return { replay: true, order: this.viewOrder(order) };
    }
    if (payment.status !== "REQUIRES_ACTION") throw new HttpError(409, "PAYMENT_CLOSED", "Payment can no longer be captured.");
    const reserved = this.reserve(order);
    payment.status = "SUCCEEDED";
    this.events.push({ eventId, paymentId, createdAt: this.now() });
    const sale = this.post(this.saleLines(order));
    order.saleTxId = sale.id;
    if (!reserved) {
      this.holdForReview(order);
      order.status = "MANUAL_REVIEW";
      return { replay: false, order: this.viewOrder(order) };
    }
    const hasManual = order.items.some((item) => item.delivery === "MANUAL");
    const hasInstant = order.items.some((item) => item.delivery === "INSTANT");
    if (this.deferFulfillment && hasInstant) {
      order.status = "FULFILLING";
      this.outbox.push({ id: randomUUID(), orderId: order.id, status: "PENDING", attempts: 0, createdAt: this.now() });
      return { replay: false, order: this.viewOrder(order) };
    }
    if (hasInstant) this.fulfillLocked(order);
    if (hasManual && order.status !== "MANUAL_REVIEW") order.status = order.items.every((item) => item.fulfilled) ? "DELIVERED" : "AWAITING_SELLER";
    if (!hasInstant && hasManual) order.status = "AWAITING_SELLER";
    return { replay: false, order: this.viewOrder(order) };
  }

  private failPayment(paymentId: string, eventId: string) {
    return this.exclusive(() => {
      if (this.events.some((event) => event.eventId === eventId)) return { replay: true };
      const payment = this.payments.find((item) => item.id === paymentId);
      if (!payment) throw new HttpError(404, "NOT_FOUND", "Payment not found.");
      if (payment.status === "REQUIRES_ACTION") payment.status = "FAILED";
      const order = this.mustOrder(payment.orderId);
      if (order.status === "PENDING_PAYMENT") order.status = "CANCELLED";
      this.events.push({ eventId, paymentId, createdAt: this.now() });
      return { replay: false, order: this.viewOrder(order) };
    });
  }

  private reserve(order: OrderRecord) {
    const picks: Array<{ item: OrderItemRecord; units: UnitRecord[] }> = [];
    for (const item of order.items) {
      const units = this.availableUnits(item.variantId).slice(0, item.quantity);
      if (units.length < item.quantity) return false;
      picks.push({ item, units });
    }
    for (const pick of picks) {
      pick.item.unitIds = pick.units.map((unit) => unit.id);
      for (const unit of pick.units) {
        unit.state = "RESERVED";
        unit.reservedOrderId = order.id;
      }
    }
    return true;
  }

  private fulfillLocked(order: OrderRecord, event?: OutboxRecord) {
    if (this.failureBudget > 0) {
      this.failureBudget -= 1;
      order.fulfillAttempts += 1;
      const record = event ?? { id: randomUUID(), orderId: order.id, status: "FAILED" as const, attempts: 0, createdAt: this.now() };
      record.attempts = order.fulfillAttempts;
      record.status = "FAILED";
      record.lastError = "Injected fulfillment failure";
      if (!event) this.outbox.push(record);
      if (order.fulfillAttempts >= 3) this.terminalFail(order);
      else order.status = "FULFILLING";
      return { ok: false as const };
    }
    for (const item of order.items.filter((entry) => entry.delivery === "INSTANT")) this.markFulfilled(item);
    this.finishIfComplete(order);
    if (event) event.status = "DONE";
    else this.outbox.push({ id: randomUUID(), orderId: order.id, status: "DONE", attempts: order.fulfillAttempts, createdAt: this.now() });
    return { ok: true as const };
  }

  private markFulfilled(item: OrderItemRecord) {
    for (const unitId of item.unitIds) {
      const unit = this.mustUnit(unitId);
      unit.state = "DELIVERED";
    }
    item.fulfilled = true;
  }

  private finishIfComplete(order: OrderRecord) {
    if (order.items.every((item) => item.fulfilled)) {
      order.status = "DELIVERED";
      this.releaseEarnings(order);
      return;
    }
    if (order.items.some((item) => item.delivery === "MANUAL" && !item.fulfilled)) order.status = "AWAITING_SELLER";
  }

  private terminalFail(order: OrderRecord) {
    for (const item of order.items) {
      for (const unitId of item.unitIds) {
        const unit = this.mustUnit(unitId);
        if (!unit.revealed && unit.state === "RESERVED") {
          unit.state = "AVAILABLE";
          unit.reservedOrderId = undefined;
        }
      }
      item.unitIds = [];
    }
    this.holdForReview(order);
    order.status = "MANUAL_REVIEW";
  }

  private holdForReview(order: OrderRecord) {
    if (this.ledger.some((tx) => tx.orderId === order.id && tx.memo.startsWith("Manual review hold"))) return;
    const sale = this.ledger.find((tx) => tx.id === order.saleTxId);
    if (!sale) return;
    const credits = sale.lines.filter((line) => line.direction === "CREDIT");
    this.post({
      memo: `Manual review hold ${order.number}`,
      orderId: order.id,
      lines: [
        ...credits.map((line) => ({ ...line, direction: "DEBIT" as const })),
        { account: "orders_unfulfilled", accountType: "liability" as const, direction: "CREDIT" as const, amountMinor: credits.reduce((sum, line) => sum + line.amountMinor, 0) },
      ],
    });
  }

  private releaseEarnings(order: OrderRecord) {
    const bySeller = new Map<string, number>();
    for (const item of order.items) {
      if (item.sellerNetMinor <= 0 || order.releasedSellers.includes(item.sellerId)) continue;
      bySeller.set(item.sellerId, (bySeller.get(item.sellerId) ?? 0) + item.sellerNetMinor);
    }
    for (const [sellerId, amountMinor] of bySeller) {
      this.post({
        memo: `Release earnings ${order.number}`,
        orderId: order.id,
        lines: [
          { account: `seller_pending:${sellerId}`, accountType: "liability", direction: "DEBIT", amountMinor },
          { account: `seller_available:${sellerId}`, accountType: "liability", direction: "CREDIT", amountMinor },
        ],
      });
      order.releasedSellers.push(sellerId);
    }
  }

  private saleLines(order: OrderRecord): Omit<LedgerTx, "id" | "createdAt"> {
    const credits: LedgerLine[] = [];
    if (order.feeMinor) credits.push({ account: "platform_fee_income", accountType: "income", direction: "CREDIT", amountMinor: order.feeMinor });
    const pending = new Map<string, number>();
    let revenue = 0;
    for (const item of order.items) {
      revenue += item.platformNetMinor;
      if (item.sellerNetMinor) pending.set(item.sellerId, (pending.get(item.sellerId) ?? 0) + item.sellerNetMinor);
    }
    if (revenue) credits.push({ account: "platform_revenue", accountType: "income", direction: "CREDIT", amountMinor: revenue });
    for (const [sellerId, amountMinor] of pending) {
      credits.push({ account: `seller_pending:${sellerId}`, accountType: "liability", direction: "CREDIT", amountMinor });
    }
    const debit: LedgerLine =
      order.paymentMethod === "wallet"
        ? { account: `customer_wallet:${order.userId}`, accountType: "liability", direction: "DEBIT", amountMinor: order.totalMinor }
        : { account: "platform_cash", accountType: "asset", direction: "DEBIT", amountMinor: order.totalMinor };
    return { memo: `Sale ${order.number}`, orderId: order.id, lines: [debit, ...credits] };
  }

  private addCatalogProduct(seed: CatalogProduct | ReturnType<typeof fixtureProduct>, payloads?: string[]) {
    const seller = this.sellers.find((item) => item.slug === ("sellerSlug" in seed ? seed.sellerSlug : "")) ?? this.sellers.find((item) => item.id === (seed as { sellerId?: string }).sellerId);
    if (!seller) throw new Error(`Missing seller for ${seed.slug}`);
    const product: ProductRecord = {
      id: seed.id,
      slug: seed.slug,
      title: seed.title,
      categorySlug: seed.categorySlug,
      kind: seed.kind,
      platform: seed.platform,
      sellerId: seller.id,
      summary: seed.summary,
      description: seed.description,
      delivery: seed.delivery,
      regions: seed.regions,
      tags: seed.tags,
      monogram: seed.monogram,
      accent: seed.accent,
      gradient: seed.gradient,
      status: "ACTIVE",
      variants: "variants" in seed ? seed.variants.map(({ units: _units, ...variant }) => variant) : [{ id: seed.variantId, name: seed.variantName, priceMinor: seed.priceMinor, region: "GLOBAL" }],
      faqs: "faqs" in seed ? seed.faqs : [],
      deliveryNotes: "deliveryNotes" in seed ? seed.deliveryNotes : [],
      createdAt: "2025-10-01T00:00:00.000Z",
    };
    this.products.push(product);
    if ("variants" in seed) {
      for (const variant of seed.variants) {
        for (let index = 0; index < variant.units; index += 1) this.sealUnit(product, variant.id, demoPayload(product, variant.name, index));
      }
    } else if (payloads) {
      for (const payload of payloads) this.sealUnit(product, seed.variantId, payload);
    }
  }

  private sealUnit(product: ProductRecord, variantId: string, payload: string) {
    const sealed = this.box.encrypt(payload);
    this.units.push({
      id: randomUUID(),
      productId: product.id,
      variantId,
      sellerId: product.sellerId,
      state: "AVAILABLE",
      revealed: false,
      ...sealed,
    });
  }

  private quoteCart(cart: CartRecord): CartQuote {
    const priced = this.priceFromCart(cart);
    return {
      items: cart.items.flatMap((item) => {
        const product = this.products.find((entry) => entry.id === item.productId && entry.status === "ACTIVE");
        const variant = product?.variants.find((entry) => entry.id === item.variantId);
        const line = priced.lines.find((entry) => entry.id === item.variantId);
        if (!product || !variant || !line) return [];
        return [{
          id: item.id,
          productId: product.id,
          slug: product.slug,
          title: product.title,
          variantId: variant.id,
          variantName: variant.name,
          sellerName: this.mustSeller(product.sellerId).name,
          quantity: item.quantity,
          unitPriceMinor: variant.priceMinor,
          lineTotalMinor: line.lineTotalMinor,
          available: this.availableUnits(variant.id).length,
          delivery: product.delivery,
          monogram: product.monogram,
          accent: product.accent,
        }];
      }),
      currency: "USD",
      subtotalMinor: priced.subtotalMinor,
      discountMinor: priced.discountMinor,
      feeMinor: priced.feeMinor,
      feeBps: this.customerFeeBps,
      totalMinor: priced.totalMinor,
      couponCode: priced.couponCode,
      couponMessage: priced.couponMessage,
    };
  }

  private priceFromCart(cart: CartRecord) {
    const inputs = cart.items.flatMap((item) => {
      const product = this.products.find((entry) => entry.id === item.productId && entry.status === "ACTIVE");
      const variant = product?.variants.find((entry) => entry.id === item.variantId);
      if (!product || !variant) return [];
      const seller = this.mustSeller(product.sellerId);
      return [{
        id: variant.id,
        sellerId: seller.id,
        platformOwned: seller.platformOwned,
        unitPriceMinor: variant.priceMinor,
        quantity: item.quantity,
      }];
    });
    return priceCart(inputs, { feeBps: this.customerFeeBps, commissionBps: this.commissionBps, coupon: cart.couponCode ? COUPONS[cart.couponCode] : undefined });
  }

  private sellerListing(product: ProductRecord) {
    return {
      ...this.summarize(product),
      description: product.description,
      variantName: product.variants[0]?.name ?? "Standard",
      createdAt: product.createdAt,
      variants: product.variants.map((variant) => ({ id: variant.id, name: variant.name, priceMinor: variant.priceMinor })),
    };
  }

  private summarize(product: ProductRecord): ProductSummary {
    const cheapest = [...product.variants].sort((a, b) => a.priceMinor - b.priceMinor)[0]!;
    const reviews = this.reviews.filter((review) => review.productId === product.id);
    const rating = reviews.length ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10 : 0;
    const salesCount = this.orders.filter((order) => order.status === "DELIVERED").flatMap((order) => order.items).filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      categorySlug: product.categorySlug,
      kind: product.kind,
      platform: product.platform,
      seller: this.publicSeller(this.mustSeller(product.sellerId)),
      summary: product.summary,
      delivery: product.delivery,
      regions: product.regions,
      tags: product.tags,
      rating,
      reviewCount: reviews.length,
      salesCount,
      monogram: product.monogram,
      accent: product.accent,
      gradient: product.gradient,
      images: (product.images ?? []).map((image) => ({ id: image.id, url: `/media/${image.key}` })),
      priceMinor: cheapest.priceMinor,
      compareAtMinor: cheapest.compareAtMinor,
      defaultVariantId: cheapest.id,
      available: this.availableUnits(cheapest.id).length,
      demo: this.demoMode,
      status: product.status,
    };
  }

  private viewOrderRequest(request: OrderRequestRecord): OrderRequestView {
    return {
      id: request.id,
      number: request.number,
      status: request.status,
      email: request.email,
      telegram: request.telegram,
      note: request.note,
      currency: request.currency,
      items: request.items.map((item) => ({ ...item })),
      subtotalMinor: request.subtotalMinor,
      discountMinor: request.discountMinor,
      feeMinor: request.feeMinor,
      feeBps: request.feeBps,
      totalMinor: request.totalMinor,
      createdAt: request.createdAt,
      demo: this.demoMode,
    };
  }

  private viewOrder(order: OrderRecord): OrderView {
    const payment = this.paymentFor(order)!;
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      currency: "USD",
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        title: item.title,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        lineTotalMinor: item.lineTotalMinor,
        delivery: item.delivery,
        sellerName: item.sellerName,
        slug: item.slug,
        monogram: item.monogram,
        accent: item.accent,
      })),
      subtotalMinor: order.subtotalMinor,
      discountMinor: order.discountMinor,
      feeMinor: order.feeMinor,
      totalMinor: order.totalMinor,
      couponCode: order.couponCode,
      paymentMethod: order.paymentMethod,
      paymentStatus: payment.status,
      paymentId: payment.id,
      createdAt: order.createdAt,
      email: order.email,
      demo: this.demoMode,
      canConfirmDemo: this.demoMode && payment.status === "REQUIRES_ACTION",
    };
  }

  private publicSeller(seller: SellerRecord): SellerPublic {
    const productIds = this.products.filter((product) => product.sellerId === seller.id).map((product) => product.id);
    const reviews = this.reviews.filter((review) => productIds.includes(review.productId));
    const salesCount = this.orders.filter((order) => order.status === "DELIVERED").flatMap((order) => order.items).filter((item) => item.sellerId === seller.id).reduce((sum, item) => sum + item.quantity, 0);
    const rating = reviews.length ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10 : 0;
    const involved = this.sellerOrderItems(seller.id).filter(({ order }) => order.status !== "CANCELLED");
    const orderedCount = new Set(involved.map(({ order }) => order.id)).size;
    const deliveredOrders = new Set(involved.filter(({ order }) => order.status === "DELIVERED").map(({ order }) => order.id)).size;
    const categories = categoryMeta
      .filter((category) => this.categoryEnabled(category.slug))
      .filter((category) => this.products.some((product) => product.sellerId === seller.id && product.status === "ACTIVE" && product.categorySlug === category.slug && this.kindEnabled(product.kind)))
      .map((category) => ({ slug: category.slug, name: category.name }));
    return {
      slug: seller.slug,
      name: seller.name,
      rating,
      reviewCount: reviews.length,
      salesCount,
      memberSince: seller.memberSince,
      status: seller.status,
      platformOwned: seller.platformOwned,
      bio: seller.bio,
      verified: seller.status === "APPROVED" && seller.verification === "APPROVED",
      categories,
      orderedCount,
      deliveredOrders,
    };
  }

  private publicUser(user: UserRecord): Actor {
    const result: Actor = { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: user.emailVerified, mfaEnabled: user.mfaEnabled };
    if (user.sellerId) result.sellerId = user.sellerId;
    return result;
  }

  private maskUnit(unit: UnitRecord) {
    const product = this.mustProduct(unit.productId);
    const variant = product.variants.find((item) => item.id === unit.variantId);
    return {
      id: unit.id,
      productId: product.id,
      productTitle: product.title,
      variantId: unit.variantId,
      variantName: variant?.name ?? "Plan",
      sellerName: this.mustSeller(unit.sellerId).name,
      state: unit.state,
      reference: `unit_••••${unit.id.slice(-4)}`,
      revealed: unit.revealed,
    };
  }

  private viewTicket(ticket: TicketRecord): TicketView {
    return { id: ticket.id, number: ticket.number, subject: ticket.subject, status: ticket.status, orderId: ticket.orderId, createdAt: ticket.createdAt, updatedAt: ticket.updatedAt, messages: ticket.messages };
  }

  private viewPayout(payout: PayoutRecord): PayoutView {
    return { id: payout.id, sellerName: this.mustSeller(payout.sellerId).name, amountMinor: payout.amountMinor, status: payout.status, createdAt: payout.createdAt };
  }

  private viewDispute(dispute: DisputeRecord): DisputeView {
    return { id: dispute.id, orderId: dispute.orderId, reason: dispute.reason, status: dispute.status, openedBy: dispute.openedBy, createdAt: dispute.createdAt, resolution: dispute.resolution };
  }

  private reviewViews(productId: string): Review[] {
    return this.reviews.filter((review) => review.productId === productId).map(({ userId: _userId, productId: _productId, ...review }) => review);
  }

  private providerViews(): ProviderView[] {
    return [
      this.paymentsEnabled
        ? { id: "payments", name: "Mock payments", kind: "PAYMENTS", mode: "MOCK", status: "READY", note: "Non-production adapter. No card is charged. Webhooks are accepted only with the demo secret." }
        : { id: "payments", name: "Online payments", kind: "PAYMENTS", mode: "MOCK", status: "NOT_CONFIGURED", note: "No payment processor is connected. Customers submit order requests and sellers arrange payment directly." },
      { id: "payouts", name: "Mock payouts", kind: "PAYOUTS", mode: "MOCK", status: "READY", note: "Non-production adapter. Approving a payout updates the ledger and does not send a bank transfer." },
      { id: "telecom", name: "Mock telecom", kind: "TELECOM", mode: "MOCK", status: "NOT_CONFIGURED", note: "No carrier credentials are configured. Numbers are not provisioned." },
      { id: "cards", name: "Mock card issuer", kind: "CARD_ISSUER", mode: "MOCK", status: "NOT_CONFIGURED", note: "No licensed issuer is connected. PAN and CVV cannot be stored." },
      { id: "accounts", name: "Manual account transfer", kind: "ACCOUNT_TRANSFER", mode: "MOCK", status: "READY", note: "Manual seller confirmation only. Automated account transfer is not connected." },
    ];
  }

  private systemStatus() {
    return [
      { name: "Marketplace API", status: "Operational" },
      { name: "Payments", status: this.paymentsEnabled ? "Mock only" : "Off — order requests only" },
      { name: "Inventory encryption", status: "Enabled" },
      { name: "Email", status: this.mailer ? `Connected (${this.mailer.kind})` : "Not configured" },
      { name: "Storage", status: this.storage === "postgres" ? "PostgreSQL" : this.storage === "file" ? "Local file — single instance" : "Memory — lost on restart" },
      { name: "Redis queue", status: "Not connected — inline fulfillment" },
      { name: "Phone numbers", status: this.telecomEnabled ? "Flag on — still a mock adapter" : "Disabled until a telecom contract exists" },
      { name: "Virtual cards", status: this.cardsEnabled ? "Flag on — still a mock adapter" : "Disabled until a licensed issuer exists" },
    ];
  }

  private visibleProducts() {
    return this.products.filter((product) => product.status === "ACTIVE" && this.kindEnabled(product.kind));
  }

  private kindEnabled(kind: ProductKind) {
    if (kind === "PHONE_NUMBER") return this.telecomEnabled;
    if (kind === "VIRTUAL_CARD") return this.cardsEnabled;
    return true;
  }

  private categoryEnabled(slug: string) {
    if (slug === "phone-numbers") return this.telecomEnabled;
    if (slug === "virtual-cards") return this.cardsEnabled;
    return !this.categoryPrefs.get(slug)?.hidden;
  }

  private allCategoryMeta() {
    return [...categoryMeta, ...this.extraCategories];
  }

  private matchesBase(product: ProductRecord, query: ProductQuery) {
    const cheapest = Math.min(...product.variants.map((variant) => variant.priceMinor));
    if (query.q) {
      const hay = `${product.title} ${product.platform} ${product.summary}`.toLowerCase();
      if (!hay.includes(query.q.toLowerCase())) return false;
    }
    if (query.category && product.categorySlug !== query.category) return false;
    if (query.region && !product.regions.includes(query.region)) return false;
    if (query.delivery && product.delivery !== query.delivery) return false;
    if (query.tag && !product.tags.includes(query.tag)) return false;
    if (query.minMinor != null && cheapest < query.minMinor) return false;
    if (query.maxMinor != null && cheapest > query.maxMinor) return false;
    if (query.inStock && product.variants.every((variant) => this.availableUnits(variant.id).length === 0)) return false;
    return true;
  }

  private compareProducts(a: ProductSummary, b: ProductSummary, sort: ProductQuery["sort"]) {
    if (sort === "price_asc") return a.priceMinor - b.priceMinor;
    if (sort === "price_desc") return b.priceMinor - a.priceMinor;
    if (sort === "rating") return b.rating - a.rating || b.reviewCount - a.reviewCount;
    if (sort === "newest") return b.slug.localeCompare(a.slug);
    return b.salesCount - a.salesCount || a.title.localeCompare(b.title);
  }

  private availableUnits(variantId: string) {
    return this.units.filter((unit) => unit.variantId === variantId && unit.state === "AVAILABLE");
  }

  private cartFor(_reason: string, actor: Actor | null, guestId: string) {
    const ownerKey = actor ? `user:${actor.id}` : `guest:${guestId}`;
    let cart = this.carts.find((item) => item.ownerKey === ownerKey);
    if (!cart) {
      cart = { ownerKey, items: [] };
      this.carts.push(cart);
    }
    return cart;
  }

  private post(input: Omit<LedgerTx, "id" | "createdAt">) {
    const debit = input.lines.filter((line) => line.direction === "DEBIT").reduce((sum, line) => sum + line.amountMinor, 0);
    const credit = input.lines.filter((line) => line.direction === "CREDIT").reduce((sum, line) => sum + line.amountMinor, 0);
    if (debit !== credit) throw new Error(`Unbalanced ledger entry: ${input.memo} (${debit} != ${credit})`);
    const tx: LedgerTx = { ...input, id: randomUUID(), createdAt: this.now() };
    this.ledger.push(tx);
    return tx;
  }

  private balance(account: string, type: AccountType) {
    let debit = 0;
    let credit = 0;
    for (const tx of this.ledger) {
      for (const line of tx.lines) {
        if (line.account !== account) continue;
        if (line.direction === "DEBIT") debit += line.amountMinor;
        else credit += line.amountMinor;
      }
    }
    return type === "asset" || type === "expense" ? debit - credit : credit - debit;
  }

  private signedForSeller(tx: LedgerTx, sellerId: string) {
    return tx.lines.filter((line) => line.account.endsWith(sellerId)).reduce((sum, line) => sum + (line.direction === "CREDIT" ? line.amountMinor : -line.amountMinor), 0);
  }

  private sellerOrderItems(sellerId: string) {
    return this.orders.flatMap((order) => order.items.filter((item) => item.sellerId === sellerId).map((item) => ({ order, item })));
  }

  private sellerActivity(sellerId: string) {
    const requests = this.orderRequests.flatMap((request) => {
      const mine = request.items.filter((item) => item.sellerId === sellerId);
      const first = mine[0];
      if (!first) return [];
      const telegram = request.telegram ? (request.telegram.startsWith("@") ? request.telegram : `@${request.telegram}`) : "";
      const status = request.status === "COMPLETED" ? "COMPLETED" as const : request.status === "CANCELED" ? "CANCELED" as const : request.status === "IN_PROGRESS" ? "IN_PROGRESS" as const : "PENDING" as const;
      return [{
        id: request.id,
        number: request.number,
        title: first.title,
        productId: first.productId,
        categorySlug: this.products.find((item) => item.id === first.productId)?.categorySlug ?? "",
        monogram: first.monogram,
        accent: first.accent,
        contact: request.email || telegram || "No contact saved",
        quantity: mine.reduce((sum, item) => sum + item.quantity, 0),
        amountMinor: mine.reduce((sum, item) => sum + item.lineTotalMinor, 0),
        status,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt ?? request.createdAt,
        requestedLabel: this.relativeTime(request.createdAt),
        note: request.note ?? "",
        kindLabel: first.variantName,
        source: "request" as const,
        canFulfill: false,
      }];
    });
    const orders = this.uniqueOrders(this.sellerOrderItems(sellerId).map((item) => item.order)).flatMap((order) => {
      const mine = order.items.filter((item) => item.sellerId === sellerId);
      const first = mine[0];
      if (!first) return [];
      return [{
        id: order.id,
        number: order.number,
        title: first.title,
        productId: first.productId,
        categorySlug: this.products.find((item) => item.id === first.productId)?.categorySlug ?? "",
        monogram: first.monogram,
        accent: first.accent,
        contact: order.email,
        quantity: mine.reduce((sum, item) => sum + item.quantity, 0),
        amountMinor: mine.reduce((sum, item) => sum + item.lineTotalMinor, 0),
        status: this.sellerRowStatus(order.status),
        createdAt: order.createdAt,
        updatedAt: order.createdAt,
        requestedLabel: this.relativeTime(order.createdAt),
        note: "",
        kindLabel: first.variantName,
        source: "order" as const,
        canFulfill: order.status === "AWAITING_SELLER",
      }];
    });
    return [...requests, ...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private sellerRowStatus(status: OrderStatus): "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" {
    if (status === "DELIVERED") return "COMPLETED";
    if (status === "CANCELLED" || status === "REFUNDED") return "CANCELED";
    return "IN_PROGRESS";
  }

  private windowCounts(rows: ReturnType<MarketplaceService["sellerActivity"]>, start: number, end: number) {
    const slice = rows.filter((row) => {
      const time = Date.parse(row.createdAt);
      return time >= start && time < end;
    });
    const completed = slice.filter((row) => row.status === "COMPLETED").length;
    const canceled = slice.filter((row) => row.status === "CANCELED").length;
    const requests = slice.filter((row) => row.status === "PENDING").length;
    const total = slice.length;
    return {
      requests,
      completed,
      canceled,
      total,
      completion: total ? Math.round((completed / total) * 1000) / 10 : 0,
    };
  }

  private periodDelta(current: number, previous: number) {
    if (previous <= 0) return null;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private spark(rows: ReturnType<MarketplaceService["sellerActivity"]>, end: number, status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELED") {
    const day = 24 * 60 * 60 * 1000;
    return Array.from({ length: 6 }, (_, index) => {
      const start = end - (6 - index) * 5 * day;
      const stop = end - (5 - index) * 5 * day;
      return rows.filter((row) => row.status === status && Date.parse(row.createdAt) >= start && Date.parse(row.createdAt) < stop).length;
    });
  }

  private topActivity(rows: ReturnType<MarketplaceService["sellerActivity"]>, end: number) {
    const day = 24 * 60 * 60 * 1000;
    const tally = (start: number, stop: number) => {
      const map = new Map<string, { title: string; monogram: string; accent: string; quantity: number }>();
      for (const row of rows) {
        const time = Date.parse(row.createdAt);
        if (time < start || time >= stop) continue;
        const current = map.get(row.title);
        if (current) current.quantity += row.quantity;
        else map.set(row.title, { title: row.title, monogram: row.monogram, accent: row.accent, quantity: row.quantity });
      }
      return map;
    };
    const current = tally(end - 30 * day, end);
    const previous = tally(end - 60 * day, end - 30 * day);
    return [...current.values()]
      .sort((a, b) => b.quantity - a.quantity || a.title.localeCompare(b.title))
      .slice(0, 3)
      .map((item) => ({ ...item, delta: this.periodDelta(item.quantity, previous.get(item.title)?.quantity ?? 0) }));
  }

  private relativeTime(iso: string) {
    const delta = Date.parse(this.now()) - Date.parse(iso);
    if (!Number.isFinite(delta) || delta < 0) return iso.slice(0, 10);
    const minutes = Math.round(delta / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
    return iso.slice(0, 10);
  }

  private uniqueOrders(orders: OrderRecord[]) {
    const map = new Map(orders.map((order) => [order.id, order]));
    return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  private seriesFor(orders: OrderRecord[]): DashboardSeriesPoint[] {
    const days: DashboardSeriesPoint[] = [];
    for (let offset = 13; offset >= 0; offset -= 1) {
      const date = daysAgo(offset).slice(0, 10);
      const matching = orders.filter((order) => order.createdAt.slice(0, 10) === date && order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED");
      days.push({ date, revenueMinor: matching.reduce((sum, order) => sum + order.totalMinor, 0), orders: matching.length });
    }
    return days;
  }

  private statusCounts(orders: OrderRecord[]) {
    const labels: OrderStatus[] = ["DELIVERED", "AWAITING_SELLER", "FULFILLING", "MANUAL_REVIEW", "PENDING_PAYMENT", "REFUNDED", "CANCELLED"];
    return labels.map((status) => ({ status, count: orders.filter((order) => order.status === status).length })).filter((item) => item.count > 0);
  }

  private topProducts(items: OrderItemRecord[]) {
    const map = new Map<string, { title: string; salesMinor: number; quantity: number }>();
    for (const item of items) {
      const current = map.get(item.productId) ?? { title: item.title, salesMinor: 0, quantity: 0 };
      current.salesMinor += item.lineTotalMinor;
      current.quantity += item.quantity;
      map.set(item.productId, current);
    }
    return [...map.values()].sort((a, b) => b.salesMinor - a.salesMinor).slice(0, 5);
  }

  private topSellers() {
    return this.sellers
      .map((seller) => {
        const lines = this.orders.filter((order) => order.status === "DELIVERED").flatMap((order) => order.items).filter((item) => item.sellerId === seller.id);
        const pub = this.publicSeller(seller);
        return { slug: seller.slug, name: seller.name, salesMinor: lines.reduce((sum, item) => sum + item.lineTotalMinor, 0), orders: new Set(this.orders.filter((order) => order.items.some((item) => item.sellerId === seller.id && order.status === "DELIVERED")).map((order) => order.id)).size, platformOwned: seller.platformOwned, rating: pub.rating, reviewCount: pub.reviewCount };
      })
      .filter((seller) => seller.salesMinor > 0)
      .sort((a, b) => b.salesMinor - a.salesMinor);
  }

  private paymentFor(order: OrderRecord) {
    return this.payments.find((payment) => payment.orderId === order.id);
  }

  private assertPayloadAllowed(product: ProductRecord, payload: string) {
    if (containsPan(payload) || containsCvv(payload)) {
      throw new HttpError(400, "SENSITIVE_DATA", "Card numbers and CVV cannot be stored.");
    }
    if (product.kind === "VIRTUAL_CARD" && !/^provider_token_[a-z0-9_-]{6,}$/i.test(payload)) {
      throw new HttpError(400, "TOKEN_REQUIRED", "Virtual cards must use a provider token. PAN and CVV cannot be stored.");
    }
  }

  private assertOwner(order: OrderRecord, actor: Actor | null, guestId: string | null) {
    const guestKey = guestId ? `guest:${guestId}` : "";
    if (actor?.id === order.userId || (guestKey && guestKey === order.userId)) return;
    throw new HttpError(403, "FORBIDDEN", "You cannot access this order.");
  }

  private assertStaff(actor: Actor) {
    if (actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN") throw new HttpError(403, "FORBIDDEN", "Admin access is required.");
  }

  private adminSellerRow(seller: SellerRecord) {
    const user = seller.userId ? this.users.find((item) => item.id === seller.userId) : undefined;
    const delivered = this.sellerOrderItems(seller.id).filter((item) => item.order.status === "DELIVERED");
    const salesMinor = delivered.reduce((sum, item) => sum + item.item.lineTotalMinor, 0);
    const orderIds = new Set(delivered.map((item) => item.order.id));
    const requestCount = this.orderRequests.filter((request) => request.items.some((item) => item.sellerId === seller.id)).length;
    const pub = this.publicSeller(seller);
    return {
      id: seller.id,
      slug: seller.slug,
      name: user?.name || seller.name,
      storeName: seller.businessName || seller.name,
      email: user?.email ?? "",
      telegram: seller.telegram ?? "",
      bio: seller.bio,
      status: seller.status,
      platformOwned: seller.platformOwned,
      memberSince: seller.memberSince,
      note: seller.note ?? "",
      productCount: this.products.filter((product) => product.sellerId === seller.id).length,
      orderCount: orderIds.size + requestCount,
      salesMinor,
      rating: pub.rating,
      reviewCount: pub.reviewCount,
    };
  }

  private adminCustomerRow(user: UserRecord) {
    const orders = this.orders.filter((order) => order.userId === user.id);
    const delivered = orders.filter((order) => order.status === "DELIVERED");
    const spentMinor = delivered.reduce((sum, order) => sum + order.totalMinor, 0);
    const last = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      note: user.note ?? "",
      createdAt: user.createdAt,
      orderCount: orders.length,
      spentMinor,
      lastOrderAt: last?.createdAt ?? "",
    };
  }

  private mustOwnSeller(actor: Actor) {
    if (!actor.sellerId) throw new HttpError(403, "SELLER_REQUIRED", "A seller profile is required.");
    return this.mustSeller(actor.sellerId);
  }

  private mustUser(id: string) {
    const user = this.users.find((item) => item.id === id);
    if (!user) throw new HttpError(404, "NOT_FOUND", "User not found.");
    return user;
  }

  private mustSeller(id: string) {
    const seller = this.sellers.find((item) => item.id === id);
    if (!seller) throw new HttpError(404, "NOT_FOUND", "Seller not found.");
    return seller;
  }

  private sellerById(id: string) {
    return this.sellers.find((item) => item.id === id);
  }

  private mustProduct(id: string) {
    const product = this.products.find((item) => item.id === id || item.slug === id);
    if (!product) throw new HttpError(404, "NOT_FOUND", "Product not found.");
    return product;
  }

  private publicProduct(id: string) {
    const product = this.mustProduct(id);
    if (product.status !== "ACTIVE") throw new HttpError(404, "NOT_FOUND", "Product not found.");
    if (!this.kindEnabled(product.kind)) throw new HttpError(404, "CATEGORY_DISABLED", "This category stays off until a licensed provider is approved.");
    return product;
  }

  private mustUnit(id: string) {
    const unit = this.units.find((item) => item.id === id);
    if (!unit) throw new HttpError(404, "NOT_FOUND", "Inventory unit not found.");
    return unit;
  }

  private mustOrder(id: string) {
    const order = this.orders.find((item) => item.id === id || item.number === id);
    if (!order) throw new HttpError(404, "NOT_FOUND", "Order not found.");
    return order;
  }

  private assertLoginRate(email: string) {
    const now = Date.now();
    const hits = (this.loginHits.get(email) ?? []).filter((stamp) => now - stamp < 60_000);
    if (hits.length >= 8) throw new HttpError(429, "RATE_LIMITED", "Too many sign-in attempts. Wait a minute and try again.");
    hits.push(now);
    this.loginHits.set(email, hits);
  }

  private audit(actor: Actor, action: string, target: string) {
    this.audits.push({ id: randomUUID(), actor: actor.email, action, target, createdAt: this.now() });
  }

  private exclusive<T>(fn: () => Promise<T> | T): Promise<T> {
    const run = this.chain.then(() => fn());
    this.chain = run.then(() => undefined, () => undefined);
    return run;
  }

  private now() {
    return this.frozenNow ?? new Date().toISOString();
  }
}

export interface ProductQuery {
  q?: string;
  category?: string;
  seller?: string;
  platform?: string[];
  region?: RegionCode;
  delivery?: "INSTANT" | "MANUAL";
  tag?: "featured" | "best" | "new" | "hot";
  minMinor?: number;
  maxMinor?: number;
  inStock?: boolean;
  sort?: "popular" | "price_asc" | "price_desc" | "newest" | "rating";
  page?: number;
  pageSize?: number;
}

interface ProductDraft {
  title: string;
  categorySlug: string;
  kind: ProductKind;
  platform: string;
  summary: string;
  description: string;
  delivery: "INSTANT" | "MANUAL";
  region: RegionCode;
  priceMinor: number;
  variantName: string;
  publish?: boolean;
  tags?: Array<"featured" | "best" | "new" | "hot">;
  status?: ListingStatus;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48);
}

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  date.setUTCHours(16, 0, 0, 0);
  return date.toISOString();
}

function demoPayload(product: ProductRecord, variantName: string, index: number) {
  if (product.kind === "VIRTUAL_CARD") return `provider_token_demo_${product.slug.replaceAll("-", "_")}_${index + 1}`;
  return `DEMO-VOUCHER ${product.slug} ${variantName} #${index + 1}. Not a credential, license, or live number.`;
}

function fixtureProduct(sellerId: string) {
  return {
    id: "prod-instant",
    sellerId,
    sellerSlug: sellerId.endsWith("0002") ? "premiumstore" : "marketplace",
    slug: "instant-voucher",
    title: "Instant Voucher",
    categorySlug: "digital-accounts",
    kind: "ACCOUNT" as const,
    platform: "Demo",
    summary: "Fixture",
    description: "Fixture product",
    delivery: "INSTANT" as "INSTANT" | "MANUAL",
    regions: ["GLOBAL" as const],
    tags: ["featured" as const],
    monogram: "IV",
    accent: "#fff",
    gradient: ["#111", "#222"] as [string, string],
    priceMinor: 499,
    variantId: "var-instant",
    variantName: "Single",
  };
}

