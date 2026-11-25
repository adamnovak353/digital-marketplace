import type { DeliveryMode, ProductKind, RegionCode } from "@marketplace/types";

export interface CatalogVariant {
  id: string;
  name: string;
  priceMinor: number;
  compareAtMinor?: number;
  region: RegionCode;
  units: number;
}

export interface CatalogProduct {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  kind: ProductKind;
  platform: string;
  sellerSlug: string;
  summary: string;
  description: string;
  delivery: DeliveryMode;
  regions: RegionCode[];
  tags: Array<"featured" | "best" | "new" | "hot">;
  monogram: string;
  accent: string;
  gradient: [string, string];
  variants: CatalogVariant[];
  faqs: Array<{ q: string; a: string }>;
  deliveryNotes: string[];
}

export interface CatalogSeller {
  id: string;
  slug: string;
  name: string;
  platformOwned: boolean;
  country: string;
  bio: string;
  memberSince: string;
}

export const catalogSellers: CatalogSeller[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    slug: "marketplace",
    name: "Marketplace Official",
    platformOwned: true,
    country: "US",
    bio: "Platform-owned demo inventory. Sample vouchers only.",
    memberSince: "2024-03-01T00:00:00.000Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    slug: "premiumstore",
    name: "PremiumStore",
    platformOwned: false,
    country: "US",
    bio: "Approved demo reseller. Listings are sample data, not brand-authorized accounts.",
    memberSince: "2024-06-12T00:00:00.000Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    slug: "alistore",
    name: "AliStore",
    platformOwned: false,
    country: "UK",
    bio: "Demo seller profile used to exercise commissions, reviews, and payouts.",
    memberSince: "2024-08-02T00:00:00.000Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    slug: "gamekeys",
    name: "GameKeys",
    platformOwned: false,
    country: "DE",
    bio: "Demo gaming-key seller. Region locks are informational in this sample catalog.",
    memberSince: "2024-09-18T00:00:00.000Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    slug: "digitalbox",
    name: "DigitalBox",
    platformOwned: false,
    country: "US",
    bio: "Demo license reseller. Inventory is encrypted and is not a live software license.",
    memberSince: "2025-01-09T00:00:00.000Z",
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    slug: "numberhub",
    name: "NumberHub",
    platformOwned: false,
    country: "US",
    bio: "Demo telecom listing profile. No carrier provisioning is connected.",
    memberSince: "2025-02-14T00:00:00.000Z",
  },
];

const notes = {
  instant: [
    "Eligible demo vouchers are released after a verified payment event.",
    "The voucher is not a username, password, or live entitlement.",
    "Revealed demo secrets are quarantined and are not returned to stock.",
  ],
  manual: [
    "A seller must confirm fulfillment. Nothing is delivered at payment time.",
    "Use this path for transfers that need a human review.",
  ],
  phone: [
    "No number is provisioned with a telecom provider.",
    "A live integration would require identity and acceptable-use checks before activation.",
  ],
  card: [
    "PAN and CVV are not collected or stored.",
    "A licensed issuer would render sensitive card data in a hosted component.",
  ],
};

function faqs(kind: string): Array<{ q: string; a: string }> {
  return [
    {
      q: "Is this a real product from the named brand?",
      a: "No. Every listing in this build is demo content. Names are used so the marketplace UI matches the reference design. They do not mean the brand authorized resale.",
    },
    {
      q: "What will I receive after payment?",
      a:
        kind === "VIRTUAL_CARD"
          ? "A demo provider-token reference. The marketplace never returns a PAN or CVV."
          : "A demo voucher string stored encrypted at rest. It cannot be redeemed with the named service.",
    },
    {
      q: "Can I get a refund?",
      a: "Demo refunds are available from the admin payments desk. Delivered vouchers are quarantined instead of being listed again.",
    },
  ];
}

function product(input: CatalogProduct): CatalogProduct {
  return input;
}

