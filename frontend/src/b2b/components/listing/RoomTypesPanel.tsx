"use client";
// Room types: list, add, edit (with the version it loaded), remove. Beds and room amenities come from the master lists.
import { useState } from "react";
import { toast } from "sonner";

import { B2BError, b2b } from "../../api";
import type { Masters, RoomType } from "../../listing";
import { errorMessage } from "../../messages";
import { Check, inputCls, Labelled } from "./ui";

const EMPTY = { name: "", description: "", sizeSqm: null as number | null, beds: [{ bedTypeKey: "double", count: 1 }], maxAdults: 2, maxChildren: 1, maxOccupancy: 3, extraBeds: { allowed: false, max: 0 }, amenities: [] as string[] };
type Draft = typeof EMPTY;

function RoomForm({ initial, masters, onSubmit, onCancel, busy }: { initial: Draft; masters: Masters; onSubmit: (d: Draft) => void; onCancel: () => void; busy: boolean }) {
  const [d, setD] = useState<Draft>(initial);
  const amenities = masters.amenities.filter((a) => a.level !== "PROPERTY");
  return (
    <form onSubmit={(e) => (e.preventDefault(), onSubmit(d))} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
      <Labelled label="Name" wide>
        <input className={inputCls} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} required minLength={2} maxLength={80} />
      </Labelled>
      <Labelled label="Size (m², optional)">
        <input type="number" min={5} max={2000} className={inputCls} value={d.sizeSqm ?? ""} onChange={(e) => setD({ ...d, sizeSqm: e.target.value ? Number(e.target.value) : null })} />
      </Labelled>
      <Labelled label="Description" wide>
        <textarea className={`${inputCls} min-h-16`} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} maxLength={3000} />
      </Labelled>
      <Labelled label="Bed">
        <div className="mt-1 flex gap-2">
          <select className={inputCls} value={d.beds[0]?.bedTypeKey} onChange={(e) => setD({ ...d, beds: [{ bedTypeKey: e.target.value, count: d.beds[0]?.count ?? 1 }] })}>
            {masters.bedTypes.map((b) => (
              <option key={b.key} value={b.key}>
                {b.name}
              </option>
            ))}
          </select>
          <input type="number" min={1} max={10} className={`${inputCls} w-20`} value={d.beds[0]?.count ?? 1} onChange={(e) => setD({ ...d, beds: [{ bedTypeKey: d.beds[0]?.bedTypeKey ?? "double", count: Number(e.target.value) }] })} />
        </div>
      </Labelled>
      <Labelled label="Max adults">
        <input type="number" min={1} max={20} className={inputCls} value={d.maxAdults} onChange={(e) => setD({ ...d, maxAdults: Number(e.target.value) })} />
      </Labelled>
      <Labelled label="Max children">
        <input type="number" min={0} max={10} className={inputCls} value={d.maxChildren} onChange={(e) => setD({ ...d, maxChildren: Number(e.target.value) })} />
      </Labelled>
      <Labelled label="Max guests in total">
        <input type="number" min={1} max={30} className={inputCls} value={d.maxOccupancy} onChange={(e) => setD({ ...d, maxOccupancy: Number(e.target.value) })} />
      </Labelled>
      <div className="flex items-end gap-3">
        <Check label="Extra beds" checked={d.extraBeds.allowed} onChange={(x) => setD({ ...d, extraBeds: { allowed: x, max: x ? Math.max(1, d.extraBeds.max) : 0 } })} />
        {d.extraBeds.allowed && <input type="number" min={1} max={5} className={`${inputCls} w-20`} value={d.extraBeds.max} onChange={(e) => setD({ ...d, extraBeds: { allowed: true, max: Number(e.target.value) } })} />}
      </div>
      <fieldset className="sm:col-span-3">
        <legend className="text-xs font-medium text-slate-600">Room amenities</legend>
        <div className="mt-1 grid gap-2 sm:grid-cols-4">
          {amenities.map((a) => (
            <Check key={a.key} label={a.name} checked={d.amenities.includes(a.key)} onChange={(x) => setD({ ...d, amenities: x ? [...d.amenities, a.key] : d.amenities.filter((k) => k !== a.key) })} />
          ))}
        </div>
      </fieldset>
      <div className="flex gap-2 sm:col-span-3">
        <button type="submit" disabled={busy} className="rounded-md bg-[#FE5300] px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50">
          {busy ? "Saving…" : "Save room type"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px]">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function RoomTypesPanel({ propertyId, rooms, masters, editable, onChanged }: { propertyId: string; rooms: RoomType[]; masters: Masters; editable: boolean; onChanged: () => void }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const bedName = (k: string) => masters.bedTypes.find((b) => b.key === k)?.name ?? k;

  async function submit(d: Draft, room?: RoomType) {
    setBusy(true);
    try {
      const url = `/hotel/properties/${propertyId}/room-types${room ? `/${room.id}` : ""}`;
      await b2b(url, { method: room ? "PUT" : "POST", body: d, headers: room ? { "If-Match": `"${room.version}"` } : {} });
      toast.success("Room type saved");
      setEditing(null);
      onChanged();
    } catch (err) {
      const details = err instanceof B2BError ? (err.details.errors as { code: string }[] | undefined) : undefined;
      toast.error(details?.length ? `Please check: ${details.map((e) => e.code.toLowerCase().replace(/_/g, " ")).join(", ")}` : errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(room: RoomType) {
    if (!window.confirm(`Remove “${room.name}”?`)) return;
    try {
      await b2b(`/hotel/properties/${propertyId}/room-types/${room.id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="space-y-3">
      {rooms.length === 0 && editing !== "new" && <p className="text-[13px] text-slate-500">No room types yet — add at least one.</p>}
      {rooms.map((r) =>
        editing === r.id ? (
          <RoomForm key={r.id} initial={{ ...r }} masters={masters} busy={busy} onSubmit={(d) => submit(d, r)} onCancel={() => setEditing(null)} />
        ) : (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
            <div className="flex-1">
              <p className="font-medium text-slate-900">{r.name}</p>
              <p className="text-xs text-slate-500">
                {r.beds.map((b) => `${b.count} × ${bedName(b.bedTypeKey)}`).join(", ")} · up to {r.maxOccupancy} guests{r.sizeSqm ? ` · ${r.sizeSqm} m²` : ""}
              </p>
            </div>
            {editable && (
              <>
                <button onClick={() => setEditing(r.id)} className="rounded-md border border-slate-200 px-3 py-1.5 text-[13px]">
                  Edit
                </button>
                <button onClick={() => remove(r)} className="rounded-md border border-red-200 px-3 py-1.5 text-[13px] text-red-600">
                  Remove
                </button>
              </>
            )}
          </div>
        ),
      )}
      {editing === "new" ? (
        <RoomForm initial={EMPTY} masters={masters} busy={busy} onSubmit={(d) => submit(d)} onCancel={() => setEditing(null)} />
      ) : (
        editable && (
          <button onClick={() => setEditing("new")} className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-[13px] text-slate-700 hover:border-[#FE5300]">
            + Add room type
          </button>
        )
      )}
    </div>
  );
}
