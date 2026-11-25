import { SellerCatalogView } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { actor, svc } = await getContext();
  if (!actor) return null;
  return <SellerCatalogView products={svc.sellerProducts(actor)} />;
}
