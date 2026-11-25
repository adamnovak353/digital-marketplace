import { notFound } from "next/navigation";
import { AdminCustomerForm } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor, svc } = await getContext();
  if (!actor) return null;
  const customer = svc.adminCustomerRows(actor).find((item) => item.id === id);
  if (!customer) notFound();
  return <AdminCustomerForm customer={customer} />;
}
