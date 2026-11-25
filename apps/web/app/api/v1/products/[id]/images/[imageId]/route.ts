import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { HttpError } from "@marketplace/domain/server";
import { getRuntime } from "@/lib/marketplace";
import { openSession } from "@/lib/session";
import { getImageStore } from "@/lib/uploads";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; imageId: string }> }) {
  const { id, imageId } = await context.params;
  const token = (await cookies()).get("dm_session")?.value;
  const actor = token ? openSession(token) : null;
  if (!actor) return NextResponse.json({ error: { code: "AUTH_REQUIRED", message: "Sign in required." } }, { status: 401 });
  const runtime = await getRuntime();
  try {
    const { key, images } = runtime.service.removeProductImage(actor, id, imageId);
    await runtime.persist();
    await getImageStore().remove(key);
    return NextResponse.json({ images });
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: { code: "STORAGE_UNAVAILABLE", message: "The image could not be removed. Try again shortly." } }, { status: 503 });
  }
}
