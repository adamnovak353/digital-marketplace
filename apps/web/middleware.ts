import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const existing = request.cookies.get("dm_guest")?.value;
  const guest = existing ?? crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  if (!existing) {
    const cookie = request.headers.get("cookie");
    requestHeaders.set("cookie", `${cookie ? `${cookie}; ` : ""}dm_guest=${guest}`);
  }
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (!existing) {
    response.cookies.set("dm_guest", guest, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|media/|favicon.ico).*)"] };
