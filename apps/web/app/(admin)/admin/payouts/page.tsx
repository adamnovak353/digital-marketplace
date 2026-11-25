import { AdminPayoutsView } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { actor, svc } = await getContext();
  if (!actor) return null;
  return <AdminPayoutsView payouts={svc.adminPayouts(actor)} />;
}
