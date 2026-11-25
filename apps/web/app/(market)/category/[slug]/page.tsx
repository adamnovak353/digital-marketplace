import { notFound } from "next/navigation";
import { ProductsView } from "@marketplace/ui";
import { getContext } from "@/lib/context";
import { toProductQuery } from "@/lib/query";

const titles: Record<string, string> = {
  "digital-accounts": "Digital Accounts",
  "phone-numbers": "Phone Numbers / SMS",
  "virtual-cards": "Virtual Cards",
  subscriptions: "Subscriptions / Licenses",
  gaming: "Gaming Products",
};

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const title = titles[slug];
  if (!title) notFound();
  const search = await searchParams;
  const { svc } = await getContext();
  const category = svc.listCategories().find((item) => item.slug === slug);
  const data = svc.listProducts(toProductQuery(search, { category: slug }));
  const subtitle = category && !category.available
    ? "This category stays off until a licensed provider is approved. Nothing here can be purchased."
    : category?.description ?? "";
  return <ProductsView title={title} subtitle={subtitle} basePath={`/category/${slug}`} data={data} selected={search} sellers={svc.home().topSellers} />;
}
