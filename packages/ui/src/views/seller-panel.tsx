"use client";

import { useMemo, useState, type ReactNode, type ComponentProps } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { toast } from "sonner";
import { Ban, Box, Download, FileText, Package, Pencil, Plus, Save, Search, Settings, ShoppingCart, Star, Trash2, Users, Wallet } from "lucide-react";
import { formatMoney, type ProductSummary } from "@marketplace/types";
import { Badge, Button, Field, NameAvatar, Panel, inputClass, mutate, useRefresh } from "../components/kit";
import { ProductImagesPanel, useProductImages } from "../components/product-images";
import { useSellerHref, type SellerActivityRow, type SellerDash } from "./seller";

function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const to = useSellerHref();
  return <NextLink href={typeof href === "string" ? to(href) : href} {...props} />;
}

const CATEGORIES = [
  { slug: "digital-accounts", name: "Digital Accounts" },
  { slug: "subscriptions", name: "Subscriptions / Licenses" },
  { slug: "gaming", name: "Gaming Products" },
];

const KINDS = [
  { value: "ACCOUNT", label: "Digital Account" },
  { value: "SUBSCRIPTION", label: "Subscription" },
  { value: "GAMING", label: "Gaming" },
  { value: "LICENSE", label: "License" },
] as const;

const CATEGORY_COLOR: Record<string, string> = {
  "digital-accounts": "#A855F7",
  subscriptions: "#22D3EE",
  gaming: "#22C55E",
};

export type SellerListing = ProductSummary & { description: string; variantName: string; createdAt: string };

export type SellerCustomer = {
  contact: string;
  orders: number;
  lastAt: string;
  firstAt: string;
  spentMinor: number;
  blocked: boolean;
  note: string;
};

export type SellerCustomerDetail = {
  contact: string;
  orders: SellerActivityRow[];
  orderCount: number;
  spentMinor: number;
  averageMinor: number;
  firstAt: string;
  lastAt: string;
  note: string;
  blocked: boolean;
};

function categoryName(slug: string) {
  return CATEGORIES.find((item) => item.slug === slug)?.name ?? slug;
}

function listingStatus(status: string) {
  if (status === "ACTIVE") return <Badge tone="green">Active</Badge>;
  if (status === "DRAFT") return <Badge tone="cyan">Draft</Badge>;
  if (status === "PENDING_REVIEW") return <Badge tone="amber">In review</Badge>;
  if (status === "REJECTED") return <Badge tone="red">Rejected</Badge>;
  return <Badge tone="red">Inactive</Badge>;
}

function requestStatus(status: SellerActivityRow["status"]) {
  if (status === "COMPLETED") return <Badge tone="green">Completed</Badge>;
  if (status === "CANCELED") return <Badge tone="red">Canceled</Badge>;
  if (status === "IN_PROGRESS") return <Badge tone="cyan">In Progress</Badge>;
  return <Badge tone="amber">Pending</Badge>;
}

function contactKind(contact: string) {
  if (contact.startsWith("@")) return "Telegram";
  if (contact.includes("@")) return "Email";
  return "Contact";
}

function contactHref(contact: string) {
  if (contact.startsWith("@")) return `https://t.me/${contact.slice(1)}`;
  if (contact.includes("@")) return `mailto:${contact}`;
  return "";
}

