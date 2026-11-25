import { SecurityView } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { actor } = await getContext();
  if (!actor) return null;
  return <SecurityView mfaEnabled={actor.mfaEnabled} />;
}
