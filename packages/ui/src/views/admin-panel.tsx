"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { toast } from "sonner";
import { Ban, Download, Layers, Package, Pencil, Plus, Search, Settings, ShoppingCart, Store, Users } from "lucide-react";
import { formatMoney, type DisputeView, type OrderView, type PayoutView, type ProductSummary, type TicketView } from "@marketplace/types";
import { Badge, Button, Field, NameAvatar, Panel, inputClass, mutate, useRefresh } from "../components/kit";
import { ProductImagesPanel, useProductImages } from "../components/product-images";
import { ConfirmAction, type AdminDash } from "./admin";

type SellerRow = {
  id: string;
  slug: string;
  name: string;
  storeName: string;
  email: string;
  telegram: string;
  bio: string;
  status: "PENDING" | "APPROVED" | "SUSPENDED";
  platformOwned: boolean;
  memberSince: string;
  note: string;
  productCount: number;
  orderCount: number;
  salesMinor: number;
  rating: number;
  reviewCount: number;
};

type SellerDetail = SellerRow & { products: Array<ProductSummary & { description: string; variantName: string; createdAt: string }>; orders: OrderView[]; requests: Array<{ id: string; number: string; status: string; totalMinor: number; createdAt: string; items: Array<{ title: string }> }>; activity: Array<{ id: string; actor: string; action: string; target: string; createdAt: string }> };
type CustomerRow = { id: string; name: string; email: string; status: "ACTIVE" | "SUSPENDED"; emailVerified: boolean; mfaEnabled: boolean; note: string; createdAt: string; orderCount: number; spentMinor: number; lastOrderAt: string };
type CustomerDetail = CustomerRow & { orders: OrderView[]; tickets: Array<{ id: string; number: string; subject: string; status: string }> };
type CategoryRow = { slug: string; name: string; description: string; productCount: number; activeCount: number; available: boolean; homepage: boolean; featured: boolean; locked: boolean; builtin: boolean };
type Listing = ProductSummary & { description: string; variantName: string; createdAt: string };

function stamp(value: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "—";
}

