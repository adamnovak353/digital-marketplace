import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { HttpError, validateImage } from "@marketplace/domain/server";
import { PRODUCT_IMAGE_MAX_BYTES } from "@marketplace/types";
import { getRuntime } from "@/lib/marketplace";
import { openSession } from "@/lib/session";
import { getImageStore } from "@/lib/uploads";

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const token = (await cookies()).get("dm_session")?.value;
  const actor = token ? openSession(token) : null;
  if (!actor) return fail(401, "AUTH_REQUIRED", "Sign in required.");
  if (Number(request.headers.get("content-length") ?? 0) > PRODUCT_IMAGE_MAX_BYTES + 64 * 1024) {
    return fail(413, "IMAGE_TOO_LARGE", "Images must be 5 MB or smaller.");
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail(400, "IMAGE_MISSING", "Attach one image in the \"file\" field.");
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) return fail(413, "IMAGE_TOO_LARGE", "Images must be 5 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateImage(bytes);
  if (!check.ok) return fail(400, check.code, check.message);

  const runtime = await getRuntime();
  const store = getImageStore();
  let reserved: { id: string; key: string };
  try {
    reserved = runtime.service.reserveProductImage(actor, id, check.type);
  } catch (error) {
    if (error instanceof HttpError) return fail(error.status, error.code, error.message);
    throw error;
  }
  await store.put(reserved.key, bytes);
  try {
    const images = runtime.service.attachProductImage(actor, id, { id: reserved.id, key: reserved.key, contentType: check.type, sizeBytes: bytes.length });
    await runtime.persist();
    return NextResponse.json({ images }, { status: 201 });
  } catch (error) {
    await store.remove(reserved.key);
    if (error instanceof HttpError) return fail(error.status, error.code, error.message);
    console.error(error);
    return fail(503, "STORAGE_UNAVAILABLE", "The image could not be saved. Try again shortly.");
  }
}
