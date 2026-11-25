import { cookies } from "next/headers";
import { getMarketplace } from "./marketplace";
import { openSession } from "./session";

export async function getContext() {
  const jar = await cookies();
  const token = jar.get("dm_session")?.value;
  const actor = token ? openSession(token) : null;
  const guestId = jar.get("dm_guest")?.value ?? "anonymous";
  const svc = await getMarketplace();
  const cart = svc.getCart(actor, guestId);
  return { actor, guestId, svc, cartCount: cart.items.reduce((sum, item) => sum + item.quantity, 0) };
}
