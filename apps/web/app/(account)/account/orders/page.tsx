import { OrdersView } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { actor, svc } = await getContext();
  if (!actor) return null;
  return <OrdersView orders={svc.listOrders(actor)} requests={svc.listMyOrderRequests(actor)} now={new Date().toISOString()} />;
}
