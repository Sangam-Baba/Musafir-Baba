"use client";
// Bus payouts (MusafirBaba finance, Stage 18 B7 — a separate run from hotels): propose the weekly run, hold / release
// a company, a second person approves, download the bank file, record the bank reference (pays: journal per company).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { rupees, type BusPayoutLine, type BusPayoutRun } from "../../bus";
import { errorMessage } from "../../messages";
import { adminDownload } from "../../payouts";
import { adminCall } from "./AdminPassGate";
import { FleetPanel, Input, inputSm, Notice, PrimaryBtn, SecondaryBtn } from "./kit";

function RunDetail({ id, token, onDone }: { id: string; token: string; onDone: () => void }) {
  const q = useQuery({ queryKey: ["b2b-admin", "bus-run", id], queryFn: () => adminCall<{ run: BusPayoutRun; lines: BusPayoutLine[] }>(`/admin/bus/payout-runs/${id}`, token) });
  const [ref, setRef] = useState("");
  if (!q.data) return <p className="text-[13px] text-slate-500">Loading…</p>;
  const { run, lines } = q.data;
  const act = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await fn();
      toast.success(done);
      await q.refetch();
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };
  const post = (path: string, body: unknown = {}) => adminCall(`/admin/bus/${path}`, token, { method: "POST", body });
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-3 text-[13px]">
      <p className="font-medium">{run.ref} · {run.status} · cycle to {run.cycleEnd} · net {rupees(run.totals.netPaise ?? 0)}</p>
      <ul className="space-y-1">
        {lines.map((l) => (
          <li key={l._id} className="flex flex-wrap items-center gap-2 border-b border-slate-100 py-1">
            <span className="font-mono text-[12px]">{l.operatorOrgId}</span><span>{l.payableIds.length} bookings</span><b>{rupees(l.netPaise)}</b>
            <span className={l.status === "HELD" ? "text-amber-700" : "text-emerald-700"}>{l.status}{l.holdReasons.length ? ` (${l.holdReasons.join(", ")})` : ""}{l.paid ? " · paid" : ""}</span>
            {run.status === "DRAFT" && <SecondaryBtn onClick={() => act(() => post(`payout-lines/${l._id}/hold`, { hold: l.status !== "HELD" }), "Updated")}>{l.status === "HELD" ? "Release" : "Hold"}</SecondaryBtn>}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        {run.status === "DRAFT" && <PrimaryBtn onClick={() => act(() => post(`payout-runs/${id}/approve`), "Approved")}>Approve (second person)</PrimaryBtn>}
        {["APPROVED", "FILE_READY"].includes(run.status) && <SecondaryBtn onClick={() => act(() => adminDownload(`/admin/bus/payout-runs/${id}/bank-file`, token, "bus-payouts.csv", "POST"), "Bank file downloaded")}>Bank file</SecondaryBtn>}
        {run.status === "FILE_READY" && (<><Input className={inputSm} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Bank reference (UTR)" /><PrimaryBtn disabled={ref.trim().length < 4} onClick={() => act(() => post(`payout-runs/${id}/paid`, { bankReference: ref.trim() }), "Recorded as paid")}>Mark paid</PrimaryBtn></>)}
        {["DRAFT", "APPROVED", "FILE_READY"].includes(run.status) && <SecondaryBtn danger onClick={() => window.confirm("Cancel this run? Its bookings go back to the next run.") && act(() => post(`payout-runs/${id}/cancel`), "Cancelled")}>Cancel run</SecondaryBtn>}
      </div>
    </div>
  );
}

export function BusPayoutsTab({ token }: { token: string }) {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["b2b-admin", "bus-runs"], queryFn: () => adminCall<{ data: BusPayoutRun[] }>("/admin/bus/payout-runs", token) });
  const [open, setOpen] = useState<string | null>(null);
  const [cycleEnd, setCycleEnd] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  const refresh = () => qc.invalidateQueries({ queryKey: ["b2b-admin", "bus-runs"] });
  async function propose() {
    try {
      const r = await adminCall<BusPayoutRun>("/admin/bus/payout-runs", token, { method: "POST", body: { cycleEnd } });
      setOpen(r._id);
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <FleetPanel title="Bus payout runs" description="Separate from hotel payouts — bus companies' net fares after their trips." actions={<div className="flex items-center gap-2"><Input className={inputSm} type="date" value={cycleEnd} onChange={(e) => setCycleEnd(e.target.value)} /><PrimaryBtn onClick={propose}>Propose run</PrimaryBtn></div>}>
      <div className="space-y-3">
        {list.isError && <Notice tone="red">{errorMessage(list.error)}</Notice>}
        <ul className="space-y-1 text-[13px]">{(list.data?.data ?? []).map((r) => <li key={r._id}><button type="button" onClick={() => setOpen(open === r._id ? null : r._id)} className="w-full rounded border border-slate-200 bg-white px-3 py-2 text-left">{r.ref} · {r.status} · to {r.cycleEnd} · {rupees(r.totals.netPaise ?? 0)}</button>{open === r._id && <RunDetail id={r._id} token={token} onDone={refresh} />}</li>)}</ul>
        {list.data && list.data.data.length === 0 && <p className="text-[13px] text-slate-500">No bus payout runs yet.</p>}
      </div>
    </FleetPanel>
  );
}
