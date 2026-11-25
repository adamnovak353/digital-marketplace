import { ResultView } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  const { svc, actor, guestId } = await getContext();
  if (!order) return <ResultView order={null} />;
  try {
    return <ResultView order={svc.getOrder(actor, guestId, order)} />;
  } catch {
    return <ResultView order={null} />;
  }
}
