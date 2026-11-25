import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { actor, cartCount } = await getContext();
  const path = (await headers()).get("x-pathname") ?? "";
  const guestOrder = path.startsWith("/account/orders/");
  if (!actor && !guestOrder) redirect(`/login?next=${encodeURIComponent(path || "/account")}`);
  return <AppShell portal={actor ? "account" : "market"} user={actor} cartCount={cartCount}>{children}</AppShell>;
}
