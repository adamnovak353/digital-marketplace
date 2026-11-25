import { notFound } from "next/navigation";
import { AdminProductForm } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, svc } = await getContext();
  if (!actor) return null;
  try {
    return <AdminProductForm product={svc.adminProduct(actor, id)} sellers={svc.adminSellerRows(actor)} categories={svc.adminCategories(actor)} />;
  } catch {
    notFound();
  }
}