function downloadCsv(name: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function Head({ icon, title, crumb, text, children }: { icon: ReactNode; title: string; crumb: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#e879f9]/80 bg-[#160b28] text-[#FF4BD8] shadow-[0_0_16px_rgba(255,0,200,.35)]">{icon}</span>
        <div>
          <p className="text-xs text-slate-500">Home / {crumb}</p>
          <h1 className="text-2xl font-black">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">{text}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <Panel className="p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black" style={{ color: tone }}>{value}</p>
    </Panel>
  );
}

function sellerBadge(status: string) {
  if (status === "APPROVED") return <Badge tone="green">Approved</Badge>;
  if (status === "SUSPENDED") return <Badge tone="red">Suspended</Badge>;
  return <Badge tone="amber">Pending</Badge>;
}

export function AdminHome({ data, activity }: { data: AdminDash; activity: Array<{ id: string; action: string; target: string; createdAt: string }> }) {
  const categories = data.categoryCounts.filter((item) => item.count > 0 || item.gmvMinor > 0);
  const total = categories.reduce((sum, item) => sum + item.count, 0);
  return (
    <div className="space-y-4">
      <Head icon={<ShoppingCart className="h-6 w-6" />} title="Admin Dashboard" crumb="Dashboard" text="Overview of this marketplace’s sellers, orders, and catalog." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Orders" value={String(data.orderCount)} tone="#FF4BD8" />
        <Stat label="Approved Sellers" value={String(data.activeSellers)} tone="#22C55E" />
        <Stat label="Customers" value={String(data.customerCount)} tone="#38BDF8" />
        <Stat label="Delivered Sales" value={formatMoney(data.gmvMinor)} tone="#F59E0B" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel className="p-4">
          <h2 className="mb-3 font-bold">Orders & Sales Trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.series}>
                <XAxis dataKey="date" tickFormatter={(value) => String(value).slice(5)} stroke="#64748b" fontSize={11} />
                <Tooltip formatter={(value, key) => key === "revenueMinor" ? formatMoney(Number(value ?? 0)) : String(value ?? 0)} />
                <Area dataKey="orders" stroke="#38BDF8" fill="#38BDF822" />
                <Area dataKey="revenueMinor" stroke="#FF4BD8" fill="#FF4BD822" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel className="p-4">
          <h2 className="font-bold">Orders by Category</h2>
          {categories.length === 0 ? <p className="mt-4 text-sm text-slate-400">No delivered orders yet.</p> : categories.map((item) => (
            <div key={item.name} className="mt-3 flex justify-between text-sm"><span>{item.name}</span><span>{total ? Math.round((item.count / total) * 1000) / 10 : 0}% · {item.count}</span></div>
          ))}
          <p className="mt-4 text-xs text-slate-500">Platform revenue {formatMoney(data.platformRevenueMinor)}. Ledger {data.books.balanced ? "is balanced" : "is out of balance"}.</p>
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel className="overflow-x-auto p-4">
          <div className="mb-2 flex justify-between"><h2 className="font-bold">Recent Orders</h2><Link href="/admin/orders" className="text-xs font-semibold text-[#FF4BD8]">View All</Link></div>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Order</th><th>Product</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {data.recentOrders.map((order) => (
                <tr key={order.id} className="border-t border-white/5">
                  <td className="py-2">{order.number}</td>
                  <td>{order.items[0]?.title ?? "—"}</td>
                  <td>{order.email}</td>
                  <td>{formatMoney(order.totalMinor)}</td>
                  <td><Badge tone="slate">{order.status.replaceAll("_", " ")}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel className="p-4">
          <h2 className="font-bold">Activity Log</h2>
          {activity.length === 0 ? <p className="mt-3 text-sm text-slate-400">No admin actions recorded yet.</p> : activity.slice(0, 6).map((entry) => (
            <p key={entry.id} className="mt-3 text-sm"><span className="text-slate-200">{entry.action}</span> <span className="text-slate-500">{entry.target}</span><span className="mt-0.5 block text-xs text-slate-500">{stamp(entry.createdAt)}</span></p>
          ))}
        </Panel>
      </div>
    </div>
  );
}

export function AdminSellersView({ sellers }: { sellers: SellerRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const rows = sellers.filter((seller) => {
    const text = `${seller.name} ${seller.storeName} ${seller.email}`.toLowerCase();
    if (query && !text.includes(query.toLowerCase())) return false;
    if (status !== "all" && seller.status !== status) return false;
    return true;
  });
  return (
    <div className="space-y-4">
      <Head icon={<Store className="h-6 w-6" />} title="Sellers" crumb="Sellers" text="Manage the seller accounts that exist on this marketplace.">
        <Button asChild><Link href="/admin/sellers/new"><Plus className="h-4 w-4" /> Add Seller</Link></Button>
      </Head>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Sellers" value={String(sellers.length)} tone="#A855F7" />
        <Stat label="Approved" value={String(sellers.filter((item) => item.status === "APPROVED").length)} tone="#22C55E" />
        <Stat label="Pending Approval" value={String(sellers.filter((item) => item.status === "PENDING").length)} tone="#F59E0B" />
        <Stat label="Suspended" value={String(sellers.filter((item) => item.status === "SUSPENDED").length)} tone="#FB7185" />
      </div>
      <Panel className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" /><input className={`${inputClass} pl-9`} placeholder="Search by name, email, or store..." value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <select className={`${inputClass} !w-48`} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All Status</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Seller</th><th>Store</th><th>Email</th><th>Status</th><th>Products</th><th>Orders</th><th>Sales</th><th>Joined</th><th></th></tr></thead>
            <tbody>
              {rows.map((seller) => (
                <tr key={seller.id} className="border-t border-white/5">
                  <td className="py-3"><span className="flex items-center gap-2"><NameAvatar name={seller.storeName} size="sm" />{seller.name}</span></td>
                  <td>{seller.storeName}</td>
                  <td className="text-slate-300">{seller.email || "No login on file"}</td>
                  <td>{sellerBadge(seller.status)}</td>
                  <td>{seller.productCount}</td>
                  <td>{seller.orderCount}</td>
                  <td>{formatMoney(seller.salesMinor)}</td>
                  <td className="text-slate-400">{seller.memberSince.slice(0, 10)}</td>
                  <td className="space-x-2 text-xs"><Link className="text-[#FF4BD8]" href={`/admin/sellers/${seller.id}`}>View</Link><Link className="text-slate-300" href={`/admin/sellers/${seller.id}/edit`}>Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">Showing {rows.length} of {sellers.length} sellers</p>
      </Panel>
    </div>
  );
}

export function AdminSellerForm({ seller }: { seller?: SellerRow }) {
  const router = useRouter();
  const refresh = useRefresh();
  const [name, setName] = useState(seller?.name ?? "");
  const [storeName, setStoreName] = useState(seller?.storeName ?? "");
  const [email, setEmail] = useState(seller?.email ?? "");
  const [telegram, setTelegram] = useState(seller?.telegram ?? "");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState(seller?.bio ?? "");
  const [note, setNote] = useState(seller?.note ?? "");
  const [status, setStatus] = useState(seller?.status ?? "PENDING");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const body = { name, storeName, email: seller ? undefined : email, telegram, password: password || undefined, bio, note, status };
      if (seller) await mutate(`/admin/sellers/${seller.id}`, "PATCH", body);
      else await mutate("/admin/sellers", "POST", { ...body, email });
      toast.success(seller ? "Seller updated." : "Seller account created. No email was sent.");
      refresh();
      router.push("/admin/sellers");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The seller was not saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Head icon={<Store className="h-6 w-6" />} title={seller ? "Edit Seller" : "Add Seller"} crumb={`Sellers / ${seller ? "Edit Seller" : "Add Seller"}`} text="Create or update a seller login and store profile." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel className="space-y-3 p-4">
          <h2 className="font-bold">Seller Information</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Full Name *"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <Field label="Store Name *"><input className={inputClass} value={storeName} onChange={(event) => setStoreName(event.target.value)} /></Field>
            <Field label="Email *"><input className={inputClass} value={email} disabled={Boolean(seller)} onChange={(event) => setEmail(event.target.value)} /></Field>
            <Field label="Telegram"><input className={inputClass} value={telegram} onChange={(event) => setTelegram(event.target.value)} placeholder="@username" /></Field>
            <Field label={seller ? "New Password" : "Password *"}><input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
          </div>
          <Field label="Store Description"><textarea className={`${inputClass} min-h-24`} maxLength={300} value={bio} onChange={(event) => setBio(event.target.value)} /></Field>
          <p className="text-xs text-slate-500">{bio.length} / 300. Avatar and banner uploads are not stored.</p>
        </Panel>
        <div className="space-y-4">
          <Panel className="space-y-3 p-4">
            <h2 className="font-bold">Account Settings</h2>
            <Field label="Status *">
              <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as SellerRow["status"])}>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </Field>
            <p className="text-xs text-slate-400">Approved sellers can list products, receive order requests, and view their orders. Suspending a seller hides their active listings.</p>
          </Panel>
          <Panel className="p-4">
            <h2 className="font-bold">Internal Note</h2>
            <textarea className={`${inputClass} mt-2 min-h-24`} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
          </Panel>
        </div>
      </div>
      <div className="flex justify-between">
        <Button asChild variant="secondary"><Link href="/admin/sellers">← Cancel</Link></Button>
        <Button disabled={busy} onClick={save}>{seller ? "Update Seller" : "Create Seller"}</Button>
      </div>
    </div>
  );
}

export function AdminSellerDetail({ seller }: { seller: SellerDetail }) {
  const refresh = useRefresh();
  const [tab, setTab] = useState<"overview" | "products" | "orders" | "activity">("overview");
  async function suspend() {
    if (!window.confirm("Suspend this seller and hide active listings?")) return;
    try {
      await mutate(`/admin/sellers/${seller.id}`, "PATCH", { status: seller.status === "SUSPENDED" ? "APPROVED" : "SUSPENDED" });
      toast.success("Seller status updated.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Status was not changed.");
    }
  }
  return (
    <div className="space-y-4">
      <Head icon={<Store className="h-6 w-6" />} title="Seller Details" crumb="Sellers / View Seller" text="Store profile, products, and orders for this seller.">
        <Button asChild variant="secondary"><Link href="/admin/sellers">← Back to Sellers</Link></Button>
        <Button asChild variant="secondary"><Link href={`/admin/sellers/${seller.id}/edit`}><Pencil className="h-4 w-4" /> Edit</Link></Button>
        <Button variant="danger" onClick={suspend}>{seller.status === "SUSPENDED" ? "Reinstate" : "Suspend"}</Button>
      </Head>
      <Panel className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <NameAvatar name={seller.storeName} />
          <div>
            <h2 className="text-xl font-black">{seller.storeName} {sellerBadge(seller.status)}</h2>
            <p className="text-sm text-slate-400">{seller.name} · {seller.email || "No login on file"} {seller.telegram ? `· ${seller.telegram}` : ""}</p>
            <p className="text-sm text-slate-500">{seller.bio || "No store description."}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><p className="text-slate-400">Products</p><p className="text-xl font-black">{seller.productCount}</p></div>
          <div><p className="text-slate-400">Orders</p><p className="text-xl font-black">{seller.orderCount}</p></div>
          <div><p className="text-slate-400">Delivered Sales</p><p className="text-xl font-black">{formatMoney(seller.salesMinor)}</p></div>
        </div>
      </Panel>
      <div className="flex flex-wrap gap-2">
        {(["overview", "products", "orders", "activity"] as const).map((item) => <button key={item} type="button" className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${tab === item ? "bg-[#FF00C8]" : "border border-white/10"}`} onClick={() => setTab(item)}>{item}</button>)}
      </div>
      {tab === "overview" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel className="p-4 text-sm"><h2 className="font-bold">Seller Information</h2><p className="mt-2">Joined {seller.memberSince.slice(0, 10)}</p><p>Rating {seller.reviewCount ? `${seller.rating} from ${seller.reviewCount} reviews` : "No reviews yet"}</p><p>Internal note: {seller.note || "None"}</p></Panel>
          <Panel className="p-4 text-sm"><h2 className="font-bold">Recent Orders</h2>{seller.orders.slice(0, 5).map((order) => <p key={order.id} className="mt-2">{order.number} · {order.items[0]?.title} · {formatMoney(order.totalMinor)}</p>)}{seller.orders.length === 0 && <p className="mt-2 text-slate-400">No paid orders.</p>}</Panel>
        </div>
      )}
      {tab === "products" && <Panel className="p-4 text-sm">{seller.products.map((product) => <p key={product.id} className="mt-2 flex justify-between"><Link href={`/admin/products/${product.id}`}>{product.title}</Link><span>{product.status} · {formatMoney(product.priceMinor)}</span></p>)}</Panel>}
      {tab === "orders" && <Panel className="p-4 text-sm">{seller.orders.map((order) => <p key={order.id} className="mt-2">{order.number} · {order.email} · {formatMoney(order.totalMinor)} · {order.status}</p>)}{seller.requests.map((request) => <p key={request.id} className="mt-2">{request.number} · {request.items[0]?.title} · {formatMoney(request.totalMinor)} · {request.status}</p>)}</Panel>}
      {tab === "activity" && <Panel className="p-4 text-sm">{seller.activity.length === 0 ? <p>No recorded actions for this store.</p> : seller.activity.map((entry) => <p key={entry.id} className="mt-2">{stamp(entry.createdAt)} · {entry.action} · {entry.target}</p>)}</Panel>}
    </div>
  );
}

export function AdminProductsView({ products }: { products: Listing[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const rows = products.filter((product) => {
    if (query && !`${product.title} ${product.seller.name}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (status !== "all" && product.status !== status) return false;
    return true;
  });
  const count = (value: string) => products.filter((product) => product.status === value).length;
  return (
    <div className="space-y-4">
      <Head icon={<Package className="h-6 w-6" />} title="Products" crumb="Products" text="Every listing on the marketplace, including drafts and items in review.">
        <Button variant="secondary" onClick={() => downloadCsv("admin-products.csv", [["Product", "Seller", "Price", "Status"], ...rows.map((item) => [item.title, item.seller.name, formatMoney(item.priceMinor), item.status])])}><Download className="h-4 w-4" /> Export</Button>
        <Button asChild><Link href="/admin/products/new"><Plus className="h-4 w-4" /> Add Product</Link></Button>
      </Head>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Total" value={String(products.length)} tone="#A855F7" />
        <Stat label="Active" value={String(count("ACTIVE"))} tone="#22C55E" />
        <Stat label="In Review" value={String(count("PENDING_REVIEW"))} tone="#F59E0B" />
        <Stat label="Rejected" value={String(count("REJECTED"))} tone="#FB7185" />
        <Stat label="Inactive" value={String(count("SUSPENDED") + count("DRAFT"))} tone="#94A3B8" />
      </div>
      <Panel className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          <input className={`${inputClass} max-w-md`} placeholder="Search by product or seller..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className={`${inputClass} !w-48`} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All Status</option>
            {["ACTIVE", "PENDING_REVIEW", "DRAFT", "REJECTED", "SUSPENDED"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Product</th><th>Category</th><th>Seller</th><th>Price</th><th>Status</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {rows.map((product) => (
                <tr key={product.id} className="border-t border-white/5">
                  <td className="py-3"><Link href={`/admin/products/${product.id}`} className="font-semibold">{product.title}</Link><span className="block text-xs text-slate-500">{product.variantName}</span></td>
                  <td>{product.categorySlug}</td>
                  <td><span className="inline-flex items-center gap-2"><NameAvatar name={product.seller.name} size="sm" />{product.seller.name}</span></td>
                  <td>{formatMoney(product.priceMinor)}</td>
                  <td><Badge tone={product.status === "ACTIVE" ? "green" : product.status === "REJECTED" || product.status === "SUSPENDED" ? "red" : "amber"}>{product.status}</Badge></td>
                  <td className="text-slate-400">{product.createdAt.slice(0, 10)}</td>
                  <td><Link href={`/admin/products/${product.id}/edit`} className="text-[#FF4BD8]"><Pencil className="h-4 w-4" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

export function AdminProductForm({ product, sellers, categories }: { product?: Listing; sellers: SellerRow[]; categories: CategoryRow[] }) {
  const router = useRouter();
  const refresh = useRefresh();
  const choices = categories.filter((category) => !category.locked);
  const [title, setTitle] = useState(product?.title ?? "");
  const [sellerId, setSellerId] = useState(product?.seller ? sellers.find((item) => item.slug === product.seller.slug)?.id ?? sellers[0]?.id ?? "" : sellers[0]?.id ?? "");
  const [categorySlug, setCategorySlug] = useState(choices.some((item) => item.slug === product?.categorySlug) ? product!.categorySlug : choices[0]?.slug ?? "digital-accounts");
  const [summary, setSummary] = useState(product?.summary ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? (product.priceMinor / 100).toFixed(2) : "0.00");
  const [status, setStatus] = useState(product?.status ?? "PENDING_REVIEW");
  const images = useProductImages(product?.images);
  const [busy, setBusy] = useState(false);

  async function save(nextStatus = status) {
    const priceMinor = Math.round(Number(price) * 100);
    if (title.trim().length < 4 || summary.trim().length < 8 || description.trim().length < 20 || priceMinor < 50) {
      toast.error("Name, short description, detailed description, and a price of at least $0.50 are required.");
      return;
    }
    setBusy(true);
    try {
      const body = { title, categorySlug, kind: product?.kind && !["PHONE_NUMBER", "VIRTUAL_CARD"].includes(product.kind) ? product.kind : "ACCOUNT", platform: product?.platform || title.split(/\s+/)[0] || "Digital", summary, description, delivery: product?.delivery ?? "MANUAL", region: "GLOBAL", priceMinor, variantName: product?.variantName || "Standard", sellerId, status: nextStatus };
      const saved = product ? await mutate<{ id: string }>(`/seller/products/${product.id}`, "PATCH", body) : await mutate<{ id: string }>("/admin/products", "POST", body);
      const failed = await images.commit(product?.id ?? saved.id);
      if (failed) toast.warning(`Listing saved. ${failed} image change${failed === 1 ? "" : "s"} did not go through; edit the listing to retry.`);
      toast.success("Listing saved.");
      refresh();
      router.push("/admin/products");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The listing was not saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Head icon={<Package className="h-6 w-6" />} title={product ? "Edit Product" : "Add Product"} crumb={`Products / ${product ? "Edit Product" : "Add Product"}`} text="Price is stored in cents. Phone numbers and virtual cards cannot be listed." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel className="space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Product Name *"><input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
            <Field label="Seller *"><select className={inputClass} value={sellerId} onChange={(event) => setSellerId(event.target.value)} disabled={Boolean(product)}>{sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.storeName}</option>)}</select></Field>
            <Field label="Category *"><select className={inputClass} value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)}>{choices.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></Field>
            <Field label="Price (USD) *"><input className={inputClass} value={price} onChange={(event) => setPrice(event.target.value)} /></Field>
          </div>
          <Field label="Short Description *"><textarea className={`${inputClass} min-h-20`} maxLength={200} value={summary} onChange={(event) => setSummary(event.target.value)} /></Field>
          <Field label="Detailed Description"><textarea className={`${inputClass} min-h-28`} value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
        </Panel>
        <div className="space-y-4">
        <ProductImagesPanel images={images} />
        <Panel className="space-y-3 p-4">
          <h2 className="font-bold">Pricing & Status</h2>
          <Field label="Status">
            <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as Listing["status"])}>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_REVIEW">In review</option>
              <option value="DRAFT">Draft</option>
              <option value="SUSPENDED">Inactive</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </Field>
          <p className="text-xs text-slate-400">Active listings appear in the public catalog when the category is enabled.</p>
        </Panel>
        </div>
      </div>
      <div className="flex justify-between">
        <Button asChild variant="secondary"><Link href="/admin/products">Cancel</Link></Button>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => save("DRAFT")}>Save as Draft</Button>
          <Button disabled={busy} onClick={() => save()}>{product ? "Update Product" : "Create Product"}</Button>
        </div>
      </div>
    </div>
  );
}

export function AdminProductDetail({ product }: { product: Listing }) {
  const router = useRouter();
  const refresh = useRefresh();
  async function duplicate() {
    try {
      const copy = await mutate<{ id: string }>(`/admin/products/${product.id}/duplicate`, "POST");
      toast.success("Draft copy created. Inventory was not copied.");
      router.push(`/admin/products/${copy.id}/edit`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The listing was not duplicated.");
    }
  }
  async function remove() {
    if (!window.confirm("Hide or remove this listing?")) return;
    try {
      await mutate(`/seller/products/${product.id}`, "DELETE");
      toast.success("Listing updated.");
      refresh();
      router.push("/admin/products");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The listing was not removed.");
    }
  }
  return (
    <div className="space-y-4">
      <Head icon={<Package className="h-6 w-6" />} title="Product Details" crumb="Products / View Product" text={product.summary}>
        <Button asChild variant="secondary"><Link href="/admin/products">← Back to Products</Link></Button>
        <Button asChild variant="secondary"><Link href={`/admin/products/${product.id}/edit`}>Edit</Link></Button>
        <Button variant="secondary" onClick={duplicate}>Duplicate</Button>
        <Button variant="danger" onClick={remove}>Delete</Button>
      </Head>
      <Panel className="grid gap-3 p-4 text-sm md:grid-cols-2">
        <p><span className="text-slate-400">Name</span><br />{product.title}</p>
        <p><span className="text-slate-400">Price</span><br />{formatMoney(product.priceMinor)}</p>
        <p><span className="text-slate-400">Category</span><br />{product.categorySlug}</p>
        <p><span className="text-slate-400">Seller</span><br />{product.seller.name}</p>
        <p><span className="text-slate-400">Status</span><br />{product.status}</p>
        <p><span className="text-slate-400">Created</span><br />{product.createdAt.slice(0, 10)}</p>
        <p className="md:col-span-2 whitespace-pre-wrap"><span className="text-slate-400">Description</span><br />{product.description}</p>
      </Panel>
    </div>
  );
}

export function AdminCategoriesView({ categories }: { categories: CategoryRow[] }) {
  const [query, setQuery] = useState("");
  const rows = categories.filter((category) => category.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="space-y-4">
      <Head icon={<Layers className="h-6 w-6" />} title="Categories" crumb="Categories" text="Built-in categories stay in the catalog. Phone numbers and virtual cards stay disabled.">
        <Button asChild><Link href="/admin/categories/new"><Plus className="h-4 w-4" /> Add Category</Link></Button>
      </Head>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Categories" value={String(categories.length)} tone="#A855F7" />
        <Stat label="Available" value={String(categories.filter((item) => item.available).length)} tone="#22C55E" />
        <Stat label="Products" value={String(categories.reduce((sum, item) => sum + item.productCount, 0))} tone="#38BDF8" />
      </div>
      <Panel className="space-y-3 p-4">
        <input className={inputClass} placeholder="Search categories..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Category</th><th>Products</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((category) => (
              <tr key={category.slug} className="border-t border-white/5">
                <td className="py-3"><span className="font-semibold">{category.name}</span><span className="block text-xs text-slate-500">{category.description}</span></td>
                <td>{category.productCount}</td>
                <td>{category.locked ? <Badge tone="red">Disabled</Badge> : category.available ? <Badge tone="green">Active</Badge> : <Badge tone="amber">Hidden</Badge>}</td>
                <td><Link href={`/admin/categories/${category.slug}/edit`} className="text-[#FF4BD8]">Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

export function AdminCategoryForm({ category }: { category?: CategoryRow }) {
  const router = useRouter();
  const refresh = useRefresh();
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [homepage, setHomepage] = useState(category?.homepage ?? true);
  const [featured, setFeatured] = useState(category?.featured ?? false);
  const [hidden, setHidden] = useState(category ? !category.available : false);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await mutate("/admin/categories", "POST", { slug: category?.slug || slug || undefined, name, description, homepage, featured, hidden: category?.locked ? true : hidden });
      toast.success("Category saved.");
      refresh();
      router.push("/admin/categories");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The category was not saved.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!category || !window.confirm("Delete this category?")) return;
    try {
      await mutate(`/admin/categories/${category.slug}`, "DELETE");
      toast.success("Category deleted.");
      router.push("/admin/categories");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The category was not deleted.");
    }
  }
  return (
    <div className="space-y-4">
      <Head icon={<Layers className="h-6 w-6" />} title={category ? "Edit Category" : "Add Category"} crumb={`Categories / ${category ? "Edit Category" : "Add Category"}`} text="Homepage visibility is saved. There is no subcategory tree.">
        {category && !category.builtin && <Button variant="danger" onClick={remove}>Delete</Button>}
      </Head>
      <Panel className="max-w-3xl space-y-3 p-4">
        {category?.locked && <p className="text-sm text-amber-200">This category stays disabled until a licensed provider is approved.</p>}
        <Field label="Category Name *"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /></Field>
        {!category && <Field label="Slug"><input className={inputClass} value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="digital-accounts" /></Field>}
        <Field label="Description"><textarea className={`${inputClass} min-h-24`} maxLength={300} value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={homepage} onChange={(event) => setHomepage(event.target.checked)} /> Show on homepage</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} /> Featured</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hidden || Boolean(category?.locked)} disabled={category?.locked} onChange={(event) => setHidden(event.target.checked)} /> Hidden from the catalog</label>
        <div className="flex justify-between"><Button asChild variant="secondary"><Link href="/admin/categories">Cancel</Link></Button><Button disabled={busy} onClick={save}>{category ? "Update Category" : "Create Category"}</Button></div>
      </Panel>
    </div>
  );
}

export function AdminOrdersView({ orders, requests }: { orders: OrderView[]; requests: Array<{ id: string; number: string; email?: string; telegram?: string; status: string; totalMinor: number; createdAt: string; items: Array<{ title: string; quantity: number }> }> }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string>("");
  const rows = useMemo(() => [
    ...orders.map((order) => ({ id: order.id, number: order.number, contact: order.email, title: order.items[0]?.title ?? "Order", amount: order.totalMinor, status: order.status, createdAt: order.createdAt, kind: "Paid order" })),
    ...requests.map((request) => ({ id: request.id, number: request.number, contact: request.email || (request.telegram ? `@${request.telegram.replace(/^@/, "")}` : "No contact"), title: request.items[0]?.title ?? "Request", amount: request.totalMinor, status: request.status, createdAt: request.createdAt, kind: "Order request" })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [orders, requests]);
  const visible = rows.filter((row) => `${row.number} ${row.contact} ${row.title}`.toLowerCase().includes(query.toLowerCase()));
  const current = visible.find((row) => row.id === selected) ?? visible[0];
  return (
    <div className="space-y-4">
      <Head icon={<ShoppingCart className="h-6 w-6" />} title="Order Requests" crumb="Order Requests" text="Paid orders and saved order requests. Requests do not charge a customer or deliver inventory.">
        <Button variant="secondary" onClick={() => downloadCsv("admin-orders.csv", [["Number", "Contact", "Product", "Amount", "Status", "Kind"], ...visible.map((row) => [row.number, row.contact, row.title, formatMoney(row.amount), row.status, row.kind])])}><Download className="h-4 w-4" /> Export</Button>
      </Head>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Paid Orders" value={String(orders.length)} tone="#A855F7" />
        <Stat label="Requests" value={String(requests.length)} tone="#38BDF8" />
        <Stat label="Delivered" value={String(orders.filter((order) => order.status === "DELIVERED").length)} tone="#22C55E" />
        <Stat label="Canceled / Refunded" value={String(orders.filter((order) => order.status === "CANCELLED" || order.status === "REFUNDED").length + requests.filter((request) => request.status === "CANCELED").length)} tone="#FB7185" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel className="space-y-3 p-4">
          <input className={inputClass} placeholder="Search by order, product, or customer..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Order</th><th>Customer</th><th>Product</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id} className="cursor-pointer border-t border-white/5" onClick={() => setSelected(row.id)}>
                    <td className="py-2">{row.number}</td><td>{row.contact}</td><td>{row.title}</td><td>{formatMoney(row.amount)}</td><td><Badge tone="slate">{row.status.replaceAll("_", " ")}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel className="p-4 text-sm">
          <h2 className="font-bold">Order Details</h2>
          {current ? <div className="mt-3 space-y-2"><p className="text-lg font-black">{current.number}</p><p>{current.title}</p><p>{formatMoney(current.amount)}</p><p>{current.contact}</p><p>{current.kind}</p><p className="text-slate-400">{stamp(current.createdAt)}</p><p>{current.status.replaceAll("_", " ")}</p></div> : <p className="mt-3 text-slate-400">No matching rows.</p>}
        </Panel>
      </div>
    </div>
  );
}

export function AdminCustomersView({ customers }: { customers: CustomerRow[] }) {
  const [query, setQuery] = useState("");
  const rows = customers.filter((customer) => `${customer.name} ${customer.email}`.toLowerCase().includes(query.toLowerCase()));
  const withOrders = customers.filter((customer) => customer.orderCount > 0).length;
  return (
    <div className="space-y-4">
      <Head icon={<Users className="h-6 w-6" />} title="Customers" crumb="Customers" text="Customer accounts. Sellers and admins are not listed here.">
        <Button variant="secondary" onClick={() => downloadCsv("customers.csv", [["Name", "Email", "Orders", "Spent", "Status", "Joined"], ...rows.map((customer) => [customer.name, customer.email, String(customer.orderCount), formatMoney(customer.spentMinor), customer.status, customer.createdAt.slice(0, 10)])])}><Download className="h-4 w-4" /> Export</Button>
        <Button asChild><Link href="/admin/customers/new"><Plus className="h-4 w-4" /> Add Customer</Link></Button>
      </Head>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Customers" value={String(customers.length)} tone="#A855F7" />
        <Stat label="With Orders" value={String(withOrders)} tone="#38BDF8" />
        <Stat label="Suspended" value={String(customers.filter((customer) => customer.status === "SUSPENDED").length)} tone="#FB7185" />
      </div>
      <Panel className="space-y-3 p-4">
        <input className={inputClass} placeholder="Search by name or email..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Customer</th><th>Orders</th><th>Spent</th><th>Status</th><th>Joined</th><th></th></tr></thead>
          <tbody>
            {rows.map((customer) => (
              <tr key={customer.id} className="border-t border-white/5">
                <td className="py-3"><span className="flex items-center gap-2"><NameAvatar name={customer.name} size="sm" /><span>{customer.name}<span className="block text-xs text-slate-500">{customer.email}</span></span></span></td>
                <td>{customer.orderCount}</td>
                <td>{formatMoney(customer.spentMinor)}</td>
                <td>{customer.status === "ACTIVE" ? <Badge tone="green">Active</Badge> : <Badge tone="red">Suspended</Badge>}</td>
                <td className="text-slate-400">{customer.createdAt.slice(0, 10)}</td>
                <td className="space-x-2 text-xs"><Link className="text-[#FF4BD8]" href={`/admin/customers/${customer.id}`}>View</Link><Link href={`/admin/customers/${customer.id}/edit`}>Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

export function AdminCustomerForm({ customer }: { customer?: CustomerRow }) {
  const router = useRouter();
  const refresh = useRefresh();
  const [name, setName] = useState(customer?.name ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState(customer?.note ?? "");
  const [status, setStatus] = useState(customer?.status ?? "ACTIVE");
  const [verified, setVerified] = useState(customer?.emailVerified ?? false);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      const body = { name, email, password: password || undefined, note, status, emailVerified: verified };
      if (customer) await mutate(`/admin/customers/${customer.id}`, "PATCH", body);
      else await mutate("/admin/customers", "POST", body);
      toast.success(customer ? "Customer updated." : "Customer created. No welcome email was sent.");
      refresh();
      router.push("/admin/customers");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The customer was not saved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <Head icon={<Users className="h-6 w-6" />} title={customer ? "Edit Customer" : "Add Customer"} crumb={`Customers / ${customer ? "Edit Customer" : "Add Customer"}`} text="Phone numbers are not collected. Password changes are stored as a hash." />
      <Panel className="max-w-3xl space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Full Name *"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="Email *"><input className={inputClass} value={email} disabled={Boolean(customer)} onChange={(event) => setEmail(event.target.value)} /></Field>
          <Field label={customer ? "New Password" : "Password *"}><input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></Field>
          <Field label="Status"><select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as CustomerRow["status"])}><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option></select></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} /> Mark email verified. This does not send a message.</label>
        <Field label="Notes"><textarea className={`${inputClass} min-h-24`} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} /></Field>
        <div className="flex justify-between"><Button asChild variant="secondary"><Link href="/admin/customers">Cancel</Link></Button><Button disabled={busy} onClick={save}>{customer ? "Update Customer" : "Create Customer"}</Button></div>
      </Panel>
    </div>
  );
}

export function AdminCustomerDetail({ customer }: { customer: CustomerDetail }) {
  const refresh = useRefresh();
  async function block() {
    try {
      await mutate(`/admin/customers/${customer.id}`, "PATCH", { status: customer.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED" });
      toast.success("Customer status updated.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Status was not changed.");
    }
  }
  const average = customer.orderCount ? Math.round(customer.spentMinor / Math.max(1, customer.orders.filter((order) => order.status === "DELIVERED").length || customer.orderCount)) : 0;
  return (
    <div className="space-y-4">
      <Head icon={<Users className="h-6 w-6" />} title="View Customer" crumb="Customers / View Customer" text="Orders and account status for this customer.">
        <Button asChild variant="secondary"><Link href="/admin/customers">← Back</Link></Button>
        <Button asChild variant="secondary"><Link href={`/admin/customers/${customer.id}/edit`}>Edit Customer</Link></Button>
        <Button variant="danger" onClick={block}>{customer.status === "SUSPENDED" ? "Unblock" : "Block"}</Button>
      </Head>
      <Panel className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3"><NameAvatar name={customer.name} /><div><h2 className="text-xl font-black">{customer.name}</h2><p className="text-sm text-slate-400">{customer.email}</p></div></div>
        <div className="grid grid-cols-3 gap-4 text-sm"><div><p className="text-slate-400">Orders</p><p className="text-xl font-black">{customer.orderCount}</p></div><div><p className="text-slate-400">Delivered Spend</p><p className="text-xl font-black">{formatMoney(customer.spentMinor)}</p></div><div><p className="text-slate-400">Avg. Delivered</p><p className="text-xl font-black">{formatMoney(average)}</p></div></div>
      </Panel>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-4 text-sm"><h2 className="font-bold">Account</h2><p className="mt-2">Status {customer.status}</p><p>Email {customer.emailVerified ? "marked verified" : "not verified"}</p><p>MFA {customer.mfaEnabled ? "on" : "off"}</p><p>Joined {customer.createdAt.slice(0, 10)}</p><p>Note: {customer.note || "None"}</p><p className="mt-2">Tickets: {customer.tickets.length === 0 ? "None" : customer.tickets.map((ticket) => ticket.number).join(", ")}</p></Panel>
        <Panel className="overflow-x-auto p-4">
          <h2 className="mb-2 font-bold">Orders</h2>
          {customer.orders.length === 0 ? <p className="text-sm text-slate-400">No orders.</p> : customer.orders.map((order) => <p key={order.id} className="mt-2 text-sm">{order.number} · {order.items[0]?.title} · {formatMoney(order.totalMinor)} · {order.status}</p>)}
        </Panel>
      </div>
    </div>
  );
}

export function AdminReportsView({ data }: { data: AdminDash }) {
  const delivered = data.statusCounts.find((item) => item.status === "DELIVERED")?.count ?? 0;
  const completion = data.orderCount ? Math.round((delivered / data.orderCount) * 1000) / 10 : 0;
  const categories = data.categoryCounts.filter((item) => item.gmvMinor > 0);
  return (
    <div className="space-y-4">
      <Head icon={<Settings className="h-6 w-6" />} title="Reports & Analytics" crumb="Reports & Analytics" text="Figures come from orders already stored. Empty categories are omitted.">
        <Button variant="secondary" onClick={() => downloadCsv("platform-report.csv", [["Metric", "Value"], ["Orders", String(data.orderCount)], ["Delivered sales", formatMoney(data.gmvMinor)], ["Customers", String(data.customerCount)], ["Approved sellers", String(data.activeSellers)], ["Platform revenue", formatMoney(data.platformRevenueMinor)]])}><Download className="h-4 w-4" /> Export</Button>
      </Head>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Orders" value={String(data.orderCount)} tone="#A855F7" />
        <Stat label="Delivered Sales" value={formatMoney(data.gmvMinor)} tone="#22C55E" />
        <Stat label="Customers" value={String(data.customerCount)} tone="#38BDF8" />
        <Stat label="Approved Sellers" value={String(data.activeSellers)} tone="#F59E0B" />
        <Stat label="Delivered Rate" value={`${completion}%`} tone="#FF4BD8" />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="p-4"><h2 className="mb-2 font-bold">Sales Trend</h2><div className="h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.series}><XAxis dataKey="date" tickFormatter={(value) => String(value).slice(5)} stroke="#64748b" fontSize={11} /><Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} /><Area dataKey="revenueMinor" stroke="#A855F7" fill="#A855F733" /></AreaChart></ResponsiveContainer></div></Panel>
        <Panel className="p-4 text-sm"><h2 className="font-bold">Orders by Status</h2>{data.statusCounts.map((item) => <p key={item.status} className="mt-2 flex justify-between"><span>{item.status.replaceAll("_", " ")}</span><span>{item.count}</span></p>)}{data.statusCounts.length === 0 && <p className="mt-2 text-slate-400">No orders.</p>}</Panel>
        <Panel className="p-4 text-sm"><h2 className="font-bold">Revenue by Category</h2>{categories.length === 0 ? <p className="mt-2 text-slate-400">No delivered category sales.</p> : categories.map((item) => <p key={item.name} className="mt-2 flex justify-between"><span>{item.name}</span><span>{formatMoney(item.gmvMinor)}</span></p>)}</Panel>
        <Panel className="p-4 text-sm"><h2 className="font-bold">Top Sellers</h2>{data.topSellers.length === 0 ? <p className="mt-2 text-slate-400">No delivered seller sales.</p> : data.topSellers.map((seller) => <p key={seller.name} className="mt-2 flex justify-between"><span>{seller.name}</span><span>{formatMoney(seller.salesMinor)} · {seller.orders} orders</span></p>)}</Panel>
      </div>
    </div>
  );
}

export function AdminPlatformSettings({ settings }: { settings: { customerFeeBps: number; commissionBps: number; allowSellerRegistration: boolean; demoMode: boolean; providers: Array<{ name: string; status: string; note: string }> } }) {
  const refresh = useRefresh();
  const [fee, setFee] = useState(String(settings.customerFeeBps));
  const [commission, setCommission] = useState(String(settings.commissionBps));
  const [registration, setRegistration] = useState(settings.allowSellerRegistration);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await mutate("/admin/settings", "PATCH", { customerFeeBps: Number(fee), commissionBps: Number(commission), allowSellerRegistration: registration });
      toast.success("Settings saved.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Settings were not saved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <Head icon={<Settings className="h-6 w-6" />} title="Platform Settings" crumb="Platform Settings" text="Fees apply to the next checkout. Payments, shipping, and email integrations are not connected." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="space-y-3 p-4">
          <h2 className="font-bold">Fees</h2>
          <Field label="Customer fee (basis points)"><input className={inputClass} value={fee} onChange={(event) => setFee(event.target.value)} /></Field>
          <Field label="Seller commission (basis points)"><input className={inputClass} value={commission} onChange={(event) => setCommission(event.target.value)} /></Field>
          <p className="text-xs text-slate-500">300 basis points is 3%. Demo mode is {settings.demoMode ? "on" : "off"}.</p>
        </Panel>
        <Panel className="space-y-3 p-4">
          <h2 className="font-bold">Marketplace Options</h2>
          <label className="flex items-center justify-between text-sm">Allow seller registration <input type="checkbox" checked={registration} onChange={(event) => setRegistration(event.target.checked)} /></label>
          <p className="text-xs text-slate-500">Turning this off blocks new seller applications. Existing sellers stay signed in.</p>
        </Panel>
        <Panel className="p-4 text-sm xl:col-span-2">
          <h2 className="font-bold">Providers</h2>
          {settings.providers.map((provider) => <p key={provider.name} className="mt-2">{provider.name}: {provider.status}. {provider.note}</p>)}
        </Panel>
      </div>
      <div className="flex justify-end"><Button disabled={busy} onClick={save}>Save Changes</Button></div>
    </div>
  );
}

export function AdminAccountSettings({ account }: { account: { name: string; email: string; role: string; mfaEnabled: boolean } }) {
  const refresh = useRefresh();
  const [name, setName] = useState(account.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  async function saveName() {
    try {
      await mutate("/auth/profile", "PATCH", { name });
      toast.success("Name updated.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Name was not updated.");
    }
  }
  async function savePassword() {
    try {
      await mutate("/auth/password", "POST", { currentPassword, newPassword });
      toast.success("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Password was not changed.");
    }
  }
  return (
    <div className="space-y-4">
      <Head icon={<Settings className="h-6 w-6" />} title="Account Settings" crumb="Account Settings" text="This admin account. API keys and extra device sessions are not issued." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="space-y-3 p-4">
          <h2 className="font-bold">Profile</h2>
          <div className="flex items-center gap-3"><NameAvatar name={name} /><div><p className="font-semibold">{account.role}</p><p className="text-sm text-slate-400">{account.email}</p></div></div>
          <Field label="Full Name"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Button onClick={saveName}>Save Profile</Button>
        </Panel>
        <Panel className="space-y-3 p-4">
          <h2 className="font-bold">Security</h2>
          <p className="text-sm">Two-factor authentication: {account.mfaEnabled ? "Enabled" : "Off"}</p>
          <Field label="Current Password"><input className={inputClass} type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></Field>
          <Field label="New Password"><input className={inputClass} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></Field>
          <Button variant="secondary" onClick={savePassword}>Change Password</Button>
        </Panel>
      </div>
    </div>
  );
}

function OpsHead({ title, crumb, text, icon }: { title: string; crumb: string; text: string; icon: ReactNode }) {
  return <Head icon={icon} title={title} crumb={crumb} text={text} />;
}

export function AdminInventoryView({ units }: { units: Array<{ id: string; reference: string; productTitle: string; variantName: string; sellerName: string; state: string; revealed: boolean }> }) {
  const counts = (state: string) => units.filter((unit) => unit.state === state).length;
  return (
    <div className="space-y-4">
      <OpsHead icon={<Package className="h-6 w-6" />} title="Inventory" crumb="Inventory" text="Encrypted units. The table shows a short reference, never the voucher or token." />
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Units" value={String(units.length)} tone="#A855F7" />
        <Stat label="Available" value={String(counts("AVAILABLE"))} tone="#22C55E" />
        <Stat label="Delivered" value={String(counts("DELIVERED"))} tone="#38BDF8" />
        <Stat label="Quarantined" value={String(counts("QUARANTINED"))} tone="#FB7185" />
      </div>
      <Panel className="overflow-x-auto p-4">
        {units.length === 0 ? <p className="text-sm text-slate-400">No inventory units.</p> : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Reference</th><th>Product</th><th>Seller</th><th>State</th><th></th></tr></thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id} className="border-t border-white/5">
                  <td className="py-3 font-mono text-xs">{unit.reference}</td>
                  <td>{unit.productTitle}<span className="block text-xs text-slate-500">{unit.variantName}</span></td>
                  <td><span className="inline-flex items-center gap-2"><NameAvatar name={unit.sellerName} size="sm" />{unit.sellerName}</span></td>
                  <td><Badge tone={unit.state === "QUARANTINED" ? "red" : unit.state === "AVAILABLE" ? "green" : "slate"}>{unit.state}</Badge></td>
                  <td>{unit.state === "QUARANTINED" ? null : <ConfirmAction label="Quarantine" path={`/admin/inventory/${unit.id}/quarantine`} tone="danger" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

export function AdminPaymentsView({ payments }: { payments: Array<{ id: string; orderNumber: string; method: string; amountMinor: number; status: string; createdAt: string }> }) {
  return (
    <div className="space-y-4">
      <OpsHead icon={<ShoppingCart className="h-6 w-6" />} title="Payments" crumb="Payments" text="Mock captures only. Refunding a succeeded payment reverses the ledger and quarantines revealed units." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Payments" value={String(payments.length)} tone="#A855F7" />
        <Stat label="Captured" value={formatMoney(payments.filter((item) => item.status === "SUCCEEDED").reduce((sum, item) => sum + item.amountMinor, 0))} tone="#22C55E" />
        <Stat label="Refunded" value={String(payments.filter((item) => item.status === "REFUNDED").length)} tone="#FB7185" />
      </div>
      <Panel className="overflow-x-auto p-4">
        {payments.length === 0 ? <p className="text-sm text-slate-400">No payments.</p> : (
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Order</th><th>Method</th><th>Amount</th><th>Status</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-white/5">
                  <td className="py-3">{payment.orderNumber}</td>
                  <td>{payment.method}</td>
                  <td>{formatMoney(payment.amountMinor)}</td>
                  <td><Badge tone={payment.status === "SUCCEEDED" ? "green" : payment.status === "REFUNDED" ? "red" : "amber"}>{payment.status}</Badge></td>
                  <td className="text-slate-400">{stamp(payment.createdAt)}</td>
                  <td>{payment.status === "SUCCEEDED" ? <ConfirmAction label="Refund" path={`/admin/payments/${payment.id}/refund`} tone="danger" /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

export function AdminPayoutsView({ payouts }: { payouts: PayoutView[] }) {
  const pending = payouts.filter((item) => item.status === "PENDING");
  return (
    <div className="space-y-4">
      <OpsHead icon={<Store className="h-6 w-6" />} title="Payouts" crumb="Payouts" text="Approving a payout moves ledger balances. No bank transfer is sent." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Requests" value={String(payouts.length)} tone="#A855F7" />
        <Stat label="Pending" value={formatMoney(pending.reduce((sum, item) => sum + item.amountMinor, 0))} tone="#F59E0B" />
        <Stat label="Paid" value={String(payouts.filter((item) => item.status === "PAID").length)} tone="#22C55E" />
      </div>
      <Panel className="overflow-x-auto p-4">
        {payouts.length === 0 ? <p className="text-sm text-slate-400">No payout requests.</p> : (
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Seller</th><th>Amount</th><th>Status</th><th>Requested</th><th></th></tr></thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id} className="border-t border-white/5">
                  <td className="py-3"><span className="inline-flex items-center gap-2"><NameAvatar name={payout.sellerName} size="sm" />{payout.sellerName}</span></td>
                  <td>{formatMoney(payout.amountMinor)}</td>
                  <td><Badge tone={payout.status === "PAID" ? "green" : payout.status === "REJECTED" ? "red" : "amber"}>{payout.status}</Badge></td>
                  <td className="text-slate-400">{stamp(payout.createdAt)}</td>
                  <td>{payout.status === "PENDING" ? <span className="flex gap-2"><ConfirmAction label="Mark paid" path={`/admin/payouts/${payout.id}/decision`} body={{ decision: "PAID" }} /><ConfirmAction label="Reject" path={`/admin/payouts/${payout.id}/decision`} body={{ decision: "REJECTED" }} tone="danger" /></span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

export function AdminDisputesView({ disputes, orders }: { disputes: DisputeView[]; orders: OrderView[] }) {
  const numberFor = (id: string) => orders.find((order) => order.id === id)?.number ?? id.slice(0, 8);
  return (
    <div className="space-y-4">
      <OpsHead icon={<Ban className="h-6 w-6" />} title="Disputes" crumb="Disputes" text="Open disputes can be resolved or rejected. The note is stored with the decision." />
      <Stat label="Open" value={String(disputes.filter((item) => item.status === "OPEN" || item.status === "UNDER_REVIEW").length)} tone="#F59E0B" />
      <Panel className="overflow-x-auto p-4">
        {disputes.length === 0 ? <p className="text-sm text-slate-400">No disputes.</p> : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Order</th><th>Opened by</th><th>Reason</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {disputes.map((dispute) => (
                <tr key={dispute.id} className="border-t border-white/5">
                  <td className="py-3">{numberFor(dispute.orderId)}</td>
                  <td><span className="inline-flex items-center gap-2"><NameAvatar name={dispute.openedBy} size="sm" />{dispute.openedBy}</span></td>
                  <td className="max-w-xs">{dispute.reason}</td>
                  <td><Badge tone={dispute.status === "RESOLVED" ? "green" : dispute.status === "REJECTED" ? "red" : "amber"}>{dispute.status}</Badge>{dispute.resolution ? <span className="mt-1 block text-xs text-slate-500">{dispute.resolution}</span> : null}</td>
                  <td>{dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW" ? <span className="flex gap-2"><ConfirmAction label="Resolve" path={`/admin/disputes/${dispute.id}/resolve`} body={{ outcome: "RESOLVED", note: "Resolved from the admin queue." }} /><ConfirmAction label="Reject" path={`/admin/disputes/${dispute.id}/resolve`} body={{ outcome: "REJECTED", note: "Rejected from the admin queue." }} tone="danger" /></span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

export function AdminTicketsView({ tickets }: { tickets: TicketView[] }) {
  return (
    <div className="space-y-4">
      <OpsHead icon={<Users className="h-6 w-6" />} title="Tickets" crumb="Tickets" text="Support tickets from customer accounts. Replies are stored on the ticket." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Tickets" value={String(tickets.length)} tone="#A855F7" />
        <Stat label="Open" value={String(tickets.filter((item) => item.status === "OPEN" || item.status === "IN_PROGRESS").length)} tone="#F59E0B" />
        <Stat label="Resolved" value={String(tickets.filter((item) => item.status === "RESOLVED" || item.status === "CLOSED").length)} tone="#22C55E" />
      </div>
      <Panel className="overflow-x-auto p-4">
        {tickets.length === 0 ? <p className="text-sm text-slate-400">No tickets.</p> : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Ticket</th><th>Subject</th><th>Status</th><th>Updated</th></tr></thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-t border-white/5">
                  <td className="py-3"><Link href={`/admin/tickets/${ticket.id}`} className="font-semibold text-[#FF4BD8]">{ticket.number}</Link></td>
                  <td>{ticket.subject}</td>
                  <td><Badge tone={ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "green" : "amber"}>{ticket.status}</Badge></td>
                  <td className="text-slate-400">{stamp(ticket.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

export function AdminTicketDetail({ ticket }: { ticket: TicketView }) {
  const refresh = useRefresh();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  async function reply() {
    if (body.trim().length < 1) return;
    setBusy(true);
    try {
      await mutate(`/tickets/${ticket.id}/messages`, "POST", { body });
      setBody("");
      toast.success("Reply saved.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The reply was not saved.");
    } finally {
      setBusy(false);
    }
  }
  async function setStatus(status: string) {
    try {
      await mutate(`/admin/tickets/${ticket.id}/status`, "POST", { status });
      toast.success("Ticket status updated.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Status was not updated.");
    }
  }
  return (
    <div className="space-y-4">
      <OpsHead icon={<Users className="h-6 w-6" />} title={ticket.number} crumb={`Tickets / ${ticket.number}`} text={ticket.subject} />
      <Badge tone={ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "green" : "amber"}>{ticket.status}</Badge>
      <Panel className="space-y-3 p-4">
        {ticket.messages.map((message) => (
          <div key={message.id} className="flex gap-3 text-sm">
            <NameAvatar name={message.authorName} size="sm" />
            <div>
              <p className="font-semibold">{message.authorName} <span className="text-xs font-normal text-slate-500">{message.authorRole} · {stamp(message.createdAt)}</span></p>
              <p className="text-slate-300">{message.body}</p>
            </div>
          </div>
        ))}
        <textarea className={`${inputClass} min-h-24`} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Reply to the customer..." />
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={reply}>Send Reply</Button>
          <Button variant="secondary" onClick={() => setStatus("RESOLVED")}>Mark Resolved</Button>
          <Button variant="secondary" onClick={() => setStatus("CLOSED")}>Close</Button>
        </div>
      </Panel>
      <Button asChild variant="secondary"><Link href="/admin/tickets">← Back to Tickets</Link></Button>
    </div>
  );
}

export function AdminAccountsView({ users }: { users: Array<{ id: string; name: string; email: string; role: string; status: string }> }) {
  return (
    <div className="space-y-4">
      <OpsHead icon={<Users className="h-6 w-6" />} title="Accounts" crumb="Accounts" text="Every login, including sellers and admins. Customer spending stays on the Customers page." />
      <Panel className="overflow-x-auto p-4">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-white/5">
                <td className="py-3"><span className="inline-flex items-center gap-2"><NameAvatar name={user.name} size="sm" />{user.name}</span></td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td><Badge tone={user.status === "ACTIVE" ? "green" : "red"}>{user.status}</Badge></td>
                <td>{user.role === "SUPER_ADMIN" ? null : <ConfirmAction label={user.status === "ACTIVE" ? "Suspend" : "Restore"} path={`/admin/users/${user.id}/status`} body={{ status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }} tone={user.status === "ACTIVE" ? "danger" : "primary"} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
