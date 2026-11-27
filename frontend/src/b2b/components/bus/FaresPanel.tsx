"use client";
// Fares of one route (Stage 18 B4): the operator's net fare per stop pair and seat type (optionally per deck — e.g.
// sleeper lower ₹900, upper ₹800), and date rules (weekend / festival: add or take off an amount, the last matching
// rule wins). MusafirBaba adds its margin and GST on top when selling. Saved whole; the log shows who changed what.
import { useQuery } from "@tanstack/react-query";
import { IndianRupee, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { B2BError, b2b } from "../../api";
import { FARE_PROBLEM, SEAT_LABEL, SEAT_TYPES, WEEKDAY_LABEL, type BusRoute, type DateRule, type Deck, type FareRow, type RouteFares, type SeatType } from "../../bus";
import { errorMessage } from "../../messages";
import { inputCls } from "../listing/ui";
import { Panel } from "../portal/ui";

const cell = "rounded border border-slate-300 bg-white px-2 py-1 text-[12px]";
const toPaise = (r: string) => Math.round(Number(r) * 100);

function problemsOf(err: unknown): string[] {
  if (!(err instanceof B2BError) || err.code !== "FARES_INVALID") return [];
  return [...new Set(((err.details as { problems?: { code: string }[] }).problems ?? []).map((p) => FARE_PROBLEM[p.code] ?? p.code))];
}

function RowEditor({ row, names, route, set, remove }: { row: FareRow; names: string[]; route: BusRoute; set: (r: FareRow) => void; remove: () => void }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-1 pr-2">
        <select value={row.fromIdx} onChange={(e) => set({ ...row, fromIdx: Number(e.target.value) })} className={cell}>
          {route.stops.map((s, i) => s.boarding && i < route.stops.length - 1 && <option key={s.stopId} value={i}>{names[i]}</option>)}
        </select>
      </td>
      <td className="py-1 pr-2">
        <select value={row.toIdx} onChange={(e) => set({ ...row, toIdx: Number(e.target.value) })} className={cell}>
          {route.stops.map((s, i) => s.dropping && i > row.fromIdx && <option key={s.stopId} value={i}>{names[i]}</option>)}
        </select>
      </td>
      <td className="py-1 pr-2">
        <select value={row.seatType} onChange={(e) => set({ ...row, seatType: e.target.value as SeatType })} className={cell}>
          {SEAT_TYPES.map((t) => <option key={t} value={t}>{SEAT_LABEL[t]}</option>)}
        </select>
      </td>
      <td className="py-1 pr-2">
        <select value={row.deck ?? ""} onChange={(e) => set({ ...row, deck: (e.target.value || null) as Deck | null })} className={cell}>
          <option value="">Any deck</option><option value="LOWER">Lower</option><option value="UPPER">Upper</option>
        </select>
      </td>
      <td className="py-1 pr-2"><input type="number" min={1} max={10000} step="1" value={row.netPaise / 100} onChange={(e) => set({ ...row, netPaise: toPaise(e.target.value) })} className={`${cell} w-24`} aria-label="Net fare in rupees" /></td>
      <td className="py-1"><button type="button" aria-label="Remove fare" onClick={remove} className="text-red-600"><X className="h-4 w-4" /></button></td>
    </tr>
  );
}

function RuleEditor({ rule, set, remove }: { rule: DateRule; set: (r: DateRule) => void; remove: () => void }) {
  const toggle = (d: number) => set({ ...rule, weekdays: rule.weekdays.includes(d) ? rule.weekdays.filter((x) => x !== d) : [...rule.weekdays, d].sort() });
  return (
    <div className="grid items-end gap-2 rounded-md border border-slate-200 p-2 sm:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto]">
      <label className="text-[11px] text-slate-600">Name<input maxLength={60} value={rule.label} onChange={(e) => set({ ...rule, label: e.target.value })} placeholder="e.g. Weekend" className={inputCls} /></label>
      <label className="text-[11px] text-slate-600">From<input type="date" value={rule.from} onChange={(e) => set({ ...rule, from: e.target.value })} className={inputCls} /></label>
      <label className="text-[11px] text-slate-600">To<input type="date" min={rule.from} value={rule.to} onChange={(e) => set({ ...rule, to: e.target.value })} className={inputCls} /></label>
      <label className="text-[11px] text-slate-600">Add ₹ (minus to lower)<input type="number" step="1" value={rule.addPaise / 100} onChange={(e) => set({ ...rule, addPaise: toPaise(e.target.value) })} className={inputCls} /></label>
      <button type="button" aria-label="Remove rule" onClick={remove} className="pb-2 text-red-600"><X className="h-4 w-4" /></button>
      <div className="flex flex-wrap items-center gap-1 sm:col-span-5">
        <span className="text-[11px] text-slate-500">Only on (none = every day):</span>
        {WEEKDAY_LABEL.map((l, d) => <button key={l} type="button" onClick={() => toggle(d)} className={`rounded-full px-2 py-0.5 text-[11px] ${rule.weekdays.includes(d) ? "bg-[#FE5300] text-white" : "border border-slate-300 text-slate-600"}`}>{l}</button>)}
      </div>
    </div>
  );
}

