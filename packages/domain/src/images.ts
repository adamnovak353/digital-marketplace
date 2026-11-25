import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { PRODUCT_IMAGE_MAX_BYTES } from "@marketplace/types";

export type ImageType = "image/png" | "image/jpeg" | "image/webp";

export const IMAGE_EXTENSIONS: Record<ImageType, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

const KEY_PATTERN = /^products\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp)$/;

/** Detects the type from file bytes; the browser-supplied type and extension are not trusted. */
export function sniffImage(bytes: Uint8Array): ImageType | null {
  const at = (offset: number, ...values: number[]) => values.every((value, index) => bytes[offset + index] === value);
  if (bytes.length >= 8 && at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (bytes.length >= 3 && at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (bytes.length >= 12 && at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  return null;
}

export function validateImage(bytes: Uint8Array): { ok: true; type: ImageType } | { ok: false; code: string; message: string } {
  if (bytes.length === 0) return { ok: false, code: "IMAGE_EMPTY", message: "The file is empty." };
  if (bytes.length > PRODUCT_IMAGE_MAX_BYTES) return { ok: false, code: "IMAGE_TOO_LARGE", message: "Images must be 5 MB or smaller." };
  const type = sniffImage(bytes);
  if (!type) return { ok: false, code: "IMAGE_TYPE", message: "Only PNG, JPG, and WEBP images are accepted." };
  return { ok: true, type };
}

export function isImageKey(key: string) {
  return KEY_PATTERN.test(key);
}

export function contentTypeForKey(key: string): ImageType {
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export class DiskImageStore {
  readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private path(key: string) {
    if (!isImageKey(key)) throw new Error("Invalid image key.");
    const full = resolve(join(this.root, key));
    if (!full.startsWith(this.root + sep)) throw new Error("Invalid image key.");
    return full;
  }

  async put(key: string, bytes: Uint8Array) {
    const full = this.path(key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, bytes, { flag: "wx" });
  }

  async read(key: string) {
    try {
      return await readFile(this.path(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async remove(key: string) {
    await rm(this.path(key), { force: true });
  }
}
