"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowDownRight, ArrowUpRight, Calendar, Check, CreditCard, Download, Headset, Plus, Search, Send, ShoppingBag, ShoppingCart, Store, Ticket } from "lucide-react";
import { toast } from "sonner";
import { passwordChangeSchema, profileSchema, reviewSchema, ticketSchema } from "@marketplace/validation";
import { formatMoney, type OrderRequestView, type OrderStatus, type OrderView, type TicketStatus, type TicketView } from "@marketplace/types";
import { Badge, Button, Field, NameAvatar, Panel, StatusPill, inputClass, mutate, useRefresh } from "../components/kit";
import { useMode } from "../components/mode";
import { cn } from "../lib/cn";
import * as React from "react";

export function AccountHome({ name, orders, tickets, now }: { name: string; orders: OrderView[]; tickets: TicketView[]; now: string }) {
  const stats = dashboardStats(orders, tickets, now);
  const recent = orders.slice(0, 3);
  const maxBar = Math.max(...stats.series.map((month) => month.minor), 0);
  return (
    <div className="space-y-4">
      <section>
        <div className="flex max-w-xl items-center gap-3 pt-1">
          <NameAvatar name={name} />
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">My Cashboard</h1>
            <p className="mt-1 text-sm text-slate-300 sm:text-base">
              Welcome back, <span className="font-semibold text-[#F6C445]">{name}</span> <span aria-hidden="true">👋</span>
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <StatCard label="Total Orders" value={String(stats.orderCount)} icon={ShoppingCart} neon="#FF4BD8" delta={stats.orderDelta} />
          <StatCard label="Total Spent" value={formatMoney(stats.spentMinor)} icon={CreditCard} neon="#22D3EE" delta={stats.spentDelta} />
          <StatCard label="Open Tickets" value={String(stats.openTickets)} icon={Ticket} neon="#67E8F9" delta={stats.ticketDelta} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]">
        <Panel className="neon-violet p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Recent Orders</h2>
            <Link href="/account/orders" className="text-sm font-semibold text-[#FF4BD8] hover:text-pink-200">View All</Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <p className="font-medium text-slate-200">No orders yet</p>
              <p className="mt-1 text-sm text-slate-400">Completed demo checkouts will show up here. Nothing is listed until an order exists.</p>
            </div>
          ) : recent.map((order) => <RecentOrder key={order.id} order={order} />)}
        </Panel>

        <Panel className="neon-violet p-4">
          <h2 className="font-semibold">Spending Overview</h2>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-black tracking-tight">{formatMoney(stats.windowSpent)}</p>
              <p className="text-xs text-slate-400">Last 6 months · paid orders</p>
            </div>
            <Delta delta={stats.spentDelta} />
          </div>
          {stats.windowSpent !== stats.spentMinor ? <p className="mt-2 text-[11px] text-slate-500">All-time paid total is {formatMoney(stats.spentMinor)}. Bars are only the last 6 months.</p> : null}
          <div className="mt-4 flex h-36 items-end gap-2" role="img" aria-label={stats.series.map((month) => `${month.label} ${formatMoney(month.minor)}`).join(", ")}>
            {stats.series.map((month) => (
              <div key={month.key} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
                <div className="flex h-full items-end rounded-t-lg bg-white/[0.04]">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#FF00C8] via-[#8B5CF6] to-[#67E8F9] shadow-[0_0_16px_rgba(139,92,246,.45)]"
                    style={{ height: month.minor > 0 && maxBar > 0 ? `${Math.max(10, Math.round((month.minor / maxBar) * 100))}%` : "0%" }}
                    title={`${month.label}: ${formatMoney(month.minor)}`}
                  />
                </div>
                <span className="text-center text-[11px] text-slate-400">{month.label}</span>
              </div>
            ))}
          </div>
          {stats.windowSpent === 0 ? <p className="mt-2 text-xs text-slate-500">No paid orders in these months.</p> : null}
        </Panel>
      </div>

      <Panel className="neon-violet p-4">
        <h2 className="font-semibold">Quick Actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href + action.label} href={action.href} className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-[#0c1024]/80 px-3 py-4 text-center text-sm font-medium text-white transition hover:border-[#e879f9]/70 hover:shadow-[0_0_18px_rgba(232,121,249,.25)]">
                <span className="neon-icon h-12 w-12 rounded-2xl" style={{ "--neon": action.neon } as React.CSSProperties}><Icon className="h-5 w-5" /></span>
                {action.label}
              </Link>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

type AccountOrderRow =
  | { kind: "order"; id: string; at: string; order: OrderView }
  | { kind: "request"; id: string; at: string; request: OrderRequestView };

export function OrdersView({ orders, requests = [], now }: { orders: OrderView[]; requests?: OrderRequestView[]; now: string }) {
  const { demo } = useMode();
  const [query, setQuery] = React.useState("");
  const [range, setRange] = React.useState<OrderRange>("30");
  const [bucket, setBucket] = React.useState<OrderFilter>("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const rows = React.useMemo(() => {
    const combined: AccountOrderRow[] = [
      ...orders.map((order) => ({ kind: "order" as const, id: order.id, at: order.createdAt, order })),
      ...requests.map((request) => ({ kind: "request" as const, id: request.id, at: request.createdAt, request })),
    ];
    return combined
      .filter((row) => orderInRange(row.at, range, now) && accountRowMatches(row, query))
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [orders, requests, range, now, query]);
  const counts: Record<OrderFilter, number> = {
    all: rows.length,
    processing: rows.filter((row) => accountRowBucket(row) === "processing").length,
    completed: rows.filter((row) => accountRowBucket(row) === "completed").length,
    refunded: rows.filter((row) => accountRowBucket(row) === "refunded").length,
  };
  const visible = bucket === "all" ? rows : rows.filter((row) => accountRowBucket(row) === bucket);
  const selected = visible.find((row) => row.id === selectedId) ?? visible[0] ?? null;
  const filters: Array<{ id: OrderFilter; label: string }> = [
    { id: "all", label: "All Orders" },
    { id: "processing", label: "Processing" },
    { id: "completed", label: "Completed" },
    { id: "refunded", label: "Refunded" },
  ];
  const emptyTitle = rows.length === 0 && orders.length === 0 && requests.length === 0
    ? (demo ? "No orders yet" : "No paid orders")
    : "No orders match";
  const emptyBody = orders.length > 0 || requests.length > 0
    ? "Try another status, date range, or search."
    : demo
      ? "Completed demo checkouts and order requests show up here."
      : "Add a listing to your cart and submit an order request.";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">My Orders</h1>
          <p className="mt-1 text-sm text-slate-400">Track your purchases and access your digital goods.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order ID, product..." className={cn(inputClass, "h-11 w-64 pl-9")} aria-label="Search orders by order ID or product" />
          </label>
          <label className="relative block">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select value={range} onChange={(event) => setRange(event.target.value as OrderRange)} aria-label="Order date range" className={cn(inputClass, "h-11 appearance-none pl-9 pr-8")}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </label>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = bucket === filter.id;
          return (
            <button key={filter.id} type="button" aria-pressed={active} onClick={() => setBucket(filter.id)} className={cn("rounded-full px-4 py-2 text-sm font-semibold", active ? "bg-[#FF00C8] text-white shadow-[0_0_16px_rgba(255,0,200,.45)]" : "border border-white/10 bg-[#10162c] text-slate-300 hover:border-[#e879f9]/50")}>
              {filter.label} ({counts[filter.id]})
            </button>
          );
        })}
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_320px]">
        <Panel className="neon-violet overflow-hidden">
          <div className="overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-[104px_minmax(220px,1.5fr)_88px_128px_118px] gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Order #</span><span>Items</span><span>Total</span><span>Status</span><span>Date</span>
            </div>
            {visible.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="font-semibold">{emptyTitle}</p>
                <p className="mt-1 text-sm text-slate-400">{emptyBody}</p>
              </div>
            ) : (
              <div className="space-y-1 px-2 pb-2">
                {visible.map((row) => {
                  const item = row.kind === "order" ? row.order.items[0] : row.request.items[0];
                  const count = row.kind === "order" ? row.order.items.length : row.request.items.length;
                  const extra = Math.max(count - 1, 0);
                  const total = row.kind === "order" ? row.order.totalMinor : row.request.totalMinor;
                  const status = row.kind === "order" ? orderListStatus(row.order) : requestListStatus(row.request);
                  const number = row.kind === "order" ? row.order.number : row.request.number;
                  const active = selected?.id === row.id;
                  return (
                    <button key={row.id} type="button" onClick={() => setSelectedId(row.id)} aria-pressed={active} className={cn("grid min-w-[720px] w-full grid-cols-[104px_minmax(220px,1.5fr)_88px_128px_118px] items-center gap-2 rounded-xl px-2 py-2.5 text-left text-sm", active ? "border border-[#FF4BD8] bg-[#FF00C8]/12 shadow-[0_0_16px_rgba(255,0,200,.28)]" : "border border-transparent hover:bg-white/5")}>
                      <span className="font-semibold text-white">{number}</span>
                      <span className="flex min-w-0 items-center gap-2">
                        {item ? <OrderArt monogram={item.monogram} accent={item.accent} /> : null}
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{item ? item.title : "No items"}{extra > 0 ? ` + ${extra} more` : ""}</span>
                          <span className="text-xs text-slate-400">{item ? formatMoney(item.lineTotalMinor) : ""}</span>
                        </span>
                      </span>
                      <span className="font-semibold">{formatMoney(total)}</span>
                      <span className="w-fit justify-self-start"><Badge tone={status.tone}>{status.label}</Badge></span>
                      <span className="text-slate-300">{formatOrderDate(row.at)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Panel>
        <OrderDetailPanel row={selected} />
      </div>
    </div>
  );
}

export function OrderDetailView({ order }: { order: OrderView }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight">{order.number}</h1>
        <p className="mt-1 text-sm text-slate-400">Order details for this account.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3"><StatusPill status={order.status} /></div>
      <Panel className="neon-violet divide-y divide-white/5">{order.items.map((item) => <div key={item.id} className="flex justify-between p-4 text-sm"><div><p className="font-medium">{item.title}</p><p className="text-slate-400">{item.variantName} · {item.sellerName} · {item.delivery}</p></div><span>{formatMoney(item.lineTotalMinor)}</span></div>)}</Panel>
      <Panel className="neon-violet space-y-1 p-4 text-sm"><p>Subtotal {formatMoney(order.subtotalMinor)}</p><p>Discount {formatMoney(order.discountMinor)}</p><p>Fee {formatMoney(order.feeMinor)}</p><p className="font-bold">Total {formatMoney(order.totalMinor)}</p><p className="text-slate-400">Payment {order.paymentStatus} · {order.paymentMethod}</p></Panel>
      {order.status === "DELIVERED" ? <Button asChild><Link href={`/account/orders/${order.id}/delivery`}>Open secure delivery</Link></Button> : null}
      {order.status === "DELIVERED" ? order.items.map((item) => <Panel key={item.id} className="neon-violet p-4"><h2 className="font-semibold">Review {item.title}</h2><ReviewForm productId={item.productId} /></Panel>) : null}
    </div>
  );
}

export function DeliveryView({ delivery }: { delivery: { status: string; items: Array<{ title: string; state: string; notice: string; payload?: string }> } }) {
  const [copied, setCopied] = React.useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Secure delivery</h1>
        <p className="mt-1 text-sm text-slate-400">Plaintext is decrypted only for the order owner. Admins and product APIs do not receive it.</p>
      </div>
      {delivery.items.map((item) => (
        <Panel key={item.title} className="neon-violet space-y-2 p-4">
          <div className="flex items-center justify-between"><h2 className="font-semibold">{item.title}</h2><StatusPill status={item.state} /></div>
          <p className="text-sm text-slate-300">{item.notice}</p>
          {item.payload ? <pre className="overflow-auto rounded-xl bg-black/40 p-3 text-sm text-cyan-100">{item.payload}</pre> : <p className="text-sm text-slate-400">Nothing is ready to reveal.</p>}
          {item.payload ? <Button variant="secondary" onClick={async () => { await navigator.clipboard.writeText(item.payload ?? ""); setCopied(item.title); }}> {copied === item.title ? "Copied" : "Copy demo voucher"}</Button> : null}
        </Panel>
      ))}
    </div>
  );
}

export function ProfileView({ name, email, verified }: { name: string; email: string; verified: boolean }) {
  const refresh = useRefresh();
  const form = useForm({ resolver: zodResolver(profileSchema), defaultValues: { name } });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-slate-400">The name and email on this account.</p>
      </div>
      <Panel className="neon-violet max-w-lg space-y-4 p-5">
      <div className="flex items-center gap-3">
        <NameAvatar name={name} />
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-slate-400">{email} · {verified ? "Email verified" : "Email not verified"}</p>
        </div>
      </div>
      <form className="space-y-3" onSubmit={form.handleSubmit(async (values) => {
        try { await mutate("/auth/profile", "PATCH", values); toast.success("Profile saved"); refresh(); }
        catch (error) { toast.error(error instanceof Error ? error.message : "Save failed"); }
      })}>
        <Field label="Name" error={form.formState.errors.name?.message}><input className={inputClass} {...form.register("name")} /></Field>
        <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Save profile"}</Button>
      </form>
      </Panel>
    </div>
  );
}

export function SecurityView({ mfaEnabled }: { mfaEnabled: boolean }) {
  const form = useForm({ resolver: zodResolver(passwordChangeSchema) });
  const [message, setMessage] = React.useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Security</h1>
        <p className="mt-1 text-sm text-slate-400">Password for this account. Multi-factor authentication is {mfaEnabled ? "required for this role" : "off for customer accounts"}.</p>
      </div>
      <Panel className="neon-violet max-w-lg space-y-4 p-5">
      <form className="space-y-3" onSubmit={form.handleSubmit(async (values) => {
        setMessage(null);
        try { const result = await mutate<{ message: string }>("/auth/password", "POST", values); setMessage(result.message); form.reset(); }
        catch (error) { setMessage(error instanceof Error ? error.message : "Password was not changed"); }
      })}>
        <Field label="Current password"><input type="password" className={inputClass} {...form.register("currentPassword")} /></Field>
        <Field label="New password" error={form.formState.errors.newPassword?.message}><input type="password" className={inputClass} {...form.register("newPassword")} /></Field>
        <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Updating..." : "Change password"}</Button>
      </form>
      {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </Panel>
    </div>
  );
}

export function TicketsView({ tickets }: { tickets: TicketView[] }) {
  const refresh = useRefresh();
  const [items, setItems] = React.useState(tickets);
  const [filter, setFilter] = React.useState<TicketFilter>("all");
  const [selectedId, setSelectedId] = React.useState<string | null>(tickets[0]?.id ?? null);
  const [creating, setCreating] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [replyError, setReplyError] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);
  const form = useForm({ resolver: zodResolver(ticketSchema), defaultValues: { subject: "", body: "" } });
  React.useEffect(() => { setItems(tickets); }, [tickets]);
  const counts: Record<TicketFilter, number> = {
    all: items.length,
    open: items.filter((ticket) => ticket.status === "OPEN").length,
    progress: items.filter((ticket) => ticket.status === "IN_PROGRESS").length,
    closed: items.filter((ticket) => ticket.status === "CLOSED" || ticket.status === "RESOLVED").length,
  };
  const visible = items.filter((ticket) => ticketMatches(ticket, filter));
  const selected = visible.find((ticket) => ticket.id === selectedId) ?? visible[0] ?? null;
  const filters: Array<{ id: TicketFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "open", label: "Open" },
    { id: "progress", label: "In Progress" },
    { id: "closed", label: "Closed" },
  ];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Support Tickets</h1>
          <p className="mt-1 text-sm text-slate-400">Get help with orders, delivery, payments, and account issues.</p>
        </div>
        <Button type="button" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New Ticket</Button>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <Panel className="neon-violet p-3">
          <div className="flex flex-wrap gap-1.5">
            {filters.map((item) => {
              const active = filter === item.id;
              return (
                <button key={item.id} type="button" aria-pressed={active} onClick={() => setFilter(item.id)} className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", active ? "bg-[#FF00C8] text-white shadow-[0_0_14px_rgba(255,0,200,.4)]" : "border border-white/10 bg-[#10162c] text-slate-300 hover:border-[#e879f9]/40")}>
                  {item.label} ({counts[item.id]})
                </button>
              );
            })}
          </div>
          <div className="mt-3 space-y-1">
            {visible.length === 0 ? <p className="px-2 py-8 text-center text-sm text-slate-400">{items.length === 0 ? "No tickets yet. Create one when you need help." : "No tickets in this status."}</p> : visible.map((ticket) => {
              const active = selected?.id === ticket.id;
              const status = ticketStatusCopy(ticket.status);
              return (
                <button key={ticket.id} type="button" aria-pressed={active} onClick={() => setSelectedId(ticket.id)} className={cn("w-full rounded-xl px-3 py-2.5 text-left", active ? "border border-[#FF4BD8] bg-[#FF00C8]/12" : "border border-transparent hover:bg-white/5")}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">#{ticket.number}</span>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </span>
                  <span className="mt-1 block truncate text-sm text-slate-200">{ticket.subject}</span>
                  <span className="mt-1 block text-[11px] text-slate-500">{formatOrderDate(ticket.createdAt)}</span>
                </button>
              );
            })}
          </div>
        </Panel>
        <Panel className="neon-violet flex min-h-[540px] flex-col p-4">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <h2 className="font-bold">#{selected.number} {selected.subject}</h2>
                  <p className="mt-1 text-xs text-slate-400">Created on {formatOrderWhen(selected.createdAt)}</p>
                </div>
                <Badge tone={ticketStatusCopy(selected.status).tone}>{ticketStatusCopy(selected.status).label}</Badge>
              </div>
              <div className="flex-1 space-y-3 overflow-auto py-4">
                {selected.messages.length === 0 ? <p className="text-sm text-slate-400">This ticket has no messages.</p> : selected.messages.map((message) => {
                  const staff = message.authorRole === "SUPPORT";
                  return (
                    <article key={message.id} className={cn("flex items-start gap-3 rounded-2xl border px-3 py-2.5 text-sm", staff ? "border-cyan-300/30 bg-cyan-400/5" : "border-white/10 bg-white/5")}>
                      <NameAvatar name={message.authorName} size="sm" />
                      <div>
                        <p className="text-xs text-slate-400"><span className={staff ? "font-semibold text-cyan-200" : "font-semibold text-pink-200"}>{message.authorName}</span> · {formatOrderWhen(message.createdAt)}</p>
                        <p className="mt-1 whitespace-pre-wrap text-slate-100">{message.body}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
              <form className="mt-auto flex items-end gap-2" onSubmit={async (event) => {
                event.preventDefault();
                const body = draft.trim();
                if (!body || sending) return;
                setSending(true);
                setReplyError(null);
                try {
                  const updated = await mutate<TicketView>(`/tickets/${selected.id}/messages`, "POST", { body });
                  setItems((current) => current.map((ticket) => ticket.id === updated.id ? updated : ticket));
                  setDraft("");
                  refresh();
                } catch (error) {
                  setReplyError(error instanceof Error ? error.message : "The reply was not saved.");
                } finally {
                  setSending(false);
                }
              }}>
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Message</span>
                  <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type your message..." className={inputClass} disabled={sending} />
                </label>
                <Button type="submit" aria-label="Send message" disabled={sending || draft.trim().length < 1} className="h-11 w-11 shrink-0 px-0"><Send className="h-4 w-4" /></Button>
              </form>
              {replyError ? <p className="mt-2 text-sm text-red-400">{replyError}</p> : null}
            </>
          ) : (
            <div className="grid flex-1 place-items-center px-6 text-center">
              <div>
                <p className="font-semibold">No ticket selected</p>
                <p className="mt-1 text-sm text-slate-400">{items.length === 0 ? "Create a ticket to start a thread." : "Choose a ticket from the list."}</p>
              </div>
            </div>
          )}
        </Panel>
      </div>
      {creating ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="presentation" onClick={() => { if (!form.formState.isSubmitting) setCreating(false); }}>
          <form role="dialog" aria-labelledby="new-ticket-title" className="w-full max-w-lg space-y-3 rounded-2xl border border-[#e879f9]/50 bg-[#10162c] p-5 shadow-[0_0_24px_rgba(232,121,249,.35)]" onClick={(event) => event.stopPropagation()} onSubmit={form.handleSubmit(async (values) => {
            try {
              const ticket = await mutate<TicketView>("/tickets", "POST", values);
              setItems((current) => [ticket, ...current.filter((item) => item.id !== ticket.id)]);
              setFilter("all");
              setSelectedId(ticket.id);
              form.reset();
              setCreating(false);
              refresh();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Ticket was not created");
            }
          })}>
            <h2 id="new-ticket-title" className="text-lg font-bold">New ticket</h2>
            <p className="text-sm text-slate-400">A subject and a message are required. This does not deliver a product or send a replacement.</p>
            <Field label="Subject" error={form.formState.errors.subject?.message}><input className={inputClass} {...form.register("subject")} /></Field>
            <Field label="Message" error={form.formState.errors.body?.message}><textarea className={inputClass} rows={5} {...form.register("body")} /></Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" disabled={form.formState.isSubmitting} onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : "Create ticket"}</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function TicketDetailView({ ticket }: { ticket: TicketView }) {
  const refresh = useRefresh();
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><h1 className="text-xl font-bold">{ticket.number}</h1><StatusPill status={ticket.status} /></div>
      <p className="text-slate-300">{ticket.subject}</p>
      <div className="space-y-2">{ticket.messages.map((message) => <Panel key={message.id} className="flex items-start gap-3 p-3 text-sm"><NameAvatar name={message.authorName} size="sm" /><div><p className="text-xs text-cyan-200">{message.authorName} · {message.authorRole}</p><p className="mt-1">{message.body}</p></div></Panel>)}</div>
      <form className="space-y-2" onSubmit={async (event) => {
        event.preventDefault(); setPending(true); setError(null);
        try { await mutate(`/tickets/${ticket.id}/messages`, "POST", { body }); setBody(""); refresh(); }
        catch (err) { setError(err instanceof Error ? err.message : "Reply failed"); }
        finally { setPending(false); }
      }}>
        <textarea className={inputClass} rows={3} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a reply" />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button disabled={pending || body.trim().length < 1}>{pending ? "Sending..." : "Send reply"}</Button>
      </form>
    </div>
  );
}

export function ReviewForm({ productId }: { productId: string }) {
  const form = useForm({ resolver: zodResolver(reviewSchema), defaultValues: { productId, rating: 5, comment: "" } });
  const [message, setMessage] = React.useState<string | null>(null);
  return (
    <form className="mt-3 space-y-2" onSubmit={form.handleSubmit(async (values) => {
      setMessage(null);
      try { await mutate("/reviews", "POST", values); setMessage("Review published."); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Review was not saved"); }
    })}>
      <Field label="Rating"><input type="number" min={1} max={5} className={inputClass} {...form.register("rating", { valueAsNumber: true })} /></Field>
      <Field label="Comment"><textarea className={inputClass} {...form.register("comment")} /></Field>
      <Button type="submit">Submit review</Button>
      {message ? <p className="text-sm text-slate-300">{message}</p> : null}
    </form>
  );
}

function OrderDetailPanel({ row }: { row: AccountOrderRow | null }) {
  if (!row) {
    return <Panel className="neon-violet p-5"><p className="text-sm text-slate-400">Select an order to see its status. Nothing is shown until an order matches the filters.</p></Panel>;
  }
  if (row.kind === "request") return <RequestDetailPanel request={row.request} />;
  const order = row.order;
  const item = order.items[0];
  const extra = Math.max(order.items.length - 1, 0);
  const status = orderListStatus(order);
  const steps = orderTimeline(order);
  return (
    <Panel className="neon-violet space-y-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-bold">Order #{order.number}</h2>
          <p className="mt-1 text-xs text-slate-400">Ordered on {formatOrderWhen(order.createdAt)}</p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      {item ? (
        <div className="flex items-center gap-3">
          <OrderArt monogram={item.monogram} accent={item.accent} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{item.title}{extra > 0 ? ` + ${extra} more` : ""}</p>
            <p className="flex items-center gap-2 text-xs text-slate-400"><NameAvatar name={item.sellerName} size="sm" className="h-6 w-6 text-[9px]" /> Seller: {item.sellerName}</p>
          </div>
          <p className="text-sm font-semibold">{formatMoney(item.lineTotalMinor)}</p>
        </div>
      ) : <p className="text-sm text-slate-400">This order has no line items.</p>}
      <div>
        <h3 className="text-sm font-semibold">Delivery status</h3>
        <ol className="mt-3 space-y-3">
          {steps.map((step) => (
            <li key={step.title} className="flex gap-2">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400 text-[#04120a]"><Check className="h-3 w-3" /></span>
              <span>
                <span className="block text-sm font-medium">{step.title}</span>
                {step.detail ? <span className="block text-xs text-slate-400">{step.detail}</span> : null}
                <span className="block text-[11px] text-slate-500">{formatOrderWhen(step.at)}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <Button asChild className="w-full"><Link href={`/account/orders/${order.id}/delivery`}>View Delivery Details</Link></Button>
      <Button type="button" variant="secondary" className="w-full" onClick={() => downloadReceipt(order)}><Download className="h-4 w-4" /> Download Receipt</Button>
    </Panel>
  );
}

function RequestDetailPanel({ request }: { request: OrderRequestView }) {
  const item = request.items[0];
  const extra = Math.max(request.items.length - 1, 0);
  const status = requestListStatus(request);
  const contact = [request.email, request.telegram].filter(Boolean).join(" · ");
  return (
    <Panel className="neon-violet space-y-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-bold">Order #{request.number}</h2>
          <p className="mt-1 text-xs text-slate-400">Requested on {formatOrderWhen(request.createdAt)}</p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      {item ? (
        <div className="flex items-center gap-3">
          <OrderArt monogram={item.monogram} accent={item.accent} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{item.title}{extra > 0 ? ` + ${extra} more` : ""}</p>
            <p className="flex items-center gap-2 text-xs text-slate-400"><NameAvatar name={item.sellerName} size="sm" className="h-6 w-6 text-[9px]" /> Seller: {item.sellerName}</p>
          </div>
          <p className="text-sm font-semibold">{formatMoney(item.lineTotalMinor)}</p>
        </div>
      ) : <p className="text-sm text-slate-400">This request has no line items.</p>}
      <div>
        <h3 className="text-sm font-semibold">Delivery status</h3>
        <ol className="mt-3 space-y-3">
          <li className="flex gap-2">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400 text-[#04120a]"><Check className="h-3 w-3" /></span>
            <span>
              <span className="block text-sm font-medium">Request submitted</span>
              <span className="block text-xs text-slate-400">Quoted total {formatMoney(request.totalMinor)}. Nothing has been charged or delivered.</span>
              <span className="block text-[11px] text-slate-500">{formatOrderWhen(request.createdAt)}</span>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400 text-[#04120a]"><Check className="h-3 w-3" /></span>
            <span>
              <span className="block text-sm font-medium">{status.label}</span>
              <span className="block text-xs text-slate-400">{request.status === "CANCELED" ? "This request was canceled." : "A person will use the contact you left. This is not a paid order."}</span>
              {contact ? <span className="block text-xs text-slate-400">{contact}</span> : null}
            </span>
          </li>
        </ol>
      </div>
      <Button asChild className="w-full"><Link href={`/order-requests/${request.id}`}>View Request Details</Link></Button>
    </Panel>
  );
}

type OrderFilter = "all" | "processing" | "completed" | "refunded";
type OrderRange = "7" | "30" | "all";
type OrderBucket = "processing" | "completed" | "refunded" | "other";

function orderBucket(order: OrderView): OrderBucket {
  if (order.status === "REFUNDED" || order.paymentStatus === "REFUNDED") return "refunded";
  if (order.status === "DELIVERED") return "completed";
  if (order.status === "CANCELLED") return "other";
  return "processing";
}

function accountRowBucket(row: AccountOrderRow): OrderBucket {
  if (row.kind === "order") return orderBucket(row.order);
  if (row.request.status === "COMPLETED") return "completed";
  if (row.request.status === "CANCELED") return "other";
  return "processing";
}

function accountRowMatches(row: AccountOrderRow, query: string) {
  if (row.kind === "order") return orderMatchesQuery(row.order, query);
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const request = row.request;
  const haystack = [request.number, request.id, request.email ?? "", request.telegram ?? "", ...request.items.flatMap((item) => [item.title, item.variantName, item.sellerName])].join(" ").toLowerCase();
  return haystack.includes(needle);
}

function requestListStatus(request: OrderRequestView): { label: string; tone: "green" | "amber" | "red" | "cyan" } {
  switch (request.status) {
    case "AWAITING_CONTACT": return { label: "Awaiting", tone: "amber" };
    case "IN_PROGRESS": return { label: "In progress", tone: "amber" };
    case "COMPLETED": return { label: "Completed", tone: "green" };
    case "CANCELED": return { label: "Canceled", tone: "red" };
  }
}

function orderListStatus(order: OrderView): { label: string; tone: "green" | "amber" | "red" | "cyan" } {
  if (order.status === "REFUNDED" || order.paymentStatus === "REFUNDED") return { label: "Refunded", tone: "red" };
  switch (order.status) {
    case "DELIVERED": return { label: "Completed", tone: "green" };
    case "AWAITING_SELLER": return { label: "Awaiting seller", tone: "amber" };
    case "MANUAL_REVIEW": return { label: "In review", tone: "amber" };
    case "PENDING_PAYMENT": return { label: "Pending payment", tone: "amber" };
    case "CANCELLED": return { label: "Cancelled", tone: "red" };
    case "PAID":
    case "FULFILLING": return { label: "Processing", tone: "amber" };
    default: return { label: order.status, tone: "cyan" };
  }
}

function orderTimeline(order: OrderView) {
  const steps: Array<{ title: string; detail?: string; at: string }> = [{ title: "Order placed", at: order.createdAt }];
  if (order.paymentStatus === "SUCCEEDED") steps.push({ title: "Payment confirmed", detail: "The demo checkout was recorded as paid. No live charge was made.", at: order.createdAt });
  else if (order.paymentStatus === "REFUNDED") steps.push({ title: "Payment refunded", detail: "The recorded payment was refunded.", at: order.createdAt });
  else if (order.paymentStatus === "FAILED") steps.push({ title: "Payment failed", detail: "No payment was taken.", at: order.createdAt });
  if (order.status === "AWAITING_SELLER") steps.push({ title: "Awaiting seller", detail: "The seller has not confirmed fulfillment. Nothing has been delivered.", at: order.createdAt });
  else if (order.status === "FULFILLING" || order.status === "PAID") steps.push({ title: "Processing order", detail: "Fulfillment is still in progress.", at: order.createdAt });
  else if (order.status === "MANUAL_REVIEW") steps.push({ title: "In review", detail: "This order is in manual review. Nothing was delivered.", at: order.createdAt });
  else if (order.status === "CANCELLED") steps.push({ title: "Cancelled", detail: "This order was cancelled.", at: order.createdAt });
  if (order.status === "DELIVERED") steps.push({ title: "Delivered", detail: "Demo delivery is ready to view. The voucher is not shown here.", at: order.createdAt });
  return steps;
}

function orderMatchesQuery(order: OrderView, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [order.number, order.id, ...order.items.flatMap((item) => [item.title, item.variantName, item.sellerName])].join(" ").toLowerCase();
  return haystack.includes(needle);
}

function orderInRange(iso: string, range: OrderRange, nowIso: string) {
  if (range === "all") return true;
  const now = new Date(nowIso).getTime();
  const then = new Date(iso).getTime();
  if (Number.isNaN(now) || Number.isNaN(then)) return true;
  return now - then <= Number(range) * 24 * 60 * 60 * 1000;
}

type TicketFilter = "all" | "open" | "progress" | "closed";

function ticketMatches(ticket: TicketView, filter: TicketFilter) {
  if (filter === "all") return true;
  if (filter === "open") return ticket.status === "OPEN";
  if (filter === "progress") return ticket.status === "IN_PROGRESS";
  return ticket.status === "CLOSED" || ticket.status === "RESOLVED";
}

function ticketStatusCopy(status: TicketStatus): { label: string; tone: "green" | "cyan" | "slate" | "pink" } {
  switch (status) {
    case "OPEN": return { label: "Open", tone: "green" };
    case "IN_PROGRESS": return { label: "In Progress", tone: "cyan" };
    case "RESOLVED": return { label: "Resolved", tone: "slate" };
    case "CLOSED": return { label: "Closed", tone: "slate" };
  }
}

function formatOrderDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatOrderWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const time = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" }).format(date);
  return `${formatOrderDate(iso)} at ${time} UTC`;
}

function paymentReceiptLine(order: OrderView) {
  if (order.paymentStatus === "SUCCEEDED") return "Payment status: succeeded in this demo. This is not a processor receipt and no live charge was made.";
  if (order.paymentStatus === "REFUNDED") return "Payment status: refunded.";
  if (order.paymentStatus === "FAILED") return "Payment status: failed. No payment was taken.";
  return "Payment status: not taken.";
}

function downloadReceipt(order: OrderView) {
  const lines = [
    "Digital Marketplace demo receipt",
    paymentReceiptLine(order),
    `Order: ${order.number}`,
    `Date: ${formatOrderWhen(order.createdAt)}`,
    `Status: ${orderListStatus(order).label}`,
    "",
    "Items:",
    ...order.items.map((item) => `- ${item.title} (${item.variantName}) · Seller: ${item.sellerName} · ${formatMoney(item.lineTotalMinor)}`),
    "",
    `Subtotal: ${formatMoney(order.subtotalMinor)}`,
    `Discount: ${formatMoney(order.discountMinor)}`,
    `Fee: ${formatMoney(order.feeMinor)}`,
    `Total: ${formatMoney(order.totalMinor)}`,
    "",
    order.status === "DELIVERED" ? "Delivery: marked delivered. Voucher contents are not included." : "Delivery: not delivered.",
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${order.number}-receipt.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

const quickActions = [
  { href: "/products", label: "Browse Products", icon: ShoppingBag, neon: "#FF4BD8" },
  { href: "/sellers", label: "Sellers", icon: Store, neon: "#C084FC" },
  { href: "/support", label: "Get Support", icon: Headset, neon: "#67E8F9" },
];

function StatCard({ label, value, icon: Icon, neon, delta }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; neon: string; delta: PeriodDelta }) {
  return (
    <Panel className="neon-violet p-4">
      <span className="neon-icon h-11 w-11 rounded-2xl" style={{ "--neon": neon } as React.CSSProperties}><Icon className="h-5 w-5" /></span>
      <p className="mt-3 text-2xl font-black tracking-tight">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
      <Delta delta={delta} />
    </Panel>
  );
}

function Delta({ delta }: { delta: PeriodDelta }) {
  if (delta.tone === "none") return <p className="mt-2 text-xs font-medium text-slate-400">No prior period</p>;
  const Icon = delta.tone === "up" ? ArrowUpRight : delta.tone === "down" ? ArrowDownRight : null;
  return (
    <p className={cn("mt-2 flex items-center gap-1 text-xs font-semibold", delta.tone === "up" && "text-emerald-400", delta.tone === "down" && "text-rose-400", delta.tone === "flat" && "text-slate-400")} title="Compared with the previous calendar month">
      {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
      <span>{delta.label}</span>
      <span className="font-medium text-slate-500">vs prior month</span>
    </p>
  );
}

function RecentOrder({ order }: { order: OrderView }) {
  const item = order.items[0];
  const extra = Math.max(order.items.length - 1, 0);
  const title = item ? `${item.title}${extra > 0 ? ` + ${extra} more` : ""}` : order.number;
  const seller = item?.sellerName;
  const status = orderStatusCopy(order.status);
  return (
    <Link href={`/account/orders/${order.id}`} className="flex items-center gap-3 rounded-xl px-1 py-2.5 hover:bg-white/5">
      {item ? <OrderArt monogram={item.monogram} accent={item.accent} /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/5 text-xs text-slate-400">—</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">{title}</span>
        <span className="block truncate text-xs text-slate-400">{seller ? `Seller: ${seller}` : order.number}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-semibold">{formatMoney(order.totalMinor)}</span>
        <Badge tone={status.tone}>{status.label}</Badge>
      </span>
    </Link>
  );
}

function OrderArt({ monogram, accent }: { monogram: string; accent: string }) {
  return (
    <span
      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-black"
      style={{ color: accent, background: `radial-gradient(circle at 30% 20%, ${accent}99, transparent 46%), linear-gradient(160deg, ${accent}66, #14081f)`, boxShadow: `0 0 14px ${accent}66` }}
    >
      {monogram}
    </span>
  );
}

function orderStatusCopy(status: OrderStatus): { label: string; tone: "green" | "red" | "amber" | "cyan" } {
  switch (status) {
    case "DELIVERED": return { label: "Completed", tone: "green" };
    case "PAID": return { label: "Paid", tone: "green" };
    case "FULFILLING": return { label: "Fulfilling", tone: "cyan" };
    case "PENDING_PAYMENT": return { label: "Pending", tone: "amber" };
    case "AWAITING_SELLER": return { label: "Awaiting seller", tone: "amber" };
    case "MANUAL_REVIEW": return { label: "In review", tone: "amber" };
    case "CANCELLED": return { label: "Cancelled", tone: "red" };
    case "REFUNDED": return { label: "Refunded", tone: "red" };
  }
}

type PeriodDelta = { label: string; tone: "up" | "down" | "flat" | "none" };

function periodDelta(current: number, previous: number): PeriodDelta {
  if (previous === 0 && current === 0) return { label: "0.0%", tone: "flat" };
  if (previous === 0) return { label: "No prior period", tone: "none" };
  const rounded = Math.round((((current - previous) / previous) * 100) * 10) / 10;
  const tone = rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
  return { label: `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`, tone };
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthStart(date: Date, offset: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
}

function dashboardStats(orders: OrderView[], tickets: TicketView[], nowIso: string) {
  const parsed = new Date(nowIso);
  const now = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const thisKey = monthKey(now);
  const lastKey = monthKey(monthStart(now, -1));
  const series = Array.from({ length: 6 }, (_, index) => {
    const date = monthStart(now, index - 5);
    return { key: monthKey(date), label: date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }), minor: 0 };
  });
  const byMonth = new Map(series.map((month) => [month.key, 0]));
  let spentMinor = 0;
  let thisSpent = 0;
  let lastSpent = 0;
  let thisOrders = 0;
  let lastOrders = 0;
  for (const order of orders) {
    const key = order.createdAt.slice(0, 7);
    if (key === thisKey) thisOrders += 1;
    if (key === lastKey) lastOrders += 1;
    if (order.paymentStatus !== "SUCCEEDED") continue;
    spentMinor += order.totalMinor;
    if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) ?? 0) + order.totalMinor);
    if (key === thisKey) thisSpent += order.totalMinor;
    if (key === lastKey) lastSpent += order.totalMinor;
  }
  const filled = series.map((month) => ({ ...month, minor: byMonth.get(month.key) ?? 0 }));
  const windowSpent = filled.reduce((sum, month) => sum + month.minor, 0);
  const openTickets = tickets.filter((ticket) => ticket.status === "OPEN" || ticket.status === "IN_PROGRESS").length;
  return {
    orderCount: orders.length,
    spentMinor,
    windowSpent,
    openTickets,
    series: filled,
    orderDelta: periodDelta(thisOrders, lastOrders),
    spentDelta: periodDelta(thisSpent, lastSpent),
    ticketDelta: tickets.length === 0 ? periodDelta(0, 0) : ({ label: "No prior period", tone: "none" } as PeriodDelta),
  };
}
