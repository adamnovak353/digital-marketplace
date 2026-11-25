import { notFound } from "next/navigation";
import { OrderDetailView } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, svc, guestId } = await getContext();
  try {
    return <OrderDetailView order={svc.getOrder(actor, guestId, id)} />;
  } catch {
    notFound();
  }
}
