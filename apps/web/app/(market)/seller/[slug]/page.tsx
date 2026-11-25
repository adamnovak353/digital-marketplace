import { notFound } from "next/navigation";
import { StorefrontView } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { svc } = await getContext();
  try {
    const data = svc.getSeller(slug);
    return <StorefrontView seller={data.seller} products={data.products} />;
  } catch {
    notFound();
  }
}
