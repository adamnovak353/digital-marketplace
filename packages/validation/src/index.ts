import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(72),
});

export const mfaSchema = z.object({
  challengeId: z.string().min(8),
  code: z.string().regex(/^\d{6}$/),
});

export const forgotSchema = z.object({
  email: z.string().trim().email(),
});

export const resetSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(72),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10),
});

export const cartItemSchema = z.object({
  productId: z.string().min(4),
  variantId: z.string().min(4),
  quantity: z.number().int().min(1).max(10),
});

export const cartQtySchema = z.object({
  quantity: z.number().int().min(1).max(10),
});

export const couponSchema = z.object({
  code: z.string().trim().min(3).max(32),
});

export const orderRequestSchema = z
  .object({
    email: z.string().trim().max(160).optional(),
    telegram: z.string().trim().max(64).optional(),
    note: z.string().trim().max(500, "Order note must be 500 characters or fewer.").optional(),
  })
  .superRefine((value, ctx) => {
    const email = value.email?.trim() ?? "";
    const telegram = value.telegram?.trim() ?? "";
    if (!email && !telegram) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter an email address or a Telegram handle.", path: ["email"] });
    }
    if (email && !z.string().email().safeParse(email).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid email address.", path: ["email"] });
    }
    if (telegram && !/^@?[A-Za-z0-9_]{3,32}$/.test(telegram)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a Telegram username. It is stored as contact text only.", path: ["telegram"] });
    }
  })
  .transform((value) => ({
    email: value.email?.trim() || undefined,
    telegram: value.telegram?.trim() || undefined,
    note: value.note?.trim() || undefined,
  }));

export const checkoutSchema = z.object({
  email: z.string().trim().email(),
  paymentMethod: z.enum(["card", "paypal", "wallet"]),
  couponCode: z.string().trim().max(32).optional(),
  acceptTerms: z.literal(true),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z.string().min(8).max(72),
});

export const ticketSchema = z.object({
  subject: z.string().trim().min(4).max(140),
  body: z.string().trim().min(8).max(4000),
  orderId: z.string().optional(),
});

export const messageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const reviewSchema = z.object({
  productId: z.string().min(4),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(4).max(1000),
});

export const onboardingSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  country: z.string().trim().min(2).max(80),
  bio: z.string().trim().min(8).max(600),
  authorized: z.literal(true),
});

export const productFormSchema = z.object({
  title: z.string().trim().min(4).max(120),
  categorySlug: z.string().min(2),
  kind: z.enum(["ACCOUNT", "PHONE_NUMBER", "VIRTUAL_CARD", "SUBSCRIPTION", "GAMING", "LICENSE"]),
  platform: z.string().trim().min(2).max(60),
  summary: z.string().trim().min(8).max(240),
  description: z.string().trim().min(20).max(4000),
  delivery: z.enum(["INSTANT", "MANUAL"]),
  region: z.enum(["GLOBAL", "US", "UK", "EU"]),
  priceMinor: z.number().int().min(50).max(500000),
  variantName: z.string().trim().min(2).max(60),
  publish: z.boolean().optional(),
  status: z.enum(["DRAFT", "PENDING_REVIEW", "ACTIVE", "REJECTED", "SUSPENDED"]).optional(),
  tags: z.array(z.enum(["featured", "best", "new", "hot"])).max(4).optional(),
});

export const sellerOrderRequestSchema = z.object({
  productId: z.string().min(4),
  variantId: z.string().min(4),
  quantity: z.number().int().min(1).max(10),
  email: z.string().trim().max(160).optional(),
  telegram: z.string().trim().max(64).optional(),
  note: z.string().trim().max(500).optional(),
}).superRefine((value, ctx) => {
  const email = value.email?.trim() ?? "";
  const telegram = value.telegram?.trim() ?? "";
  if (!email && !telegram) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter an email address or a Telegram handle.", path: ["email"] });
  if (email && !z.string().email().safeParse(email).success) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid email address.", path: ["email"] });
  if (telegram && !/^@?[A-Za-z0-9_]{3,32}$/.test(telegram)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a Telegram username. It is stored as contact text only.", path: ["telegram"] });
});

export const sellerRequestStatusSchema = z.object({
  status: z.enum(["IN_PROGRESS", "COMPLETED", "CANCELED"]),
});

export const sellerCustomerSchema = z.object({
  contact: z.string().trim().min(3).max(160),
  note: z.string().trim().max(300).optional(),
  blocked: z.boolean().optional(),
});

export const inventorySchema = z.object({
  productId: z.string().min(4),
  variantId: z.string().min(4),
  payload: z.string().trim().min(4).max(500),
});

export const payoutSchema = z.object({
  amountMinor: z.number().int().min(1000),
});

export const confirmSchema = z.object({
  confirm: z.literal(true),
  note: z.string().max(500).optional(),
});

export const adminSellerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  storeName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().optional(),
  telegram: z.string().trim().max(64).optional(),
  password: z.string().min(8).max(72).optional(),
  bio: z.string().trim().max(300).optional(),
  note: z.string().trim().max(500).optional(),
  status: z.enum(["APPROVED", "PENDING", "SUSPENDED"]),
});

export const adminCustomerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).max(72).optional(),
  note: z.string().trim().max(500).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  emailVerified: z.boolean().optional(),
});

export const adminCategorySchema = z.object({
  slug: z.string().trim().min(2).max(48).optional(),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional(),
  homepage: z.boolean(),
  featured: z.boolean(),
  hidden: z.boolean(),
});

export const settingsSchema = z.object({
  customerFeeBps: z.number().int().min(0).max(2000),
  commissionBps: z.number().int().min(0).max(5000),
});

export const demoTopupSchema = z.object({
  amountMinor: z.number().int().min(500).max(50000),
});

export const disputeResolveSchema = z.object({
  confirm: z.literal(true),
  outcome: z.enum(["RESOLVED", "REJECTED"]),
  note: z.string().trim().min(4).max(500),
});
