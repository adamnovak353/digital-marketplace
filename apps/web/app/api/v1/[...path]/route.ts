import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { handleRequest } from "@marketplace/domain/server";
import { getRuntime } from "@/lib/marketplace";
import { openSession, sealSession } from "@/lib/session";

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const url = new URL(request.url);
  const jar = await cookies();
  const token = jar.get("dm_session")?.value;
  const guestId = jar.get("dm_guest")?.value ?? null;
  const query: Record<string, string | string[]> = {};
  url.searchParams.forEach((value, key) => {
    const current = query[key];
    query[key] = current ? (Array.isArray(current) ? [...current, value] : [current, value]) : value;
  });
  const headerSecret = request.headers.get("x-webhook-secret");
  if (headerSecret) query.secret = headerSecret;
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.json().catch(() => undefined);
  const result = await handleRequest(await getRuntime(), { method: request.method, path: `/${path.join("/")}`, query, body, actor: token ? openSession(token) : null, guestId });
  const response = NextResponse.json(result.body, { status: result.status });
  if (result.clearSession) response.cookies.set("dm_session", "", { httpOnly: true, path: "/", maxAge: 0 });
  if (result.session) response.cookies.set("dm_session", sealSession(result.session), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return response;
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
