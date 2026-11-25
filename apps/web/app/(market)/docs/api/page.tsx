import Link from "next/link";
import { listRoutes } from "@marketplace/domain/server";

export default function Page() {
  const routes = listRoutes();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">API v1</h1>
      <p className="max-w-3xl text-sm text-slate-300">Routes are served by the demo runtime at <code>/api/v1</code>. The NestJS service exposes the same handlers when <code>pnpm dev:api</code> is running. Monetary amounts are integer minor units. Client prices are ignored.</p>
      <div className="overflow-x-auto rounded-2xl border border-violet-400/20">
        <table className="w-full text-left text-sm">
          <thead className="text-slate-400"><tr><th className="p-3">Method</th><th>Path</th><th>Access</th></tr></thead>
          <tbody>
            {routes.map((route) => <tr key={`${route.method}${route.path}`} className="border-t border-white/5"><td className="p-3 font-mono text-pink-200">{route.method}</td><td className="font-mono">/api/v1{route.path}</td><td>{route.auth}</td></tr>)}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-slate-400">Webhook calls need header <code>x-webhook-secret</code>. The demo confirmation button is session-scoped and only works while demo mode is on. <Link className="text-cyan-300" href="/legal/acceptable-use">Acceptable use</Link></p>
    </div>
  );
}
