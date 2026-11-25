import { redirect } from "next/navigation";
import { SellerBaseProvider } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { actor } = await getContext();
  if (!actor?.sellerId) redirect("/seller/onboarding");
  return <SellerBaseProvider base="/account/seller">{children}</SellerBaseProvider>;
}
