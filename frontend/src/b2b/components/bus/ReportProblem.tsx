"use client";
// Report a trip problem to MusafirBaba (Stage 18 B7): breakdown, delay, the trip cancelled, other. Ops get it at once
// and tell / refund passengers when needed.
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { PROBLEM_LABEL, type TripProblem } from "../../bus";
import { errorMessage } from "../../messages";
import { inputCls } from "../listing/ui";

export function ReportProblem({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ kind: "DELAY" as TripProblem["kind"], note: "", delay: "" });
  const [busy, setBusy] = useState(false);
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-[12px] text-amber-800">Report a problem</button>;
  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await b2b(`/bus/trips/${tripId}/problems`, { method: "POST", body: { kind: f.kind, note: f.note, delayMinutes: f.kind === "DELAY" && f.delay ? Number(f.delay) : null } });
      toast.success("Sent to MusafirBaba — we'll take care of the passengers");
      setOpen(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={send} className="grid gap-2 rounded-md border border-amber-200 bg-amber-50/50 p-3 text-[12px] sm:grid-cols-[10rem_7rem_1fr_auto] sm:items-end">
      <label className="text-slate-600">Problem<select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as TripProblem["kind"] })} className={inputCls}>{Object.entries(PROBLEM_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="text-slate-600">Delay (min)<input type="number" min={1} max={2880} disabled={f.kind !== "DELAY"} value={f.delay} onChange={(e) => setF({ ...f, delay: e.target.value })} className={inputCls} /></label>
      <label className="text-slate-600">What happened<input required minLength={5} maxLength={1000} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} className={inputCls} /></label>
      <button disabled={busy} className="rounded-md bg-amber-600 px-3 py-1.5 font-medium text-white disabled:opacity-50">Send</button>
    </form>
  );
}
