import { ProfileView } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { actor } = await getContext();
  if (!actor) return null;
  return <ProfileView name={actor.name} email={actor.email} verified={actor.emailVerified} />;
}
