"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  Box,
  ChevronDown,
  CreditCard,
  Gamepad2,
  Gift,
  Headset,
  BarChart3,
  ClipboardList,
  Copy,
  Crown,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Menu,
  Package,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Smartphone,
  Store,
  Ticket,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import type { Role } from "@marketplace/types";
import { cn } from "../lib/cn";
import { mutate, NameAvatar } from "./kit";
import { useMode } from "./mode";

export interface Viewer {
  id: string;
  name: string;
  email: string;
  role: Role;
  sellerId?: string;
  emailVerified: boolean;
}

const marketLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/sellers", label: "Sellers" },
  { href: "/support", label: "Support" },
];

const accountLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/sellers", label: "Sellers" },
  { href: "/support", label: "Support" },
];

export interface SellerChrome {
  name: string;
  slug: string;
  status: string;
  requestCount: number;
}

export interface AdminChrome {
  sellers: number;
  products: number;
  customers: number;
  openOrders: number;
}

export function AppShell({ portal, user, cartCount, seller, admin, children }: { portal: "market" | "account" | "seller" | "admin"; user: Viewer | null; cartCount: number; seller?: SellerChrome | null; admin?: AdminChrome | null; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const links = portal === "account" ? accountLinks : marketLinks;
  const { demo } = useMode();
  return (
    <div className="relative min-h-screen text-slate-50">
      {demo ? (
        <div className="border-b border-[#FF00C8]/20 bg-[#FF00C8]/10 px-4 py-1.5 text-center text-[11px] font-medium tracking-wide text-pink-100">
          DEMO DATA · Sample listings only · No live charges, credentials, card numbers, or brand authorization
        </div>
      ) : null}
      <TopNav links={links} user={user} cartCount={cartCount} onMenu={() => setOpen(true)} />
      {portal === "market" ? (
        <div className="mx-auto w-full max-w-[1540px] px-3 py-4 md:px-5">{children}</div>
      ) : (
        <div className="mx-auto flex w-full max-w-[1540px] gap-4 px-3 py-4 md:px-5">
          <PortalNav portal={portal} user={user} seller={seller} admin={admin} open={open} onClose={() => setOpen(false)} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      )}
      {open && portal === "market" ? <MobileDrawer onClose={() => setOpen(false)} links={links} /> : null}
      <footer className="mx-auto flex w-full max-w-[1540px] flex-wrap gap-x-4 gap-y-2 px-5 py-8 text-xs text-slate-500">
        <span suppressHydrationWarning>© {new Date().getFullYear()} Digital Marketplace{demo ? " demo" : ""}</span>
        <Link href="/legal/terms" className="hover:text-slate-300">Terms</Link>
        <Link href="/legal/privacy" className="hover:text-slate-300">Privacy</Link>
        <Link href="/legal/refunds" className="hover:text-slate-300">Refunds</Link>
        <Link href="/legal/acceptable-use" className="hover:text-slate-300">Acceptable use</Link>
        <Link href="/docs/api" className="hover:text-slate-300">API</Link>
      </footer>
    </div>
  );
}

function TopNav({ links, user, cartCount, onMenu }: { links: Array<{ href: string; label: string }>; user: Viewer | null; cartCount: number; onMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#080B1B]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1540px] items-center gap-3 px-3 md:px-5">
        <button className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 lg:hidden" onClick={onMenu} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#FF00C8] to-[#00E5FF] shadow-[0_0_18px_rgba(255,0,200,.45)]"><Box className="h-5 w-5 text-white" /></span>
          <span className="hidden text-sm font-extrabold leading-tight sm:block">Digital<br />Marketplace</span>
        </Link>
        <nav className="ml-2 hidden items-center gap-1 lg:flex">
          {links.map((link) => <HeaderLink key={link.href} href={link.href} label={link.label} pathname={pathname} />)}
        </nav>
        <form action="/products" className="relative mx-auto hidden max-w-xl flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input name="q" placeholder="Search digital products, accounts, keys..." className="h-11 w-full rounded-full border border-[#a855f7]/40 bg-[#10152B] pl-10 pr-16 text-sm outline-none focus:border-[#e879f9] focus:shadow-[0_0_16px_rgba(232,121,249,.28)]" />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-500">Ctrl K</kbd>
        </form>
        <div className="ml-auto flex items-center gap-1.5">
          <IconLink href="/products" label="Browse"><LayoutGrid className="h-4 w-4" /></IconLink>
          <IconLink href={user ? "/account" : "/login"} label="Alerts"><Bell className="h-4 w-4" /></IconLink>
          <IconLink href="/cart" label="Cart">
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 ? <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#FF00C8] px-1 text-[10px] font-bold">{cartCount}</span> : null}
          </IconLink>
          {user ? (
            <Link href="/account" className="ml-1" aria-label={user.name}><NameAvatar name={user.name} size="sm" /></Link>
          ) : (
            <button className="ml-1 text-sm text-slate-300" onClick={() => router.push("/login")}>Sign in</button>
          )}
        </div>
      </div>
    </header>
  );
}

function IconLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return <Link href={href} aria-label={label} className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-300 hover:bg-white/5 hover:text-white">{children}</Link>;
}

export function MarketSidebar({ counts = {} }: { counts?: Record<string, number | null> }) {
  const pathname = usePathname();
  const items = [
    { href: "/products", key: "all", label: "All Products", icon: LayoutGrid },
    { href: "/category/digital-accounts", key: "digital-accounts", label: "Digital Accounts", icon: UserRound },
    { href: "/category/phone-numbers", key: "phone-numbers", label: "Phone Numbers / SMS", icon: Smartphone },
    { href: "/category/virtual-cards", key: "virtual-cards", label: "Virtual Cards", icon: CreditCard },
    { href: "/category/subscriptions", key: "subscriptions", label: "Subscriptions / Licenses", icon: BadgeCheck },
    { href: "/category/gaming", key: "gaming", label: "Gaming Products", icon: Gamepad2 },
  ];
  return (
    <aside className="hidden w-[248px] shrink-0 lg:block">
      <div className="sticky top-[92px] space-y-3">
        <div className="rounded-2xl border border-[#c084fc]/70 bg-[#101428] p-3 shadow-[0_0_18px_rgba(168,85,247,.28),inset_0_0_24px_rgba(139,92,246,.08)]">
          <p className="flex items-center gap-2 px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
            <LayoutGrid className="h-3.5 w-3.5 text-[#FF4BD8]" /> Browse Categories
          </p>
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const count = counts[item.key];
            return (
              <Link key={item.href} href={item.href} className={cn("flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm text-slate-200 hover:bg-white/5", active && "bg-[#FF00C8]/12")}>
                <Icon className="h-4 w-4 shrink-0 text-[#FF4BD8]" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {count === undefined ? null : <span className="text-[11px] text-slate-500">{count === null ? "Off" : count}</span>}
              </Link>
            );
          })}
        </div>
        <ClaimCoupon />
        <div className="neon-surface neon-cyan rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Headset className="mt-0.5 h-8 w-8 shrink-0 text-cyan-300 drop-shadow-[0_0_10px_rgba(0,229,255,.85)]" />
            <span>
              <span className="block font-semibold text-white">24/7 Support</span>
              <span className="mt-0.5 block text-xs text-slate-400">Live chat · Fast response</span>
              <span className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#22c55e]" />
                Online Now
              </span>
            </span>
          </div>
          <Link href="/support" className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-cyan-300/40 py-2 text-sm font-semibold text-cyan-100">
            <MessageCircle className="h-4 w-4" /> Open Chat
          </Link>
        </div>
      </div>
    </aside>
  );
}

