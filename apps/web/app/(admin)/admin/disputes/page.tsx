import { AdminDisputesView } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { actor, svc } = await getContext();
  if (!actor) return null;
  return <AdminDisputesView disputes={svc.adminDisputes(actor)} orders={svc.adminOrders(actor)} />;
}
