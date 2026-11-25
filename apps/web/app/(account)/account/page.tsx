import { AccountHome } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { actor, svc } = await getContext();
  if (!actor) return null;
  return (
    <AccountHome
      name={actor.name}
      orders={svc.listOrders(actor)}
      tickets={svc.listTickets(actor)}
      now={new Date().toISOString()}
    />
  );
}
