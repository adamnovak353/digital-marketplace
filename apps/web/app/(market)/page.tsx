import { HomeView } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { svc } = await getContext();
  return <HomeView data={svc.home()} />;
}
