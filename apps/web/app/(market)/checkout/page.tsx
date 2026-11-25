import { redirect } from "next/navigation";
import { CheckoutView } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { svc, actor, guestId } = await getContext();
  if (!svc.paymentsEnabled) redirect("/cart");
  return <CheckoutView quote={svc.getCart(actor, guestId)} email={actor?.email} />;
}
