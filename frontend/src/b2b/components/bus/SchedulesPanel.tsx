"use client";
// Schedules: which approved bus runs an approved route on which days, from when until when. Trips for the next
// 90 days appear on their own (every few hours). A schedule isn't edited — end it from a day and add a new one;
// unsold trips from that day are cancelled, sold ones stay for MusafirBaba to handle.
import { CalendarClock, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { WEEKDAY_LABEL, type Bus, type BusRoute, type BusSchedule } from "../../bus";
import { errorMessage } from "../../messages";
import { inputCls } from "../listing/ui";
import { Panel, Pill } from "../portal/ui";

const todayIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

function NewSchedule({ routes, buses, onSaved }: { routes: BusRoute[]; buses: Bus[]; onSaved: () => void }) {
  const [form, setForm] = useState({ routeId: "", vehicleId: "", weekdays: [0, 1, 2, 3, 4, 5, 6], validFrom: todayIst(), validTo: "" });
  const [busy, setBusy] = useState(false);
  const toggle = (d: number) => setForm({ ...form, weekdays: form.weekdays.includes(d) ? form.weekdays.filter((x) => x !== d) : [...form.weekdays, d].sort() });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await b2b("/bus/schedules", { method: "POST", body: { ...form, validTo: form.validTo || null } });
      toast.success("Schedule added — trips appear within a few hours");
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <label className="text-[12px] font-medium text-slate-700">Route (approved)
        <select required value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })} className={inputCls}>
          <option value="">— pick —</option>
          {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </label>
      <label className="text-[12px] font-medium text-slate-700">Bus (approved)
        <select required value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })} className={inputCls}>
          <option value="">— pick —</option>
          {buses.map((b) => <option key={b.id} value={b.id}>{b.regNo}{b.name ? ` · ${b.name}` : ""}</option>)}
        </select>
      </label>
      <label className="text-[12px] font-medium text-slate-700">First day<input required type="date" min={todayIst()} value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className={inputCls} /></label>
      <label className="text-[12px] font-medium text-slate-700">Last day (optional)<input type="date" min={form.validFrom} value={form.validTo} onChange={(e) => setForm({ ...form, validTo: e.target.value })} className={inputCls} /></label>
      <div className="sm:col-span-2 lg:col-span-3">
        <p className="text-[12px] font-medium text-slate-700">Runs on</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {WEEKDAY_LABEL.map((l, d) => (
            <button key={l} type="button" onClick={() => toggle(d)} className={`rounded-full px-3 py-1 text-[12px] ${form.weekdays.includes(d) ? "bg-[#FE5300] text-white" : "border border-slate-300 text-slate-700"}`}>{l}</button>
          ))}
        </div>
      </div>
      <button disabled={busy || !form.routeId || !form.vehicleId || !form.weekdays.length} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#FE5300] px-3 py-2 text-[13px] font-medium text-white disabled:opacity-50"><Plus className="h-4 w-4" /> Add schedule</button>
    </form>
  );
}

export function SchedulesPanel({ schedules, routes, buses, canManage, onChanged }: { schedules: BusSchedule[]; routes: BusRoute[]; buses: Bus[]; canManage: boolean; onChanged: () => void }) {
  const approvedRoutes = routes.filter((r) => r.status === "APPROVED");
  const approvedBuses = buses.filter((b) => b.status === "APPROVED" && b.layoutId);
  async function end(s: BusSchedule) {
    const from = window.prompt("End from which day? (YYYY-MM-DD) — no trips from that day; unsold ones are cancelled.", todayIst());
    if (!from) return;
    try {
      const r = await b2b<{ tripsCancelled: number }>(`/bus/schedules/${s.id}/end`, { method: "POST", body: { from, expectedVersion: s.version } });
      toast.success(`Schedule ended · ${r.tripsCancelled} unsold trip${r.tripsCancelled === 1 ? "" : "s"} cancelled`);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <div className="space-y-4">
      {canManage && (
        <Panel icon={CalendarClock} title="New schedule" subtitle="Trips for the next 90 days are made from it automatically.">
          {approvedRoutes.length && approvedBuses.length ? <NewSchedule routes={approvedRoutes} buses={approvedBuses} onSaved={onChanged} /> : <p className="text-[13px] text-slate-500">You need an approved route and an approved bus first.</p>}
        </Panel>
      )}
      {schedules.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-[13px] text-slate-500">No schedules yet.</p>
      ) : (
        <ul className="space-y-2">
          {schedules.map((s) => {
            const route = routes.find((r) => r.id === s.routeId);
            const bus = buses.find((b) => b.id === s.vehicleId);
            return (
              <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-[13px]">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-slate-900">{route?.name ?? "Route"} · <span className="font-mono">{bus?.regNo ?? "bus"}</span></span>
                  <span className="block text-[12px] text-slate-500">{s.weekdays.length === 7 ? "Every day" : s.weekdays.map((d) => WEEKDAY_LABEL[d]).join(", ")} · from {s.validFrom}{s.validTo ? ` to ${s.validTo}` : ""}{s.endedFrom ? ` · ended from ${s.endedFrom}` : ""}</span>
                </span>
                <Pill tone={s.status === "ACTIVE" ? "green" : "violet"}>{s.status === "ACTIVE" ? "Running" : "Ended"}</Pill>
                {canManage && s.status === "ACTIVE" && <button type="button" onClick={() => end(s)} className="rounded-md border border-red-200 px-2.5 py-1 text-[12px] text-red-600">End</button>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
