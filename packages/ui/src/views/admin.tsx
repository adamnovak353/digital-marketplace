"use client";

import type { ReactNode } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { toast } from "sonner";
import { formatMoney, type OrderView } from "@marketplace/types";
import { Button, NameAvatar, Panel, StatusPill, mutate, useRefresh } from "../components/kit";

export interface AdminDash {
  gmvMinor: number;
  orderCount: number;
  activeSellers: number;
  customerCount: number;
  platformRevenueMinor: number;
  series: Array<{ date: string; revenueMinor: number; orders: number }>;
  statusCounts: Array<{ status: string; count: number }>;
  categoryCounts: Array<{ name: string; count: number; gmvMinor: number }>;
  topSellers: Array<{ name: string; salesMinor: number; orders: number }>;
  recentOrders: OrderView[];
  system: Array<{ name: string; status: string }>;
  books: { balanced: boolean };
}

export function AdminOverview({ data }: { data: AdminDash }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Platform overview</h1>
      <div className="grid gap-3 md:grid-cols-5">
        <Stat label="GMV" value={formatMoney(data.gmvMinor)} />
        <Stat label="Orders" value={String(data.orderCount)} />
        <Stat label="Active sellers" value={String(data.activeSellers)} />
        <Stat label="Customers" value={String(data.customerCount)} />
        <Stat label="Platform revenue" value={formatMoney(data.platformRevenueMinor)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel className="h-72 p-4"><h2 className="mb-2 font-semibold">Revenue & orders</h2><div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.series}><XAxis dataKey="date" tickFormatter={(value) => String(value).slice(5)} tick={{ fill: "#94A3B8", fontSize: 11 }} /><Tooltip formatter={(value) => formatMoney(Number(value ?? 0))} contentStyle={{ background: "#10152B", border: "1px solid rgba(139,92,246,.4)" }} /><Bar dataKey="revenueMinor" fill="#FF00C8" radius={4} /></BarChart></ResponsiveContainer></div></Panel>
        <Panel className="p-4 text-sm"><h2 className="font-semibold">Orders by category</h2>{data.categoryCounts.map((item) => <div key={item.name} className="mt-2 flex justify-between"><span>{item.name}</span><span>{item.count}</span></div>)}<p className="mt-3 text-xs text-slate-500">Books {data.books.balanced ? "balanced" : "out of balance"}</p></Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-4 text-sm"><h2 className="font-semibold">Top sellers</h2>{data.topSellers.map((seller) => <div key={seller.name} className="mt-2 flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2"><NameAvatar name={seller.name} size="sm" /><span className="truncate">{seller.name}</span></span><span>{formatMoney(seller.salesMinor)}</span></div>)}</Panel>
        <Panel className="p-4 text-sm"><h2 className="font-semibold">System status</h2>{data.system.map((item) => <div key={item.name} className="mt-2 flex justify-between"><span>{item.name}</span><span className="text-cyan-200">{item.status}</span></div>)}</Panel>
      </div>
    </div>
  );
}

export function AdminTable({ title, columns, rows, empty }: { title: string; columns: string[]; rows: ReactNode[][]; empty: string }) {
  return <div className="space-y-3"><h1 className="text-2xl font-bold">{title}</h1>{rows.length === 0 ? <p className="text-sm text-slate-400">{empty}</p> : <Panel className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-400"><tr>{columns.map((column) => <th key={column} className="p-3">{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-t border-white/5">{row.map((cell, cellIndex) => <td key={cellIndex} className="p-3">{cell}</td>)}</tr>)}</tbody></table></Panel>}</div>;
}

export function ConfirmAction({ label, path, body, tone = "primary" }: { label: string; path: string; body?: Record<string, unknown>; tone?: "primary" | "danger" }) {
  const refresh = useRefresh();
  return <Button size="sm" variant={tone === "danger" ? "danger" : "secondary"} onClick={async () => {
    if (!window.confirm(`${label}? This is a sensitive demo action.`)) return;
    try { await mutate(path, "POST", { confirm: true, ...body }); toast.success(label); refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : `${label} failed`); }
  }}>{label}</Button>;
}

export function AdminAnalytics({ data }: { data: AdminDash }) {
  return <AdminOverview data={data} />;
}

export function AdminSettings({ settings }: { settings: { customerFeeBps: number; commissionBps: number; demoMode: boolean; providers: Array<{ id: string; name: string; mode: string; status: string; note: string }> } }) {
  const refresh = useRefresh();
  return (
    <div className="space-y-4">
      <Panel className="max-w-xl space-y-3 p-5">
        <h1 className="text-xl font-bold">Marketplace settings</h1>
        <p className="text-sm text-slate-400">Demo mode {settings.demoMode ? "on" : "off"}. Fees are basis points.</p>
        <form className="space-y-3" onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          try {
            await mutate("/admin/settings", "PATCH", { confirm: true, customerFeeBps: Number(form.get("customerFeeBps")), commissionBps: Number(form.get("commissionBps")) });
            toast.success("Settings saved");
            refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Settings were not saved");
          }
        }}>
          <label className="block text-sm">Customer fee bps<input className={inputClassName} name="customerFeeBps" type="number" defaultValue={settings.customerFeeBps} /></label>
          <label className="block text-sm">Reseller commission bps<input className={inputClassName} name="commissionBps" type="number" defaultValue={settings.commissionBps} /></label>
          <Button type="submit">Save with confirmation</Button>
        </form>
      </Panel>
      <div className="grid gap-3 md:grid-cols-2">{settings.providers.map((provider) => <Panel key={provider.id} className="p-4 text-sm"><div className="flex justify-between"><h2 className="font-semibold">{provider.name}</h2><StatusPill status={provider.mode} /></div><p className="mt-1 text-slate-400">{provider.status}</p><p className="mt-2 text-slate-300">{provider.note}</p></Panel>)}</div>
    </div>
  );
}

const inputClassName = "mt-1 w-full rounded-xl border border-[#a855f7]/45 bg-[#0C1024] px-3 py-2 outline-none focus:border-[#e879f9] focus:shadow-[0_0_16px_rgba(232,121,249,.35)]";

function Stat({ label, value }: { label: string; value: string }) {
  return <Panel className="p-4"><p className="text-xs text-slate-400">{label}</p><p className="text-xl font-bold">{value}</p></Panel>;
}
