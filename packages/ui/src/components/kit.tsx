"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { ShoppingCart, Star, Zap } from "lucide-react";
import { toast } from "sonner";
import { formatMoney, type ProductSummary } from "@marketplace/types";
import { cn, discountPercent } from "../lib/cn";

export async function mutate<T = unknown>(path: string, method = "POST", body?: unknown): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method,
    credentials: "include",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message ?? "The request did not complete.");
  return data as T;
}

export function useRefresh() {
  const router = useRouter();
  return React.useCallback(() => router.refresh(), [router]);
}

const AVATAR_TONES = ["#FF4BD8", "#00E5FF", "#A855F7", "#F59E0B", "#22D3EE", "#818CF8"];

export function NameAvatar({ name, size = "md", className }: { name: string; size?: "sm" | "md"; className?: string }) {
  const tone = AVATAR_TONES[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TONES.length] ?? AVATAR_TONES[0]!;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2 ? `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase() : name.slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-full border font-bold text-white", size === "sm" ? "h-9 w-9 text-[11px]" : "h-12 w-12 text-sm", className)}
      style={{ borderColor: tone, background: `radial-gradient(circle at 30% 25%, ${tone}, #120818 74%)`, boxShadow: `0 0 14px ${tone}88` }}
    >
      {initials}
    </span>
  );
}

const buttonStyles = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "border border-[#FF7AE8] bg-gradient-to-r from-[#FF00C8] to-[#8B5CF6] text-white shadow-[0_0_18px_rgba(255,0,200,.65),0_0_36px_rgba(139,92,246,.35)] hover:brightness-110",
        secondary: "border border-[#e879f9]/70 bg-[#14102a] text-white shadow-[0_0_14px_rgba(232,121,249,.28)] hover:border-[#f0abfc] hover:shadow-[0_0_20px_rgba(232,121,249,.45)]",
        ghost: "text-slate-300 hover:bg-white/5",
        danger: "border border-red-300 bg-red-500 text-white shadow-[0_0_18px_rgba(239,68,68,.55)] hover:bg-red-400",
      },
      size: { sm: "h-8 px-3 text-xs", md: "h-10", lg: "h-12 px-6" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({ className, variant, size, asChild, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonStyles({ variant, size }), className)} {...props} />;
}

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="text-slate-300">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-400">{error}</span>}
    </label>
  );
}

export const inputClass = "w-full rounded-xl border border-[#a855f7]/45 bg-[#0C1024] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-[#e879f9] focus:shadow-[0_0_16px_rgba(232,121,249,.35)]";

export function Badge({ children, tone = "pink" }: { children: React.ReactNode; tone?: "pink" | "cyan" | "green" | "amber" | "red" | "slate" }) {
  const tones = {
    pink: "bg-[#FF00C8]/15 text-pink-300",
    cyan: "bg-cyan-400/10 text-cyan-300",
    green: "bg-emerald-400/10 text-emerald-300",
    amber: "bg-amber-400/10 text-amber-300",
    red: "bg-red-400/10 text-red-300",
    slate: "bg-white/5 text-slate-300",
  };
  return <span className={cn("inline-flex items-center rounded-full border border-current/30 px-2 py-0.5 text-[11px] font-semibold", tones[tone])}>{children}</span>;
}

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("neon-surface rounded-2xl backdrop-blur-xl", className)}>{children}</section>;
}

export function Rating({ value, count }: { value: number; count: number }) {
  return (
    <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
      <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
      <span className="text-slate-200">{value ? value.toFixed(1) : "New"}</span>
      <span>({count})</span>
    </div>
  );
}

export function ProductArt({ monogram, accent, gradient, className, image, alt = "" }: { monogram: string; accent: string; gradient: [string, string]; className?: string; image?: string; alt?: string }) {
  if (image) {
    return (
      <div className={cn("relative aspect-[16/10] overflow-hidden bg-[#10152B]", className)}>
        <img src={image} alt={alt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className={cn("relative flex aspect-[16/10] items-center justify-center overflow-hidden", className)} style={{ background: `radial-gradient(circle at 30% 20%, ${accent}55, transparent 32%), linear-gradient(160deg, ${gradient[0]}, ${gradient[1]})` }}>
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.14)_1px,transparent_1px)] [background-size:20px_20px]" />
      <span className="relative text-4xl font-black tracking-tight" style={{ color: accent, textShadow: `0 0 18px ${accent}` }}>{monogram}</span>
    </div>
  );
}

