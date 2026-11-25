import { EmptyState, OrderRequestResult } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { svc, actor, guestId } = await getContext();
  try {
    return <OrderRequestResult request={svc.getOrderRequest(actor, guestId, id)} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Order request not found.";
    return <EmptyState title="Order request not found" body={message} href="/cart" action="Back to cart" />;
  }
}
