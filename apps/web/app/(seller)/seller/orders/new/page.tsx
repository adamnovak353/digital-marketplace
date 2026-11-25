import { SellerRequestForm } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { actor, svc } = await getContext();
  if (!actor) return null;
  return <SellerRequestForm products={svc.sellerProducts(actor)} />;
}
