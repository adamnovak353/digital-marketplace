import { notFound } from "next/navigation";
import { AdminProductDetail } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, svc } = await getContext();
  if (!actor) return null;
  try {
    return <AdminProductDetail product={svc.adminProduct(actor, id)} />;
  } catch {
    notFound();
  }
}
