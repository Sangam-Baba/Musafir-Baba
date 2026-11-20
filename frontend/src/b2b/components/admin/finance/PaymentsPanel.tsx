"use client";
// Finance → Payments: every PayU payment of the new system (B2B… ids only — the existing website's payments are not
// here), refunds, PayU settlement lines, and the mismatches reconciliation found. Finance can resolve a mismatch with
// a note, import a settlement file, and refund a payment to its source (repeat-safe: a double click sends one refund).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CreditCard, FileUp, Landmark, Loader2, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { INTENT_STATUSES, parseSettlementCsv, rupeesToPaise, type IntentStatus, type PaymentRow, type ReconException, type RefundRow, type SettlementRow } from "../../../finance";
import { errorMessage } from "../../../messages";
import { inr } from "../../../website/hotels";
import { adminCall } from "../AdminPassGate";
import { FleetEmptyState, FleetPanel, FleetPill, fleetTone, Input, inputSm, PrimaryBtn, SecondaryBtn } from "../kit";

const PAY_TONE: Record<IntentStatus, string> = { CREATED: fleetTone.slate, PENDING: fleetTone.amber, SUCCEEDED: fleetTone.emerald, FAILED: fleetTone.red, REFUNDED: fleetTone.sky };
const when = (d: string | null) => (d ? new Date(d).toLocaleString("en-IN") : "—");
const Spinner = () => <div className="flex justify-center py-6"><Loader2 className="animate-spin text-slate-400" /></div>;

function RefundForm({ p, token, onDone }: { p: PaymentRow; token: string; onDone: () => void }) {
  const left = p.amountPaise - p.refundedPaise;
  const [amount, setAmount] = useState(String(left / 100));
  const [reason, setReason] = useState("");
  const [requestId] = useState(() => crypto.randomUUID()); // one per form: a double click or retry sends the same refund
  const [busy, setBusy] = useState(false);
  const paise = rupeesToPaise(amount);
  async function submit() {
    setBusy(true);
    try {
      const r = await adminCall<{ status: string }>("/admin/refunds", token, { method: "POST", body: { intentId: p.id, amountPaise: paise, reason: reason.trim(), requestId } });
      toast.success(r.status === "FAILED" ? "PayU refused the refund — see Mismatches" : "Refund sent to PayU — it goes back to the customer's payment method");
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-4 py-2 text-[13px]">
      <span className="text-slate-600">Refund up to {inr(left)}:</span>
      <Input className={`${inputSm} w-28`} value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Input className={`${inputSm} w-72`} placeholder="Reason (at least 5 characters)" value={reason} onChange={(e) => setReason(e.target.value)} />
      <PrimaryBtn disabled={busy || !paise || paise > left || reason.trim().length < 5} onClick={submit}>Refund</PrimaryBtn>
    </div>
  );
}

function Payments({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<IntentStatus | "">("");
  const [refunding, setRefunding] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["b2b-admin", "finance", "payments", status], queryFn: () => adminCall<{ data: PaymentRow[] }>(`/admin/payments${status ? `?status=${status}` : ""}`, token) });
  const rows = q.data?.data ?? [];
  return (
    <FleetPanel title="Payments" description="Confirmed only after PayU's own verify API says so — never from the browser return alone." icon={CreditCard} bodyClassName="p-0">
      <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-4 py-2">
        {(["", ...INTENT_STATUSES] as const).map((f) => (
          <button key={f || "all"} onClick={() => setStatus(f)} className={`rounded-full border px-2.5 py-0.5 text-[11px] ${status === f ? "border-[#FE5300] bg-orange-50 text-[#FE5300]" : "border-slate-200 text-slate-600"}`}>{f || "All"}</button>
        ))}
      </div>
      {q.isLoading && <Spinner />}
      {q.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {!q.isLoading && rows.length === 0 && <FleetEmptyState icon={CreditCard} title="No payments here" />}
      <div className="divide-y divide-slate-100">
        {rows.map((p) => (
          <div key={p.id}>
            <div className="flex flex-wrap items-center gap-2 px-4 py-2 text-[13px]">
              <FleetPill className={PAY_TONE[p.status]}>{p.status}</FleetPill>
              <span className="font-mono text-[12px] text-slate-700">{p.txnId}</span>
              <span className="text-slate-600">{p.purpose} · {p.reference.type}/{p.reference.id}</span>
              <span className="text-slate-500">{p.payer.firstname}{p.mode ? ` · ${p.mode}` : ""}{p.failureReason ? ` · ${p.failureReason}` : ""}</span>
              <span className="ml-auto font-mono text-slate-800">{inr(p.amountPaise)}{p.refundedPaise ? ` (refunded ${inr(p.refundedPaise)})` : ""}</span>
              <span className="w-36 text-right text-[11px] text-slate-400">{when(p.createdAt)}</span>
              {p.status === "SUCCEEDED" && p.refundedPaise < p.amountPaise && (
                <SecondaryBtn onClick={() => setRefunding(refunding === p.id ? null : p.id)}><Undo2 className="h-3.5 w-3.5" /> Refund</SecondaryBtn>
              )}
            </div>
            {refunding === p.id && <RefundForm p={p} token={token} onDone={() => { setRefunding(null); void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "finance"] }); }} />}
          </div>
        ))}
      </div>
    </FleetPanel>
  );
}

