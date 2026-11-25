import { SellerRequestsView } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { actor, svc } = await getContext();
  if (!actor) return null;
  const data = svc.sellerDashboard(actor);
  return <SellerRequestsView rows={data.activity} products={svc.sellerProducts(actor)} />;
}
