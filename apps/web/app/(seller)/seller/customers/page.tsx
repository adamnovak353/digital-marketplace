import { SellerCustomerList } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { actor, svc } = await getContext();
  if (!actor) return null;
  return <SellerCustomerList customers={svc.sellerCustomers(actor)} monthKey={new Date().toISOString().slice(0, 7)} />;
}