export function ProductCard({ product, layout = "home" }: { product: ProductSummary; layout?: "home" | "catalog" }) {
  const discount = discountPercent(product.priceMinor, product.compareAtMinor);
  const instant = product.delivery === "INSTANT";
  return (
    <article className={cn("neon-surface group relative flex flex-col rounded-2xl p-2.5 hover:-translate-y-1", layout === "home" && "neon-pink")}>
      <Link href={`/product/${product.slug}`} className="block overflow-hidden rounded-xl">
        <ProductArt monogram={product.monogram} accent={product.accent} gradient={product.gradient} image={product.images?.[0]?.url} alt={product.title} className={layout === "catalog" ? "aspect-[4/3]" : undefined} />
        {layout === "home" && discount > 0 && <span className="absolute left-4 top-4 rounded-md bg-[#FF00C8] px-1.5 py-0.5 text-[11px] font-bold text-white">-{discount}%</span>}
      </Link>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-2">
        <Link href={`/product/${product.slug}`} className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 hover:text-pink-200">{product.title}</Link>
        {layout === "home" ? <p className="text-[11px] text-slate-400">{product.seller.name}</p> : null}
        <Rating value={product.rating} count={product.reviewCount} />
        {layout === "catalog" ? <p className={cn("mt-1 flex items-center gap-1 text-[11px] font-medium", instant ? "text-emerald-400" : "text-amber-300")}><Zap className="h-3 w-3" /> {instant ? "Instant Delivery" : "Manual Delivery"}</p> : null}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <div className="text-lg font-bold leading-none">{formatMoney(product.priceMinor)}</div>
            {layout === "home" && product.compareAtMinor ? <div className="text-[11px] text-slate-500 line-through">{formatMoney(product.compareAtMinor)}</div> : null}
            {layout === "home" ? <span className={product.available > 0 ? "block text-[11px] font-medium text-emerald-400" : "block text-[11px] text-amber-300"}>{product.available > 0 ? `In stock · ${product.available}` : "Out of stock"}</span> : null}
          </div>
          <AddToCart productId={product.id} variantId={product.defaultVariantId} disabled={product.available < 1} />
        </div>
      </div>
    </article>
  );
}

function AddToCart({ productId, variantId, disabled }: { productId: string; variantId: string; disabled?: boolean }) {
  const [pending, setPending] = React.useState(false);
  const refresh = useRefresh();
  return (
    <Button
      size="sm"
      variant="secondary"
      aria-label={pending ? "Adding" : "Add to cart"}
      className="h-9 w-9 shrink-0 rounded-xl px-0"
      disabled={disabled || pending}
      onClick={async () => {
        setPending(true);
        try {
          await mutate("/cart/items", "POST", { productId, variantId, quantity: 1 });
          toast.success("Added to cart");
          refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Could not add to cart");
        } finally {
          setPending(false);
        }
      }}
    >
      <ShoppingCart className="h-4 w-4" />
    </Button>
  );
}

export function EmptyState({ title, body, href, action }: { title: string; body: string; href?: string; action?: string }) {
  return (
    <Panel className="neon-violet px-6 py-16 text-center">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{body}</p>
      {href && action ? <Button asChild className="mt-5"><Link href={href}>{action}</Link></Button> : null}
    </Panel>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone = status === "DELIVERED" || status === "SUCCEEDED" || status === "PAID" || status === "APPROVED" || status === "ACTIVE" || status === "RESOLVED" ? "green" : status === "REFUNDED" || status === "REJECTED" || status === "SUSPENDED" || status === "FAILED" ? "red" : status === "MANUAL_REVIEW" || status === "PENDING" || status === "PENDING_PAYMENT" || status === "PENDING_REVIEW" || status === "AWAITING_CONTACT" ? "amber" : "cyan";
  const label = status === "AWAITING_CONTACT" ? "Awaiting" : status.replaceAll("_", " ");
  return <Badge tone={tone}>{label}</Badge>;
}
