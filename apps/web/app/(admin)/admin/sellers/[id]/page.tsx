import { notFound } from "next/navigation";
import { AdminSellerDetail } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, svc } = await getContext();
  if (!actor) return null;
  try {
    return <AdminSellerDetail seller={svc.adminSeller(actor, id)} />;
  } catch {
    notFound();
  }
}
