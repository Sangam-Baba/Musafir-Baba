"use client";
// Routes of a bus operator: ordered stops (from its points) with a time each — "next day" for after midnight — and
// whether passengers may board and / or get off there. Stops change only while a draft or after "needs changes";
// once sent or approved, copy the route to change it.
import { ArrowDown, ArrowUp, Copy, Plus, Route as RouteIcon, Send, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { B2BError, b2b } from "../../api";
import { BUS_STATUS, MAX_STOPS, ROUTE_PROBLEM, stopTime, type BusRoute, type BusStop, type RouteStop } from "../../bus";
import { errorMessage } from "../../messages";
import { inputCls } from "../listing/ui";
import { Panel, Pill } from "../portal/ui";

const blank = (): RouteStop => ({ stopId: "", dayOffset: 0, time: "", boarding: true, dropping: true });
const EDITABLE = ["DRAFT", "CHANGES_REQUESTED"];

function problemsOf(err: unknown): string[] {
  if (!(err instanceof B2BError) || err.code !== "ROUTE_INVALID") return [];
  const list = ((err.details as { problems?: { path: string; code: string }[] }).problems ?? []).map((p) => {
    const at = /^stops\.(\d+)/.exec(p.path);
    return `${at ? `Stop ${Number(at[1]) + 1}: ` : ""}${ROUTE_PROBLEM[p.code] ?? p.code}`;
  });
  return [...new Set(list)];
}

function StopRow({ row, i, count, points, set, move, remove }: { row: RouteStop; i: number; count: number; points: BusStop[]; set: (r: RouteStop) => void; move: (by: number) => void; remove: () => void }) {
  return (
    <div className="grid items-end gap-2 rounded-md border border-slate-200 bg-slate-50/60 p-2 sm:grid-cols-[2rem_1.6fr_1fr_1fr_auto_auto]">
      <span className="pb-2 text-center text-[12px] font-semibold text-slate-500">{i + 1}</span>
      <label className="text-[11px] text-slate-600">Point
        <select required value={row.stopId} onChange={(e) => set({ ...row, stopId: e.target.value })} className={inputCls}>
          <option value="">— pick —</option>
          {points.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="text-[11px] text-slate-600">Time<input required type="time" value={row.time} onChange={(e) => set({ ...row, time: e.target.value })} className={inputCls} /></label>
      <label className="text-[11px] text-slate-600">Day
        <select value={row.dayOffset} onChange={(e) => set({ ...row, dayOffset: Number(e.target.value) })} className={inputCls}>
          <option value={0}>Departure day</option><option value={1}>Next day</option><option value={2}>+2 days</option><option value={3}>+3 days</option>
        </select>
      </label>
      <div className="flex gap-3 pb-2 text-[12px] text-slate-700">
        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={row.boarding} onChange={(e) => set({ ...row, boarding: e.target.checked })} /> Board</label>
        <label className="inline-flex items-center gap-1"><input type="checkbox" checked={row.dropping} onChange={(e) => set({ ...row, dropping: e.target.checked })} /> Get off</label>
      </div>
      <div className="flex gap-1 pb-1.5">
        <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(-1)} className="rounded border border-slate-300 p-1 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
        <button type="button" aria-label="Move down" disabled={i === count - 1} onClick={() => move(1)} className="rounded border border-slate-300 p-1 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
        <button type="button" aria-label="Remove stop" disabled={count <= 2} onClick={remove} className="rounded border border-slate-300 p-1 text-red-600 disabled:opacity-30"><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

export function RouteEditor({ route, points, onSaved, onCancel }: { route: BusRoute | null; points: BusStop[]; onSaved: (r: BusRoute) => void; onCancel: () => void }) {
  const [name, setName] = useState(route?.name ?? "");
  const [rows, setRows] = useState<RouteStop[]>(route?.stops.map((s) => ({ stopId: s.stopId, dayOffset: s.dayOffset, time: s.time, boarding: s.boarding, dropping: s.dropping })) ?? [blank(), blank()]);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const active = points.filter((p) => p.active);
  const setRow = (i: number, r: RouteStop) => setRows(rows.map((x, j) => (j === i ? r : x)));
  const move = (i: number, by: number) => {
    const next = [...rows];
    const [r] = next.splice(i, 1);
    next.splice(i + by, 0, r as RouteStop);
    setRows(next);
  };
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setProblems([]);
    try {
      const body = { name, stops: rows };
      onSaved(route ? await b2b<BusRoute>(`/bus/routes/${route.id}`, { method: "PATCH", body: { ...body, expectedVersion: route.version } }) : await b2b<BusRoute>("/bus/routes", { method: "POST", body }));
      toast.success("Route saved");
    } catch (err) {
      setProblems(problemsOf(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel icon={RouteIcon} title={route ? `Edit — ${route.name}` : "New route"} subtitle="Stops in order, with the time the bus reaches each one." action={<button type="button" onClick={onCancel} className="text-[12px] text-slate-500">Close</button>}>
      <form onSubmit={save} className="space-y-3">
        <label className="block max-w-md text-[12px] font-medium text-slate-700">Route name<input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Delhi → Jaipur (night)" className={inputCls} /></label>
        <div className="space-y-2">
          {rows.map((r, i) => <StopRow key={i} row={r} i={i} count={rows.length} points={active} set={(x) => setRow(i, x)} move={(by) => move(i, by)} remove={() => setRows(rows.filter((_, j) => j !== i))} />)}
        </div>
        <button type="button" disabled={rows.length >= MAX_STOPS} onClick={() => setRows([...rows, blank()])} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[12px] disabled:opacity-40"><Plus className="h-3.5 w-3.5" /> Add stop</button>
        {problems.length > 0 && <ul className="list-disc rounded-md border border-red-200 bg-red-50 py-2 pl-6 pr-3 text-[12px] text-red-700">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        <div><button disabled={busy} className="rounded-md bg-[#FE5300] px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50">Save route</button></div>
      </form>
    </Panel>
  );
}

function RouteCard({ route, pointName, canManage, onEdit, onChanged }: { route: BusRoute; pointName: (id: string) => string; canManage: boolean; onEdit: () => void; onChanged: () => void }) {
  const s = BUS_STATUS[route.status];
  const [busy, setBusy] = useState(false);
  async function run(path: string, body: Record<string, unknown>, done: string) {
    setBusy(true);
    try {
      await b2b(`/bus/routes/${route.id}/${path}`, { method: "POST", body });
      toast.success(done);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  const editable = EDITABLE.includes(route.status);
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-[14px] font-semibold text-slate-900">{route.name}</p>
        <Pill tone={s.tone}>{s.label}</Pill>
      </div>
      <ol className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-slate-600">
        {route.stops.map((st, i) => (
          <li key={st.stopId} className="inline-flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300">→</span>}
            <span><b className="font-medium text-slate-800">{pointName(st.stopId)}</b> {stopTime(st)}</span>
          </li>
        ))}
      </ol>
      {route.review?.note && <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[12px] text-amber-800"><b>Note from MusafirBaba:</b> {route.review.note}</p>}
      {canManage && route.status !== "RETIRED" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {editable && <button type="button" onClick={onEdit} className="rounded-md border border-slate-300 px-2.5 py-1 text-[12px]">Edit</button>}
          {editable && <button type="button" disabled={busy} onClick={() => run("submit", { expectedVersion: route.version }, "Sent to MusafirBaba")} className="inline-flex items-center gap-1 rounded-md bg-[#FE5300] px-2.5 py-1 text-[12px] font-medium text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" /> Send for approval</button>}
          <button type="button" disabled={busy} onClick={() => run("copy", { name: `${route.name} (copy)`.slice(0, 120) }, "Copy made")} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-[12px]"><Copy className="h-3.5 w-3.5" /> Copy</button>
          <button type="button" disabled={busy} onClick={() => window.confirm("Retire this route? It can't be used again.") && run("retire", { expectedVersion: route.version }, "Route retired")} className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-[12px] text-red-600"><Trash2 className="h-3.5 w-3.5" /> Retire</button>
        </div>
      )}
    </li>
  );
}

export function RoutesPanel({ routes, points, canManage, onChanged }: { routes: BusRoute[]; points: BusStop[]; canManage: boolean; onChanged: () => void }) {
  const [editing, setEditing] = useState<BusRoute | "new" | null>(null);
  useEffect(() => {
    if (editing && editing !== "new" && !routes.some((r) => r.id === editing.id)) setEditing(null);
  }, [routes, editing]);
  const pointName = (id: string) => points.find((p) => p.id === id)?.name ?? "—";
  return (
    <div className="space-y-4">
      {canManage && !editing && (
        <button type="button" disabled={points.length < 2} onClick={() => setEditing("new")} className="inline-flex items-center gap-1.5 rounded-md bg-[#FE5300] px-3 py-2 text-[13px] font-medium text-white disabled:opacity-50"><Plus className="h-4 w-4" /> New route</button>
      )}
      {canManage && points.length < 2 && <p className="text-[12px] text-slate-500">Add at least two points first.</p>}
      {editing && <RouteEditor route={editing === "new" ? null : editing} points={points} onCancel={() => setEditing(null)} onSaved={() => (setEditing(null), onChanged())} />}
      {routes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-[13px] text-slate-500">No routes yet.</p>
      ) : (
        <ul className="space-y-2">{routes.map((r) => <RouteCard key={r.id} route={r} pointName={pointName} canManage={canManage} onEdit={() => setEditing(r)} onChanged={onChanged} />)}</ul>
      )}
    </div>
  );
}
