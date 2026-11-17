"use client";
// Changing many nights at once: a range + weekdays, then rooms / stop-sell for a room type or prices / rules for a plan.
// Always previewed first (what changes, nights kept because guests are booked, prices moving > 50 % to confirm);
// after applying, the change can be undone. Uses PUT /hotel/properties/:id/calendar and …/calendar/undo.
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { newRequestId, problemList, rupees, type Calendar, type EditResult } from "../../inventory";
import { errorMessage } from "../../messages";
import { inputCls, Labelled } from "../listing/ui";
import { fieldCls } from "./ui";
import type { Target } from "./CalendarGrid";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type Tri = "" | "yes" | "no";
const tri = (v: Tri) => (v === "" ? undefined : v === "yes");

export type EditorState = { target: Target | null; from: string; to: string };

function TriSelect({ label, value, onChange }: { label: string; value: Tri; onChange: (v: Tri) => void }) {
  return (
    <Labelled label={label}>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value as Tri)}>
        <option value="">No change</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </Labelled>
  );
}

export function BulkEditor({ cal, propertyId, state, onState, onChanged }: { cal: Calendar; propertyId: string; state: EditorState; onState: (s: EditorState) => void; onChanged: () => void }) {
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [rooms, setRooms] = useState({ total: "", stopSell: "" as Tri });
  const [rate, setRate] = useState({ prices: {} as Record<number, string>, minLos: "", maxLos: "", cta: "" as Tri, ctd: "" as Tri, stopSell: "" as Tri });
  const [preview, setPreview] = useState<EditResult | null>(null);
  const [confirmBig, setConfirmBig] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  const targets = cal.roomTypes.flatMap((rt) => [
    { value: `rooms|${rt.id}`, label: `${rt.name} — rooms`, target: { kind: "rooms", roomTypeId: rt.id } as Target },
    ...rt.ratePlans.map((p) => ({ value: `rate|${rt.id}|${p.id}`, label: `${rt.name} — ${p.name}`, target: { kind: "rate", roomTypeId: rt.id, ratePlanId: p.id } as Target })),
  ]);
  const t = state.target;
  const tValue = !t ? "" : t.kind === "rooms" ? `rooms|${t.roomTypeId}` : `rate|${t.roomTypeId}|${t.ratePlanId}`;
  const rt = cal.roomTypes.find((r) => r.id === t?.roomTypeId);
  const plan = t?.kind === "rate" ? rt?.ratePlans.find((p) => p.id === t.ratePlanId) : undefined;

  function body(dry: boolean) {
    const base = { requestId: newRequestId(), from: state.from, to: state.to, weekdays: weekdays.length ? weekdays : null, preview: dry, confirmBigChange: confirmBig };
    if (!t) return null;
    if (t.kind === "rooms") return { ...base, rooms: [{ roomTypeId: t.roomTypeId, ...(rooms.total !== "" ? { total: Number(rooms.total) } : {}), ...(rooms.stopSell ? { stopSell: tri(rooms.stopSell) } : {}) }], rates: [] };
    const prices = Object.entries(rate.prices).filter(([, v]) => v !== "").map(([g, v]) => ({ guests: Number(g), amount: Math.round(Number(v) * 100) }));
    const change = {
      ratePlanId: t.ratePlanId,
      roomTypeId: t.roomTypeId,
      ...(prices.length ? { prices } : {}),
      ...(rate.minLos !== "" ? { minLos: rate.minLos === "0" ? null : Number(rate.minLos) } : {}),
      ...(rate.maxLos !== "" ? { maxLos: rate.maxLos === "0" ? null : Number(rate.maxLos) } : {}),
      ...(rate.cta ? { closedToArrival: tri(rate.cta) } : {}),
      ...(rate.ctd ? { closedToDeparture: tri(rate.ctd) } : {}),
      ...(rate.stopSell ? { stopSell: tri(rate.stopSell) } : {}),
    };
    return { ...base, rooms: [], rates: [change] };
  }

  async function send(dry: boolean) {
    const b = body(dry);
    if (!b) return;
    setBusy(true);
    setProblems([]);
    try {
      const r = await b2b<EditResult>(`/hotel/properties/${propertyId}/calendar`, { method: "PUT", body: b });
      if (dry) setPreview(r);
      else {
        toast.success(r.refused.length ? `Saved — ${r.refused.length} night(s) kept their rooms (guests booked)` : `Saved ${r.nights} night(s)`);
        setLast(r.changeId ?? null);
        setPreview(null);
        setConfirmBig(false);
        onChanged();
      }
    } catch (err) {
      setProblems(problemList(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!last) return;
    try {
      const r = await b2b<{ refused: unknown[] }>(`/hotel/properties/${propertyId}/calendar/undo`, { method: "POST", body: { changeId: last } });
      toast.success(r.refused.length ? "Undone — some nights kept their rooms (booked meanwhile)" : "Change undone");
      setLast(null);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  const reset = () => setPreview(null);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Labelled label="What to change">
          <select className={inputCls} value={tValue} onChange={(e) => (onState({ ...state, target: targets.find((x) => x.value === e.target.value)?.target ?? null }), reset())}>
            <option value="">Choose…</option>
            {targets.map((x) => (
              <option key={x.value} value={x.value}>{x.label}</option>
            ))}
          </select>
        </Labelled>
        <Labelled label="From">
          <input type="date" className={inputCls} value={state.from} min={cal.today} onChange={(e) => (onState({ ...state, from: e.target.value }), reset())} />
        </Labelled>
        <Labelled label="Until (not included)">
          <input type="date" className={inputCls} value={state.to} min={state.from} onChange={(e) => (onState({ ...state, to: e.target.value }), reset())} />
        </Labelled>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-slate-600">Only on:</span>
        {WEEKDAYS.map((w, i) => (
          <button key={w} type="button" onClick={() => (setWeekdays(weekdays.includes(i) ? weekdays.filter((x) => x !== i) : [...weekdays, i]), reset())} className={`rounded-full border px-2.5 py-0.5 ${weekdays.includes(i) ? "border-[#FE5300] bg-orange-50 text-[#FE5300]" : "border-slate-200 text-slate-600"}`}>
            {w}
          </button>
        ))}
        <span className="text-slate-400">{weekdays.length ? "" : "(every day)"}</span>
      </div>
      {t?.kind === "rooms" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Labelled label="Rooms for MusafirBaba" hint="Never below what is booked">
            <input type="number" min={0} max={999} className={inputCls} value={rooms.total} onChange={(e) => (setRooms({ ...rooms, total: e.target.value }), reset())} placeholder="no change" />
          </Labelled>
          <TriSelect label="Stop selling" value={rooms.stopSell} onChange={(v) => (setRooms({ ...rooms, stopSell: v }), reset())} />
        </div>
      )}
      {t?.kind === "rate" && plan && rt && (
        <div className="space-y-3">
          {plan.derived ? (
            <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">This plan&apos;s prices follow another plan. You can still change its rules here.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {plan.priceKeys.map((g) => (
                <Labelled key={g} label={g === 0 ? "Price per room (₹, before tax)" : `${g} guest${g > 1 ? "s" : ""} (₹, before tax)`}>
                  <input type="number" min={1} step="0.01" className={`${fieldCls} w-36`} value={rate.prices[g] ?? ""} onChange={(e) => (setRate({ ...rate, prices: { ...rate.prices, [g]: e.target.value } }), reset())} placeholder="no change" />
                </Labelled>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-5">
            <Labelled label="Min stay (0 = none)"><input type="number" min={0} max={30} className={inputCls} value={rate.minLos} onChange={(e) => (setRate({ ...rate, minLos: e.target.value }), reset())} placeholder="no change" /></Labelled>
            <Labelled label="Max stay (0 = none)"><input type="number" min={0} max={30} className={inputCls} value={rate.maxLos} onChange={(e) => (setRate({ ...rate, maxLos: e.target.value }), reset())} placeholder="no change" /></Labelled>
            <TriSelect label="No arrival" value={rate.cta} onChange={(v) => (setRate({ ...rate, cta: v }), reset())} />
            <TriSelect label="No departure" value={rate.ctd} onChange={(v) => (setRate({ ...rate, ctd: v }), reset())} />
            <TriSelect label="Stop selling" value={rate.stopSell} onChange={(v) => (setRate({ ...rate, stopSell: v }), reset())} />
          </div>
        </div>
      )}
      {problems.length > 0 && <ul className="list-disc rounded-md bg-red-50 py-2 pl-6 pr-3 text-xs text-red-700">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      {preview && (
        <div className="space-y-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <p><strong>{preview.nights}</strong> night(s) will change.</p>
          {preview.skipped.past.length > 0 && <p>{preview.skipped.past.length} past night(s) skipped.</p>}
          {preview.refused.length > 0 && <p className="text-amber-700">Kept (guests booked): {preview.refused.map((r) => `${r.date} (${r.booked + r.held} booked)`).join(", ")}</p>}
          {preview.warnings.length > 0 && (
            <div className="text-red-700">
              <p>Prices moving more than 50 %: {preview.warnings.slice(0, 5).map((w) => `${w.date}: ${rupees(w.from)} → ${rupees(w.to)}`).join(", ")}{preview.warnings.length > 5 ? "…" : ""}</p>
              <label className="mt-1 flex items-center gap-1.5"><input type="checkbox" checked={confirmBig} onChange={(e) => setConfirmBig(e.target.checked)} /> Yes, these prices are right</label>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || !t} onClick={() => send(true)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-700 hover:border-[#FE5300] disabled:opacity-50">Preview</button>
        <button type="button" disabled={busy || !preview || preview.nights === 0 || (preview.warnings.length > 0 && !confirmBig)} onClick={() => send(false)} className="rounded-md bg-[#FE5300] px-3 py-1.5 text-[13px] font-medium text-white shadow-sm hover:bg-[#e54b00] disabled:opacity-50">{busy ? "Saving…" : "Apply"}</button>
        {last && <button type="button" onClick={undo} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-700">Undo last change</button>}
      </div>
    </div>
  );
}
