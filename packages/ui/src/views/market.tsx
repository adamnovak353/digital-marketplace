"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowRight, BadgeCheck, Check, ChevronDown, ChevronLeft, ChevronRight, CreditCard, Crown, Gamepad2, Globe, Handshake, Info, KeyRound, LayoutGrid, Mail, Minus, Pencil, Play, Plus, Search, Send, ShieldCheck, ShoppingCart, Smartphone, Sparkles, Star, Store, Trash2, Trophy, UserRound, Zap } from "lucide-react";
import { toast } from "sonner";
import { checkoutSchema } from "@marketplace/validation";
import { formatMoney, type CartQuote, type Category, type OrderRequestView, type OrderView, type ProductDetail, type ProductListResponse, type ProductSummary, type SellerPublic } from "@marketplace/types";
import { cn } from "../lib/cn";
import { MarketSidebar } from "../components/shell";
import { useMode } from "../components/mode";
import { Badge, Button, EmptyState, Field, inputClass, NameAvatar, Panel, ProductArt, ProductCard, StatusPill, mutate, useRefresh } from "../components/kit";

export interface HomeData {
  categories: Category[];
  featured: ProductSummary[];
  hot: ProductSummary[];
  best: ProductSummary[];
  newest: ProductSummary[];
  topSellers: Array<{ slug: string; name: string; salesMinor: number; orders: number; platformOwned: boolean; rating?: number; reviewCount?: number }>;
  disclaimer: string;
}

const icons = { accounts: UserGlyph, phone: PhoneGlyph, card: CardGlyph, license: LicenseGlyph, gaming: GameGlyph };

export function HomeView({ data }: { data: HomeData }) {
  const { demo } = useMode();
  const [tab, setTab] = React.useState<"featured" | "best" | "newest">("featured");
  const lists = { featured: data.featured, best: data.best, newest: data.newest };
  const counts = Object.fromEntries(data.categories.map((category) => [category.slug, category.available ? category.productCount : null])) as Record<string, number | null>;
  counts.all = data.categories.reduce((sum, category) => sum + (category.available ? category.productCount : 0), 0);
  return (
    <div className="flex gap-4">
      <MarketSidebar counts={counts} />
      <div className="min-w-0 flex-1 space-y-5">
        <section className="neon-surface neon-pink relative overflow-hidden rounded-3xl bg-[#120818]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_40%,rgba(255,0,200,.45),transparent_28%),radial-gradient(circle_at_60%_80%,rgba(0,229,255,.28),transparent_32%)]" />
          <div className="relative p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">Digital goods marketplace</p>
            <h1 className="mt-3 text-4xl font-black leading-[0.95] md:text-6xl">
              <span className="text-[#FF4AD2]">BUY & SELL</span>
              <br />
              DIGITAL PRODUCTS
            </h1>
            <p className="mt-4 max-w-xl text-sm text-slate-300 md:text-base">Accounts · Licenses · Phone Numbers · Cards · Game Keys</p>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-200">
              <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-cyan-300" /> Secure payments</span>
              <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-amber-300" /> Instant delivery</span>
              <span className="inline-flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5 text-pink-300" /> Verified sellers</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/products">Shop Now <ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild size="lg" variant="secondary"><Link href="/seller/onboarding">Become a Seller</Link></Button>
            </div>
          </div>
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Shop by Category</h2>
            <Link href="/products" className="text-sm text-[#FF4BD8]">View all categories</Link>
          </div>
          <div className="neon-cycle grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {data.categories.map((category) => {
              const Icon = icons[category.icon];
              return (
                <Link key={category.slug} href={`/category/${category.slug}`} className="neon-surface flex flex-col items-center rounded-2xl px-3 py-5 text-center hover:-translate-y-1">
                  <span className="neon-icon"><Icon /></span>
                  <p className="text-sm font-semibold">{category.name}</p>
                  <p className="text-xs text-slate-400">{category.available ? `${category.productCount} listings` : "Unavailable"}</p>
                </Link>
              );
            })}
          </div>
        </section>
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Featured Products</h2>
            <div className="flex gap-1 text-xs">
              {(["featured", "best", "newest"] as const).map((key) => (
                <button key={key} onClick={() => setTab(key)} className={tab === key ? "rounded-full bg-[#FF00C8] px-3 py-1.5 font-semibold" : "rounded-full px-3 py-1.5 text-slate-400"}>{key === "best" ? "Best Selling" : key === "newest" ? "New Arrivals" : "Featured"}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {lists[tab].slice(0, 5).map((product) => <HomeCard key={product.id} product={product} />)}
          </div>
        </section>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(demo
            ? [
                ["Secure & Safe", "Demo payments are not live charges", ShieldCheck],
                ["Instant Delivery", "Vouchers release after a verified payment", Zap],
                ["Verified Sellers", "Sellers need admin approval", BadgeCheck],
                ["Buyer Protection", "Revealed vouchers are not restocked", UserRound],
              ]
            : [
                ["No Upfront Charge", "Placing an order request takes no payment", ShieldCheck],
                ["Seller Arranged", "The seller contacts you to complete each order", Zap],
                ["Verified Sellers", "Sellers need admin approval", BadgeCheck],
                ["Private Delivery", "Delivered items are visible only to you", UserRound],
              ]
          ).map(([title, body, Icon]) => {
            const Glyph = Icon as React.ComponentType<{ className?: string }>;
            return <div key={String(title)} className="neon-surface flex items-center gap-3 rounded-2xl p-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#FF00C8]/15 text-[#FF4BD8]"><Glyph className="h-5 w-5" /></span><span><span className="block text-sm font-semibold">{String(title)}</span><span className="block text-xs text-slate-400">{String(body)}</span></span></div>;
          })}
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">New Arrivals</h2><Link href="/products?sort=newest" className="text-sm text-[#FF4BD8]">View all</Link></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {data.newest.slice(0, 6).map((product) => (
              <Link key={product.id} href={`/product/${product.slug}`} className="neon-surface flex items-center gap-2 rounded-2xl p-2">
                <ProductArt monogram={product.monogram} accent={product.accent} gradient={product.gradient} image={product.images?.[0]?.url} className="h-12 w-12 shrink-0 rounded-xl" />
                <span className="min-w-0"><span className="block truncate text-xs font-semibold">{product.title}</span><span className="text-sm font-bold">{formatMoney(product.priceMinor)}</span></span>
              </Link>
            ))}
          </div>
        </section>
        <p className="text-xs text-slate-500">{data.disclaimer}</p>
      </div>
      <aside className="hidden w-[270px] shrink-0 space-y-3 xl:block">
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Top Sellers</h2><Link href="/sellers" className="text-xs text-[#FF4BD8]">View all</Link></div>
          <div className="space-y-3">
            {data.topSellers.slice(0, 4).map((seller) => (
              <Link key={seller.slug} href={`/seller/${seller.slug}`} className="flex items-center gap-2 text-sm">
                <NameAvatar name={seller.name} size="sm" />
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{seller.name}</span><span className="flex items-center gap-1 text-[11px] text-amber-300"><Star className="h-3 w-3 fill-amber-300" /> {seller.rating ? seller.rating.toFixed(1) : "New"} <span className="text-slate-500">({seller.reviewCount ?? 0})</span></span></span>
                <span className="text-xs text-cyan-300">{formatMoney(seller.salesMinor)}</span>
              </Link>
            ))}
          </div>
        </Panel>
        <div className="rounded-2xl border border-[#f0abfc]/70 bg-gradient-to-br from-[#6d28d9] via-[#a21caf] to-[#4c1d95] p-4 shadow-[0_0_18px_rgba(232,121,249,.4)]">
          <Crown className="h-6 w-6 text-amber-200" />
          <p className="mt-2 font-bold">Become a Seller</p>
          <p className="mt-1 text-xs text-white/75">{demo ? "List demo products after admin approval." : "List products after admin approval."}</p>
          <Button asChild className="mt-3 w-full"><Link href="/seller/onboarding">Start Selling <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
        <Panel className="space-y-2 p-4 text-sm">
          <h2 className="font-bold">Why Choose Us?</h2>
          {(demo ? ["Demo catalog across five categories", "Instant delivery after verified payment", "Approved sellers only", "Encrypted inventory", "Support tickets"] : ["Listings reviewed before going live", "Approved sellers only", "No payment on order requests", "Encrypted inventory", "Support tickets"]).map((item) => <p key={item} className="flex items-center gap-2 text-slate-200"><span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-400 text-[#04120a]"><Check className="h-3 w-3" /></span> {item}</p>)}
        </Panel>
      </aside>
    </div>
  );
}

function HomeCard({ product }: { product: ProductSummary }) {
  const [quantity, setQuantity] = React.useState(1);
  const [pending, setPending] = React.useState(false);
  const refresh = useRefresh();
  return (
    <article className="neon-surface neon-pink relative flex flex-col rounded-2xl p-2.5">
      <Link href={`/product/${product.slug}`} className="block overflow-hidden rounded-xl"><ProductArt monogram={product.monogram} accent={product.accent} gradient={product.gradient} image={product.images?.[0]?.url} className="aspect-[4/3]" /></Link>
      <span className="absolute left-4 top-4 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-pink-100">{cardKind(product.kind)}</span>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-2">
        <Link href={`/product/${product.slug}`} className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">{product.title}</Link>
        <Stars value={product.rating} />
        <p className={product.available > 0 ? "text-[11px] font-medium text-emerald-400" : "text-[11px] text-amber-300"}>{product.available > 0 ? `In Stock · ${product.available}` : "Out of stock"}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="font-bold">{formatMoney(product.priceMinor)}</span>
          <span className="flex items-center gap-1">
            <button type="button" className="grid h-6 w-6 place-items-center rounded-md border border-white/10 text-xs" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease">-</button>
            <span className="w-4 text-center text-xs">{quantity}</span>
            <button type="button" className="grid h-6 w-6 place-items-center rounded-md border border-white/10 text-xs" onClick={() => setQuantity((value) => Math.min(product.available || 1, value + 1))} aria-label="Increase">+</button>
            <button type="button" aria-label="Add to cart" disabled={pending || product.available < 1} className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-r from-[#FF00C8] to-[#8B5CF6] disabled:opacity-50" onClick={async () => {
              setPending(true);
              try { await mutate("/cart/items", "POST", { productId: product.id, variantId: product.defaultVariantId, quantity }); toast.success("Added to cart"); refresh(); }
              catch (error) { toast.error(error instanceof Error ? error.message : "Could not add to cart"); }
              finally { setPending(false); }
            }}><ShoppingCart className="h-3.5 w-3.5" /></button>
          </span>
        </div>
      </div>
    </article>
  );
}