function ClaimCoupon() {
  const [message, setMessage] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-[#f0abfc]/80 bg-gradient-to-br from-[#6d28d9] via-[#a21caf] to-[#4c1d95] p-3.5 shadow-[0_0_22px_rgba(232,121,249,.55),inset_0_0_28px_rgba(255,0,200,.18)]">
      <div className="flex items-center gap-3">
        <span className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#f9a8d4] via-[#e879f9] to-[#7c3aed] shadow-[0_0_22px_rgba(255,0,200,.75)]">
          <Gift className="h-9 w-9 text-white" strokeWidth={1.75} />
        </span>
        <span>
          <span className="block text-sm font-bold text-white">New Member Bonus</span>
          <span className="block text-[1.65rem] font-black leading-none tracking-tight text-[#FF4BD8]">10% OFF</span>
          <span className="mt-1 block text-xs text-white/75">your first order</span>
        </span>
      </div>
      <button
        disabled={pending}
        className="mt-3 w-full rounded-xl bg-gradient-to-r from-[#FF2BD6] to-[#8B5CF6] py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(255,0,200,.55)] disabled:opacity-60"
        onClick={async () => {
          setPending(true);
          try {
            const quote = await mutate<{ couponMessage?: string }>("/cart/coupon", "POST", { code: "WELCOME10" });
            setMessage(quote.couponMessage ?? "Coupon saved on this cart.");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Coupon was not applied.");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "Checking..." : "Claim Now"}
      </button>
      {message ? <p className="mt-2 text-xs text-white/90">{message}</p> : null}
    </div>
  );
}

function PortalNav({ portal, user, seller, admin, open, onClose }: { portal: "account" | "seller" | "admin"; user: Viewer | null; seller?: SellerChrome | null; admin?: AdminChrome | null; open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const account = portal === "account";
  const sellerItems = [
    ["/seller/dashboard", "Dashboard", LayoutDashboard],
    ["/seller/products", "Products", Package],
    ["/seller/orders", "Order Requests", ClipboardList],
    ["/seller/earnings", "Sales & Reports", BarChart3],
    ["/seller/settings", "Store Settings", Settings],
  ];
  const items = account
    ? [
        ["/account", "Dashboard", LayoutGrid],
        ["/account/orders", "My Orders", Box],
        ["/account/profile", "Profile", UserRound],
        ["/account/tickets", "Tickets", Ticket],
        ["/account/security", "Security", Shield],
      ]
    : portal === "seller"
      ? sellerItems
      : [
          ["/admin", "Dashboard", LayoutDashboard],
          ["/admin/sellers", "Sellers", Store],
          ["/admin/products", "Products", Package],
          ["/admin/categories", "Categories", Layers],
          ["/admin/orders", "Order Requests", ClipboardList],
          ["/admin/customers", "Customers", UserRound],
          ["/admin/users", "Accounts", UserRound],
          ["/admin/inventory", "Inventory", Box],
          ["/admin/payments", "Payments", CreditCard],
          ["/admin/payouts", "Payouts", Wallet],
          ["/admin/disputes", "Disputes", Shield],
          ["/admin/tickets", "Tickets", Ticket],
          ["/admin/analytics", "Reports & Analytics", BarChart3],
          ["/admin/settings", "Platform Settings", Settings],
          ["/admin/account", "Account Settings", UserRound],
        ];
  const title = portal === "account" ? "My Account" : portal === "seller" ? "Seller Panel" : "Admin Panel";
  return (
    <>
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-72 border-r border-white/10 bg-[#0C1024] p-4 lg:static lg:z-0 lg:block lg:w-[248px] lg:border-0 lg:bg-transparent lg:p-0", open ? "block" : "hidden lg:block")}>
        <div className="neon-surface neon-violet sticky top-[92px] max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl p-3">
          <div className="mb-2 flex items-center justify-between px-2">
            {account ? (
              <p className="flex items-center gap-2 text-sm font-semibold text-white"><UserRound className="h-4 w-4 text-[#FF4BD8]" /> My Account</p>
            ) : (
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
            )}
            <button className="lg:hidden" onClick={onClose} aria-label="Close"><X className="h-4 w-4" /></button>
          </div>
          {items.map(([href, label, Icon]) => {
            const target = String(href);
            const active = account ? accountItemActive(pathname, target) : portal === "admin" ? (target === "/admin" ? pathname === "/admin" : pathname === target || pathname.startsWith(`${target}/`)) : pathname === target;
            const Glyph = Icon as React.ComponentType<{ className?: string }>;
            return (
              <Link
                key={target}
                href={target}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  account ? "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium" : "flex items-center gap-2 rounded-xl px-2 py-2 text-sm",
                  active
                    ? account
                      ? "bg-[#FF00C8] text-white shadow-[0_0_18px_rgba(255,0,200,.55)]"
                      : "bg-gradient-to-r from-[#6366f1] to-[#22d3ee] font-semibold text-white shadow-[0_0_16px_rgba(34,211,238,.35)]"
                    : account
                      ? "text-slate-200 hover:bg-white/5"
                      : "text-slate-300 hover:bg-white/5",
                )}
              >
                <Glyph className={cn("h-4 w-4", account && !active && "text-[#FF4BD8]", account && active && "text-white")} />
                <span className="min-w-0 flex-1">{String(label)}</span>
                {portal === "seller" && target === "/seller/orders" && seller && seller.requestCount > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#FF00C8] px-1 text-[10px] font-bold text-white">{seller.requestCount}</span> : null}
                {portal === "admin" && target === "/admin/orders" && admin && admin.openOrders > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#FF00C8] px-1 text-[10px] font-bold text-white">{admin.openOrders}</span> : null}
              </Link>
            );
          })}
          {account && user?.sellerId ? (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="mb-1 flex items-center gap-2 px-3 text-sm font-semibold text-white"><Store className="h-4 w-4 text-[#FF4BD8]" /> Seller</p>
              {sellerItems.map(([href, label, Icon]) => {
                const target = String(href).replace(/^\/seller/, "/account/seller");
                const active = target.endsWith("/dashboard") ? pathname === target : pathname === target || pathname.startsWith(`${target}/`);
                const Glyph = Icon as React.ComponentType<{ className?: string }>;
                return (
                  <Link key={target} href={target} onClick={onClose} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium", active ? "bg-[#FF00C8] text-white shadow-[0_0_18px_rgba(255,0,200,.55)]" : "text-slate-200 hover:bg-white/5")}>
                    <Glyph className={cn("h-4 w-4", active ? "text-white" : "text-[#FF4BD8]")} />
                    <span className="min-w-0 flex-1">{String(label)}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}
          <button
            className={cn(
              "mt-1 flex w-full items-center rounded-xl text-sm hover:bg-white/5",
              account ? "gap-2.5 px-3 py-2.5 font-medium text-slate-200" : "mt-2 gap-2 px-2 py-2 text-slate-300",
            )}
            onClick={async () => {
              await mutate("/auth/logout", "POST");
              router.push("/");
              router.refresh();
            }}
          >
            <LogOut className={cn("h-4 w-4", account && "text-[#FF4BD8]")} /> {account ? "Logout" : "Log out"}
          </button>
        </div>
        {portal === "seller" && seller ? <SellerStoreCard seller={seller} /> : null}
        {portal === "admin" && admin ? <AdminPlatformCard admin={admin} /> : null}
      </aside>
      {open ? <button className="fixed inset-0 z-40 bg-black/50 lg:hidden" aria-label="Close menu" onClick={onClose} /> : null}
    </>
  );
}

function AdminPlatformCard({ admin }: { admin: AdminChrome }) {
  return (
    <div className="neon-surface neon-pink mt-3 rounded-2xl p-3">
      <div className="flex items-center gap-2 px-1">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#e879f9]/70 text-[#FF4BD8]"><Crown className="h-4 w-4" /></span>
        <div>
          <p className="text-sm font-bold">Platform</p>
          <p className="text-xs text-emerald-300">Online</p>
        </div>
      </div>
      <dl className="mt-3 space-y-1 px-1 text-xs text-slate-300">
        <div className="flex justify-between"><dt>Sellers</dt><dd className="font-semibold">{admin.sellers}</dd></div>
        <div className="flex justify-between"><dt>Products</dt><dd className="font-semibold">{admin.products}</dd></div>
        <div className="flex justify-between"><dt>Customers</dt><dd className="font-semibold">{admin.customers}</dd></div>
      </dl>
    </div>
  );
}

function SellerStoreCard({ seller }: { seller: SellerChrome }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="neon-surface neon-pink mt-3 rounded-2xl p-3">
      <p className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">My Store</p>
      <div className="mt-2 flex items-center gap-2 px-1">
        <NameAvatar name={seller.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{seller.name}</p>
          <p className="text-xs text-emerald-300">{seller.status === "APPROVED" ? "Active" : seller.status}</p>
        </div>
      </div>
      <Link href={`/seller/${seller.slug}`} className="mt-3 flex items-center justify-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 hover:bg-white/5">View Store</Link>
      <button
        type="button"
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
        onClick={async () => {
          await navigator.clipboard.writeText(`${window.location.origin}/seller/${seller.slug}`);
          setCopied(true);
        }}
      >
        <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy Store Link"}
      </button>
    </div>
  );
}

const productCategories = [
  { href: "/products", label: "All Products" },
  { href: "/category/digital-accounts", label: "Digital Accounts" },
  { href: "/category/phone-numbers", label: "Phone Numbers / SMS" },
  { href: "/category/virtual-cards", label: "Virtual Cards" },
  { href: "/category/subscriptions", label: "Subscriptions / Licenses" },
  { href: "/category/gaming", label: "Gaming Products" },
];

function accountItemActive(pathname: string, href: string) {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isHeaderActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/products") return pathname === "/products" || pathname.startsWith("/products/") || pathname.startsWith("/product/") || pathname.startsWith("/category/");
  if (href === "/sellers") return pathname === "/sellers" || pathname.startsWith("/sellers/") || /^\/seller\/[^/]+$/.test(pathname);
  return pathname === href || pathname.startsWith(`${href}/`);
}

function HeaderLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = isHeaderActive(pathname, href);
  const className = cn("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm", active ? "bg-[#FF00C8] font-semibold text-white shadow-[0_0_16px_rgba(255,0,200,.55)]" : "text-slate-300 hover:text-white");
  if (label !== "Products") {
    return <Link href={href} className={className}>{label}</Link>;
  }
  return <ProductsMenu href={href} pathname={pathname} className={className} />;
}

function ProductsMenu({ href, pathname, className }: { href: string; pathname: string; className: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <div className={className}>
        <Link href={href} onClick={() => setOpen(false)}>Products</Link>
        <button type="button" aria-label="Product categories" aria-expanded={open} className="grid h-4 w-4 place-items-center" onClick={() => setOpen(true)}>
          <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
        </button>
      </div>
      {open ? (
        <div className="absolute left-0 top-full z-50 w-64 pt-2">
          <div className="rounded-2xl border border-[#c084fc]/50 bg-[#101428] p-2 shadow-[0_0_18px_rgba(168,85,247,.35)]">
            {productCategories.map((item) => {
              const current = item.href === "/products" ? pathname === "/products" : pathname === item.href;
              return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn("block rounded-xl px-3 py-2 text-sm", current ? "bg-[#FF00C8]/15 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white")}>{item.label}</Link>;
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MobileDrawer({ onClose, links }: { onClose: () => void; links: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button className="absolute inset-0 bg-black/60" aria-label="Close" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-72 bg-[#0C1024] p-4">
        {links.map((link) => {
          const active = isHeaderActive(pathname, link.href);
          return <Link key={link.href} href={link.href} onClick={onClose} className={cn("block rounded-xl px-3 py-3 text-sm", active ? "text-white shadow-[inset_0_-2px_0_#FF00C8]" : "hover:bg-white/5")}>{link.label}</Link>;
        })}
        <MarketSidebarMobile onClose={onClose} />
      </div>
    </div>
  );
}

function MarketSidebarMobile({ onClose }: { onClose: () => void }) {
  const links = ["/category/digital-accounts", "/category/phone-numbers", "/category/virtual-cards", "/category/subscriptions", "/category/gaming"];
  return <div className="mt-4 border-t border-white/10 pt-3">{links.map((href) => <Link key={href} href={href} onClick={onClose} className="block px-3 py-2 text-sm text-slate-300">{href.split("/").pop()?.replaceAll("-", " ")}</Link>)}</div>;
}

