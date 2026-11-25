import { createHmac, timingSafeEqual } from "node:crypto";
import type { Actor } from "./service";

function secret() {
  return process.env.SESSION_SECRET || "demo-only-session-secret-change-me";
}

export function sealSession(actor: Actor) {
  const payload = Buffer.from(JSON.stringify({ ...actor, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function openSession(token: string): Actor | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as Actor & { exp: number };
    if (!data.exp || data.exp < Date.now()) return null;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      sellerId: data.sellerId,
      emailVerified: data.emailVerified,
      mfaEnabled: data.mfaEnabled,
    };
  } catch {
    return null;
  }
}

export function readCookie(header: string | undefined, name: string) {
  if (!header) return null;
  const parts = header.split(";").map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
