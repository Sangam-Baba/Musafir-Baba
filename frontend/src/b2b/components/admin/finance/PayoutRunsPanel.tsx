"use client";
// Finance → Hotel payouts (Stage 15): weekly payout runs — propose (deductions and automatic holds), hold / release a
// hotel, approve (a different person), download the bank file, mark paid with the bank reference; deduction rules;
// hotels' statement questions (disputes).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Download, HelpCircle, Loader2, Percent } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../../../messages";
import { adminDownload, HOLD_LABEL, indiaDay, RUN_LABEL, type DeductionRule, type Dispute, type PayoutLine, type PayoutRun, type RunStatus } from "../../../payouts";
import { inr } from "../../../website/hotels";
import { adminCall } from "../AdminPassGate";
import { FleetEmptyState, FleetPanel, FleetPill, fleetTone, Input, inputSm, PrimaryBtn, SecondaryBtn } from "../kit";

const RUN_TONE: Record<RunStatus, string> = { DRAFT: fleetTone.amber, APPROVED: fleetTone.sky, FILE_READY: fleetTone.sky, PAID: fleetTone.emerald, CANCELLED: fleetTone.slate };
const Spinner = () => <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" /></div>;
const when = (d: string | null) => (d ? new Date(d).toLocaleString("en-IN") : "—");
/** The Sunday just gone (India) — the default cycle end of a weekly run. */
const lastSunday = () => {
  const today = new Date(`${indiaDay()}T00:00:00Z`);
  return indiaDay(-((today.getUTCDay() + 7) % 7 || 7));
};

function useRefresh() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ["b2b-admin", "payouts"] });
}

function LineRow({ l, run, token }: { l: PayoutLine; run: PayoutRun; token: string }) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  async function hold(h: boolean) {
    setBusy(true);
    try {
      await adminCall(`/admin/payout-lines/${l.id}/hold`, token, { method: "POST", body: { hold: h } });
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 text-[13px]">
      <FleetPill className={l.status === "HELD" ? fleetTone.red : fleetTone.emerald}>{l.status === "HELD" ? "Held" : "Included"}</FleetPill>
      <span className="font-mono text-[12px] text-slate-700">{l.hotelOrgId}</span>
      <span className="text-slate-500">{l.payables} booking{l.payables === 1 ? "" : "s"}</span>
      {l.holdReasons.length > 0 && <span className="text-[12px] text-red-700">{l.holdReasons.map((r) => HOLD_LABEL[r] ?? r).join(" · ")}</span>}
      <span className="ml-auto font-mono text-slate-600">{inr(l.grossPaise)}{l.deductions.length > 0 && ` − ${inr(l.deductions.reduce((s, d) => s + d.amountPaise, 0))}`}</span>
      <span className="w-28 text-right font-mono font-medium text-slate-900">{inr(l.netPaise)}</span>
      {run.status === "DRAFT" && (
        <SecondaryBtn disabled={busy} onClick={() => hold(l.status !== "HELD")}>{l.status === "HELD" ? "Release" : "Hold"}</SecondaryBtn>
      )}
    </div>
  );
}

