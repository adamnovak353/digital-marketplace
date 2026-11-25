import { ProductsView } from "@marketplace/ui";
import { getContext } from "@/lib/context";
import { toProductQuery } from "@/lib/query";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const search = await searchParams;
  const { svc } = await getContext();
  const data = svc.listProducts(toProductQuery(search));
  return <ProductsView title="All products" subtitle="Demo catalog. Filters and prices come from the server." basePath="/products" data={data} selected={search} sellers={svc.home().topSellers} />;
}
