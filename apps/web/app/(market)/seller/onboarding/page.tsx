import { OnboardingView } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { actor } = await getContext();
  return <OnboardingView signedIn={Boolean(actor)} />;
}
