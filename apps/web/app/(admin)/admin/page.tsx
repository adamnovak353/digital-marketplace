import { AdminHome } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { actor, svc } = await getContext();
  if (!actor) return null;
  return <AdminHome data={svc.adminAnalytics(actor)} activity={svc.auditLog(actor)} />;
}
