import { notFound } from "next/navigation";
import { SellerRequestDetail } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, svc } = await getContext();
  if (!actor) return null;
  const row = svc.sellerDashboard(actor).activity.find((item) => item.id === id || item.number === id);
  if (!row) notFound();
  return <SellerRequestDetail row={row} />;
}
