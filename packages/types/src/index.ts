export type Role = "CUSTOMER" | "SELLER" | "ADMIN" | "SUPER_ADMIN";

export type ProductKind =
  | "ACCOUNT"
  | "PHONE_NUMBER"
  | "VIRTUAL_CARD"
  | "SUBSCRIPTION"
  | "GAMING"
  | "LICENSE";

export type DeliveryMode = "INSTANT" | "MANUAL";
export type RegionCode = "GLOBAL" | "US" | "UK" | "EU";
export type ListingStatus = "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED" | "SUSPENDED";
export type InventoryState = "AVAILABLE" | "RESERVED" | "DELIVERED" | "QUARANTINED";
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "FULFILLING"
  | "DELIVERED"
  | "AWAITING_SELLER"
  | "MANUAL_REVIEW"
  | "CANCELLED"
  | "REFUNDED";
export type PaymentStatus = "REQUIRES_ACTION" | "SUCCEEDED" | "FAILED" | "REFUNDED";
export type SellerStatus = "PENDING" | "APPROVED" | "SUSPENDED";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type PayoutStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";
export type DisputeStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";
export type Currency = "USD";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  sellerId?: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
}

export interface Category {
  slug: string;
  name: string;
  description: string;
  icon: "accounts" | "phone" | "card" | "license" | "gaming";
  productCount: number;
  available: boolean;
}

export interface SellerPublic {
  slug: string;
  name: string;
  rating: number;
  reviewCount: number;
  salesCount: number;
  memberSince: string;
  status: SellerStatus;
  platformOwned: boolean;
  bio: string;
  verified: boolean;
  categories: Array<{ slug: string; name: string }>;
  orderedCount: number;
  deliveredOrders: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  priceMinor: number;
  compareAtMinor?: number;
  region: RegionCode;
  available: number;
}

export interface ProductImage {
  id: string;
  url: string;
}

export const PRODUCT_IMAGE_LIMIT = 5;
export const PRODUCT_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export interface ProductSummary {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  kind: ProductKind;
  platform: string;
  seller: SellerPublic;
  summary: string;
  delivery: DeliveryMode;
  regions: RegionCode[];
  tags: Array<"featured" | "best" | "new" | "hot">;
  rating: number;
  reviewCount: number;
  salesCount: number;
  monogram: string;
  accent: string;
  gradient: [string, string];
  /** Uploaded product photos, first one is the cover. */
  images: ProductImage[];
  priceMinor: number;
  compareAtMinor?: number;
  defaultVariantId: string;
  available: number;
  demo: boolean;
  status: ListingStatus;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ProductDetail extends ProductSummary {
  description: string;
  variants: ProductVariant[];
  faqs: Array<{ q: string; a: string }>;
  deliveryNotes: string[];
  disclaimer: string;
  reviews: Review[];
  related: ProductSummary[];
}

export interface ProductListResponse {
  items: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    platforms: Array<{ name: string; count: number }>;
    sellers: Array<{ slug: string; name: string; count: number }>;
    regions: Array<{ code: RegionCode; count: number }>;
    delivery: Array<{ mode: "INSTANT" | "MANUAL"; count: number }>;
  };
}

export interface CartItem {
  id: string;
  productId: string;
  slug: string;
  title: string;
  variantId: string;
  variantName: string;
  sellerName: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  available: number;
  delivery: DeliveryMode;
  monogram: string;
  accent: string;
}

export interface CartQuote {
  items: CartItem[];
  currency: Currency;
  subtotalMinor: number;
  discountMinor: number;
  feeMinor: number;
  feeBps: number;
  totalMinor: number;
  couponCode?: string;
  couponMessage?: string;
}

export interface OrderRequestItem {
  id: string;
  productId: string;
  slug: string;
  title: string;
  variantName: string;
  sellerName: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  monogram: string;
  accent: string;
}

export interface OrderRequestView {
  id: string;
  number: string;
  status: "AWAITING_CONTACT" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
  email?: string;
  telegram?: string;
  note?: string;
  currency: Currency;
  items: OrderRequestItem[];
  subtotalMinor: number;
  discountMinor: number;
  feeMinor: number;
  feeBps: number;
  totalMinor: number;
  createdAt: string;
  demo: boolean;
}

export interface OrderItemView {
  id: string;
  productId: string;
  title: string;
  variantName: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  delivery: DeliveryMode;
  sellerName: string;
  slug: string;
  monogram: string;
  accent: string;
}

export interface OrderView {
  id: string;
  number: string;
  status: OrderStatus;
  currency: Currency;
  items: OrderItemView[];
  subtotalMinor: number;
  discountMinor: number;
  feeMinor: number;
  totalMinor: number;
  couponCode?: string;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  paymentId: string;
  createdAt: string;
  email: string;
  demo: boolean;
  canConfirmDemo: boolean;
}

export interface DeliveryView {
  orderId: string;
  status: OrderStatus;
  items: Array<{
    title: string;
    kind: ProductKind;
    delivery: DeliveryMode;
    state: "READY" | "WAITING_FOR_SELLER" | "UNAVAILABLE";
    payload?: string;
    notice: string;
  }>;
}

export interface WalletView {
  currency: Currency;
  availableMinor: number;
  transactions: Array<{
    id: string;
    type: string;
    description: string;
    amountMinor: number;
    createdAt: string;
    status: string;
  }>;
}

export interface TicketMessage {
  id: string;
  authorName: string;
  authorRole: Role | "SUPPORT";
  body: string;
  createdAt: string;
}

export interface TicketView {
  id: string;
  number: string;
  subject: string;
  status: TicketStatus;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export interface PayoutView {
  id: string;
  sellerName: string;
  amountMinor: number;
  status: PayoutStatus;
  createdAt: string;
}

export interface DisputeView {
  id: string;
  orderId: string;
  reason: string;
  status: DisputeStatus;
  openedBy: string;
  createdAt: string;
  resolution?: string;
}

export interface ProviderView {
  id: string;
  name: string;
  kind: "PAYMENTS" | "PAYOUTS" | "TELECOM" | "CARD_ISSUER" | "ACCOUNT_TRANSFER";
  mode: "MOCK" | "LIVE";
  status: "READY" | "NOT_CONFIGURED";
  note: string;
}

export interface DashboardSeriesPoint {
  date: string;
  revenueMinor: number;
  orders: number;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  createdAt: string;
}

export const DEMO_DISCLAIMER =
  "Demo listing only. Not affiliated with, endorsed by, or authorized by any named service. No live account, phone number, license, or card is sold. Delivery returns a demo voucher. Card numbers and CVV are never stored.";

export const LISTING_DISCLAIMER =
  "Independent seller listing. Not affiliated with, endorsed by, or authorized by any named brand or service. Card numbers and CVV are never stored.";

export function formatMoney(minor: number, currency: Currency = "USD") {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minor));
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const cents = String(abs % 100).padStart(2, "0");
  const amount = `${sign}$${whole}.${cents}`;
  return currency === "USD" ? amount : `${amount} ${currency}`;
}
