import { SellersView } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page() {
  const { svc } = await getContext();
  return <SellersView sellers={svc.listSellers()} />;
}