function Refunds({ token }: { token: string }) {
  const q = useQuery({ queryKey: ["b2b-admin", "finance", "refunds"], queryFn: () => adminCall<{ data: RefundRow[] }>("/admin/refunds", token) });
  const rows = q.data?.data ?? [];
  return (
    <FleetPanel title="Refunds" description="Back to the customer's payment method through PayU, followed until PayU says it's done." icon={Undo2} bodyClassName="p-0">
      {q.isLoading && <Spinner />}
      {!q.isLoading && rows.length === 0 && <FleetEmptyState icon={Undo2} title="No refunds" />}
      <div className="divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r._id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-[13px]">
            <FleetPill className={r.status === "SUCCEEDED" ? fleetTone.emerald : r.status === "FAILED" ? fleetTone.red : fleetTone.amber}>{r.status}</FleetPill>
            <span className="font-mono text-[12px] text-slate-700">{r.refundId}</span>
            <span className="text-slate-500">{r.txnId} · {r.reason}{r.gatewayMessage ? ` · PayU: ${r.gatewayMessage}` : ""}</span>
            <span className="ml-auto font-mono text-slate-800">{inr(r.amountPaise)}</span>
            <span className="w-36 text-right text-[11px] text-slate-400">{when(r.createdAt)}</span>
          </div>
        ))}
      </div>
    </FleetPanel>
  );
}

function ExceptionRow({ x, token }: { x: ReconException; token: string }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function resolve() {
    setBusy(true);
    try {
      await adminCall(`/admin/recon-exceptions/${x._id}/resolve`, token, { method: "POST", body: { note: note.trim() } });
      toast.success("Resolved");
      void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "finance", "exceptions"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-1 px-4 py-2 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <FleetPill className={x.status === "OPEN" ? fleetTone.red : fleetTone.slate}>{x.kind}</FleetPill>
        {x.txnId && <span className="font-mono text-[12px] text-slate-700">{x.txnId}</span>}
        <span className="text-slate-600">{x.detail}</span>
        {x.amountPaise !== null && <span className="ml-auto font-mono text-slate-800">{inr(x.amountPaise)}</span>}
        <span className="w-36 text-right text-[11px] text-slate-400">{when(x.raisedAt)}</span>
      </div>
      {x.status === "RESOLVED" && <p className="text-[12px] text-slate-500">Resolved by {x.resolvedBy} — {x.resolution}</p>}
      {x.status === "OPEN" && (
        <div className="flex flex-wrap items-center gap-2">
          <Input className={`${inputSm} w-96`} placeholder="What was found and done (at least 5 characters)" value={note} onChange={(e) => setNote(e.target.value)} />
          <SecondaryBtn disabled={busy || note.trim().length < 5} onClick={resolve}>Mark resolved</SecondaryBtn>
        </div>
      )}
    </div>
  );
}

function Exceptions({ token }: { token: string }) {
  const [status, setStatus] = useState<"OPEN" | "RESOLVED">("OPEN");
  const q = useQuery({ queryKey: ["b2b-admin", "finance", "exceptions", status], queryFn: () => adminCall<{ data: ReconException[] }>(`/admin/recon-exceptions?status=${status}`, token) });
  const rows = q.data?.data ?? [];
  return (
    <FleetPanel
      title="Mismatches"
      description="Where PayU and our records don't agree: amounts, settlements we can't match, late payments, refused refunds, payments not settled after 3 days."
      icon={AlertTriangle}
      bodyClassName="p-0"
      actions={
        <div className="flex gap-1.5">
          {(["OPEN", "RESOLVED"] as const).map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={`rounded-full border px-2.5 py-0.5 text-[11px] ${status === s ? "border-[#FE5300] bg-orange-50 text-[#FE5300]" : "border-slate-200 text-slate-600"}`}>{s === "OPEN" ? "Open" : "Resolved"}</button>
          ))}
        </div>
      }
    >
      {q.isLoading && <Spinner />}
      {q.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {!q.isLoading && rows.length === 0 && <FleetEmptyState icon={AlertTriangle} title={status === "OPEN" ? "Nothing to look at" : "None resolved yet"} />}
      <div className="divide-y divide-slate-100">{rows.map((x) => <ExceptionRow key={x._id} x={x} token={token} />)}</div>
    </FleetPanel>
  );
}

