import { notFound } from "next/navigation";
import { AdminCategoryForm } from "@marketplace/ui";
import { getContext } from "@/lib/context";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { actor, svc } = await getContext();
  if (!actor) return null;
  const category = svc.adminCategories(actor).find((item) => item.slug === slug);
  if (!category) notFound();
  return <AdminCategoryForm category={category} />;
}
