import { redirect } from "next/navigation";
import { AppShell } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function MarketLayout({ children }: { children: React.ReactNode }) {
  const { actor, cartCount } = await getContext();
  return <AppShell portal="market" user={actor} cartCount={cartCount}>{children}</AppShell>;
}
