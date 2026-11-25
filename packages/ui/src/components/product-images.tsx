"use client";

import * as React from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { PRODUCT_IMAGE_LIMIT, PRODUCT_IMAGE_MAX_BYTES, PRODUCT_IMAGE_TYPES, type ProductImage } from "@marketplace/types";
import { Panel, mutate } from "./kit";

interface PendingImage {
  file: File;
  url: string;
}

export function useProductImages(initial: ProductImage[] = []) {
  const [kept, setKept] = React.useState(initial);
  const [removed, setRemoved] = React.useState<string[]>([]);
  const [pending, setPending] = React.useState<PendingImage[]>([]);
  const pendingRef = React.useRef(pending);
  pendingRef.current = pending;
  React.useEffect(() => () => pendingRef.current.forEach((item) => URL.revokeObjectURL(item.url)), []);

  const count = kept.length + pending.length;

  function add(list: FileList | File[] | null) {
    if (!list) return;
    const next = [...pending];
    let total = count;
    for (const file of Array.from(list)) {
      if (total >= PRODUCT_IMAGE_LIMIT) {
        toast.error(`A product can have up to ${PRODUCT_IMAGE_LIMIT} images.`);
        break;
      }
      if (!(PRODUCT_IMAGE_TYPES as readonly string[]).includes(file.type) || file.size > PRODUCT_IMAGE_MAX_BYTES) {
        toast.error(`${file.name}: use a PNG, JPG, or WEBP image up to 5 MB.`);
        continue;
      }
      next.push({ file, url: URL.createObjectURL(file) });
      total += 1;
    }
    setPending(next);
  }

  function removePending(url: string) {
    URL.revokeObjectURL(url);
    setPending(pending.filter((item) => item.url !== url));
  }

  function removeKept(id: string) {
    setKept(kept.filter((item) => item.id !== id));
    setRemoved([...removed, id]);
  }

  /** Applies removals and uploads after the listing is saved. Returns how many changes failed. */
  async function commit(productId: string) {
    let failed = 0;
    for (const id of removed) {
      try {
        await mutate(`/products/${productId}/images/${id}`, "DELETE");
      } catch (error) {
        failed += 1;
        toast.error(error instanceof Error ? error.message : "An image was not removed.");
      }
    }
    for (const item of pending) {
      const body = new FormData();
      body.append("file", item.file);
      const response = await fetch(`/api/v1/products/${productId}/images`, { method: "POST", credentials: "include", body }).catch(() => null);
      if (!response?.ok) {
        failed += 1;
        const data = (await response?.json().catch(() => ({}))) as { error?: { message?: string } } | undefined;
        toast.error(`${item.file.name}: ${data?.error?.message ?? "upload failed."}`);
      }
    }
    return failed;
  }

  return { kept, pending, count, add, removePending, removeKept, commit };
}

export function ProductImagesPanel({ images }: { images: ReturnType<typeof useProductImages> }) {
  const [dragging, setDragging] = React.useState(false);
  const full = images.count >= PRODUCT_IMAGE_LIMIT;
  return (
    <Panel className="space-y-3 p-4">
      <h2 className="font-bold">Product Images ({images.count}/{PRODUCT_IMAGE_LIMIT})</h2>
      <p className="text-xs text-slate-400">The first image is the cover on product cards. New images upload when you save.</p>
      <label
        className={`grid place-items-center rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-slate-400 transition focus-within:ring-2 focus-within:ring-[#00E5FF] ${full ? "cursor-not-allowed border-white/10 opacity-60" : "cursor-pointer border-[#a855f7]/60 hover:border-[#FF00C8]"} ${dragging ? "border-[#00E5FF] bg-[#00E5FF]/5" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => { event.preventDefault(); setDragging(false); if (!full) images.add(event.dataTransfer.files); }}
      >
        <input className="sr-only" type="file" accept={PRODUCT_IMAGE_TYPES.join(",")} multiple disabled={full} onChange={(event) => { images.add(event.target.files); event.target.value = ""; }} />
        <ImagePlus className="mb-2 h-6 w-6 text-[#FF4BD8]" aria-hidden />
        {full ? "Image limit reached" : "Drag & drop images here, or click to choose"}
        <span className="mt-1 block text-xs">PNG, JPG, WEBP · Max 5 MB each · Up to {PRODUCT_IMAGE_LIMIT} images</span>
      </label>
      {images.count > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {images.kept.map((image, index) => (
            <li key={image.id} className="relative">
              <img src={image.url} alt={`Product image ${index + 1}`} className="h-16 w-16 rounded-xl border border-white/10 object-cover" />
              <RemoveButton label={`Remove image ${index + 1}`} onClick={() => images.removeKept(image.id)} />
            </li>
          ))}
          {images.pending.map((item) => (
            <li key={item.url} className="relative">
              <img src={item.url} alt={item.file.name} className="h-16 w-16 rounded-xl border border-dashed border-[#00E5FF]/60 object-cover" />
              <RemoveButton label={`Remove ${item.file.name}`} onClick={() => images.removePending(item.url)} />
              <span className="mt-1 block text-center text-[10px] text-cyan-300">On save</span>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-white/20 bg-black/85 text-white hover:bg-[#EF4444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]">
      <X className="h-3 w-3" />
    </button>
  );
}
