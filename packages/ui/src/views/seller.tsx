"use client";

import * as React from "react";
import type { ReactNode } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { toast } from "sonner";
import { FileText, Package, Plus, Settings, ShoppingCart, Star, XCircle } from "lucide-react";
import { inventorySchema, onboardingSchema, payoutSchema, productFormSchema } from "@marketplace/validation";
import { formatMoney, type OrderView, type ProductSummary, type SellerPublic } from "@marketplace/types";
import { Badge, Button, Field, NameAvatar, Panel, StatusPill, inputClass, mutate, useRefresh } from "../components/kit";

const SellerBaseContext = React.createContext("/seller");

const sellerPanelPath = /^\/seller\/(dashboard|products|orders|customers|earnings|inventory|payouts|reviews|settings)(\/|$)/;

export function SellerBaseProvider({ base, children }: { base: string; children: React.ReactNode }) {
  return <SellerBaseContext.Provider value={base}>{children}</SellerBaseContext.Provider>;
}

export function useSellerHref() {
  const base = React.useContext(SellerBaseContext);
  return (href: string) => (base === "/account/seller" && sellerPanelPath.test(href) ? `/account${href}` : href);
}

function Link({ href, ...props }: React.ComponentProps<typeof NextLink>) {
  const to = useSellerHref();
  return <NextLink href={typeof href === "string" ? to(href) : href} {...props} />;
}

type SellerRowStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";

export interface SellerActivityRow {
  id: string;
  number: string;
  title: string;
  productId: string;
  categorySlug: string;
  monogram: string;
  accent: string;
  contact: string;
  quantity: number;
  amountMinor: number;
  status: SellerRowStatus;
  createdAt: string;
  updatedAt: string;
  requestedLabel: string;
  note: string;
  kindLabel: string;
  source: "request" | "order";
  canFulfill: boolean;
}

export interface SellerDash {
  seller: SellerPublic;
  salesMinor: number;
  orderCount: number;
  fulfillmentRate: number;
  pendingMinor: number;
  availableMinor: number;
  heldMinor: number;
  paidMinor: number;
  series: Array<{ date: string; revenueMinor: number; orders: number }>;
  topProducts: Array<{ title: string; salesMinor: number; quantity: number }>;
  statusCounts: Array<{ status: string; count: number }>;
  recentOrders: OrderView[];
  openRequestCount: number;
  requestCount: number;
  completedCount: number;
  canceledCount: number;
  rating: number;
  reviewCount: number;
  deltas: { requests: number | null; completed: number | null; canceled: number | null; total: number | null; completion: number | null };
  sparks: { requests: number[]; completed: number[]; canceled: number[]; rating: number[] };
  recent: SellerActivityRow[];
  activity: SellerActivityRow[];
  performance: { requests: number; completed: number; canceled: number; total: number; completion: number };
  topRequestProducts: Array<{ title: string; monogram: string; accent: string; quantity: number; delta: number | null }>;
}

