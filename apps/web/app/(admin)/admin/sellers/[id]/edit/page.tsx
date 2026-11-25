import { notFound } from "next/navigation";
import { AdminSellerForm } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, svc } = await getContext();
  if (!actor) return null;
  const seller = svc.adminSellerRows(actor).find((item) => item.id === id);
  if (!seller) notFound();
  return <AdminSellerForm seller={seller} />;
}
