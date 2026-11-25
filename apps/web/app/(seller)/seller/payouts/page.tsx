import { SellerPayoutDesk } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { actor, svc } = await getContext();
  if (!actor) return null;
  return <SellerPayoutDesk payouts={svc.sellerPayouts(actor)} availableMinor={svc.sellerDashboard(actor).availableMinor} />;
}