export function SellerDashboardView({ data }: { data: SellerDash }) {
  const ratingLabel = data.reviewCount > 0 ? data.rating.toFixed(1) : "New";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Welcome back, {data.seller.name} <span aria-hidden="true">👋</span></h1>
          <p className="mt-1 text-sm text-slate-400">Manage your products, order requests, and store performance.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary"><Link href={`/seller/${data.seller.slug}`}>View My Store</Link></Button>
          <Button asChild><Link href="/seller/products/new"><Plus className="h-4 w-4" /> Add Product</Link></Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Order Requests" value={String(data.requestCount)} icon={<ShoppingCart className="h-4 w-4" />} tone="#FF4BD8" delta={data.deltas.requests} points={data.sparks.requests} />
        <MetricCard label="Completed Orders" value={String(data.completedCount)} icon={<Package className="h-4 w-4" />} tone="#A855F7" delta={data.deltas.completed} points={data.sparks.completed} />
        <MetricCard label="Canceled Orders" value={String(data.canceledCount)} icon={<XCircle className="h-4 w-4" />} tone="#F43F5E" delta={data.deltas.canceled} points={data.sparks.canceled} />
        <MetricCard label="Store Rating" value={ratingLabel} icon={<Star className="h-4 w-4" />} tone="#F6C445" detail={data.reviewCount > 0 ? `(${data.reviewCount} reviews)` : "No reviews yet"} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel className="overflow-x-auto p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-bold">Recent Order Requests</h2>
            <Link href="/seller/orders" className="text-xs font-semibold text-[#FF4BD8]">View All Orders</Link>
          </div>
          {data.recent.length === 0 ? <p className="text-sm text-slate-400">No orders or requests for this store yet.</p> : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="pb-2 pr-3">#</th><th className="pb-2 pr-3">Product</th><th className="pb-2 pr-3">Customer Contact</th><th className="pb-2 pr-3">Quantity</th><th className="pb-2 pr-3">Status</th><th className="pb-2">Requested At</th></tr>
              </thead>
              <tbody>
                {data.recent.map((row) => (
                  <tr key={row.id} className="border-t border-white/5">
                    <td className="py-3 pr-3"><Link href={`/seller/orders/${row.id}`} className="text-slate-300 hover:text-white">{row.number}</Link></td>
                    <td className="py-3 pr-3">
                      <span className="flex items-center gap-2">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-black" style={{ color: row.accent, background: `${row.accent}22` }}>{row.monogram}</span>
                        <span className="font-medium">{row.title}</span>
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-slate-300">{row.contact}</td>
                    <td className="py-3 pr-3">{row.quantity}</td>
                    <td className="py-3 pr-3"><RequestStatus status={row.status} /></td>
                    <td className="py-3 text-slate-400">{row.requestedLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel className="p-4">
          <h2 className="font-bold">Store Performance <span className="text-xs font-medium text-slate-400">(Last 30 Days)</span></h2>
          <dl className="mt-4 space-y-3 text-sm">
            <PerformanceRow label="Total Requests" value={String(data.performance.total)} delta={data.deltas.total} />
            <PerformanceRow label="Completed" value={String(data.performance.completed)} delta={data.deltas.completed} />
            <PerformanceRow label="Canceled" value={String(data.performance.canceled)} delta={data.deltas.canceled} />
            <PerformanceRow label="Completion Rate" value={data.performance.total ? `${data.performance.completion}%` : "—"} delta={data.deltas.completion} />
          </dl>
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Panel className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Top Products <span className="text-xs font-medium text-slate-400">(Last 30 Days)</span></h2>
            <Link href="/seller/products" className="text-xs font-semibold text-[#FF4BD8]">View All Products</Link>
          </div>
          {data.topRequestProducts.length === 0 ? <p className="text-sm text-slate-400">No orders in the last 30 days.</p> : (
            <ul className="space-y-3">
              {data.topRequestProducts.map((item) => (
                <li key={item.title} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-black" style={{ color: item.accent, background: `${item.accent}22` }}>{item.monogram}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.title}</span>
                    <span className="text-xs text-slate-400">{item.quantity} {item.quantity === 1 ? "order" : "orders"}</span>
                  </span>
                  <Delta value={item.delta} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel className="p-4">
          <h2 className="mb-3 font-bold">Quick Actions</h2>
          <div className="space-y-2">
            <Button asChild className="w-full"><Link href="/seller/products/new"><Plus className="h-4 w-4" /> Add Product</Link></Button>
            <Button asChild variant="secondary" className="w-full"><Link href="/seller/products"><Package className="h-4 w-4" /> Manage Products</Link></Button>
            <Button asChild variant="secondary" className="w-full"><Link href="/seller/orders"><FileText className="h-4 w-4" /> View Order Requests {data.openRequestCount > 0 ? <Badge>{data.openRequestCount}</Badge> : null}</Link></Button>
            <Button asChild variant="secondary" className="w-full"><Link href="/seller/settings"><Settings className="h-4 w-4" /> Store Settings</Link></Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, tone, delta, detail, points }: { label: string; value: string; icon: ReactNode; tone: string; delta?: number | null; detail?: string; points?: number[] }) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ color: tone, background: `${tone}22` }}>{icon}</span>
        {points ? <Spark points={points} color={tone} /> : null}
      </div>
      <p className="mt-3 text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black">{value} {detail ? <span className="text-sm font-medium text-slate-400">{detail}</span> : null}</p>
      {delta !== undefined ? <Delta value={delta} /> : null}
    </Panel>
  );
}

function PerformanceRow({ label, value, delta }: { label: string; value: string; delta: number | null }) {
  return <div className="flex items-center justify-between gap-3"><dt className="text-slate-300">{label}</dt><dd className="flex items-center gap-2 font-semibold">{value}<Delta value={delta} /></dd></div>;
}

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs font-medium text-slate-500">No prior period</span>;
  const up = value > 0;
  return <span className={up ? "text-xs font-semibold text-emerald-300" : value < 0 ? "text-xs font-semibold text-rose-300" : "text-xs font-semibold text-slate-400"}>{up ? "▲" : value < 0 ? "▼" : "•"} {Math.abs(value)}%</span>;
}

function Spark({ points, color }: { points: number[]; color: string }) {
  if (!points.some((point) => point > 0)) return null;
  const max = Math.max(...points, 1);
  const coords = points.map((point, index) => `${(index / Math.max(points.length - 1, 1)) * 64},${18 - (point / max) * 14}`).join(" ");
  return <svg viewBox="0 0 64 20" className="h-5 w-16" aria-hidden="true"><polyline fill="none" stroke={color} strokeWidth="2" points={coords} /></svg>;
}

function RequestStatus({ status }: { status: SellerRowStatus }) {
  if (status === "COMPLETED") return <Badge tone="green">Completed</Badge>;
  if (status === "CANCELED") return <Badge tone="red">Canceled</Badge>;
  if (status === "IN_PROGRESS") return <Badge tone="cyan">In Progress</Badge>;
  return <Badge tone="amber">Pending</Badge>;
}

export function SellerProductsView({ products }: { products: ProductSummary[] }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between"><h1 className="text-2xl font-bold">Products</h1><Button asChild><Link href="/seller/products/new">New listing</Link></Button></div>
      <Panel className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-400"><tr><th className="p-3">Title</th><th>Status</th><th>Price</th><th>Stock</th><th></th></tr></thead><tbody>{products.map((product) => <tr key={product.id} className="border-t border-white/5"><td className="p-3">{product.title}</td><td><StatusPill status={product.status} /></td><td>{formatMoney(product.priceMinor)}</td><td>{product.available}</td><td><Link className="text-cyan-300" href={`/seller/products/${product.id}/edit`}>Edit</Link></td></tr>)}</tbody></table></Panel>
    </div>
  );
}

export function SellerProductForm({ product }: { product?: ProductSummary }) {
  const router = useRouter();
  const to = useSellerHref();
  const form = useForm({
    resolver: zodResolver(product ? productFormSchema.partial() : productFormSchema),
    defaultValues: product ? { title: product.title, summary: product.summary, priceMinor: product.priceMinor } : { categorySlug: "digital-accounts", kind: "ACCOUNT" as const, delivery: "MANUAL" as const, region: "GLOBAL" as const, variantName: "Standard" },
  });
  return (
    <Panel className="max-w-2xl space-y-3 p-5">
      <h1 className="text-xl font-bold">{product ? "Edit listing" : "New listing"}</h1>
      <p className="text-sm text-slate-400">New reseller listings stay in review until an admin approves them. Do not submit real credentials or card data.</p>
      <form className="grid gap-3" onSubmit={form.handleSubmit(async (values) => {
        try {
          if (product) await mutate(`/seller/products/${product.id}`, "PATCH", values);
          else await mutate("/seller/products", "POST", values);
          toast.success(product ? "Listing updated" : "Listing submitted for review");
          router.push(to("/seller/products"));
          router.refresh();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Save failed");
        }
      })}>
        {!product ? <>
          <Field label="Title"><input className={inputClass} {...form.register("title")} /></Field>
          <Field label="Category"><select className={inputClass} {...form.register("categorySlug")}><option value="digital-accounts">Digital accounts</option><option value="subscriptions">Subscriptions</option><option value="gaming">Gaming</option></select></Field>
          <Field label="Kind"><select className={inputClass} {...form.register("kind")}><option value="ACCOUNT">Account</option><option value="SUBSCRIPTION">Subscription</option><option value="GAMING">Gaming</option><option value="LICENSE">License</option></select></Field>
          <p className="text-xs text-slate-500">Phone numbers and virtual cards cannot be listed until a licensed provider is approved.</p>
          <Field label="Platform"><input className={inputClass} {...form.register("platform")} /></Field>
          <Field label="Summary"><input className={inputClass} {...form.register("summary")} /></Field>
          <Field label="Description"><textarea className={inputClass} rows={4} {...form.register("description")} /></Field>
          <Field label="Delivery"><select className={inputClass} {...form.register("delivery")}><option value="MANUAL">Manual</option><option value="INSTANT">Instant</option></select></Field>
          <Field label="Region"><select className={inputClass} {...form.register("region")}><option>GLOBAL</option><option>US</option><option>UK</option><option>EU</option></select></Field>
          <Field label="Plan name"><input className={inputClass} {...form.register("variantName")} /></Field>
        </> : <Field label="Title"><input className={inputClass} {...form.register("title")} /></Field>}
        <Field label="Price in cents"><input type="number" className={inputClass} {...form.register("priceMinor", { valueAsNumber: true })} /></Field>
        {product ? <Field label="Summary"><input className={inputClass} {...form.register("summary")} /></Field> : null}
        <p className="text-xs text-red-300">{form.formState.errors.root?.message}</p>
        <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Save listing"}</Button>
      </form>
    </Panel>
  );
}

export function SellerInventoryView({ units, products }: { units: Array<{ id: string; productTitle: string; variantName: string; state: string; reference: string; productId: string; variantId: string }>; products: ProductSummary[] }) {
  const refresh = useRefresh();
  const form = useForm({ resolver: zodResolver(inventorySchema), defaultValues: { productId: products[0]?.id ?? "", variantId: products[0]?.defaultVariantId ?? "", payload: "" } });
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Panel className="space-y-3 p-4">
        <h1 className="font-bold">Add encrypted stock</h1>
        <form className="space-y-3" onSubmit={form.handleSubmit(async (values) => {
          try { await mutate("/seller/inventory", "POST", values); toast.success("Inventory encrypted"); form.setValue("payload", ""); refresh(); }
          catch (error) { toast.error(error instanceof Error ? error.message : "Inventory was not stored"); }
        })}>
          <Field label="Product"><select className={inputClass} {...form.register("productId")}>{products.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}</select></Field>
          <Field label="Variant id"><input className={inputClass} {...form.register("variantId")} /></Field>
          <Field label="Demo payload"><textarea className={inputClass} rows={4} placeholder="DEMO-VOUCHER or provider_token_..." {...form.register("payload")} /></Field>
          <Button type="submit">Encrypt and store</Button>
        </form>
      </Panel>
      <Panel className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-400"><tr><th className="p-3">Reference</th><th>Product</th><th>State</th></tr></thead><tbody>{units.map((unit) => <tr key={unit.id} className="border-t border-white/5"><td className="p-3 font-mono">{unit.reference}</td><td>{unit.productTitle}</td><td><StatusPill status={unit.state} /></td></tr>)}</tbody></table></Panel>
    </div>
  );
}

export function SellerCustomersView({ customers }: { customers: Array<{ contact: string; orders: number; lastAt: string }> }) {
  if (!customers.length) return <Panel className="p-6"><h1 className="text-xl font-bold">Customers</h1><p className="mt-2 text-sm text-slate-400">No customer contacts yet. Email and Telegram handles appear here after someone requests or buys from this store.</p></Panel>;
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Customers</h1>
      <Panel className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-400"><tr><th className="p-3">Contact</th><th>Orders</th><th>Last activity</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.contact} className="border-t border-white/5"><td className="p-3"><span className="inline-flex items-center gap-2"><NameAvatar name={customer.contact} size="sm" />{customer.contact}</span></td><td>{customer.orders}</td><td className="text-slate-400">{customer.lastAt.slice(0, 10)}</td></tr>)}</tbody></table></Panel>
    </div>
  );
}

export function SellerOrdersView({ orders }: { orders: OrderView[] }) {
  const refresh = useRefresh();
  return <Panel className="divide-y divide-white/5">{orders.map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm"><div><p className="font-medium">{order.number}</p><p className="text-slate-400">{order.items.map((item) => item.title).join(", ")}</p></div><div className="flex items-center gap-2"><StatusPill status={order.status} />{order.status === "AWAITING_SELLER" ? <Button size="sm" onClick={async () => { try { await mutate(`/seller/orders/${order.id}/fulfill`, "POST"); toast.success("Fulfillment recorded"); refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Fulfillment failed"); } }}>Fulfill</Button> : null}</div></div>)}</Panel>;
}

