import { notFound } from "next/navigation";
import { SellerCustomerDetail } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page({ params }: { params: Promise<{ contact: string }> }) {
  const { contact } = await params;
  const { actor, svc } = await getContext();
  if (!actor) return null;
  try {
    return <SellerCustomerDetail customer={svc.sellerCustomer(actor, decodeURIComponent(contact))} />;
  } catch {
    notFound();
  }
}