export function FaresPanel({ route, names, canManage, onClose }: { route: BusRoute; names: string[]; canManage: boolean; onClose: () => void }) {
  const fares = useQuery({ queryKey: ["b2b", "bus", "fares", route.id], queryFn: () => b2b<RouteFares>(`/bus/routes/${route.id}/fares`) });
  const [rows, setRows] = useState<FareRow[]>([]);
  const [rules, setRules] = useState<DateRule[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (fares.data) (setRows(fares.data.rows), setRules(fares.data.rules));
  }, [fares.data]);
  const last = route.stops.length - 1;
  const newRow = (): FareRow => ({ fromIdx: 0, toIdx: last, seatType: "SLEEPER", deck: null, netPaise: 50_000 });
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  async function save() {
    if (!fares.data) return;
    setBusy(true);
    setProblems([]);
    try {
      await b2b<RouteFares>(`/bus/routes/${route.id}/fares`, { method: "PUT", body: { rows, rules, expectedVersion: fares.data.version } });
      toast.success("Fares saved");
      await fares.refetch();
    } catch (err) {
      setProblems(problemsOf(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel icon={IndianRupee} title={`Fares — ${route.name}`} subtitle="Your net fare per seat. MusafirBaba adds its margin and GST when selling." action={<button type="button" onClick={onClose} className="text-[12px] text-slate-500">Close</button>}>
      {!fares.data ? (
        <p className="text-[13px] text-slate-500">Loading…</p>
      ) : (
        <fieldset disabled={!canManage || busy} className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[12px]">
              <thead className="text-slate-500"><tr><th className="pb-1 font-medium">From</th><th className="pb-1 font-medium">To</th><th className="pb-1 font-medium">Seat type</th><th className="pb-1 font-medium">Deck</th><th className="pb-1 font-medium">Net fare ₹</th><th /></tr></thead>
              <tbody>{rows.map((r, i) => <RowEditor key={i} row={r} names={names} route={route} set={(x) => setRows(rows.map((y, j) => (j === i ? x : y)))} remove={() => setRows(rows.filter((_, j) => j !== i))} />)}</tbody>
            </table>
            {rows.length === 0 && <p className="py-2 text-[12px] text-slate-500">No fares yet — seats aren&apos;t sold without one.</p>}
          </div>
          {canManage && <button type="button" onClick={() => setRows([...rows, newRow()])} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-[12px]"><Plus className="h-3.5 w-3.5" /> Add fare</button>}
          <div className="space-y-2">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Date rules (weekend, festivals)</p>
            {rules.map((r, i) => <RuleEditor key={r.id ?? `new-${i}`} rule={r} set={(x) => setRules(rules.map((y, j) => (j === i ? x : y)))} remove={() => setRules(rules.filter((_, j) => j !== i))} />)}
            {canManage && <button type="button" onClick={() => setRules([...rules, { label: "Weekend", from: today, to: today, weekdays: [5, 6, 0], addPaise: 10_000 }])} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-[12px]"><Plus className="h-3.5 w-3.5" /> Add date rule</button>}
          </div>
          {problems.length > 0 && <ul className="list-disc rounded-md border border-red-200 bg-red-50 py-2 pl-6 pr-3 text-[12px] text-red-700">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
          {canManage && <button type="button" onClick={save} className="rounded-md bg-[#FE5300] px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50">Save fares</button>}
          {fares.data.history.length > 0 && (
            <div className="text-[11px] text-slate-500">
              <p className="font-semibold uppercase tracking-wide">Changes</p>
              <ul>{fares.data.history.slice(0, 5).map((h) => <li key={h.at}>{new Date(h.at).toLocaleString("en-IN")} — {h.summary}</li>)}</ul>
            </div>
          )}
        </fieldset>
      )}
    </Panel>
  );
}
