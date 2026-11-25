import { openMarketplace, type MarketplaceRuntime } from "@marketplace/domain/server";

const globalForMarketplace = globalThis as unknown as { marketplaceRuntime?: Promise<MarketplaceRuntime> };

function log(event: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ time: new Date().toISOString(), service: "web", event, ...fields }));
}

export function getRuntime() {
  if (!globalForMarketplace.marketplaceRuntime) {
    const runtime = openMarketplace(process.env, log);
    runtime.catch(() => {
      globalForMarketplace.marketplaceRuntime = undefined;
    });
    globalForMarketplace.marketplaceRuntime = runtime;
  }
  return globalForMarketplace.marketplaceRuntime;
}

export async function getMarketplace() {
  return (await getRuntime()).service;
}
