import type { ProductQuery } from "@marketplace/domain/server";
import type { RegionCode } from "@marketplace/types";

type Search = Record<string, string | string[] | undefined>;

export function toProductQuery(search: Search, extra: Partial<ProductQuery> = {}) {
  const one = (key: string) => {
    const value = search[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const many = (key: string) => {
    const value = search[key];
    const values = Array.isArray(value) ? value : value ? [value] : [];
    return values.flatMap((item) => item.split(",")).map((item) => item.trim()).filter(Boolean);
  };
  const region = one("region");
  const delivery = one("delivery");
  const sort = one("sort");
  const tag = extra.tag ?? one("tag");
  const min = one("min");
  const max = one("max");
  const query: ProductQuery = {
    q: one("q"),
    category: extra.category ?? one("category"),
    seller: one("seller"),
    platform: many("platform"),
    inStock: one("inStock") === "1",
    sort: sort === "price_asc" || sort === "price_desc" || sort === "newest" || sort === "rating" ? sort : "popular",
    page: Number(one("page") ?? 1) || 1,
    pageSize: 12,
  };
  if (region === "GLOBAL" || region === "US" || region === "UK" || region === "EU") query.region = region satisfies RegionCode;
  if (delivery === "INSTANT" || delivery === "MANUAL") query.delivery = delivery;
  if (tag === "featured" || tag === "best" || tag === "new" || tag === "hot") query.tag = tag;
  if (min && Number.isFinite(Number(min))) query.minMinor = Math.round(Number(min) * 100);
  if (max && Number.isFinite(Number(max))) query.maxMinor = Math.round(Number(max) * 100);
  return query;
}
