"use client";
// Photos of the property and of each room type. The browser makes the sizes (photo-resize.ts); the server checks them.
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { b2b, b2bForm } from "../../api";
import { PHOTO_CATEGORIES, type Photo, type Property, type RoomType } from "../../listing";
import { errorMessage } from "../../messages";
import { PhotoTooSmallError, preparePhoto } from "../../photo-resize";

function Group({ title, need, photos, roomTypeId, property, editable, onChanged }: { title: string; need: number; photos: Photo[]; roomTypeId: string | null; property: Property; editable: boolean; onChanged: () => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function upload(files: FileList) {
    for (const [i, file] of Array.from(files).entries()) {
      setBusy(`Preparing ${i + 1} of ${files.length}…`);
      try {
        const prepared = await preparePhoto(file);
        const form = new FormData();
        const ext = prepared.type === "image/webp" ? "webp" : "jpg";
        for (const [name, blob] of Object.entries(prepared.files)) form.append(name, blob, `${name}.${ext}`);
        form.append("placeholder", prepared.placeholder);
        form.append("category", roomTypeId ? "ROOM" : "EXTERIOR");
        if (roomTypeId) form.append("roomTypeId", roomTypeId);
        setBusy(`Uploading ${i + 1} of ${files.length}…`);
        await b2bForm(`/hotel/properties/${property.id}/photos`, form);
      } catch (err) {
        toast.error(err instanceof PhotoTooSmallError ? `${file.name}: ${err.message}` : `${file.name}: ${errorMessage(err)}`);
      }
    }
    setBusy(null);
    if (picker.current) picker.current.value = "";
    onChanged();
  }

  async function patch(photo: Photo, body: Record<string, unknown>) {
    try {
      await b2b(`/hotel/properties/${property.id}/photos/${photo.id}`, { method: "PATCH", body });
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function remove(photo: Photo) {
    try {
      await b2b(`/hotel/properties/${property.id}/photos/${photo.id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs ${photos.length >= need ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-800"}`}>
          {photos.length} / at least {need}
        </span>
        <span className="flex-1" />
        {editable && (
          <>
            <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => e.target.files?.length && upload(e.target.files)} />
            <button disabled={Boolean(busy)} onClick={() => picker.current?.click()} className="rounded-md bg-[#FE5300] px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-60">
              {busy ?? "Add photos"}
            </button>
          </>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.map((p) => (
          <figure key={p.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <Image
              unoptimized // already sized in the browser and served from the CDN
              src={(p.sizes.card ?? p.sizes.thumb)?.url ?? ""}
              width={(p.sizes.card ?? p.sizes.thumb)?.width ?? 640}
              height={(p.sizes.card ?? p.sizes.thumb)?.height ?? 480}
              alt={p.caption ?? title}
              className="aspect-[4/3] w-full object-cover"
              style={{ backgroundImage: `url(${p.placeholder})`, backgroundSize: "cover" }}
            />
            <figcaption className="space-y-1 p-2 text-xs">
              {editable ? (
                <>
                  <input className="w-full rounded border border-slate-200 px-1.5 py-1" placeholder="Caption" defaultValue={p.caption ?? ""} onBlur={(e) => e.target.value !== (p.caption ?? "") && patch(p, { caption: e.target.value.trim() || null })} maxLength={140} />
                  <div className="flex items-center gap-1">
                    <select className="flex-1 rounded border border-slate-200 px-1 py-1" value={p.category} onChange={(e) => patch(p, { category: e.target.value })}>
                      {PHOTO_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c.charAt(0) + c.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                    {!roomTypeId && (
                      <button title="Make cover" onClick={() => patch(p, { isCover: true })} className={`rounded px-1.5 py-1 ${p.isCover ? "bg-amber-100 text-amber-700" : "border border-slate-200"}`}>
                        ★
                      </button>
                    )}
                    <button title="Remove" onClick={() => remove(p)} className="rounded border border-red-200 px-1.5 py-1 text-red-600">
                      ✕
                    </button>
                  </div>
                </>
              ) : (
                <span>{p.caption ?? p.category.toLowerCase()}</span>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function PhotosPanel({ property, rooms, editable, onChanged }: { property: Property; rooms: RoomType[]; editable: boolean; onChanged: () => void }) {
  const of = (roomTypeId: string | null) => property.photos.filter((p) => p.roomTypeId === roomTypeId);
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">Photos at least 1200 px wide. They are resized in your browser and all location / camera details are removed before upload.</p>
      <Group title="Property photos" need={5} photos={of(null)} roomTypeId={null} property={property} editable={editable} onChanged={onChanged} />
      {rooms.map((r) => (
        <Group key={r.id} title={r.name} need={2} photos={of(r.id)} roomTypeId={r.id} property={property} editable={editable} onChanged={onChanged} />
      ))}
    </div>
  );
}
