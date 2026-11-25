import { notFound } from "next/navigation";
import { ProductDetailView } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { svc, actor } = await getContext();
  try {
    return <ProductDetailView product={svc.getProduct(slug, actor)} />;
  } catch {
    notFound();
  }
}
