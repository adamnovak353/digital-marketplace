import { AdminAccountSettings } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { actor } = await getContext();
  if (!actor) return null;
  return <AdminAccountSettings account={{ name: actor.name, email: actor.email, role: actor.role, mfaEnabled: actor.mfaEnabled }} />;
}