function RunActions({ run, token }: { run: PayoutRun; token: string }) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const [bankRef, setBankRef] = useState("");
  async function act(path: string, body: unknown, done: string) {
    setBusy(true);
    try {
      await adminCall(`/admin/payout-runs/${run.id}/${path}`, token, { method: "POST", body });
      toast.success(done);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function bankFile() {
    setBusy(true);
    try {
      await adminDownload(`/admin/payout-runs/${run.id}/bank-file`, token, `payout-${run.ref}.csv`, "POST");
      toast.success("Bank file downloaded — upload it in the bank's bulk transfer page");
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function cancel() {
    const reason = window.prompt("Why cancel this run? (the bookings go back for the next run)");
    if (reason && reason.trim().length >= 3) void act("cancel", { reason: reason.trim() }, "Run cancelled");
  }
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2">
      {run.status === "DRAFT" && <PrimaryBtn disabled={busy} onClick={() => act("approve", {}, "Approved — totals are now locked")}>Approve (not the preparer)</PrimaryBtn>}
      {(run.status === "APPROVED" || run.status === "FILE_READY") && (
        <SecondaryBtn disabled={busy} onClick={bankFile}><Download className="h-3.5 w-3.5" /> Bank file</SecondaryBtn>
      )}
      {run.status === "FILE_READY" && (
        <>
          <Input className={`${inputSm} w-56`} placeholder="Bank batch reference / UTR" value={bankRef} onChange={(e) => setBankRef(e.target.value)} />
          <PrimaryBtn disabled={busy || bankRef.trim().length < 4} onClick={() => act("paid", { bankReference: bankRef.trim() }, "Marked paid — hotels are told")}>Mark paid</PrimaryBtn>
        </>
      )}
      {["DRAFT", "APPROVED", "FILE_READY"].includes(run.status) && <SecondaryBtn danger disabled={busy} onClick={cancel}>Cancel run</SecondaryBtn>}
    </div>
  );
}

function RunDetail({ run, token }: { run: PayoutRun; token: string }) {
  const q = useQuery({ queryKey: ["b2b-admin", "payouts", "run", run.id, run.status], queryFn: () => adminCall<PayoutRun & { lines: PayoutLine[] }>(`/admin/payout-runs/${run.id}`, token) });
  if (q.isLoading) return <Spinner />;
  if (q.error) return <p className="p-4 text-[13px] text-red-700">{errorMessage(q.error)}</p>;
  const lines = q.data?.lines ?? [];
  return (
    <div className="bg-slate-50/60">
      <div className="divide-y divide-slate-100">{lines.map((l) => <LineRow key={l.id} l={l} run={run} token={token} />)}</div>
      <RunActions run={run} token={token} />
    </div>
  );
}

function Runs({ token }: { token: string }) {
  const refresh = useRefresh();
  const [cycleEnd, setCycleEnd] = useState(lastSunday);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["b2b-admin", "payouts", "runs"], queryFn: () => adminCall<{ data: PayoutRun[] }>("/admin/payout-runs", token) });
  async function propose() {
    setBusy(true);
    try {
      const r = await adminCall<PayoutRun>("/admin/payout-runs", token, { method: "POST", body: { cycleEnd } });
      toast.success(`Run ${r.ref} prepared — check it, then someone else approves`);
      setOpen(r.id);
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const runs = q.data?.data ?? [];
  return (
    <FleetPanel
      title="Payout runs"
      description="Weekly by default. Bookings ready to pay up to the cycle end, minus deductions. Hotels are held automatically when KYC isn't approved, bank details are missing or changed in the last 72 hours, or a statement question is open."
      icon={Banknote}
      bodyClassName="p-0"
      actions={
        <div className="flex items-center gap-2">
          <label className="text-[12px] text-slate-600">Cycle end <input type="date" value={cycleEnd} onChange={(e) => setCycleEnd(e.target.value)} className="h-8 rounded-md border border-slate-200 px-2 text-[12px]" /></label>
          <PrimaryBtn disabled={busy} onClick={propose}>Prepare run</PrimaryBtn>
        </div>
      }
    >
      {q.isLoading && <Spinner />}
      {q.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {!q.isLoading && runs.length === 0 && <FleetEmptyState icon={Banknote} title="No payout runs yet" />}
      <div className="divide-y divide-slate-100">
        {runs.map((r) => (
          <div key={r.id}>
            <button onClick={() => setOpen(open === r.id ? null : r.id)} className="flex w-full flex-wrap items-center gap-2 px-4 py-2 text-left text-[13px] hover:bg-slate-50">
              <FleetPill className={RUN_TONE[r.status]}>{RUN_LABEL[r.status]}</FleetPill>
              <span className="font-mono text-[12px] text-slate-700">{r.ref}</span>
              <span className="text-slate-600">up to {r.cycleEnd} · {r.totals.lines} hotel{r.totals.lines === 1 ? "" : "s"}{r.totals.held ? ` · ${r.totals.held} held` : ""}</span>
              <span className="text-[12px] text-slate-400">by {r.preparedBy}{r.approvedBy ? ` · approved by ${r.approvedBy}` : ""}{r.bankReference ? ` · ${r.bankReference}` : ""}</span>
              <span className="ml-auto font-mono font-medium text-slate-900">{inr(r.totals.netPaise)}</span>
              <span className="w-36 text-right text-[11px] text-slate-400">{when(r.createdAt)}</span>
            </button>
            {open === r.id && <RunDetail run={r} token={token} />}
          </div>
        ))}
      </div>
    </FleetPanel>
  );
}

function Rules({ token }: { token: string }) {
  const refresh = useRefresh();
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState("");
  const [hotel, setHotel] = useState("");
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["b2b-admin", "payouts", "rules"], queryFn: () => adminCall<{ data: DeductionRule[] }>("/admin/deduction-rules", token) });
  const n = Number(value);
  const ok = label.trim().length >= 2 && n > 0 && (type === "PERCENT" ? n <= 100 : true) && (!hotel || /^[a-f0-9]{24}$/.test(hotel));
  async function add() {
    setBusy(true);
    try {
      const body = { label: label.trim(), type, hotelOrgId: hotel || null, ...(type === "PERCENT" ? { valueBps: Math.round(n * 100) } : { amountPaise: Math.round(n * 100) }) };
      await adminCall("/admin/deduction-rules", token, { method: "POST", body });
      setLabel("");
      setValue("");
      setHotel("");
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function retire(id: string) {
    try {
      await adminCall(`/admin/deduction-rules/${id}/retire`, token, { method: "POST", body: {} });
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  const rules = q.data?.data ?? [];
  return (
    <FleetPanel title="Deductions" description="Taken from each hotel's payout (e.g. TDS as the CA advises). A hotel's own rule comes before the all-hotels rule; never more than the payout. Changes apply to the next run." icon={Percent} bodyClassName="p-0">
      <div className="divide-y divide-slate-100">
        {rules.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-[13px]">
            <FleetPill className={r.status === "ACTIVE" ? fleetTone.emerald : fleetTone.slate}>{r.status === "ACTIVE" ? "Active" : "Retired"}</FleetPill>
            <span className="font-medium text-slate-800">{r.label}</span>
            <span className="text-slate-600">{r.type === "PERCENT" ? `${r.valueBps / 100} %` : inr(r.amountPaise)}</span>
            <span className="text-[12px] text-slate-400">{r.hotelOrgId ? `hotel ${r.hotelOrgId}` : "all hotels"}</span>
            {r.status === "ACTIVE" && <span className="ml-auto"><SecondaryBtn onClick={() => retire(r.id)}>Retire</SecondaryBtn></span>}
          </div>
        ))}
        {!q.isLoading && rules.length === 0 && <FleetEmptyState icon={Percent} title="No deductions — hotels get their full payout" />}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2">
        <Input className={`${inputSm} w-48`} placeholder="Label, e.g. TDS 194-O" value={label} onChange={(e) => setLabel(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")} className="h-8 rounded-md border border-slate-200 px-2 text-[13px]">
          <option value="PERCENT">% of payout</option>
          <option value="FIXED">Fixed ₹</option>
        </select>
        <Input className={`${inputSm} w-24`} placeholder={type === "PERCENT" ? "1" : "500"} value={value} onChange={(e) => setValue(e.target.value)} />
        <Input className={`${inputSm} w-64`} placeholder="Hotel org id (empty = all hotels)" value={hotel} onChange={(e) => setHotel(e.target.value.trim())} />
        <PrimaryBtn disabled={busy || !ok} onClick={add}>Add rule</PrimaryBtn>
      </div>
    </FleetPanel>
  );
}

function DisputeRow({ d, token }: { d: Dispute; token: string }) {
  const refresh = useRefresh();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function resolve(accept: boolean) {
    setBusy(true);
    try {
      await adminCall(`/admin/statement-disputes/${d.id}/resolve`, token, { method: "POST", body: { accept, note: note.trim() } });
      refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-1 px-4 py-2 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <FleetPill className={d.status === "OPEN" ? fleetTone.amber : d.status === "ACCEPTED" ? fleetTone.emerald : fleetTone.slate}>{d.status}</FleetPill>
        <span className="font-mono text-[12px] text-slate-700">{d.bookingRef}</span>
        <span className="text-slate-700">“{d.message}”</span>
        <span className="ml-auto text-[11px] text-slate-400">{d.hotelOrgId} · {when(d.createdAt)}</span>
      </div>
      {d.resolution && <p className="text-[12px] text-slate-500">Answer: {d.resolution}</p>}
      {d.status === "OPEN" && (
        <div className="flex flex-wrap items-center gap-2">
          <Input className={`${inputSm} w-96`} placeholder="Answer to the hotel (fix with an adjustment if accepted)" value={note} onChange={(e) => setNote(e.target.value)} />
          <SecondaryBtn disabled={busy || note.trim().length < 3} onClick={() => resolve(true)}>Accept</SecondaryBtn>
          <SecondaryBtn danger disabled={busy || note.trim().length < 3} onClick={() => resolve(false)}>Reject</SecondaryBtn>
        </div>
      )}
    </div>
  );
}

function Disputes({ token }: { token: string }) {
  const [status, setStatus] = useState<"OPEN" | "ACCEPTED" | "REJECTED">("OPEN");
  const q = useQuery({ queryKey: ["b2b-admin", "payouts", "disputes", status], queryFn: () => adminCall<{ data: Dispute[] }>(`/admin/statement-disputes?status=${status}`, token) });
  const rows = q.data?.data ?? [];
  return (
    <FleetPanel
      title="Statement questions"
      description="A hotel questioned an amount. While open, that hotel's next payout is held."
      icon={HelpCircle}
      bodyClassName="p-0"
      actions={
        <div className="flex gap-1.5">
          {(["OPEN", "ACCEPTED", "REJECTED"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`rounded-full border px-2.5 py-0.5 text-[11px] ${status === s ? "border-[#FE5300] bg-orange-50 text-[#FE5300]" : "border-slate-200 text-slate-600"}`}>{s === "OPEN" ? "Open" : s === "ACCEPTED" ? "Accepted" : "Rejected"}</button>
          ))}
        </div>
      }
    >
      {q.isLoading && <Spinner />}
      {!q.isLoading && rows.length === 0 && <FleetEmptyState icon={HelpCircle} title={status === "OPEN" ? "No open questions" : "None"} />}
      <div className="divide-y divide-slate-100">{rows.map((d) => <DisputeRow key={d.id} d={d} token={token} />)}</div>
    </FleetPanel>
  );
}

export function PayoutRunsPanel({ token }: { token: string }) {
  return (
    <div className="space-y-3">
      <Runs token={token} />
      <Disputes token={token} />
      <Rules token={token} />
    </div>
  );
}
