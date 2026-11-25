"use client";
// Boarding / dropping points of a bus operator: a point is a place in a city (e.g. "Kashmere Gate, Delhi"). Routes are
// built from these. A point's city can't change; switch a point off instead of deleting it.
import { MapPin, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import type { BusStop } from "../../bus";
import { errorMessage } from "../../messages";
import { inputCls } from "../listing/ui";
import { Panel, Pill } from "../portal/ui";

type City = { id: string; name: string };

function NewStop({ cities, onSaved }: { cities: City[]; onSaved: () => void }) {
  const [form, setForm] = useState({ cityId: "", name: "", address: "", landmark: "" });
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await b2b<BusStop>("/bus/stops", { method: "POST", body: { cityId: form.cityId, name: form.name, address: form.address || null, landmark: form.landmark || null } });
      toast.success("Point added");
      setForm({ ...form, name: "", address: "", landmark: "" });
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr_1fr_auto] lg:items-end">
      <label className="text-[12px] font-medium text-slate-700">City
        <select required value={form.cityId} onChange={(e) => setForm({ ...form, cityId: e.target.value })} className={inputCls}>
          <option value="">— pick —</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="text-[12px] font-medium text-slate-700">Point name<input required minLength={2} maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kashmere Gate ISBT" className={inputCls} /></label>
      <label className="text-[12px] font-medium text-slate-700">Address (optional)<input maxLength={200} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} /></label>
      <label className="text-[12px] font-medium text-slate-700">Landmark (optional)<input maxLength={80} value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} className={inputCls} /></label>
      <button disabled={busy || !form.cityId || form.name.trim().length < 2} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#FE5300] px-3 py-2 text-[13px] font-medium text-white disabled:opacity-50"><Plus className="h-4 w-4" /> Add</button>
    </form>
  );
}

export function StopsPanel({ stops, cities, canManage, onChanged }: { stops: BusStop[]; cities: City[]; canManage: boolean; onChanged: () => void }) {
  const cityName = (id: string) => cities.find((c) => c.id === id)?.name ?? "—";
  async function toggle(s: BusStop) {
    try {
      await b2b(`/bus/stops/${s.id}`, { method: "PATCH", body: { active: !s.active, expectedVersion: s.version } });
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <div className="space-y-4">
      {canManage && (
        <Panel title="New point" subtitle="Where passengers get on or off — your office, a bus stand, a highway stop.">
          <NewStop cities={cities} onSaved={onChanged} />
        </Panel>
      )}
      {stops.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-[13px] text-slate-500">No points yet. Add the places your buses stop at.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {stops.map((s) => (
            <li key={s.id} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#FE5300]" />
              <div className="min-w-0 flex-1 text-[13px]">
                <p className="font-medium text-slate-900">{s.name} <span className="font-normal text-slate-500">· {cityName(s.cityId)}</span></p>
                {(s.address || s.landmark) && <p className="text-[12px] text-slate-500">{[s.address, s.landmark].filter(Boolean).join(" · ")}</p>}
              </div>
              {canManage ? (
                <button type="button" onClick={() => toggle(s)} className="shrink-0">
                  <Pill tone={s.active ? "green" : "violet"}>{s.active ? "On" : "Off"}</Pill>
                </button>
              ) : (
                <Pill tone={s.active ? "green" : "violet"}>{s.active ? "On" : "Off"}</Pill>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
