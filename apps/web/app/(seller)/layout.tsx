import { redirect } from "next/navigation";
import { AppShell } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { actor, cartCount, svc } = await getContext();
  if (!actor) redirect("/login?next=/seller/dashboard");
  if (!actor.sellerId) redirect("/seller/onboarding");
  const dashboard = svc.sellerDashboard(actor);
  return <AppShell portal="seller" user={actor} cartCount={cartCount} seller={{ name: dashboard.seller.name, slug: dashboard.seller.slug, status: dashboard.seller.status, requestCount: dashboard.openRequestCount }}>{children}</AppShell>;
}
