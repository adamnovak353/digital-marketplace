import { notFound } from "next/navigation";
import { DeliveryView } from "@marketplace/ui";
import { getContext } from "@/lib/context";
import { getRuntime } from "@/lib/marketplace";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, svc, guestId } = await getContext();
  let delivery;
  try {
    delivery = svc.getDelivery(actor, guestId, id);
  } catch {
    notFound();
  }
  await (await getRuntime()).persist();
  return <DeliveryView delivery={delivery} />;
}
