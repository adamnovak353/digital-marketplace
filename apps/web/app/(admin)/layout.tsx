import { redirect } from "next/navigation";
import { AppShell } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { actor, cartCount, svc } = await getContext();
  if (!actor || (actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN")) redirect("/login?next=/admin");
  return <AppShell portal="admin" user={actor} cartCount={cartCount} admin={svc.adminNav(actor)}>{children}</AppShell>;
}