export function SellerEarningsView({ data }: { data: SellerDash & { entries: Array<{ id: string; memo: string; amountMinor: number; createdAt: string }> } }) {
  return <div className="space-y-4"><div className="grid gap-3 md:grid-cols-4"><Stat label="Pending" value={formatMoney(data.pendingMinor)} /><Stat label="Available" value={formatMoney(data.availableMinor)} /><Stat label="On hold" value={formatMoney(data.heldMinor)} /><Stat label="Paid out" value={formatMoney(data.paidMinor)} /></div><Panel className="divide-y divide-white/5">{data.entries.map((entry) => <div key={entry.id} className="flex justify-between p-3 text-sm"><span>{entry.memo}</span><span>{formatMoney(entry.amountMinor)}</span></div>)}</Panel></div>;
}

export function SellerPayoutsView({ payouts, availableMinor }: { payouts: Array<{ id: string; amountMinor: number; status: string; createdAt: string }>; availableMinor: number }) {
  const refresh = useRefresh();
  const form = useForm({ resolver: zodResolver(payoutSchema), defaultValues: { amountMinor: Math.min(availableMinor, 1000) } });
  return (
    <div className="space-y-4">
      <Panel className="max-w-md space-y-3 p-4"><h1 className="font-bold">Request payout</h1><p className="text-sm text-slate-400">Available {formatMoney(availableMinor)}. The mock payout provider does not send a bank transfer.</p><form className="space-y-3" onSubmit={form.handleSubmit(async (values) => { try { await mutate("/seller/payouts", "POST", values); toast.success("Payout requested"); refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Request failed"); } })}><Field label="Amount in cents"><input type="number" className={inputClass} {...form.register("amountMinor", { valueAsNumber: true })} /></Field><Button type="submit">Request</Button></form></Panel>
      <Panel className="divide-y divide-white/5">{payouts.map((payout) => <div key={payout.id} className="flex justify-between p-3 text-sm"><span>{formatMoney(payout.amountMinor)}</span><StatusPill status={payout.status} /></div>)}</Panel>
    </div>
  );
}

export function SellerReviewsView({ reviews }: { reviews: Array<{ id: string; author: string; rating: number; comment: string; productTitle: string }> }) {
  return <div className="space-y-3">{reviews.map((review) => <Panel key={review.id} className="flex items-start gap-3 p-4 text-sm"><NameAvatar name={review.author} size="sm" /><div><p className="text-slate-400">{review.productTitle} · {review.rating}/5 · {review.author}</p><p className="mt-1">{review.comment}</p></div></Panel>)}{reviews.length === 0 ? <p className="text-slate-400">No reviews yet.</p> : null}</div>;
}

export function SellerSettingsView({ settings }: { settings: { name: string; businessName: string; country: string; bio: string; status: string; verification: string } }) {
  const refresh = useRefresh();
  const form = useForm({ defaultValues: { businessName: settings.businessName, bio: settings.bio } });
  return <Panel className="max-w-xl space-y-3 p-5"><h1 className="text-xl font-bold">Seller settings</h1><StatusPill status={settings.status} /><p className="text-sm text-slate-400">Verification {settings.verification} · {settings.country}</p><form className="space-y-3" onSubmit={form.handleSubmit(async (values) => { try { await mutate("/seller/settings", "PATCH", values); toast.success("Settings saved"); refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Save failed"); } })}><Field label="Business name"><input className={inputClass} {...form.register("businessName")} /></Field><Field label="Bio"><textarea className={inputClass} rows={4} {...form.register("bio")} /></Field><Button type="submit">Save</Button></form></Panel>;
}

export function OnboardingView({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const form = useForm({ resolver: zodResolver(onboardingSchema), defaultValues: { businessName: "", country: "", bio: "", authorized: undefined as unknown as true } });
  if (!signedIn) return <Panel className="max-w-lg space-y-3 p-6"><h1 className="text-2xl font-bold">Become a seller</h1><p className="text-sm text-slate-300">Create a customer account first. Seller access starts only after admin approval.</p><Button asChild><Link href="/register?next=/seller/onboarding">Create account</Link></Button></Panel>;
  return (
    <Panel className="max-w-xl space-y-3 p-5">
      <h1 className="text-2xl font-bold">Seller application</h1>
      <form className="space-y-3" onSubmit={form.handleSubmit(async (values) => {
        try { const result = await mutate<{ message: string }>("/seller/onboarding", "POST", values); toast.success(result.message); router.refresh(); }
        catch (error) { toast.error(error instanceof Error ? error.message : "Application failed"); }
      })}>
        <Field label="Business name"><input className={inputClass} {...form.register("businessName")} /></Field>
        <Field label="Country"><input className={inputClass} {...form.register("country")} /></Field>
        <Field label="What will you sell?"><textarea className={inputClass} rows={4} {...form.register("bio")} /></Field>
        <label className="flex gap-2 text-sm"><input type="checkbox" onChange={(event) => form.setValue("authorized", event.target.checked ? true : (undefined as unknown as true))} /> I will only list demo or properly authorized goods.</label>
        <Button type="submit">Submit application</Button>
      </form>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <Panel className="p-4"><p className="text-xs text-slate-400">{label}</p><p className="text-2xl font-bold">{value}</p></Panel>;
}