function ImportSettlements({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const parsed = text.trim() ? parseSettlementCsv(text) : { lines: [], errors: [] };
  async function submit() {
    setBusy(true);
    try {
      const r = await adminCall<{ lines: number; ours: number; matched: number; exceptions: number }>("/admin/settlements/import", token, { method: "POST", body: { lines: parsed.lines } });
      toast.success(`${r.lines} lines: ${r.ours} ours, ${r.matched} matched, ${r.exceptions} mismatches`);
      setText("");
      void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "finance"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <FleetPanel title="Import a settlement file" description="Normally fetched from PayU every morning. Paste a file here if that failed. Lines of the existing website are ignored; importing the same file twice changes nothing." icon={FileUp}>
      <textarea
        className="h-32 w-full rounded-md border border-slate-200 p-2 font-mono text-[12px]"
        placeholder={"txnid,mihpayid,amount,fee,tax,settled,utr,action,settledOn\nB2BH…,40312345678,997.50,19.95,3.59,973.96,UTR123,capture,2026-11-18"}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {parsed.errors.map((e) => <p key={e} className="text-[12px] text-red-700">{e}</p>)}
      <div className="mt-2 flex items-center gap-2">
        <span className="text-[12px] text-slate-500">{parsed.lines.length} lines ready (amounts in rupees)</span>
        <span className="ml-auto"><PrimaryBtn disabled={busy || parsed.lines.length === 0 || parsed.errors.length > 0} onClick={submit}>Import</PrimaryBtn></span>
      </div>
    </FleetPanel>
  );
}

function Settlements({ token }: { token: string }) {
  const q = useQuery({ queryKey: ["b2b-admin", "finance", "settlements"], queryFn: () => adminCall<{ data: SettlementRow[] }>("/admin/settlements", token) });
  const rows = q.data?.data ?? [];
  return (
    <FleetPanel title="Settlement lines" description="What PayU paid into the bank for our payments, after its fee and the GST on it." icon={Landmark} bodyClassName="p-0">
      {q.isLoading && <Spinner />}
      {!q.isLoading && rows.length === 0 && <FleetEmptyState icon={Landmark} title="No settlement lines yet" />}
      <div className="divide-y divide-slate-100">
        {rows.map((s) => (
          <div key={s._id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-[13px]">
            <FleetPill className={s.journalPosted ? fleetTone.emerald : fleetTone.red}>{s.journalPosted ? "Matched" : "Not matched"}</FleetPill>
            <span className="font-mono text-[12px] text-slate-700">{s.txnId}</span>
            <span className="text-slate-500">{s.action} · {s.settledOn} · {s.source}{s.utr ? ` · UTR ${s.utr}` : ""}</span>
            <span className="ml-auto font-mono text-slate-800">{inr(s.amountPaise)}</span>
            <span className="text-[12px] text-slate-500">fee {inr(s.feePaise + s.taxPaise)} · to bank {inr(s.settledPaise)}</span>
          </div>
        ))}
      </div>
    </FleetPanel>
  );
}

export function PaymentsPanel({ token, view }: { token: string; view: "payments" | "reconciliation" }) {
  if (view === "payments")
    return (
      <div className="space-y-3">
        <Payments token={token} />
        <Refunds token={token} />
      </div>
    );
  return (
    <div className="space-y-3">
      <Exceptions token={token} />
      <Settlements token={token} />
      <ImportSettlements token={token} />
    </div>
  );
}
