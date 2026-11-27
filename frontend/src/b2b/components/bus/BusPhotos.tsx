"use client";
// Photos of a bus (Stage 18 B8): outside, inside, seats. The browser makes the sizes (at least 1200 px wide), the server
// checks and stores them in the public folder; travellers see the first photo in search.
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { b2b, b2bForm } from "../../api";
import type { Bus } from "../../bus";
import { errorMessage } from "../../messages";
import { preparePhoto } from "../../photo-resize";

const CATEGORIES = { OUTSIDE: "Outside", INSIDE: "Inside", SEATS: "Seats", OTHER: "Other" } as const;

export function BusPhotos({ bus, canManage, onChanged }: { bus: Bus; canManage: boolean; onChanged: () => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<keyof typeof CATEGORIES>("OUTSIDE");
  const [busy, setBusy] = useState(false);
  const photos = bus.photos ?? [];
  async function upload(file: File) {
    setBusy(true);
    try {
      const prepared = await preparePhoto(file);
      const ext = prepared.type === "image/webp" ? "webp" : "jpg";
      const form = new FormData();
      for (const [name, blob] of Object.entries(prepared.files)) form.append(name, blob, `${name}.${ext}`);
      form.append("placeholder", prepared.placeholder);
      form.append("category", category);
      await b2bForm(`/bus/vehicles/${bus.id}/photos`, form);
      toast.success("Photo added");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error && !("code" in err) ? err.message : errorMessage(err));
    } finally {
      setBusy(false);
      if (picker.current) picker.current.value = "";
    }
  }
  async function remove(id: string) {
    try {
      await b2b(`/bus/vehicles/${bus.id}/photos/${id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {photos.map((p) => (
          <figure key={p.id} className="relative overflow-hidden rounded-md border border-slate-200">
            {p.urls.card && <Image src={p.urls.card} alt={p.caption ?? CATEGORIES[p.category as keyof typeof CATEGORIES] ?? "Bus photo"} width={320} height={200} unoptimized className="h-28 w-full object-cover" />}
            <figcaption className="px-2 py-1 text-[11px] text-slate-600">{CATEGORIES[p.category as keyof typeof CATEGORIES] ?? p.category}</figcaption>
            {canManage && <button type="button" aria-label="Remove photo" onClick={() => remove(p.id)} className="absolute right-1 top-1 rounded bg-white/90 p-1 text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}
          </figure>
        ))}
        {photos.length === 0 && <p className="col-span-full text-[13px] text-slate-500">No photos yet — travellers like to see the bus.</p>}
      </div>
      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value as keyof typeof CATEGORIES)} className="rounded-md border border-slate-300 px-2 py-1.5 text-[13px]">{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button type="button" disabled={busy || photos.length >= 20} onClick={() => picker.current?.click()} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-[13px] disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Add photo</button>
          <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <span className="text-[11px] text-slate-500">At least 1200 px wide · up to 20 photos</span>
        </div>
      )}
    </div>
  );
}
