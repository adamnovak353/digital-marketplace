import { CartView } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { svc, actor, guestId } = await getContext();
  return <CartView quote={svc.getCart(actor, guestId)} email={actor?.email} />;
}
