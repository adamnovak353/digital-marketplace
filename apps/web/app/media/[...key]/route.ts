import { contentTypeForKey, isImageKey } from "@marketplace/domain/server";
import { getImageStore } from "@/lib/uploads";

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const key = (await context.params).key.join("/");
  if (!isImageKey(key)) return new Response("Not found", { status: 404 });
  const bytes = await getImageStore().read(key);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentTypeForKey(key),
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
