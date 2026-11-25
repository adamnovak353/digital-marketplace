import { DiskImageStore } from "@marketplace/domain/server";

const globalForUploads = globalThis as unknown as { imageStore?: DiskImageStore };

export function getImageStore() {
  globalForUploads.imageStore ??= new DiskImageStore(process.env.UPLOAD_DIR || ".data/uploads");
  return globalForUploads.imageStore;
}