export const catalogProducts: CatalogProduct[] = [
  product({
    id: "30000000-0000-4000-8000-000000000001",
    slug: "netflix-premium",
    title: "Netflix Premium (1 Month)",
    categorySlug: "digital-accounts",
    kind: "ACCOUNT",
    platform: "Netflix",
    sellerSlug: "premiumstore",
    summary: "Demo streaming entitlement. Not an official or transferable Netflix account.",
    description:
      "Sample listing for a streaming plan. The marketplace only models authorized transfers; this demo does not verify or move a real account. Checkout reserves an encrypted demo voucher after a mock payment webhook.",
    delivery: "INSTANT",
    regions: ["GLOBAL", "US", "UK", "EU"],
    tags: ["featured", "best", "hot"],
    monogram: "N",
    accent: "#E50914",
    gradient: ["#3b0614", "#120814"],
    variants: [
      { id: "31000000-0000-4000-8000-000000000011", name: "1 Month", priceMinor: 499, compareAtMinor: 699, region: "GLOBAL", units: 16 },
      { id: "31000000-0000-4000-8000-000000000012", name: "3 Months", priceMinor: 1299, compareAtMinor: 1899, region: "GLOBAL", units: 10 },
      { id: "31000000-0000-4000-8000-000000000013", name: "12 Months", priceMinor: 3999, compareAtMinor: 5999, region: "US", units: 6 },
    ],
    faqs: faqs("ACCOUNT"),
    deliveryNotes: notes.instant,
  }),
  product({
    id: "30000000-0000-4000-8000-000000000002",
    slug: "spotify-premium",
    title: "Spotify Premium (3 Months)",
    categorySlug: "digital-accounts",
    kind: "ACCOUNT",
    platform: "Spotify",
    sellerSlug: "premiumstore",
    summary: "Demo music-plan listing with instant voucher delivery.",
    description: "Sample reseller listing. No Spotify account is created, transferred, or accessed.",
    delivery: "INSTANT",
    regions: ["GLOBAL", "US", "EU"],
    tags: ["featured", "best"],
    monogram: "S",
    accent: "#1DB954",
    gradient: ["#06331c", "#07140e"],
    variants: [
      { id: "31000000-0000-4000-8000-000000000022", name: "3 Months", priceMinor: 999, compareAtMinor: 1499, region: "GLOBAL", units: 12 },
    ],
    faqs: faqs("ACCOUNT"),
    deliveryNotes: notes.instant,
  }),
  product({
    id: "30000000-0000-4000-8000-000000000003",
    slug: "disney-plus",
    title: "Disney+ Premium (1 Month)",
    categorySlug: "digital-accounts",
    kind: "ACCOUNT",
    platform: "Disney+",
    sellerSlug: "premiumstore",
    summary: "Demo family-plan listing. Region badge is informational.",
    description: "Visual sample for a streaming tile. Payment produces a demo voucher only.",
    delivery: "INSTANT",
    regions: ["US", "UK", "EU"],
    tags: ["featured", "hot"],
    monogram: "D+",
    accent: "#3B82F6",
    gradient: ["#0b1b4a", "#120818"],
    variants: [
      { id: "31000000-0000-4000-8000-000000000031", name: "1 Month", priceMinor: 699, compareAtMinor: 899, region: "US", units: 14 },
    ],
    faqs: faqs("ACCOUNT"),
    deliveryNotes: notes.instant,
  }),
  product({
    id: "30000000-0000-4000-8000-000000000004",
    slug: "youtube-premium",
    title: "YouTube Premium (1 Month)",
    categorySlug: "digital-accounts",
    kind: "SUBSCRIPTION",
    platform: "YouTube",
    sellerSlug: "alistore",
    summary: "Demo subscription listing sold by AliStore.",
    description: "Sample subscription SKU used for seller attribution and reviews. Not a YouTube subscription.",
    delivery: "INSTANT",
    regions: ["GLOBAL", "US"],
    tags: ["featured", "new"],
    monogram: "YT",
    accent: "#FF0033",
    gradient: ["#3a0614", "#140810"],
    variants: [
      { id: "31000000-0000-4000-8000-000000000041", name: "1 Month", priceMinor: 699, compareAtMinor: 899, region: "GLOBAL", units: 11 },
    ],
    faqs: faqs("SUBSCRIPTION"),
    deliveryNotes: notes.instant,
  }),
  product({
    id: "30000000-0000-4000-8000-000000000005",
    slug: "chatgpt-plus",
    title: "ChatGPT Plus (1 Month)",
    categorySlug: "digital-accounts",
    kind: "SUBSCRIPTION",
    platform: "ChatGPT",
    sellerSlug: "alistore",
    summary: "Demo AI-plan listing. No OpenAI account is provisioned.",
    description: "Sample plus-plan tile. The delivered payload is a non-redeemable demo voucher.",
    delivery: "INSTANT",
    regions: ["GLOBAL"],
    tags: ["featured", "best", "new"],
    monogram: "AI",
    accent: "#10A37F",
    gradient: ["#04281f", "#101018"],
    variants: [
      { id: "31000000-0000-4000-8000-000000000051", name: "1 Month", priceMinor: 1999, region: "GLOBAL", units: 18 },
    ],
    faqs: faqs("SUBSCRIPTION"),
    deliveryNotes: notes.instant,
  }),
  product({
    id: "30000000-0000-4000-8000-000000000006",
    slug: "canva-pro",
    title: "Canva Pro (12 Months)",
    categorySlug: "digital-accounts",
    kind: "LICENSE",
    platform: "Canva",
    sellerSlug: "digitalbox",
    summary: "Demo design-tool license key. Not issued by Canva.",
    description: "Encrypted demo license inventory. Duplicate delivery is blocked by unit state.",
    delivery: "INSTANT",
    regions: ["GLOBAL"],
    tags: ["hot", "new"],
    monogram: "C",
    accent: "#00C4CC",
    gradient: ["#04383a", "#101018"],
    variants: [
      { id: "31000000-0000-4000-8000-000000000061", name: "12 Months", priceMinor: 2999, compareAtMinor: 3999, region: "GLOBAL", units: 8 },
    ],
    faqs: faqs("LICENSE"),
    deliveryNotes: notes.instant,
  }),
  product({
    id: "30000000-0000-4000-8000-000000000007",
    slug: "adobe-creative-cloud",
    title: "Adobe Creative Cloud (1 Month)",
    categorySlug: "digital-accounts",
    kind: "LICENSE",
    platform: "Adobe",
    sellerSlug: "digitalbox",
    summary: "Demo creative-suite listing with manual seller confirmation.",
    description: "Manual fulfillment sample. The seller must mark the order fulfilled. No Adobe license is generated.",
    delivery: "MANUAL",
    regions: ["US", "EU"],
    tags: ["best"],
    monogram: "Ae",
    accent: "#FF0000",
    gradient: ["#3a0a0a", "#140808"],
    variants: [
      { id: "31000000-0000-4000-8000-000000000071", name: "1 Month", priceMinor: 4999, compareAtMinor: 5999, region: "US", units: 6 },
    ],
    faqs: faqs("LICENSE"),
    deliveryNotes: notes.manual,
  }),
  product({
    id: "30000000-0000-4000-8000-000000000008",
    slug: "notion-plus",
    title: "Notion Plus (1 Month)",
    categorySlug: "digital-accounts",
    kind: "SUBSCRIPTION",
    platform: "Notion",
    sellerSlug: "digitalbox",
    summary: "Demo workspace plan. Not a Notion subscription.",
    description: "Small-ticket demo subscription used in filters and related products.",
    delivery: "INSTANT",
    regions: ["GLOBAL"],
    tags: ["new"],
    monogram: "No",
    accent: "#F8FAFC",
    gradient: ["#1c2438", "#0c101c"],
    variants: [
      { id: "31000000-0000-4000-8000-000000000081", name: "1 Month", priceMinor: 799, compareAtMinor: 999, region: "GLOBAL", units: 15 },
    ],
    faqs: faqs("SUBSCRIPTION"),
    deliveryNotes: notes.instant,
  }),
  product({
    id: "30000000-0000-4000-8000-000000000009",
    slug: "us-mobile-number",
    title: "US Mobile Number — 30 Days",
    categorySlug: "phone-numbers",
    kind: "PHONE_NUMBER",
    platform: "Demo Telecom",
    sellerSlug: "numberhub",
    summary: "Demo US number listing. No SMS route is provisioned.",
    description: "Represents an authorized telecom product. The mock telecom adapter is not a carrier integration and cannot send or receive SMS.",
    delivery: "INSTANT",
    regions: ["US"],
    tags: ["featured"],
    monogram: "+1",
    accent: "#00E5FF",
    gradient: ["#042833", "#10131f"],
    variants: [
      { id: "31000000-0000-4000-8000-000000000091", name: "30 Days", priceMinor: 450, region: "US", units: 9 },
    ],
    faqs: faqs("PHONE_NUMBER"),
    deliveryNotes: notes.phone,
  }),
  product({
    id: "30000000-0000-4000-8000-000000000010",
    slug: "uk-mobile-number",
    title: "UK Mobile Number — 30 Days",
    categorySlug: "phone-numbers",
    kind: "PHONE_NUMBER",
    platform: "Demo Telecom",
    sellerSlug: "numberhub",
    summary: "Demo UK number listing with an expiration field.",
    description: "Expiration and renewal are represented as order metadata. No number is purchased from a carrier.",
    delivery: "MANUAL",
    regions: ["UK"],
    tags: ["new"],
    monogram: "+44",
    accent: "#8B5CF6",
    gradient: ["#1a1033", "#10131f"],
    variants: [
      { id: "31000000-0000-4000-8000-000000000101", name: "30 Days", priceMinor: 550, region: "UK", units: 7 },
    ],
    faqs: faqs("PHONE_NUMBER"),
    deliveryNotes: [...notes.phone, ...notes.manual],
  }),
  product({
    id: "30000000-0000-4000-8000-000000000011",
    slug: "demo-virtual-visa",
    title: "Demo Virtual Visa",
    categorySlug: "virtual-cards",
    kind: "VIRTUAL_CARD",
    platform: "Demo Issuer",
    sellerSlug: "marketplace",
    summary: "Hosted-card demo. The marketplace stores a provider token, never PAN or CVV.",
    description:
      "A production card product would be issued by a licensed partner after KYC/AML. This mock issuer is not live. Inventory accepts only provider_token references.",
    delivery: "INSTANT",
    regions: ["US", "EU"],
    tags: ["featured", "hot"],
    monogram: "V",
    accent: "#FF00C8",
    gradient: ["#35122d", "#120814"],
    variants: [
      { id: "31000000-0000-4000-8000-000000000111", name: "Issuance", priceMinor: 399, region: "US", units: 10 },
    ],
    faqs: faqs("VIRTUAL_CARD"),
    deliveryNotes: notes.card,
  }),
  product({
    id: "30000000-0000-4000-8000-000000000012",
    slug: "steam-wallet-10",
    title: "Steam Wallet ($10)",
    categorySlug: "gaming",
    kind: "GAMING",
    platform: "Steam",
    sellerSlug: "gamekeys",
    summary: "Demo wallet-code listing. The code is not a Steam voucher.",
    description: "Sample gaming SKU with region metadata. Delivered once, then the unit is marked delivered.",
    delivery: "INSTANT",
    regions: ["GLOBAL", "US", "EU"],
    tags: ["featured", "best", "hot"],
    monogram: "St",
    accent: "#66C0F4",
    gradient: ["#0d2233", "#10131c"],
    variants: [
      { id: "31000000-0000-4000-8000-000000000121", name: "$10 code", priceMinor: 999, region: "GLOBAL", units: 20 },
    ],
    faqs: faqs("GAMING"),
    deliveryNotes: notes.instant,
  }),
  product({
    id: "30000000-0000-4000-8000-000000000013",
    slug: "valorant-points-5300",
    title: "Valorant Points (5300)",
    categorySlug: "gaming",
    kind: "GAMING",
    platform: "Valorant",
    sellerSlug: "gamekeys",
    summary: "Demo points pack. Not redeemable in Valorant.",
    description: "High-ticket gaming sample used for price sort and regional badges.",
    delivery: "INSTANT",
    regions: ["US", "EU"],
    tags: ["featured", "hot"],
    monogram: "VP",
    accent: "#FF4655",
    gradient: ["#3a1020", "#120810"],
    variants: [
      { id: "31000000-0000-4000-8000-000000000131", name: "5300 points", priceMinor: 4599, compareAtMinor: 4999, region: "US", units: 8 },
    ],
    faqs: faqs("GAMING"),
    deliveryNotes: notes.instant,
  }),
  product({
    id: "30000000-0000-4000-8000-000000000014",
    slug: "playstation-plus",
    title: "PlayStation Plus (1 Month)",
    categorySlug: "gaming",
    kind: "GAMING",
    platform: "PlayStation",
    sellerSlug: "gamekeys",
    summary: "Demo console subscription listing with manual delivery.",
    description: "Seller-confirmed demo key flow. No PlayStation entitlement is created.",
    delivery: "MANUAL",
    regions: ["US", "UK", "EU"],
    tags: ["new"],
    monogram: "PS",
    accent: "#00439C",
    gradient: ["#071833", "#101018"],
    variants: [
      { id: "31000000-0000-4000-8000-000000000141", name: "1 Month", priceMinor: 899, compareAtMinor: 1199, region: "US", units: 9 },
    ],
    faqs: faqs("GAMING"),
    deliveryNotes: notes.manual,
  }),
  product({
    id: "30000000-0000-4000-8000-000000000015",
    slug: "demo-office-license",
    title: "Demo Office License",
    categorySlug: "subscriptions",
    kind: "LICENSE",
    platform: "Demo Software",
    sellerSlug: "marketplace",
    summary: "Platform-owned demo license. No third-party commission.",
    description: "Platform inventory sample. Earnings stay with the marketplace ledger accounts.",
    delivery: "INSTANT",
    regions: ["GLOBAL"],
    tags: ["featured", "best"],
    monogram: "Li",
    accent: "#F59E0B",
    gradient: ["#33240a", "#141018"],
    variants: [
      { id: "31000000-0000-4000-8000-000000000151", name: "Perpetual demo key", priceMinor: 2999, region: "GLOBAL", units: 12 },
    ],
    faqs: faqs("LICENSE"),
    deliveryNotes: notes.instant,
  }),
  product({
    id: "30000000-0000-4000-8000-000000000016",
    slug: "demo-cloud-storage",
    title: "Demo Cloud Storage (1 Year)",
    categorySlug: "subscriptions",
    kind: "SUBSCRIPTION",
    platform: "Demo Cloud",
    sellerSlug: "digitalbox",
    summary: "Demo storage plan used in the subscriptions category.",
    description: "Category sample so subscriptions are not an empty catalog. Delivery is a demo voucher.",
    delivery: "INSTANT",
    regions: ["GLOBAL", "EU"],
    tags: ["new"],
    monogram: "Cl",
    accent: "#22C55E",
    gradient: ["#06331a", "#10140f"],
    variants: [
      { id: "31000000-0000-4000-8000-000000000161", name: "1 Year", priceMinor: 1999, compareAtMinor: 2499, region: "GLOBAL", units: 10 },
    ],
    faqs: faqs("SUBSCRIPTION"),
    deliveryNotes: notes.instant,
  }),
];

export const categoryMeta = [
  {
    slug: "digital-accounts",
    name: "Digital Accounts",
    description: "Demo account and plan listings. Authorized-transfer workflows only — nothing here is a live login.",
    icon: "accounts" as const,
  },
  {
    slug: "phone-numbers",
    name: "Phone Numbers / SMS",
    description: "Demo number inventory. Telecom provisioning, expiry, and identity checks are not connected.",
    icon: "phone" as const,
  },
  {
    slug: "virtual-cards",
    name: "Virtual Cards",
    description: "Demo issuer flow. Sensitive card data stays in a provider-hosted component and is never stored here.",
    icon: "card" as const,
  },
  {
    slug: "subscriptions",
    name: "Subscriptions / Licenses",
    description: "Demo software licenses and plans with encrypted, single-delivery inventory.",
    icon: "license" as const,
  },
  {
    slug: "gaming",
    name: "Gaming Products",
    description: "Demo keys and wallet codes with region metadata. Not redeemable on game platforms.",
    icon: "gaming" as const,
  },
];