function cardKind(kind: ProductSummary["kind"]) {
  if (kind === "ACCOUNT") return "Account";
  if (kind === "SUBSCRIPTION") return "License";
  if (kind === "PHONE_NUMBER") return "Phone / SMS";
  if (kind === "VIRTUAL_CARD") return "Card";
  if (kind === "GAMING") return "Gaming";
  return "Digital";
}

export function ProductsView({ title, subtitle, basePath, data, selected, sellers }: { title: string; subtitle: string; basePath: string; data: ProductListResponse; selected: Record<string, string | string[] | undefined>; sellers: Array<{ slug: string; name: string; salesMinor: number; rating?: number; reviewCount?: number }> }) {
  const { demo } = useMode();
  const platforms = asList(selected.platform);
  const [maxPrice, setMaxPrice] = React.useState(asText(selected.max) || "50");
  const regionOrder = ["GLOBAL", "US", "UK", "EU"] as const;
  const regions = [...data.facets.regions].sort((a, b) => regionOrder.indexOf(a.code) - regionOrder.indexOf(b.code));
  const marks = data.items.filter((item, index, list) => list.findIndex((other) => other.platform === item.platform) === index).slice(0, 4);
  const HeaderIcon = headerIcon(basePath);
  return (
    <div>
      <p className="text-xs text-slate-500">Home <span className="text-slate-600">/</span> <span className="text-slate-300">{title}</span></p>
      <div className="mt-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[#e879f9]/80 bg-[#160b28] text-[#FF4BD8] shadow-[0_0_18px_rgba(232,121,249,.45)]">
            <HeaderIcon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-sm text-slate-400">{subtitle}</p>
          </div>
        </div>
        <div className="hidden gap-2 md:flex">
          {marks.map((item) => (
            <span key={item.platform} className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 text-sm font-black" style={{ color: item.accent, background: `${item.accent}22`, boxShadow: `0 0 16px ${item.accent}55` }}>{item.monogram}</span>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_260px]">
        <form id="catalog-filters" action={basePath} className="neon-surface neon-violet h-fit space-y-4 rounded-2xl p-4 lg:sticky lg:top-[92px]">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Filters</h2><Link href={basePath} className="text-xs font-semibold text-[#FF4BD8]">Clear All</Link></div>
          {selected.q ? <input type="hidden" name="q" value={String(selected.q)} /> : null}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-300"><span>Price Range</span><span>$0 — ${maxPrice}</span></div>
            <input className="mt-3 w-full accent-[#FF00C8]" type="range" name="max" min="0" max="50" step="1" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} />
          </div>
          <fieldset className="space-y-1.5 text-sm"><legend className="mb-1 text-xs font-medium text-slate-300">Platform</legend>{data.facets.platforms.map((item) => <label key={item.name} className="flex items-center gap-2 text-slate-200"><input className="h-3.5 w-3.5 accent-[#FF00C8]" type="checkbox" name="platform" value={item.name} defaultChecked={platforms.includes(item.name)} /> <span className="flex-1">{item.name}</span> <span className="text-slate-500">({item.count})</span></label>)}</fieldset>
          <fieldset className="space-y-1.5 text-sm"><legend className="mb-1 text-xs font-medium text-slate-300">Region</legend>{regions.map((item) => <label key={item.code} className="flex items-center gap-2 text-slate-200"><input className="h-3.5 w-3.5 accent-[#FF00C8]" type="radio" name="region" value={item.code} defaultChecked={selected.region === item.code} /> <span className="flex-1">{regionName[item.code]}</span> <span className="text-slate-500">({item.count})</span></label>)}</fieldset>
          <fieldset className="space-y-1.5 text-sm"><legend className="mb-1 text-xs font-medium text-slate-300">Delivery</legend>{(data.facets.delivery ?? []).map((item) => <label key={item.mode} className="flex items-center gap-2 text-slate-200"><input className="h-3.5 w-3.5 accent-[#FF00C8]" type="radio" name="delivery" value={item.mode} defaultChecked={selected.delivery === item.mode} /> <span className="flex-1">{item.mode === "INSTANT" ? "Instant" : "Manual"}</span> <span className="text-slate-500">({item.count})</span></label>)}</fieldset>
          <fieldset className="space-y-1.5 text-sm"><legend className="mb-1 text-xs font-medium text-slate-300">Seller</legend>{data.facets.sellers.map((item) => <label key={item.slug} className="flex items-center gap-2 text-slate-200"><input className="h-3.5 w-3.5 accent-[#FF00C8]" type="radio" name="seller" value={item.slug} defaultChecked={selected.seller === item.slug} /> {item.name}</label>)}</fieldset>
          <label className="flex items-center gap-2 text-sm text-slate-200"><input className="h-3.5 w-3.5 accent-[#FF00C8]" type="checkbox" name="inStock" value="1" defaultChecked={selected.inStock === "1"} /> In stock only</label>
          <Button type="submit" className="w-full">Apply filters</Button>
        </form>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-300">{data.total} products found</p>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              Sort by:
              <select form="catalog-filters" name="sort" defaultValue={asText(selected.sort) || "popular"} className="rounded-xl border border-[#a855f7]/50 bg-[#0C1024] px-3 py-1.5 text-sm text-white outline-none" onChange={(event) => event.currentTarget.form?.requestSubmit()}>
                <option value="popular">Popular</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Rating</option>
                <option value="newest">Newest</option>
              </select>
            </label>
          </div>
          {data.items.length === 0 ? <div className="mt-4"><EmptyState title="No listings match" body="Try another search, price range, or category." href={basePath} action="Clear filters" /></div> : <div className="neon-cycle mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">{data.items.map((product) => <ProductCard key={product.id} product={product} layout="catalog" />)}</div>}
        </div>
        <aside className="hidden space-y-3 xl:block">
          <Panel className="p-4">
            <h2 className="font-bold">Top Sellers</h2>
            <div className="mt-3 space-y-3">
              {sellers.map((seller) => (
                <Link key={seller.slug} href={`/seller/${seller.slug}`} className="flex items-center gap-2 text-sm">
                  <NameAvatar name={seller.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{seller.name}</span>
                    <span className="flex items-center gap-1 text-[11px] text-amber-300"><Sparkles className="h-3 w-3" /> {seller.rating ? seller.rating.toFixed(1) : "New"} <span className="text-slate-500">({seller.reviewCount ?? 0})</span></span>
                  </span>
                </Link>
              ))}
            </div>
          </Panel>
          <Panel className="space-y-2 p-4 text-sm">
            <h2 className="font-bold">Shop with Confidence</h2>
            {(demo ? ["Verified sellers", "Instant delivery", "Secure and encrypted", "Support tickets"] : ["Verified sellers", "Reviewed listings", "Secure and encrypted", "Support tickets"]).map((item) => <p key={item} className="flex items-center gap-2 text-slate-200"><span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-400 text-[#04120a]"><Check className="h-3 w-3" /></span> {item}</p>)}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

export function ProductDetailView({ product }: { product: ProductDetail }) {
  const [quantity, setQuantity] = React.useState(1);
  const [frame, setFrame] = React.useState(0);
  const photos = product.images ?? [];
  const [tab, setTab] = React.useState<"Description" | "Delivery" | "Reviews" | "FAQ">("Description");
  const [pending, setPending] = React.useState(false);
  const variant = product.variants.find((item) => item.id === product.defaultVariantId) ?? product.variants[0];
  const router = useRouter();
  const refresh = useRefresh();
  const { demo } = useMode();
  if (!variant) return <EmptyState title="Unavailable" body="This listing has no purchasable option." href="/products" action="Back to products" />;
  async function add(goOrder = false) {
    setPending(true);
    try {
      await mutate("/cart/items", "POST", { productId: product.id, variantId: variant.id, quantity });
      refresh();
      if (goOrder) router.push("/cart");
      else toast.success("Added to cart");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add to cart");
    } finally {
      setPending(false);
    }
  }
  const category = categoryTitle[product.categorySlug] ?? product.categorySlug;
  const regionLabel = product.regions.includes("GLOBAL") ? "Global Region" : product.regions.join(", ");
  return (
    <div className="space-y-5">
      <p className="text-xs text-slate-500">Home <span className="px-1 text-slate-600">/</span> <Link href={`/category/${product.categorySlug}`} className="hover:text-white">{category}</Link> <span className="px-1 text-slate-600">/</span> <span className="text-[#FF4BD8]">{product.title}</span></p>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="grid gap-4 lg:grid-cols-[520px_minmax(0,1fr)]">
          <div className="grid w-full max-w-[520px] grid-cols-[97.6px_minmax(0,1fr)] items-start gap-2">
            <div className="grid gap-2">
              {photos.length
                ? photos.slice(0, 4).map((image, index) => (
                    <button key={image.id} type="button" aria-label={`Image ${index + 1}`} aria-pressed={frame === index} onClick={() => setFrame(index)} className={frame === index ? "relative aspect-square w-full overflow-hidden rounded-xl border border-[#FF00C8] shadow-[0_0_12px_rgba(255,0,200,.45)]" : "relative aspect-square w-full overflow-hidden rounded-xl border border-white/10"}>
                      <img src={image.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      {index === 3 && photos.length > 4 ? <span className="absolute inset-0 grid place-items-center bg-black/55 text-sm font-bold text-white">+{photos.length - 4}</span> : null}
                    </button>
                  ))
                : posterFrames.map((item, index) => (
                    <button key={item} type="button" aria-label={`Image ${index + 1}`} onClick={() => setFrame(index)} className={frame === index ? "relative aspect-square w-full overflow-hidden rounded-xl border border-[#FF00C8] shadow-[0_0_12px_rgba(255,0,200,.45)]" : "relative aspect-square w-full overflow-hidden rounded-xl border border-white/10"}>
                      <Poster product={product} frame={index} compact className="absolute inset-0 h-full w-full" />
                      {index === 3 && product.related.length > 0 ? <span className="absolute inset-0 grid place-items-center bg-black/55 text-sm font-bold text-white">+{product.related.length}</span> : null}
                    </button>
                  ))}
            </div>
            <Panel className="neon-pink aspect-square w-full self-start overflow-hidden p-1.5">
              {photos.length ? (
                <button type="button" className="relative block h-full w-full overflow-hidden rounded-xl" aria-label={photos.length > 1 ? "Next image" : product.title} onClick={() => setFrame((frame + 1) % photos.length)}>
                  <img src={photos[frame % photos.length]!.url} alt={product.title} className="absolute inset-0 h-full w-full object-cover" />
                </button>
              ) : (
                <Poster product={product} frame={frame} className="h-full w-full" />
              )}
            </Panel>
          </div>
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{product.title}</h1>
              {product.tags.includes("best") ? <span className="rounded-full bg-[#FF00C8] px-2.5 py-1 text-[11px] font-bold text-white">Bestseller</span> : demo ? <Badge>Demo</Badge> : null}
            </div>
            <p className="mt-2 text-sm text-slate-400">{product.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <Stars value={product.rating} />
              <span className="font-semibold">{product.rating ? product.rating.toFixed(1) : "New"}</span>
              <span className="text-slate-500">({product.reviewCount} reviews)</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">{product.salesCount} sold</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300"><Zap className="h-3 w-3" /> {product.delivery === "INSTANT" ? "Instant Delivery" : "Manual Delivery"}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-200"><Globe className="h-3 w-3" /> {regionLabel}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#e879f9]/50 bg-[#e879f9]/10 px-2.5 py-1 text-[11px] font-medium text-pink-200"><BadgeCheck className="h-3 w-3" /> Verified Seller</span>
            </div>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-4xl font-black">{formatMoney(variant.priceMinor)}</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-xl border border-[#a855f7]/50">
                <button className="px-3 py-2" type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity">-</button>
                <span className="w-8 text-center text-sm">{quantity}</span>
                <button className="px-3 py-2" type="button" onClick={() => setQuantity(Math.min(Math.max(variant.available, 1), quantity + 1))} aria-label="Increase quantity">+</button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button disabled={pending || variant.available < 1} onClick={() => add(false)}><ShoppingCart className="h-4 w-4" /> {pending ? "Adding..." : "Add to Cart"}</Button>
              <Button variant="secondary" disabled={pending || variant.available < 1} onClick={() => add(true)}>{pending ? "Adding..." : "Order Now"}</Button>
            </div>
            <p className="mt-3 text-xs text-amber-200">{product.disclaimer}</p>
          </div>
        </div>
        <div className="space-y-3">
          <Panel className="p-4 text-sm">
            <div className="flex items-center gap-3">
              <NameAvatar name={product.seller.name} />
              <div>
                <p className="text-xs text-slate-400">Sold by</p>
                <Link href={`/seller/${product.seller.slug}`} className="text-base font-semibold text-white">{product.seller.name}</Link>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-300"><Star className="h-3 w-3 fill-amber-300" /> {product.seller.rating ? product.seller.rating.toFixed(1) : "New"} <span className="text-slate-500">({product.seller.reviewCount})</span></p>
              </div>
            </div>
            <dl className="mt-4 space-y-1.5 text-sm">
              {demo ? <div className="flex justify-between gap-3"><dt className="text-slate-400">Response time</dt><dd>Demo desk</dd></div> : null}
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Completion rate</dt><dd>{product.seller.salesCount} delivered</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-400">Member since</dt><dd>{memberLabel(product.seller.memberSince)}</dd></div>
            </dl>
            <Button asChild variant="secondary" className="mt-4 w-full"><Link href={`/seller/${product.seller.slug}`}>View Store</Link></Button>
          </Panel>
          <Panel className="space-y-2 p-4 text-sm">
            <h2 className="font-semibold">{demo ? "Guarantee" : "How ordering works"}</h2>
            {(demo
              ? ["Working demo voucher", "Instant delivery after payment", "Replacement if not working", "Friendly 24/7 support"]
              : ["No payment is taken when you place a request", "The seller contacts you by email or Telegram", "Delivered items are visible only to you", "Open a support ticket if something goes wrong"]
            ).map((item) => <p key={item} className="flex items-start gap-2 text-slate-200"><span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-400 text-[#04120a]"><Check className="h-3 w-3" /></span> {item}</p>)}
          </Panel>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_640px]">
        <Panel className="p-4">
          <div className="flex gap-1 border-b border-white/10 text-sm">
            {(["Description", "Delivery", "Reviews", "FAQ"] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={tab === item ? "border-b-2 border-[#FF00C8] px-3 py-2 font-semibold text-[#FF4BD8]" : "px-3 py-2 text-slate-400"}>{item === "Reviews" ? `Reviews (${product.reviewCount})` : item}</button>)}
          </div>
          <div className="mt-4 text-sm text-slate-300">
            {tab === "Description" ? <div className="space-y-3"><p className="font-semibold text-white">About This Product</p><p>{product.description}</p><ul className="space-y-1">{product.deliveryNotes.map((note) => <li key={note} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {note}</li>)}</ul></div> : null}
            {tab === "Delivery" ? <ul className="space-y-1">{product.deliveryNotes.map((note) => <li key={note} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {note}</li>)}</ul> : null}
            {tab === "Reviews" ? product.reviews.length ? product.reviews.map((review) => <div key={review.id} className="flex items-start gap-3 border-b border-white/5 py-3"><NameAvatar name={review.author} size="sm" /><div><Stars value={review.rating} /><p className="mt-1 font-medium text-white">{review.author}</p><p>{review.comment}</p></div></div>) : <p>No reviews yet.</p> : null}
            {tab === "FAQ" ? product.faqs.length ? product.faqs.map((faq) => <div key={faq.q} className="py-2"><p className="font-medium text-white">{faq.q}</p><p>{faq.a}</p></div>) : <p>The seller has not added questions yet. Ask through a support ticket.</p> : null}
          </div>
        </Panel>
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Related products</h2><Link href={`/category/${product.categorySlug}`} className="text-sm text-[#FF4BD8]">View all</Link></div>
          <div className="grid grid-cols-3 gap-2">{product.related.slice(0, 3).map((item) => <RelatedTile key={item.id} product={item} />)}</div>
        </section>
      </div>
    </div>
  );
}

export function CartView({ quote, email: accountEmail }: { quote: CartQuote; email?: string }) {
  const router = useRouter();
  const refresh = useRefresh();
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [channel, setChannel] = React.useState<"email" | "telegram">("email");
  const [email, setEmail] = React.useState(accountEmail ?? "");
  const [telegram, setTelegram] = React.useState("");
  const [note, setNote] = React.useState("");
  const mode = useMode();
  const count = quote.items.reduce((sum, item) => sum + item.quantity, 0);
  async function change(task: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError(null);
    try {
      await task();
      toast.success(success);
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Cart update failed";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const nextEmail = email.trim();
    const nextTelegram = telegram.trim();
    const nextNote = note.trim();
    if (!nextEmail && !nextTelegram) {
      setError("Enter an email address or a Telegram handle.");
      return;
    }
    if (nextEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    if (nextTelegram && !/^@?[A-Za-z0-9_]{3,32}$/.test(nextTelegram)) {
      setError("Enter a Telegram username. It is stored as contact text only.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const saved = await mutate<OrderRequestView>("/order-requests", "POST", {
        email: nextEmail || undefined,
        telegram: nextTelegram || undefined,
        note: nextNote || undefined,
      });
      toast.success("Order request saved");
      refresh();
      router.push(`/order-requests/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the order request");
    } finally {
      setSubmitting(false);
    }
  }
  if (!quote.items.length) return <EmptyState title="Your cart is empty" body={mode.demo ? "Browse the demo catalog and add a listing. Prices are calculated on the server." : "Browse the catalog and add a listing to request it."} href="/products" action="Browse products" />;
  return (
    <form noValidate className="space-y-4" onSubmit={submit}>
      <p className="text-xs text-slate-500">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="px-1 text-slate-600">/</span>
        <span className="text-[#FF4BD8]">Cart</span>
      </p>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#FF00C8]/15 text-[#FF4BD8] shadow-[0_0_16px_rgba(255,0,200,.35)]"><ShoppingCart className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold">Order Request</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">{mode.demo ? "Add products and a contact method. Submitting stores a sample order request. No payment is taken, and Telegram is not contacted." : "Add products and a contact method. The seller contacts you to arrange the order. No payment is taken when you submit."}</p>
        </div>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Panel className="neon-pink p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold">Your Order ({count} {count === 1 ? "item" : "items"})</h2>
              <button type="button" className="text-sm font-medium text-cyan-300 disabled:opacity-50" disabled={busy || submitting} onClick={() => change(async () => { for (const item of quote.items) await mutate(`/cart/items/${item.id}`, "DELETE"); }, "Cart cleared")}>Clear Cart</button>
            </div>
            <div className="space-y-3">
              {quote.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-[#c084fc]/80 bg-[#0b1024] p-3 shadow-[0_0_18px_rgba(168,85,247,.28)]">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[#FF00C8] text-white" aria-hidden><Check className="h-3 w-3" /></span>
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl"><ProductArt monogram={item.monogram} accent={item.accent} gradient={["#241033", "#10131f"]} className="absolute inset-0 h-full w-full" /></span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/product/${item.slug}`} className="block truncate font-semibold hover:text-pink-200">{item.title}</Link>
                    <p className="truncate text-xs text-slate-400">{item.variantName} · Seller: {item.sellerName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-white/15 bg-[#0c1024]">
                      <button type="button" className="grid h-8 w-8 place-items-center text-slate-300 disabled:opacity-40" aria-label={`Decrease ${item.title}`} disabled={busy || submitting || item.quantity <= 1} onClick={() => change(() => mutate(`/cart/items/${item.id}`, "PATCH", { quantity: item.quantity - 1 }), "Quantity updated")}><Minus className="h-3.5 w-3.5" /></button>
                      <span className="w-5 text-center text-sm">{item.quantity}</span>
                      <button type="button" className="grid h-8 w-8 place-items-center text-slate-300 disabled:opacity-40" aria-label={`Increase ${item.title}`} disabled={busy || submitting || item.quantity >= Math.min(10, item.available)} onClick={() => change(() => mutate(`/cart/items/${item.id}`, "PATCH", { quantity: item.quantity + 1 }), "Quantity updated")}><Plus className="h-3.5 w-3.5" /></button>
                    </div>
                    <button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-red-300 disabled:opacity-40" aria-label={`Remove ${item.title}`} disabled={busy || submitting} onClick={() => change(() => mutate(`/cart/items/${item.id}`, "DELETE"), "Removed from cart")}><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="w-16 text-right text-sm font-semibold">{formatMoney(item.lineTotalMinor)}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel className="neon-pink space-y-3 p-4">
            <div>
              <h2 className="flex items-center gap-2 font-semibold"><UserRound className="h-4 w-4 text-[#FF4BD8]" /> Contact Information <span className="text-pink-300">(Required)</span></h2>
              <p className="mt-1 text-xs text-slate-400">Enter an email or a Telegram handle. One of them is enough.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => setChannel("email")} className={channel === "email" ? "flex items-center gap-2 rounded-xl border border-[#FF4BD8] bg-[#FF00C8]/10 px-3 py-2.5 text-sm shadow-[0_0_16px_rgba(255,0,200,.35)]" : "flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-300"}>
                <Mail className="h-4 w-4 text-[#FF4BD8]" />
                <span className="flex-1 text-left">Email Address</span>
                <span className={channel === "email" ? "grid h-5 w-5 place-items-center rounded-full bg-[#FF00C8] text-white" : "grid h-5 w-5 place-items-center rounded-full border border-white/20"}>{channel === "email" ? <Check className="h-3 w-3" /> : null}</span>
              </button>
              <button type="button" onClick={() => setChannel("telegram")} className={channel === "telegram" ? "flex items-center gap-2 rounded-xl border border-[#FF4BD8] bg-[#FF00C8]/10 px-3 py-2.5 text-sm shadow-[0_0_16px_rgba(255,0,200,.35)]" : "flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-slate-300"}>
                <Send className="h-4 w-4 text-cyan-300" />
                <span className="flex-1 text-left">Telegram</span>
                <span className={channel === "telegram" ? "grid h-5 w-5 place-items-center rounded-full bg-[#FF00C8] text-white" : "grid h-5 w-5 place-items-center rounded-full border border-white/20"}>{channel === "telegram" ? <Check className="h-3 w-3" /> : null}</span>
              </button>
            </div>
            {channel === "email" ? (
              <label className="block space-y-1.5 text-sm" htmlFor="order-email">
                <span>Email Address <span className="text-pink-400">*</span></span>
                <input id="order-email" type="email" autoComplete="email" className={inputClass} placeholder="you@email.com" value={email} onChange={(event) => setEmail(event.target.value)} />
                <span className="block text-xs text-slate-400">{mode.email ? "Saved with this request. We email you a confirmation, and the seller replies here." : mode.demo ? "Saved with this request so we can reply. This demo does not send email." : "Saved with this request so the seller can reply."}</span>
              </label>
            ) : (
              <label className="block space-y-1.5 text-sm" htmlFor="order-telegram">
                <span>Telegram <span className="text-pink-400">*</span></span>
                <input id="order-telegram" autoComplete="off" className={inputClass} placeholder="@username" value={telegram} onChange={(event) => setTelegram(event.target.value)} />
                <span className="block text-xs text-slate-400">{mode.demo ? "Stored as a username only. This demo does not message Telegram." : "Stored as a username only. The seller messages you on Telegram."}</span>
              </label>
            )}
            {channel !== "telegram" && telegram.trim() ? <p className="text-xs text-cyan-200">Telegram {telegram.trim()} is included.</p> : null}
            {channel !== "email" && email.trim() ? <p className="text-xs text-cyan-200">Email {email.trim()} is included.</p> : null}
          </Panel>
          <Panel className="neon-pink space-y-2 p-4">
            <h2 className="flex items-center gap-2 font-semibold"><Pencil className="h-4 w-4 text-[#FF4BD8]" /> Order Note <span className="text-sm font-normal text-slate-400">(Optional)</span></h2>
            <textarea className={cn(inputClass, "min-h-24 resize-y")} maxLength={500} placeholder="Any special request or additional information..." value={note} onChange={(event) => setNote(event.target.value)} />
            <p className="text-right text-xs text-slate-500">{note.length} / 500</p>
          </Panel>
        </div>
        <div className="space-y-3 lg:sticky lg:top-[92px]">
          <Panel className="neon-pink space-y-3 p-4">
            <h2 className="font-semibold">Order Summary</h2>
            <Row label={`Subtotal (${count} ${count === 1 ? "item" : "items"})`} value={formatMoney(quote.subtotalMinor)} />
            {quote.discountMinor > 0 ? <Row label="Discount" value={formatMoney(quote.discountMinor)} /> : null}
            <Row label={`Platform fee (${(quote.feeBps / 100).toFixed(0)}%)`} value={formatMoney(quote.feeMinor)} />
            <div className="flex items-center justify-between text-sm text-slate-300"><span>Order Type</span><span>Order Request</span></div>
            <div className="flex items-center justify-between text-sm text-slate-300"><span>Payment</span><span className="rounded-md bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">Not Required</span></div>
            {quote.couponMessage ? <p className="text-xs text-cyan-200">{quote.couponMessage}</p> : null}
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-lg font-bold"><span>Total (Reference Only)</span><span className="text-[#FF4BD8]">{formatMoney(quote.totalMinor)}</span></div>
          </Panel>
          <Panel className="flex gap-3 p-4 text-sm text-slate-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#FF4BD8]" />
            <p><span className="font-semibold text-white">This is an order request, not a payment.</span> Submitting saves the request and the server total. No card, PayPal, wallet, or crypto charge is made, and inventory is not delivered. A Telegram handle is stored as contact text only.</p>
          </Panel>
          <Panel className="space-y-2 p-4 text-sm">
            <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-[#FF4BD8]" /> Why Order From Us?</h2>
            {["Verified sellers", "Encrypted inventory", "Support tickets", "No charge on this request"].map((item) => (
              <p key={item} className="flex items-center gap-2 text-slate-200"><span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-400 text-[#04120a]"><Check className="h-3 w-3" /></span> {item}</p>
            ))}
          </Panel>
          {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
          <Button type="submit" size="lg" className="w-full" disabled={busy || submitting}><Send className="h-4 w-4" />{submitting ? "Saving request..." : "Submit Order Request"}</Button>
        </div>
      </div>
    </form>
  );
}

export function OrderRequestResult({ request }: { request: OrderRequestView }) {
  const { demo, email } = useMode();
  const count = request.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <p className="text-xs text-slate-500">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="px-1 text-slate-600">/</span>
        <Link href="/cart" className="hover:text-white">Cart</Link>
        <span className="px-1 text-slate-600">/</span>
        <span className="text-[#FF4BD8]">{request.number}</span>
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Order request saved</h1>
        <StatusPill status={request.status} />
      </div>
      <p className="text-sm text-slate-300">{demo ? "Status is awaiting contact. This sample request is not paid and not delivered. No payment step was created." : `The seller will contact you to arrange this order. No payment was taken.${email && request.email ? " A confirmation was sent to your email." : ""}`}</p>
      <Panel className="space-y-2 p-4 text-sm">
        <h2 className="font-semibold">Contact</h2>
        {request.email ? <p>Email: {request.email}</p> : null}
        {request.telegram ? <p>Telegram: {request.telegram} {demo ? <span className="text-slate-400">(contact text only, not messaged)</span> : null}</p> : null}
        {request.note ? <p className="text-slate-300">Note: {request.note}</p> : null}
      </Panel>
      <Panel className="space-y-3 p-4">
        <h2 className="font-semibold">Requested items ({count})</h2>
        {request.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0"><span className="block truncate font-medium">{item.title}</span><span className="text-xs text-slate-400">{item.variantName} · Seller: {item.sellerName} · × {item.quantity}</span></span>
            <span className="font-semibold">{formatMoney(item.lineTotalMinor)}</span>
          </div>
        ))}
        <Row label="Subtotal" value={formatMoney(request.subtotalMinor)} />
        {request.discountMinor > 0 ? <Row label="Discount" value={formatMoney(request.discountMinor)} /> : null}
        <Row label={`Platform fee (${(request.feeBps / 100).toFixed(0)}%)`} value={formatMoney(request.feeMinor)} />
        <Row label="Total (Reference Only)" value={formatMoney(request.totalMinor)} strong />
      </Panel>
      <p className="text-sm text-slate-400">No card, PayPal, wallet, or crypto charge was made. Inventory was not reserved or revealed.</p>
      <Button asChild><Link href="/products">Continue browsing</Link></Button>
    </div>
  );
}

export function CheckoutView({ quote, email }: { quote: CartQuote; email?: string }) {
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(checkoutSchema), defaultValues: { email: email ?? "", paymentMethod: "card" as const, acceptTerms: undefined as unknown as true } });
  const [error, setError] = React.useState<string | null>(null);
  if (!quote.items.length) return <EmptyState title="Nothing to check out" body="Your cart is empty." href="/products" action="Browse products" />;
  return (
    <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]" onSubmit={form.handleSubmit(async (values) => {
      setError(null);
      try {
        const result = await mutate<{ order: OrderView }>("/orders", "POST", values);
        router.push(`/checkout/result?order=${result.order.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Checkout failed");
      }
    })}>
      <div className="space-y-4">
        <Panel className="p-4"><h1 className="text-xl font-bold">Checkout</h1><p className="text-sm text-slate-400">The server recalculates every total. Card numbers are not collected.</p></Panel>
        <Panel className="space-y-3 p-4">
          <h2 className="font-semibold">Your cart ({quote.items.length})</h2>
          {quote.items.map((item) => <div key={item.id} className="flex justify-between text-sm"><span>{item.title} × {item.quantity}</span><span>{formatMoney(item.lineTotalMinor)}</span></div>)}
        </Panel>
        <Panel className="space-y-3 p-4">
          <Field label="Email address" error={form.formState.errors.email?.message}><input className={inputClass} {...form.register("email")} /></Field>
          <p className="text-sm font-medium">Payment method</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[["card", "Credit / debit card"], ["paypal", "PayPal"], ["wallet", "Refund credit"]].map(([id, label]) => (
              <label key={id} className="flex items-center gap-2 rounded-xl border border-white/10 p-3 text-sm"><input type="radio" value={id} {...form.register("paymentMethod")} /> {label}</label>
            ))}
          </div>
          <p className="text-xs text-slate-400">Mock provider only. A hosted card field would be used with an approved processor. Do not enter a real card number.</p>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" onChange={(event) => form.setValue("acceptTerms", event.target.checked ? true : (undefined as unknown as true), { shouldValidate: true })} /> I agree to the demo terms. This does not buy a live product.</label>
          {form.formState.errors.acceptTerms ? <p className="text-xs text-red-400">Accept the terms to continue.</p> : null}
        </Panel>
      </div>
      <QuoteCard quote={quote} error={error} action={<Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Creating order..." : `Continue · ${formatMoney(quote.totalMinor)}`}</Button>} />
    </form>
  );
}

export function ResultView({ order }: { order: OrderView | null }) {
  const refresh = useRefresh();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  if (!order) return <EmptyState title="Order not found" body="This payment result is missing or belongs to another session." href="/account/orders" action="View orders" />;
  return (
    <Panel className="mx-auto max-w-2xl space-y-4 p-6">
      <p className="text-sm text-slate-400">{order.number}</p>
      <h1 className="text-2xl font-bold">Payment status</h1>
      <StatusPill status={order.status} />
      <p className="text-sm text-slate-300">Payment {order.paymentStatus.replaceAll("_", " ").toLowerCase()} via the mock {order.paymentMethod} adapter. Total {formatMoney(order.totalMinor)}.</p>
      {order.canConfirmDemo ? <p className="rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">No charge has been made. Confirming records a demo payment webhook and then reserves inventory.</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {order.canConfirmDemo ? <Button disabled={pending} onClick={async () => {
        setPending(true); setError(null);
        try { await mutate(`/payments/${order.paymentId}/demo-confirm`, "POST"); refresh(); }
        catch (err) { setError(err instanceof Error ? err.message : "Webhook was not accepted"); }
        finally { setPending(false); }
      }}>{pending ? "Recording webhook..." : "Record demo payment webhook"}</Button> : null}
      {order.status === "DELIVERED" ? <Button asChild><Link href={`/account/orders/${order.id}/delivery`}>View delivery</Link></Button> : null}
      {order.status === "AWAITING_SELLER" ? <p className="text-sm text-slate-300">Payment is recorded. The seller still has to confirm manual fulfillment.</p> : null}
      {order.status === "MANUAL_REVIEW" ? <p className="text-sm text-amber-200">Payment was captured in the demo ledger, but inventory could not be reserved. An admin needs to refund or review it.</p> : null}
      <Link href={`/account/orders/${order.id}`} className="block text-sm text-cyan-300">Order details</Link>
    </Panel>
  );
}

export function StorefrontView({ seller, products }: { seller: SellerPublic; products: ProductSummary[] }) {
  return (
    <div className="space-y-4">
      <Panel className="p-6"><div className="flex items-center gap-3"><NameAvatar name={seller.name} /><div><Badge>{seller.platformOwned ? "Platform inventory" : "Reseller"}</Badge><h1 className="mt-2 text-3xl font-bold">{seller.name}</h1></div></div><p className="mt-3 max-w-2xl text-sm text-slate-300">{seller.bio}</p><p className="mt-2 text-sm text-slate-400">{seller.salesCount} delivered · {seller.reviewCount} reviews · since {seller.memberSince.slice(0, 10)}</p></Panel>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </div>
  );
}

const SELLER_PAGE_SIZE = 8;
const HIDDEN_SELLER_CATEGORIES = new Set(["phone-numbers", "virtual-cards"]);

type SellerPill = "all" | "top" | "verified" | "new";
type SellerLevelName = "Platinum" | "Gold" | "Silver" | "New";
type SellerSortKey = "best" | "rating" | "orders" | "newest" | "name";

function sellerLevel(orders: number): SellerLevelName {
  if (orders >= 500) return "Platinum";
  if (orders >= 100) return "Gold";
  if (orders >= 30) return "Silver";
  return "New";
}

function visibleSellerCategories(seller: SellerPublic) {
  return seller.categories.filter((category) => !HIDDEN_SELLER_CATEGORIES.has(category.slug));
}

function successRate(seller: SellerPublic) {
  if (seller.orderedCount < 1) return null;
  return (seller.deliveredOrders / seller.orderedCount) * 100;
}

function formatSuccess(rate: number) {
  const rounded = Math.round(rate * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function compareSellers(a: SellerPublic, b: SellerPublic, sort: SellerSortKey) {
  if (sort === "rating") return b.rating - a.rating || b.reviewCount - a.reviewCount || a.name.localeCompare(b.name);
  if (sort === "orders") return b.orderedCount - a.orderedCount || b.deliveredOrders - a.deliveredOrders || a.name.localeCompare(b.name);
  if (sort === "newest") return b.memberSince.localeCompare(a.memberSince) || a.name.localeCompare(b.name);
  if (sort === "name") return a.name.localeCompare(b.name);
  return b.deliveredOrders - a.deliveredOrders || b.rating - a.rating || b.orderedCount - a.orderedCount || a.name.localeCompare(b.name);
}

function SellerAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  return <NameAvatar name={name} size={size} />;
}

function SellerStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-black/20 px-2 py-2">
      <div className="flex items-center justify-center gap-1 text-sm font-bold text-white">{icon}{value}</div>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

export function SellersView({ sellers }: { sellers: SellerPublic[] }) {
  const [pill, setPill] = React.useState<SellerPill>("all");
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [rating, setRating] = React.useState("any");
  const [sort, setSort] = React.useState<SellerSortKey>("best");
  const [page, setPage] = React.useState(1);

  const topSlugs = React.useMemo(() => {
    const ranked = [...sellers].filter((seller) => seller.deliveredOrders > 0).sort((a, b) => compareSellers(a, b, "best"));
    return new Set(ranked.slice(0, 3).map((seller) => seller.slug));
  }, [sellers]);
  const categories = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const seller of sellers) {
      for (const item of visibleSellerCategories(seller)) map.set(item.slug, item.name);
    }
    return [...map.entries()].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [sellers]);
  const ranked = React.useMemo(
    () => [...sellers].filter((seller) => seller.deliveredOrders > 0).sort((a, b) => compareSellers(a, b, "best")).slice(0, 3),
    [sellers],
  );

  React.useEffect(() => { setPage(1); }, [pill, query, category, rating, sort]);

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const minRating = rating === "any" ? null : Number(rating);
    return sellers.filter((seller) => {
      if (pill === "top" && !topSlugs.has(seller.slug)) return false;
      if (pill === "verified" && !seller.verified) return false;
      if (pill === "new" && sellerLevel(seller.orderedCount) !== "New") return false;
      if (needle && !seller.name.toLowerCase().includes(needle)) return false;
      if (category !== "all" && !visibleSellerCategories(seller).some((item) => item.slug === category)) return false;
      if (minRating !== null && (seller.reviewCount < 1 || seller.rating < minRating)) return false;
      return true;
    }).sort((a, b) => compareSellers(a, b, sort));
  }, [sellers, pill, topSlugs, query, category, rating, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / SELLER_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = filtered.length === 0 ? 0 : (currentPage - 1) * SELLER_PAGE_SIZE + 1;
  const end = Math.min(currentPage * SELLER_PAGE_SIZE, filtered.length);
  const visible = filtered.slice((currentPage - 1) * SELLER_PAGE_SIZE, currentPage * SELLER_PAGE_SIZE);
  const counts = {
    all: sellers.length,
    top: topSlugs.size,
    verified: sellers.filter((seller) => seller.verified).length,
    new: sellers.filter((seller) => sellerLevel(seller.orderedCount) === "New").length,
  };
  const pills: Array<{ id: SellerPill; label: string; icon?: React.ReactNode }> = [
    { id: "all", label: "All Sellers" },
    { id: "top", label: "Top Sellers", icon: <Trophy className="h-3.5 w-3.5" /> },
    { id: "verified", label: "Verified Sellers", icon: <BadgeCheck className="h-3.5 w-3.5" /> },
    { id: "new", label: "New Sellers", icon: <Star className="h-3.5 w-3.5" /> },
  ];
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs text-slate-500">Home <span className="text-slate-600">/</span> <span className="text-slate-300">Sellers</span></p>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#e879f9]/80 bg-[#160b28] text-[#FF4BD8] shadow-[0_0_18px_rgba(232,121,249,.45)]">
            <Store className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sellers</h1>
            <p className="text-sm text-slate-400">Explore our verified sellers, check their ratings, and buy with confidence. All sellers are reviewed for quality, reliability, and secure delivery.</p>
          </div>
        </div>
      </header>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_292px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap gap-2">
          {pills.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={pill === item.id}
              onClick={() => setPill(item.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition",
                pill === item.id
                  ? "bg-gradient-to-r from-[#FF00C8] to-[#C026D3] text-white shadow-[0_0_18px_rgba(255,0,200,.55)]"
                  : "border border-white/10 bg-[#12182e] text-slate-200 hover:border-[#FF4BD8]/50",
              )}
            >
              {item.icon}
              {item.label}
              <span className={pill === item.id ? "text-white/80" : "text-slate-400"}>({counts[item.id].toLocaleString("en-US")})</span>
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-slate-400">Search</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sellers by name..." aria-label="Search sellers by name" className={cn(inputClass, "h-11 pl-9")} />
            </span>
          </label>
          <FilterSelect label="Category" value={category} onChange={setCategory}>
            <option value="all">All Categories</option>
            {categories.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Rating" value={rating} onChange={setRating}>
            <option value="any">Any Rating</option>
            <option value="4.5">4.5 and up</option>
            <option value="4">4.0 and up</option>
            <option value="3">3.0 and up</option>
          </FilterSelect>
          <FilterSelect label="Sort By" value={sort} onChange={(value) => setSort(value as SellerSortKey)}>
            <option value="best">Best Match</option>
            <option value="rating">Highest rating</option>
            <option value="orders">Most orders</option>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
          </FilterSelect>
        </div>

        {visible.length === 0 ? (
          <Panel className="p-8 text-center">
            <h2 className="font-semibold">No sellers match</h2>
            <p className="mt-1 text-sm text-slate-400">No loaded seller fits these filters.</p>
          </Panel>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {visible.map((seller) => {
              const rate = successRate(seller);
              const cats = visibleSellerCategories(seller);
              return (
                <article key={seller.slug} className="neon-surface neon-violet flex flex-col rounded-2xl p-3.5">
                  <div className="flex items-start gap-3">
                    <SellerAvatar name={seller.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="line-clamp-2 font-bold leading-tight">{seller.name}</h2>
                        {seller.verified ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300"><BadgeCheck className="h-3 w-3" /> Verified</span> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">{cats.length ? cats.map((item) => item.name).join(" · ") : "No active listings"}</p>
                    </div>
                  </div>
                  <p className="mt-3 flex items-center gap-1 text-sm text-slate-200">
                    <Star className={cn("h-3.5 w-3.5", seller.reviewCount > 0 ? "fill-amber-300 text-amber-300" : "text-slate-500")} />
                    {seller.reviewCount > 0 ? <><span className="font-semibold">{seller.rating.toFixed(1)}</span> <span className="text-slate-400">({seller.reviewCount.toLocaleString("en-US")})</span></> : <span className="text-slate-400">No reviews</span>}
                  </p>
                  <div className={cn("mt-3 grid gap-2 text-center", rate === null ? "grid-cols-1" : "grid-cols-2")}>
                    <SellerStat icon={<ShoppingCart className="h-3.5 w-3.5 text-pink-300" />} value={seller.orderedCount.toLocaleString("en-US")} label={seller.orderedCount === 1 ? "Order" : "Orders"} />
                    {rate !== null ? <SellerStat icon={<BadgeCheck className="h-3.5 w-3.5 text-emerald-300" />} value={formatSuccess(rate)} label="Success" /> : null}
                  </div>
                  <Button asChild className="mt-3 w-full rounded-full"><Link href={`/seller/${seller.slug}`}>View Store <ArrowRight className="h-4 w-4" /></Link></Button>
                </article>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
          <p>{filtered.length === 0 ? "Showing 0 of 0 sellers" : `Showing ${start}–${end} of ${filtered.length.toLocaleString("en-US")} sellers`}</p>
          {pageCount > 1 ? (
            <nav className="flex items-center gap-1" aria-label="Seller pages">
              <button type="button" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 disabled:opacity-40" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <button key={number} type="button" onClick={() => setPage(number)} className={cn("grid h-8 min-w-8 place-items-center rounded-lg px-2 text-sm", number === currentPage ? "bg-[#FF00C8] font-semibold text-white" : "border border-white/10 text-slate-300")} aria-current={number === currentPage ? "page" : undefined}>{number}</button>
              ))}
              <button type="button" className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 disabled:opacity-40" onClick={() => setPage(currentPage + 1)} disabled={currentPage === pageCount} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
            </nav>
          ) : null}
        </div>
      </div>

      <aside className="space-y-4">
        <Panel className="neon-pink p-4">
          <h2 className="mb-3 flex items-center gap-2 font-bold"><Trophy className="h-4 w-4 text-amber-300" /> Top Sellers</h2>
          {ranked.length === 0 ? <p className="text-sm text-slate-400">No completed orders yet.</p> : (
            <ol className="space-y-3">
              {ranked.map((seller, index) => (
                <li key={seller.slug}>
                  <Link href={`/seller/${seller.slug}`} className="flex items-center gap-3 rounded-xl px-1 py-1 hover:bg-white/5">
                    <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-[#140818]", index === 0 ? "bg-amber-300" : index === 1 ? "bg-slate-300" : "bg-orange-400")}>{index + 1}</span>
                    <SellerAvatar name={seller.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{seller.name}</span>
                      {seller.reviewCount > 0 ? (
                        <span className="flex items-center gap-1 text-xs text-slate-300"><Star className="h-3 w-3 fill-amber-300 text-amber-300" /> {seller.rating.toFixed(1)} <span className="text-slate-400">({seller.reviewCount.toLocaleString("en-US")})</span></span>
                      ) : <span className="text-xs text-slate-400">No reviews</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <Panel className="neon-pink p-4">
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#FF00C8]/15 text-[#FF4BD8]"><Handshake className="h-6 w-6" /></div>
          <h2 className="text-lg font-bold">Become a Seller</h2>
          <p className="mt-1 text-sm text-slate-300">Start selling digital products and grow your business with us.</p>
          <Button asChild className="mt-4 w-full rounded-full"><Link href="/seller/onboarding">Apply as a Seller <ArrowRight className="h-4 w-4" /></Link></Button>
        </Panel>
      </aside>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-slate-400">{label}</span>
      <span className="relative block">
        <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label} className={cn(inputClass, "h-11 appearance-none pr-9")}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  );
}

export function SupportView() {
  const { demo } = useMode();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="space-y-3 p-6"><h1 className="text-2xl font-bold">Support</h1><p className="text-sm text-slate-300">{demo ? "The demo desk stores tickets in the marketplace. No email provider is configured, so replies appear in the ticket thread." : "Tickets are stored with your account. Replies from the marketplace team appear in the ticket thread."}</p><Button asChild><Link href="/account/tickets">Open tickets</Link></Button></Panel>
      <Panel className="space-y-3 p-6 text-sm text-slate-300"><h2 className="font-semibold text-white">Common questions</h2>{demo ? <p>Delivery is a demo voucher, not a password or card number.</p> : <p>Order requests take no payment. The seller contacts you to arrange each order.</p>}<p>Seller listings stay pending until an admin approves them.</p><p>Refunds are an admin action and do not restock revealed inventory.</p></Panel>
    </div>
  );
}

function QuoteCard({ quote, error, onCoupon, action }: { quote: CartQuote; error: string | null; onCoupon?: (code: string) => void; action?: React.ReactNode }) {
  const [code, setCode] = React.useState("");
  return (
    <Panel className="h-fit space-y-3 p-4">
      <h2 className="font-semibold">Order summary</h2>
      <Row label="Subtotal" value={formatMoney(quote.subtotalMinor)} />
      <Row label="Discount" value={formatMoney(quote.discountMinor)} />
      <Row label={`Platform fee (${(quote.feeBps / 100).toFixed(0)}%)`} value={formatMoney(quote.feeMinor)} />
      <Row label="Total" value={formatMoney(quote.totalMinor)} strong />
      {quote.couponMessage ? <p className="text-xs text-cyan-200">{quote.couponMessage}</p> : null}
      {onCoupon ? <div className="flex gap-2"><input className={inputClass} value={code} onChange={(event) => setCode(event.target.value)} placeholder="Coupon" /><Button type="button" variant="secondary" onClick={() => onCoupon(code)}>Apply</Button></div> : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      {action ?? <Button asChild className="w-full"><Link href="/checkout">Checkout</Link></Button>}
    </Panel>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={strong ? "flex justify-between text-lg font-bold" : "flex justify-between text-sm text-slate-300"}><span>{label}</span><span>{value}</span></div>;
}

const regionName = { GLOBAL: "Global", US: "US", UK: "UK", EU: "EU" } as const;

const categoryTitle: Record<string, string> = {
  "digital-accounts": "Digital Accounts",
  "phone-numbers": "Phone Numbers / SMS",
  "virtual-cards": "Virtual Cards",
  subscriptions: "Subscriptions / Licenses",
  gaming: "Gaming Products",
};

function memberLabel(iso: string) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [year, month] = iso.slice(0, 10).split("-");
  const index = Number(month) - 1;
  return index >= 0 && index < 12 ? `${months[index]} ${year}` : iso.slice(0, 7);
}

const posterFrames = ["poster", "mark", "play", "grid"] as const;

function kindLabel(kind: ProductDetail["kind"]) {
  if (kind === "ACCOUNT" || kind === "SUBSCRIPTION") return "Premium Account";
  if (kind === "GAMING") return "Game Key";
  if (kind === "PHONE_NUMBER") return "Number";
  if (kind === "VIRTUAL_CARD") return "Virtual Card";
  return "Digital Product";
}

function Poster({ product, frame, compact = false, className }: { product: ProductDetail; frame: number; compact?: boolean; className?: string }) {
  const label = kindLabel(product.kind);
  return (
    <div className={cn("relative flex aspect-square items-center justify-center overflow-hidden", className)} style={{ background: `radial-gradient(circle at 30% 20%, ${product.accent}55, transparent 36%), linear-gradient(160deg, ${product.gradient[0]}, ${product.gradient[1]})` }}>
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:18px_18px]" />
      {frame === 1 ? <span className={compact ? "relative text-lg font-black" : "relative text-7xl font-black"} style={{ color: product.accent, textShadow: `0 0 18px ${product.accent}` }}>{product.monogram}</span> : null}
      {frame === 2 ? <span className="relative grid place-items-center rounded-full border-2 border-white/80 bg-black/40" style={{ width: compact ? 28 : 72, height: compact ? 28 : 72 }}><Play className={compact ? "h-3 w-3 fill-white text-white" : "ml-1 h-7 w-7 fill-white text-white"} /></span> : null}
      {frame === 3 ? <span className={compact ? "relative text-[10px] font-black text-white" : "relative text-5xl font-black tracking-tight text-white"}>{product.platform}</span> : null}
      {frame === 0 ? (
        <span className="relative px-3 text-center">
          <span className="mx-auto grid place-items-center rounded-full border-2 border-white/85 bg-black/35" style={{ width: compact ? 22 : 64, height: compact ? 22 : 64 }}><Play className={compact ? "h-2.5 w-2.5 fill-white text-white" : "ml-1 h-6 w-6 fill-white text-white"} /></span>
          <span className={compact ? "mt-1 block text-[9px] font-black leading-none" : "mt-3 block text-3xl font-black tracking-tight"} style={{ color: product.accent, textShadow: `0 0 16px ${product.accent}` }}>{compact ? product.monogram : product.platform.toUpperCase()}</span>
          {compact ? null : <span className="mt-1 block text-sm font-semibold text-white">{label}</span>}
        </span>
      ) : null}
    </div>
  );
}

function RelatedTile({ product }: { product: ProductSummary }) {
  return (
    <Link href={`/product/${product.slug}`} className="neon-surface block rounded-2xl p-2">
      <ProductArt monogram={product.monogram} accent={product.accent} gradient={product.gradient} image={product.images?.[0]?.url} className="aspect-square w-full rounded-xl" />
      <p className="mt-2 line-clamp-2 text-xs font-semibold leading-4">{product.title}</p>
      <p className="mt-1 text-sm font-bold">{formatMoney(product.priceMinor)}</p>
    </Link>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, index) => <Star key={index} className={index < Math.round(value) ? "h-3.5 w-3.5 fill-amber-300 text-amber-300" : "h-3.5 w-3.5 text-slate-600"} />)}
    </span>
  );
}

function headerIcon(basePath: string) {
  if (basePath.includes("phone")) return Smartphone;
  if (basePath.includes("virtual")) return CreditCard;
  if (basePath.includes("subscription")) return BadgeCheck;
  if (basePath.includes("gaming")) return Gamepad2;
  if (basePath.includes("digital")) return UserRound;
  return LayoutGrid;
}

function asList(value: string | string[] | undefined) { return Array.isArray(value) ? value : value ? [value] : []; }
function asText(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function UserGlyph() { return <Sparkles className="h-5 w-5" />; }
function PhoneGlyph() { return <Zap className="h-5 w-5" />; }
function CardGlyph() { return <CreditCard className="h-5 w-5" />; }
function LicenseGlyph() { return <KeyRound className="h-5 w-5" />; }
function GameGlyph() { return <Gamepad2 className="h-5 w-5" />; }