function stamp(value: string) {
  return value.replace("T", " ").slice(0, 16);
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

function PageHead({ icon, title, crumb, text, children }: { icon: ReactNode; title: string; crumb: string; text: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#e879f9]/80 bg-[#160b28] text-[#FF4BD8] shadow-[0_0_16px_rgba(255,0,200,.35)]">{icon}</span>
        <div>
          <p className="text-xs text-slate-500">Home / {crumb}</p>
          <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">{text}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Stat({ label, value, tone, icon }: { label: string; value: string; tone: string; icon: ReactNode }) {
  return (
    <Panel className="flex items-center gap-3 p-4">
      <span className="grid h-11 w-11 place-items-center rounded-2xl border" style={{ color: tone, borderColor: `${tone}88`, background: `${tone}18` }}>{icon}</span>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-2xl font-black">{value}</p>
      </div>
    </Panel>
  );
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  const count = Math.min(5, pages);
  const start = Math.max(1, Math.min(page - 2, pages - count + 1));
  const items = Array.from({ length: count }, (_, index) => start + index);
  return (
    <div className="flex items-center justify-end gap-1">
      <button type="button" className="rounded-lg border border-white/10 px-2 py-1 text-xs" onClick={() => onPage(Math.max(1, page - 1))}>←</button>
      {items.map((item) => (
        <button key={item} type="button" className={`h-8 w-8 rounded-lg text-xs ${item === page ? "bg-[#FF00C8] font-bold" : "border border-white/10"}`} onClick={() => onPage(item)}>{item}</button>
      ))}
      <button type="button" className="rounded-lg border border-white/10 px-2 py-1 text-xs" onClick={() => onPage(Math.min(pages, page + 1))}>→</button>
    </div>
  );
}

export function SellerCatalogView({ products }: { products: SellerListing[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const rows = useMemo(() => products.filter((product) => {
    const text = `${product.title} ${product.slug}`.toLowerCase();
    if (query && !text.includes(query.toLowerCase())) return false;
    if (category !== "all" && product.categorySlug !== category) return false;
    if (status === "active" && product.status !== "ACTIVE") return false;
    if (status === "draft" && product.status !== "DRAFT" && product.status !== "PENDING_REVIEW") return false;
    if (status === "inactive" && product.status !== "SUSPENDED" && product.status !== "REJECTED") return false;
    return true;
  }), [products, query, category, status]);
  const pages = Math.max(1, Math.ceil(rows.length / 6));
  const visible = rows.slice((page - 1) * 6, page * 6);
  const counts = {
    total: products.length,
    active: products.filter((item) => item.status === "ACTIVE").length,
    draft: products.filter((item) => item.status === "DRAFT" || item.status === "PENDING_REVIEW").length,
    inactive: products.filter((item) => item.status === "SUSPENDED" || item.status === "REJECTED").length,
  };
  return (
    <div className="space-y-4">
      <PageHead icon={<Package className="h-6 w-6" />} title="Products" crumb="Products" text="Manage your product listings. Add, edit, or remove products from your store.">
        <Button variant="secondary" onClick={() => downloadCsv("products.csv", [["Product", "Category", "Price", "Status", "Created"], ...rows.map((item) => [item.title, categoryName(item.categorySlug), formatMoney(item.priceMinor), item.status, item.createdAt.slice(0, 10)])])}><Download className="h-4 w-4" /> Export</Button>
        <Button asChild><Link href="/seller/products/new"><Plus className="h-4 w-4" /> Add Product</Link></Button>
      </PageHead>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Products" value={String(counts.total)} tone="#A855F7" icon={<Package className="h-4 w-4" />} />
        <Stat label="Active" value={String(counts.active)} tone="#22C55E" icon={<Package className="h-4 w-4" />} />
        <Stat label="Draft / Review" value={String(counts.draft)} tone="#38BDF8" icon={<Pencil className="h-4 w-4" />} />
        <Stat label="Inactive" value={String(counts.inactive)} tone="#FB7185" icon={<Ban className="h-4 w-4" />} />
      </div>
      <Panel className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input className={`${inputClass} pl-9`} placeholder="Search products by name..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
          </label>
          <select className={`${inputClass} !w-52 shrink-0`} value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
            <option value="all">All Categories</option>
            {CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
          <select className={`${inputClass} !w-52 shrink-0`} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft / review</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No listings match these filters.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-2">Product</th><th>Category</th><th>Price</th><th>Status</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {visible.map((product) => (
                  <tr key={product.id} className="border-t border-white/5">
                    <td className="py-3">
                      <span className="flex items-center gap-2">
                        <span className="grid h-9 w-9 place-items-center rounded-lg text-xs font-black" style={{ color: product.accent, background: `${product.accent}22` }}>{product.monogram}</span>
                        <span>
                          <span className="block font-semibold">{product.title}</span>
                          <span className="text-xs text-slate-500">{product.variantName}</span>
                        </span>
                      </span>
                    </td>
                    <td><Badge tone="pink">{categoryName(product.categorySlug)}</Badge></td>
                    <td className="font-semibold">{formatMoney(product.priceMinor)}</td>
                    <td>{listingStatus(product.status)}</td>
                    <td className="text-slate-400">{product.createdAt.slice(0, 10)}</td>
                    <td className="text-right"><Link href={`/seller/products/${product.id}/edit`} className="font-semibold text-[#FF4BD8]">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Showing {rows.length === 0 ? 0 : (page - 1) * 6 + 1}–{Math.min(page * 6, rows.length)} of {rows.length} products</span>
          <Pager page={page} pages={pages} onPage={setPage} />
        </div>
      </Panel>
    </div>
  );
}

export function SellerListingForm({ product }: { product?: SellerListing }) {
  const router = useRouter();
  const to = useSellerHref();
  const refresh = useRefresh();
  const [title, setTitle] = useState(product?.title ?? "");
  const [categorySlug, setCategorySlug] = useState(product?.categorySlug && CATEGORIES.some((item) => item.slug === product.categorySlug) ? product.categorySlug : "digital-accounts");
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>(KINDS.some((item) => item.value === product?.kind) ? product!.kind as (typeof KINDS)[number]["value"] : "ACCOUNT");
  const [price, setPrice] = useState(product ? (product.priceMinor / 100).toFixed(2) : "0.00");
  const [summary, setSummary] = useState(product?.summary ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [active, setActive] = useState(product ? product.status === "ACTIVE" : true);
  const [featured, setFeatured] = useState(Boolean(product?.tags.includes("featured")));
  const [best, setBest] = useState(Boolean(product?.tags.includes("best")));
  const [fresh, setFresh] = useState(product ? product.tags.includes("new") : true);
  const images = useProductImages(product?.images);
  const [busy, setBusy] = useState(false);

  async function save(publish: boolean) {
    const priceMinor = Math.round(Number(price) * 100);
    if (title.trim().length < 4) return toast.error("Enter a product name of at least 4 characters.");
    if (summary.trim().length < 8 || summary.trim().length > 160) return toast.error("Short description must be 8–160 characters.");
    if (description.trim().length < 20) return toast.error("Detailed description needs at least 20 characters.");
    if (!Number.isFinite(priceMinor) || priceMinor < 50) return toast.error("Enter a price of at least $0.50.");
    const tags = [featured ? "featured" : "", best ? "best" : "", fresh ? "new" : ""].filter(Boolean);
    const body = {
      title: title.trim(),
      categorySlug,
      kind,
      platform: product?.platform || title.trim().split(/\s+/)[0] || "Digital",
      summary: summary.trim(),
      description: description.trim(),
      delivery: product?.delivery ?? "MANUAL",
      region: "GLOBAL" as const,
      priceMinor,
      variantName: product?.variantName || "Standard",
      publish,
      tags,
    };
    setBusy(true);
    try {
      const saved = product ? await mutate<{ id: string }>(`/seller/products/${product.id}`, "PATCH", body) : await mutate<{ id: string }>("/seller/products", "POST", body);
      const failed = await images.commit(product?.id ?? saved.id);
      if (failed) toast.warning(`Listing saved. ${failed} image change${failed === 1 ? "" : "s"} did not go through; edit the listing to retry.`);
      toast.success(publish ? "Submitted for review. It stays hidden until an admin approves it." : product?.status === "ACTIVE" ? "Listing hidden from the store." : "Draft saved.");
      refresh();
      router.push(to("/seller/products"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The listing was not saved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!product || !window.confirm("Remove this listing?")) return;
    setBusy(true);
    try {
      const result = await mutate<{ removed: boolean }>(`/seller/products/${product.id}`, "DELETE");
      toast.success(result.removed ? "Listing removed." : "Listing hidden from the store. Past orders stay on record.");
      refresh();
      router.push(to("/seller/products"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The listing was not removed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHead icon={product ? <Pencil className="h-6 w-6" /> : <Package className="h-6 w-6" />} title={product ? "Edit Product" : "Add Product"} crumb={`Products / ${product ? "Edit Product" : "Add Product"}`} text={product ? "Update product information and settings." : "Create a new product listing for your store."} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="space-y-4 p-4">
          <h2 className="font-bold">Product Information</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Product Name *"><input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g., Netflix Premium (1 Month)" /></Field>
            <Field label="Category *">
              <select className={inputClass} value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)}>{CATEGORIES.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select>
            </Field>
            <Field label="Price (USD) *"><input className={inputClass} inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} /></Field>
            <Field label="Product Type *">
              <select className={inputClass} value={kind} onChange={(event) => setKind(event.target.value as (typeof KINDS)[number]["value"])}>{KINDS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            </Field>
          </div>
          <Field label="Short Description *">
            <textarea className={`${inputClass} min-h-24`} maxLength={160} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="A brief description that will be shown on the product card..." />
            <span className="block text-right text-xs text-slate-500">{summary.length} / 160</span>
          </Field>
          <Field label="Detailed Description">
            <textarea className={`${inputClass} min-h-32`} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Provide full details, features, usage instructions, and other important information..." />
          </Field>
        </Panel>
        <div className="space-y-4">
          <ProductImagesPanel images={images} />
          <Panel className="space-y-3 p-4">
            <h2 className="flex items-center gap-2 font-bold"><Settings className="h-4 w-4" /> Product Settings</h2>
            <Toggle label="Status" text={active ? (product?.status === "ACTIVE" ? "Active (visible in your store)" : "Submit for review") : "Hidden"} on={active} onChange={setActive} />
            <Toggle label="Featured Product" text="Show on store homepage" on={featured} onChange={setFeatured} />
            <Toggle label="Best Seller" text="Mark as best seller" on={best} onChange={setBest} />
            <Toggle label="New Product" text='Show "New" badge' on={fresh} onChange={setFresh} />
            <p className="text-xs text-slate-500">A new or edited listing is not public until an admin approves it. Turning an active listing off hides it.</p>
          </Panel>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="secondary"><Link href="/seller/products">← Cancel</Link></Button>
        <div className="flex flex-wrap gap-2">
          {product && <Button variant="danger" disabled={busy} onClick={remove}><Trash2 className="h-4 w-4" /> Delete Product</Button>}
          <Button variant="secondary" disabled={busy} onClick={() => save(false)}><Save className="h-4 w-4" /> Save as Draft</Button>
          <Button disabled={busy} onClick={() => save(active)}>{product ? "Update Product" : "Publish Product"}</Button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, text, on, onChange }: { label: string; text: string; on: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span><span className="block font-medium">{label}</span><span className="text-xs text-slate-400">{text}</span></span>
      <button type="button" aria-pressed={on} className={`h-6 w-11 rounded-full p-1 ${on ? "bg-[#22C55E]" : "bg-slate-700"}`} onClick={() => onChange(!on)}>
        <span className={`block h-4 w-4 rounded-full bg-white transition ${on ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

export function SellerRequestsView({ rows, products }: { rows: SellerActivityRow[]; products: SellerListing[] }) {
  const [query, setQuery] = useState("");
  const [productId, setProductId] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const filtered = rows.filter((row) => {
    const text = `${row.number} ${row.title} ${row.contact}`.toLowerCase();
    if (query && !text.includes(query.toLowerCase())) return false;
    if (productId !== "all" && row.productId !== productId) return false;
    if (status !== "all" && row.status !== status) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / 6));
  const visible = filtered.slice((page - 1) * 6, page * 6);
  const count = (value: SellerActivityRow["status"]) => rows.filter((row) => row.status === value).length;
  return (
    <div className="space-y-4">
      <PageHead icon={<ShoppingCart className="h-6 w-6" />} title="Order Requests" crumb="Order Requests" text="Manage customer order requests and update order status.">
        <Button variant="secondary" onClick={() => downloadCsv("order-requests.csv", [["Order", "Product", "Contact", "Quantity", "Amount", "Status", "Requested"], ...filtered.map((row) => [row.number, row.title, row.contact, String(row.quantity), formatMoney(row.amountMinor), row.status, stamp(row.createdAt)])])}><Download className="h-4 w-4" /> Export</Button>
        <Button asChild><Link href="/seller/orders/new"><Plus className="h-4 w-4" /> New Order (Manual)</Link></Button>
      </PageHead>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Total Requests" value={String(rows.length)} tone="#A855F7" icon={<ShoppingCart className="h-4 w-4" />} />
        <Stat label="Pending" value={String(count("PENDING"))} tone="#F59E0B" icon={<ShoppingCart className="h-4 w-4" />} />
        <Stat label="In Progress" value={String(count("IN_PROGRESS"))} tone="#38BDF8" icon={<ShoppingCart className="h-4 w-4" />} />
        <Stat label="Completed" value={String(count("COMPLETED"))} tone="#22C55E" icon={<ShoppingCart className="h-4 w-4" />} />
        <Stat label="Canceled" value={String(count("CANCELED"))} tone="#FB7185" icon={<Ban className="h-4 w-4" />} />
      </div>
      <div className="flex flex-wrap gap-2">
        {(["all", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELED"] as const).map((item) => (
          <button key={item} type="button" className={`rounded-full px-3 py-1.5 text-xs font-semibold ${status === item ? "bg-[#FF00C8]" : "border border-white/10 text-slate-300"}`} onClick={() => { setStatus(item); setPage(1); }}>
            {item === "all" ? `All Orders (${rows.length})` : `${item === "PENDING" ? "Pending" : item === "IN_PROGRESS" ? "In Progress" : item === "COMPLETED" ? "Completed" : "Canceled"} (${count(item)})`}
          </button>
        ))}
      </div>
      <Panel className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input className={`${inputClass} pl-9`} placeholder="Search by order ID, product, or contact..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
          </label>
          <select className={`${inputClass} !w-52 shrink-0`} value={productId} onChange={(event) => { setProductId(event.target.value); setPage(1); }}>
            <option value="all">All Products</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}
          </select>
        </div>
        {visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No order requests match these filters.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-2">Order ID</th><th>Product</th><th>Customer Contact</th><th>Qty</th><th>Status</th><th>Requested At</th><th>Last Update</th><th></th></tr></thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id} className="border-t border-white/5">
                    <td className="py-3 font-medium">{row.number}</td>
                    <td><span className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg text-[11px] font-black" style={{ color: row.accent, background: `${row.accent}22` }}>{row.monogram}</span>{row.title}</span></td>
                    <td className="text-slate-300">{row.contact}</td>
                    <td>{row.quantity}</td>
                    <td>{requestStatus(row.status)}</td>
                    <td className="text-slate-400">{stamp(row.createdAt)}</td>
                    <td className="text-slate-400">{stamp(row.updatedAt)}</td>
                    <td><Link href={`/seller/orders/${row.id}`} className="text-xs font-semibold text-[#FF4BD8]">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Showing {filtered.length === 0 ? 0 : (page - 1) * 6 + 1}–{Math.min(page * 6, filtered.length)} of {filtered.length} order requests</span>
          <Pager page={page} pages={pages} onPage={setPage} />
        </div>
      </Panel>
    </div>
  );
}

export function SellerRequestForm({ products }: { products: SellerListing[] }) {
  const router = useRouter();
  const to = useSellerHref();
  const ready = products.filter((product) => product.status === "ACTIVE" || product.status === "PENDING_REVIEW");
  const [productId, setProductId] = useState(ready[0]?.id ?? "");
  const product = ready.find((item) => item.id === productId);
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState<"telegram" | "email">("telegram");
  const [contact, setContact] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const total = (product?.priceMinor ?? 0) * quantity;

  async function submit() {
    if (!product) return toast.error("Choose one of your listings.");
    setBusy(true);
    try {
      const body = {
        productId: product.id,
        variantId: product.defaultVariantId,
        quantity,
        email: method === "email" ? contact.trim() : undefined,
        telegram: method === "telegram" ? contact.trim() : undefined,
        note: note.trim() || undefined,
      };
      const created = await mutate<{ id: string }>("/seller/order-requests", "POST", body);
      toast.success("Order request saved. No payment was taken and nothing was delivered.");
      router.push(to(`/seller/orders/${created.id}`));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The request was not saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHead icon={<ShoppingCart className="h-6 w-6" />} title="New Order Request" crumb="Order Requests / New Order" text="Manually create an order request for a customer. The price comes from the catalog." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="space-y-4 p-4">
          <h2 className="font-bold">Order Information</h2>
          <Field label="Product *">
            <select className={inputClass} value={productId} onChange={(event) => setProductId(event.target.value)}>
              {ready.length === 0 && <option value="">No active listings</option>}
              {ready.map((item) => <option key={item.id} value={item.id}>{item.title} · {formatMoney(item.priceMinor)}</option>)}
            </select>
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Quantity *">
              <div className="flex items-center gap-2">
                <button type="button" className="h-10 w-10 rounded-xl border border-white/10" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                <span className="w-8 text-center font-bold">{quantity}</span>
                <button type="button" className="h-10 w-10 rounded-xl border border-white/10" onClick={() => setQuantity(Math.min(10, quantity + 1))}>+</button>
              </div>
            </Field>
            <Field label="Unit Price (USD) *"><input className={inputClass} readOnly value={product ? formatMoney(product.priceMinor) : ""} /></Field>
          </div>
          <div>
            <p className="text-sm text-slate-300">Total Amount</p>
            <p className="mt-1 text-3xl font-black text-[#FF4BD8]">{formatMoney(total)}</p>
          </div>
          <Field label="Request Details (Optional)">
            <textarea className={`${inputClass} min-h-28`} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add specific details about this order..." />
            <span className="block text-right text-xs text-slate-500">{note.length} / 500</span>
          </Field>
        </Panel>
        <div className="space-y-4">
          <Panel className="space-y-3 p-4">
            <h2 className="font-bold">Customer Information</h2>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${method === "telegram" ? "border-[#FF4BD8] bg-[#FF4BD8]/10" : "border-white/10"}`} onClick={() => setMethod("telegram")}>Telegram</button>
              <button type="button" className={`rounded-xl border px-3 py-2 text-sm ${method === "email" ? "border-[#FF4BD8] bg-[#FF4BD8]/10" : "border-white/10"}`} onClick={() => setMethod("email")}>Email</button>
            </div>
            <Field label={method === "email" ? "Email *" : "Telegram Username *"}>
              <input className={inputClass} value={contact} onChange={(event) => setContact(event.target.value)} placeholder={method === "email" ? "name@example.com" : "@username"} />
            </Field>
            <p className="text-xs text-slate-500">Telegram is saved as contact text. No message is sent.</p>
          </Panel>
          <Panel className="p-4">
            <h2 className="font-bold">Order Status</h2>
            <p className="mt-2 text-sm text-slate-300">Initial status: Pending</p>
            <p className="mt-1 text-xs text-slate-500">Saving this request does not charge the customer or deliver inventory.</p>
          </Panel>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="secondary"><Link href="/seller/orders">← Cancel</Link></Button>
        <Button disabled={busy || !product} onClick={submit}><Plus className="h-4 w-4" /> Create Order Request</Button>
      </div>
    </div>
  );
}

export function SellerRequestDetail({ row }: { row: SellerActivityRow }) {
  const refresh = useRefresh();
  const [status, setStatus] = useState<"IN_PROGRESS" | "COMPLETED" | "CANCELED">(row.status === "CANCELED" ? "CANCELED" : row.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS");
  const [busy, setBusy] = useState(false);
  const href = contactHref(row.contact);
  const steps = [
    { label: "Order Request Submitted", done: true, when: stamp(row.createdAt), text: "The request was saved." },
    { label: "In Progress", done: row.status === "IN_PROGRESS" || row.status === "COMPLETED", when: row.status === "PENDING" ? "—" : stamp(row.updatedAt), text: "You are preparing this order." },
    { label: "Completed", done: row.status === "COMPLETED", when: row.status === "COMPLETED" ? stamp(row.updatedAt) : "—", text: row.source === "order" ? "The paid order was delivered." : "Marked completed. No inventory was delivered from this request." },
    { label: "Canceled", done: row.status === "CANCELED", when: row.status === "CANCELED" ? stamp(row.updatedAt) : "—", text: "The request was canceled." },
  ];

  async function update(next: "IN_PROGRESS" | "COMPLETED" | "CANCELED") {
    setBusy(true);
    try {
      await mutate(`/seller/order-requests/${row.id}`, "PATCH", { status: next });
      toast.success("Request status updated. No payment or delivery was made.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Status was not updated.");
    } finally {
      setBusy(false);
    }
  }

  async function fulfill() {
    setBusy(true);
    try {
      await mutate(`/seller/orders/${row.id}/fulfill`, "POST", {});
      toast.success("Manual order fulfilled.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The order was not fulfilled.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHead icon={<ShoppingCart className="h-6 w-6" />} title="Order Request Details" crumb={`Order Requests / ${row.number}`} text="View the request, contact the customer, and update a saved request status." />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Panel className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <h2 className="text-lg font-black">Order {row.number}</h2>
              <p className="text-xs text-slate-400">Requested {stamp(row.createdAt)} · Updated {stamp(row.updatedAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              {requestStatus(row.status)}
              {href && <a className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold" href={href} target="_blank" rel="noreferrer">Message Customer</a>}
            </div>
          </Panel>
          <Panel className="p-4">
            <h2 className="mb-3 font-bold">Order Items</h2>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-xl text-xs font-black" style={{ color: row.accent, background: `${row.accent}22` }}>{row.monogram}</span><span><span className="block font-semibold">{row.title}</span><span className="text-xs text-slate-500">{row.kindLabel}</span></span></span>
              <span>Qty {row.quantity}</span>
              <span className="font-bold text-[#FF4BD8]">{formatMoney(row.amountMinor)}</span>
            </div>
          </Panel>
          <Panel className="space-y-2 p-4 text-sm">
            <h2 className="font-bold">Customer Information</h2>
            <p className="flex items-center gap-2"><NameAvatar name={row.contact} size="sm" /> {row.contact}</p>
            <p className="text-slate-400">{contactKind(row.contact)} · Requested {stamp(row.createdAt)}</p>
          </Panel>
          <Panel className="p-4">
            <h2 className="font-bold">Request Details</h2>
            <p className="mt-2 text-sm text-slate-300">{row.note || "No note was saved with this request."}</p>
          </Panel>
        </div>
        <div className="space-y-4">
          {row.source === "request" ? (
            <Panel className="space-y-3 p-4">
              <h2 className="font-bold">Order Status</h2>
              <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELED">Canceled</option>
              </select>
              <Button className="w-full" disabled={busy} onClick={() => update(status)}>Update Status</Button>
              <p className="text-xs text-slate-500">Completing a request does not charge anyone or reveal inventory.</p>
            </Panel>
          ) : (
            <Panel className="space-y-3 p-4">
              <h2 className="font-bold">Paid Order</h2>
              <p className="text-sm text-slate-300">This row is a checkout order. Its status follows payment and fulfillment.</p>
              {row.canFulfill && <Button className="w-full" disabled={busy} onClick={fulfill}>Mark as Completed</Button>}
            </Panel>
          )}
          <Panel className="space-y-3 p-4">
            <h2 className="font-bold">Order Timeline</h2>
            {steps.map((step) => (
              <div key={step.label} className="flex gap-3 text-sm">
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${step.done ? "bg-[#FF4BD8]" : "bg-slate-700"}`} />
                <span>
                  <span className="block font-medium">{step.label}</span>
                  <span className="text-xs text-slate-500">{step.text} {step.when}</span>
                </span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="secondary"><Link href="/seller/orders">← Back to Orders</Link></Button>
        {row.source === "request" && row.status !== "CANCELED" && row.status !== "COMPLETED" && (
          <div className="flex gap-2">
            <Button variant="danger" disabled={busy} onClick={() => update("CANCELED")}><Ban className="h-4 w-4" /> Cancel Order</Button>
            <Button disabled={busy} onClick={() => update("COMPLETED")}>Mark as Completed</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function SellerCustomerList({ customers, monthKey }: { customers: SellerCustomer[]; monthKey: string }) {
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("all");
  const [page, setPage] = useState(1);
  const rows = customers.filter((customer) => {
    if (query && !customer.contact.toLowerCase().includes(query.toLowerCase())) return false;
    if (method === "email" && (customer.contact.startsWith("@") || !customer.contact.includes("@"))) return false;
    if (method === "telegram" && !customer.contact.startsWith("@")) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(rows.length / 6));
  const visible = rows.slice((page - 1) * 6, page * 6);
  const fresh = customers.filter((customer) => customer.firstAt.slice(0, 7) === monthKey).length;
  const repeat = customers.filter((customer) => customer.orders > 1).length;
  return (
    <div className="space-y-4">
      <PageHead icon={<Users className="h-6 w-6" />} title="Customers" crumb="Customers" text="People who have ordered from this store.">
        <Button variant="secondary" onClick={() => downloadCsv("customers.csv", [["Contact", "Method", "Orders", "Spent", "Customer since", "Last order"], ...rows.map((customer) => [customer.contact, contactKind(customer.contact), String(customer.orders), formatMoney(customer.spentMinor), customer.firstAt.slice(0, 10), stamp(customer.lastAt)])])}><Download className="h-4 w-4" /> Export</Button>
      </PageHead>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total Customers" value={String(customers.length)} tone="#A855F7" icon={<Users className="h-4 w-4" />} />
        <Stat label="New This Month" value={String(fresh)} tone="#22C55E" icon={<Users className="h-4 w-4" />} />
        <Stat label="With Orders" value={String(customers.length)} tone="#38BDF8" icon={<ShoppingCart className="h-4 w-4" />} />
        <Stat label="Repeat Customers" value={String(repeat)} tone="#F59E0B" icon={<Users className="h-4 w-4" />} />
      </div>
      <Panel className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <input className={`${inputClass} pl-9`} placeholder="Search by contact..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
          </label>
          <select className={`${inputClass} !w-52 shrink-0`} value={method} onChange={(event) => { setMethod(event.target.value); setPage(1); }}>
            <option value="all">All Contact Methods</option>
            <option value="email">Email</option>
            <option value="telegram">Telegram</option>
          </select>
        </div>
        {visible.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No customers match these filters.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="pb-2">Customer</th><th>Contact Method</th><th>Total Orders</th><th>Last Order</th><th>Customer Since</th><th></th></tr></thead>
              <tbody>
                {visible.map((customer) => (
                  <tr key={customer.contact} className="border-t border-white/5">
                    <td className="py-3"><span className="flex items-center gap-2"><NameAvatar name={customer.contact} size="sm" /><span>{customer.contact}{customer.blocked ? " · Blocked" : ""}</span></span></td>
                    <td>{contactKind(customer.contact)}</td>
                    <td>{customer.orders}</td>
                    <td className="text-slate-400">{stamp(customer.lastAt)}</td>
                    <td className="text-slate-400">{customer.firstAt.slice(0, 10)}</td>
                    <td><Link href={`/seller/customers/${encodeURIComponent(customer.contact)}`} className="text-xs font-semibold text-[#FF4BD8]">View</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>Showing {rows.length === 0 ? 0 : (page - 1) * 6 + 1}–{Math.min(page * 6, rows.length)} of {rows.length} customers</span>
          <Pager page={page} pages={pages} onPage={setPage} />
        </div>
      </Panel>
    </div>
  );
}

export function SellerCustomerDetail({ customer }: { customer: SellerCustomerDetail }) {
  const refresh = useRefresh();
  const [note, setNote] = useState(customer.note);
  const [busy, setBusy] = useState(false);
  const href = contactHref(customer.contact);
  const completed = customer.orders.filter((row) => row.status === "COMPLETED" && row.source === "order");
  const average = completed.length ? Math.round(customer.spentMinor / completed.length) : 0;

  async function save(blocked = customer.blocked) {
    setBusy(true);
    try {
      await mutate("/seller/customers", "POST", { contact: customer.contact, note, blocked });
      toast.success(blocked === customer.blocked ? "Note saved." : blocked ? "Customer blocked for this store." : "Customer unblocked.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The note was not saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHead icon={<Users className="h-6 w-6" />} title="Customer Details" crumb={`Customers / ${customer.contact}`} text="Order history and a private note for this contact." />
      <Panel className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <NameAvatar name={customer.contact} />
          <div>
            <h2 className="text-xl font-black">{customer.contact}</h2>
            <p className="text-xs text-slate-400">{customer.blocked ? "Blocked" : "Active"} · Customer since {customer.firstAt.slice(0, 10)}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><p className="text-slate-400">Total Orders</p><p className="text-xl font-black">{customer.orderCount}</p></div>
          <div><p className="text-slate-400">Completed Spend</p><p className="text-xl font-black">{formatMoney(customer.spentMinor)}</p></div>
          <div><p className="text-slate-400">Avg. Completed</p><p className="text-xl font-black">{formatMoney(average)}</p></div>
        </div>
      </Panel>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="space-y-2 p-4 text-sm">
          <h2 className="font-bold">Contact Information</h2>
          <p>{contactKind(customer.contact)}: {customer.contact}</p>
          <p className="text-slate-400">Joined {customer.firstAt.slice(0, 10)}</p>
          <p className="text-slate-400">Last order {stamp(customer.lastAt)}</p>
          {href && <a className="inline-block text-[#FF4BD8]" href={href} target="_blank" rel="noreferrer">Open {contactKind(customer.contact)}</a>}
        </Panel>
        <Panel className="overflow-x-auto p-4">
          <h2 className="mb-2 font-bold">Order History ({customer.orderCount})</h2>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Order</th><th>Product</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {customer.orders.map((row) => (
                <tr key={row.id} className="border-t border-white/5">
                  <td className="py-2"><Link href={`/seller/orders/${row.id}`} className="text-[#FF4BD8]">{row.number}</Link></td>
                  <td>{row.title}</td>
                  <td>{formatMoney(row.amountMinor)}</td>
                  <td>{requestStatus(row.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel className="space-y-3 p-4">
          <h2 className="font-bold">Notes (Private)</h2>
          <textarea className={`${inputClass} min-h-28`} maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Private note for this contact..." />
          <span className="block text-right text-xs text-slate-500">{note.length} / 300</span>
          <Button disabled={busy} onClick={() => save()}><Save className="h-4 w-4" /> Save Note</Button>
        </Panel>
        <Panel className="space-y-3 p-4">
          <h2 className="font-bold">Communication</h2>
          <p className="text-sm text-slate-400">No messages are stored. Email and Telegram are contact details only.</p>
          {href && <a className="text-sm font-semibold text-[#FF4BD8]" href={href} target="_blank" rel="noreferrer">Message on {contactKind(customer.contact)}</a>}
        </Panel>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="secondary"><Link href="/seller/customers">← Back to Customers</Link></Button>
        <Button variant="danger" disabled={busy} onClick={() => save(!customer.blocked)}>{customer.blocked ? "Unblock Customer" : "Block Customer"}</Button>
      </div>
    </div>
  );
}

export function SellerReportsView({ data }: { data: SellerDash }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const rows = data.activity.filter((row) => {
    const day = row.createdAt.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });
  const completed = rows.filter((row) => row.status === "COMPLETED" && row.source === "order");
  const sales = completed.reduce((sum, row) => sum + row.amountMinor, 0);
  const customers = new Set(rows.map((row) => row.contact.toLowerCase())).size;
  const average = completed.length ? Math.round(sales / completed.length) : 0;
  const categories = new Map<string, number>();
  for (const row of completed) categories.set(row.categorySlug, (categories.get(row.categorySlug) ?? 0) + row.amountMinor);
  const slices = [...categories.entries()].map(([slug, minor]) => ({ slug, name: categoryName(slug), minor, share: sales ? Math.round((minor / sales) * 1000) / 10 : 0 })).sort((a, b) => b.minor - a.minor);
  const days = new Map<string, number>();
  for (const row of completed) days.set(row.createdAt.slice(0, 10), (days.get(row.createdAt.slice(0, 10)) ?? 0) + row.amountMinor);
  const series = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, revenueMinor]) => ({ date: date.slice(5), revenueMinor }));
  const gradient = slices.length ? `conic-gradient(${slices.map((slice, index) => {
    const start = slices.slice(0, index).reduce((sum, item) => sum + item.share, 0);
    return `${CATEGORY_COLOR[slice.slug] ?? "#F59E0B"} ${start}% ${start + slice.share}%`;
  }).join(",")})` : "conic-gradient(#1e293b 0 100%)";

  function report(kind: "sales" | "orders" | "customers" | "products") {
    if (kind === "customers") {
      const map = new Map<string, { orders: number; minor: number }>();
      for (const row of rows) {
        const current = map.get(row.contact) ?? { orders: 0, minor: 0 };
        current.orders += 1;
        if (row.status === "COMPLETED") current.minor += row.amountMinor;
        map.set(row.contact, current);
      }
      downloadCsv("customers-report.csv", [["Contact", "Orders", "Completed amount"], ...[...map.entries()].map(([contact, value]) => [contact, String(value.orders), formatMoney(value.minor)])]);
      return;
    }
    if (kind === "products") {
      const map = new Map<string, { orders: number; minor: number }>();
      for (const row of completed) {
        const current = map.get(row.title) ?? { orders: 0, minor: 0 };
        current.orders += row.quantity;
        current.minor += row.amountMinor;
        map.set(row.title, current);
      }
      downloadCsv("product-performance.csv", [["Product", "Quantity", "Amount"], ...[...map.entries()].map(([title, value]) => [title, String(value.orders), formatMoney(value.minor)])]);
      return;
    }
    const source = kind === "sales" ? completed : rows;
    downloadCsv(`${kind}-report.csv`, [["Date", "Order", "Product", "Contact", "Status", "Amount"], ...source.map((row) => [row.createdAt.slice(0, 10), row.number, row.title, row.contact, row.status, formatMoney(row.amountMinor)])]);
  }

  return (
    <div className="space-y-4">
      <PageHead icon={<FileText className="h-6 w-6" />} title="Sales & Reports" crumb="Sales & Reports" text="Totals use paid orders that were delivered. Open requests stay in the table and are not counted as sales.">
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input className={inputClass} type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <input className={inputClass} type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
      </PageHead>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Completed Sales" value={formatMoney(sales)} tone="#A855F7" icon={<FileText className="h-4 w-4" />} />
        <Stat label="Completed Orders" value={String(completed.length)} tone="#38BDF8" icon={<ShoppingCart className="h-4 w-4" />} />
        <Stat label="Customers" value={String(customers)} tone="#22C55E" icon={<Users className="h-4 w-4" />} />
        <Stat label="Avg. Completed Order" value={formatMoney(average)} tone="#F59E0B" icon={<FileText className="h-4 w-4" />} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel className="p-4">
          <h2 className="mb-3 font-bold">Sales Trend</h2>
          {series.length === 0 ? <p className="py-16 text-center text-sm text-slate-400">No completed sales in this range.</p> : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series}>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} />
                  <Area dataKey="revenueMinor" stroke="#FF4BD8" fill="#FF4BD833" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
        <Panel className="p-4">
          <h2 className="mb-3 font-bold">Sales by Category</h2>
          <div className="mx-auto grid h-36 w-36 place-items-center rounded-full" style={{ background: gradient }}>
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[#10152B] text-center text-xs"><span>{formatMoney(sales)}<br />Completed</span></div>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {slices.length === 0 ? <li className="text-slate-400">No completed sales in this range.</li> : slices.map((slice) => (
              <li key={slice.slug} className="flex items-center justify-between gap-2"><span><i className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: CATEGORY_COLOR[slice.slug] ?? "#F59E0B" }} />{slice.name}</span><span>{slice.share}% · {formatMoney(slice.minor)}</span></li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel className="overflow-x-auto p-4">
          <h2 className="mb-3 font-bold">Recent Orders</h2>
          {rows.length === 0 ? <p className="text-sm text-slate-400">No rows in this range.</p> : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Order</th><th>Product</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {rows.slice(0, 6).map((row) => (
                  <tr key={row.id} className="border-t border-white/5">
                    <td className="py-2"><Link href={`/seller/orders/${row.id}`} className="text-[#FF4BD8]">{row.number}</Link></td>
                    <td>{row.title}</td>
                    <td>{formatMoney(row.amountMinor)}</td>
                    <td>{requestStatus(row.status)}</td>
                    <td className="text-slate-400">{stamp(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel className="space-y-3 p-4">
          <h2 className="font-bold">Reports</h2>
          <p className="text-xs text-slate-400">Downloads use the rows currently in the date range.</p>
          {([["sales", "Sales Report"], ["orders", "Orders Report"], ["customers", "Customers Report"], ["products", "Product Performance"]] as const).map(([kind, label]) => (
            <div key={kind} className="flex items-center justify-between gap-2 text-sm">
              <span>{label}</span>
              <Button size="sm" variant="secondary" onClick={() => report(kind)}><Download className="h-3 w-3" /> Download</Button>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

type StockUnit = { id: string; productTitle: string; variantName: string; state: string; reference: string };
type StockProduct = { id: string; title: string; defaultVariantId: string; variants?: Array<{ id: string; name: string; priceMinor: number }> };

export function SellerStockView({ units, products }: { units: StockUnit[]; products: StockProduct[] }) {
  const refresh = useRefresh();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const product = products.find((item) => item.id === productId) ?? products[0];
  const variants = product?.variants?.length ? product.variants : product ? [{ id: product.defaultVariantId, name: "Default", priceMinor: 0 }] : [];
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [payload, setPayload] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(units.length / pageSize));
  const rows = units.slice((page - 1) * pageSize, page * pageSize);
  const count = (state: string) => units.filter((unit) => unit.state === state).length;
  async function store() {
    if (!product || payload.trim().length < 4) return;
    setBusy(true);
    try {
      await mutate("/seller/inventory", "POST", { productId: product.id, variantId, payload: payload.trim() });
      setPayload("");
      toast.success("Encrypted. The voucher is not shown again.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Inventory was not stored.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <PageHead icon={<Box className="h-6 w-6" />} title="Inventory" crumb="Inventory" text="Stock is encrypted on save. This list shows a short reference, never the voucher." />
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Units" value={String(units.length)} tone="#A855F7" icon={<Package className="h-4 w-4" />} />
        <Stat label="Available" value={String(count("AVAILABLE"))} tone="#22C55E" icon={<Package className="h-4 w-4" />} />
        <Stat label="Delivered" value={String(count("DELIVERED"))} tone="#38BDF8" icon={<ShoppingCart className="h-4 w-4" />} />
        <Stat label="Quarantined" value={String(count("QUARANTINED"))} tone="#FB7185" icon={<Ban className="h-4 w-4" />} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Panel className="space-y-3 p-4">
          <h2 className="font-bold">Add demo stock</h2>
          <p className="text-xs text-slate-400">Use a sample voucher such as DEMO-VOUCHER-1001. Card numbers are rejected.</p>
          {products.length === 0 ? <p className="text-sm text-slate-400">Add a product before storing stock.</p> : (
            <>
              <Field label="Product">
                <select className={inputClass} value={productId} onChange={(event) => {
                  const next = products.find((item) => item.id === event.target.value);
                  setProductId(event.target.value);
                  setVariantId(next?.variants?.[0]?.id ?? next?.defaultVariantId ?? "");
                }}>{products.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
              </Field>
              <Field label="Plan">
                <select className={inputClass} value={variantId} onChange={(event) => setVariantId(event.target.value)}>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}{variant.priceMinor ? ` · ${formatMoney(variant.priceMinor)}` : ""}</option>)}</select>
              </Field>
              <Field label="Demo voucher">
                <textarea className={`${inputClass} min-h-24`} value={payload} onChange={(event) => setPayload(event.target.value)} placeholder="DEMO-VOUCHER-1001" />
              </Field>
              <Button disabled={busy} onClick={store}>Encrypt and store</Button>
            </>
          )}
        </Panel>
        <Panel className="overflow-x-auto p-4">
          {units.length === 0 ? <p className="text-sm text-slate-400">No stock stored for this store.</p> : (
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Reference</th><th>Product</th><th>State</th></tr></thead>
              <tbody>
                {rows.map((unit) => (
                  <tr key={unit.id} className="border-t border-white/5">
                    <td className="py-3 font-mono text-xs">{unit.reference}</td>
                    <td>{unit.productTitle}<span className="block text-xs text-slate-500">{unit.variantName}</span></td>
                    <td><Badge tone={unit.state === "QUARANTINED" ? "red" : unit.state === "AVAILABLE" ? "green" : "slate"}>{unit.state}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-3"><Pager page={page} pages={pages} onPage={setPage} /></div>
        </Panel>
      </div>
    </div>
  );
}

export function SellerPayoutDesk({ payouts, availableMinor }: { payouts: Array<{ id: string; amountMinor: number; status: string; createdAt: string }>; availableMinor: number }) {
  const refresh = useRefresh();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  async function request() {
    const amountMinor = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor < 1000) {
      toast.error("Enter at least $10.00.");
      return;
    }
    setBusy(true);
    try {
      await mutate("/seller/payouts", "POST", { amountMinor });
      setAmount("");
      toast.success("Payout requested. No bank transfer was sent.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The request was not saved.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <PageHead icon={<Wallet className="h-6 w-6" />} title="Payouts" crumb="Payouts" text="A request moves available earnings into a hold. No bank transfer is sent." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Available" value={formatMoney(availableMinor)} tone="#22C55E" icon={<Wallet className="h-4 w-4" />} />
        <Stat label="Requests" value={String(payouts.length)} tone="#A855F7" icon={<FileText className="h-4 w-4" />} />
      </div>
      <Panel className="max-w-md space-y-3 p-4">
        <Field label="Amount (USD)">
          <input className={inputClass} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="10.00" />
        </Field>
        <Button disabled={busy || availableMinor < 1000} onClick={request}>Request payout</Button>
        {availableMinor < 1000 ? <p className="text-xs text-slate-500">Available earnings are below the $10.00 minimum.</p> : null}
      </Panel>
      <Panel className="overflow-x-auto p-4">
        {payouts.length === 0 ? <p className="text-sm text-slate-400">No payout requests.</p> : (
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Amount</th><th>Status</th><th>Requested</th></tr></thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id} className="border-t border-white/5">
                  <td className="py-3">{formatMoney(payout.amountMinor)}</td>
                  <td><Badge tone={payout.status === "PAID" ? "green" : payout.status === "REJECTED" ? "red" : "amber"}>{payout.status}</Badge></td>
                  <td className="text-slate-400">{stamp(payout.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

export function SellerReviewBoard({ reviews }: { reviews: Array<{ id: string; author: string; rating: number; comment: string; productTitle: string; createdAt?: string }> }) {
  const average = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : "—";
  return (
    <div className="space-y-4">
      <PageHead icon={<Star className="h-6 w-6" />} title="Reviews" crumb="Reviews" text="Reviews left on this store's listings." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Reviews" value={String(reviews.length)} tone="#A855F7" icon={<Star className="h-4 w-4" />} />
        <Stat label="Average" value={average} tone="#F59E0B" icon={<Star className="h-4 w-4" />} />
      </div>
      {reviews.length === 0 ? <Panel className="p-6 text-sm text-slate-400">No reviews yet.</Panel> : reviews.map((review) => (
        <Panel key={review.id} className="flex gap-3 p-4 text-sm">
          <NameAvatar name={review.author} size="sm" />
          <div>
            <p className="font-semibold">{review.author} <span className="font-normal text-slate-400">· {review.rating}/5 · {review.productTitle}</span></p>
            <p className="mt-1 text-slate-300">{review.comment}</p>
          </div>
        </Panel>
      ))}
    </div>
  );
}
