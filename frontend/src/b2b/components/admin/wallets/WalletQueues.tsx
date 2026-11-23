"use client";
// B2B admin → Wallets (Stage 11): the two-person queues — bank-transfer top-ups (check, then a different person
// approves), credit lines (propose, then a different person approves) and wallet adjustments (same rule).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, CreditCard, Scale } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { rupeesToPaise } from "../../../finance";
import { errorMessage } from "../../../messages";
import { inr } from "../../../website/hotels";
import { adminCall } from "../AdminPassGate";
import { FleetEmptyState, FleetPanel, Input, inputSm, PrimaryBtn, SecondaryBtn } from "../kit";

type ManualTopUp = { id: string; ref: string; clientOrgId: string; amountPaise: number; method: string; utr: string; paidOn: string; status: string; checkedBy: string | null; createdAt: string };
type CreditLine = { id: string; clientOrgId: string; limitPaise: number; dueDays: number; note: string | null; status: string; proposedBy: string };
type Adjustment = { id: string; clientOrgId: string; amountPaise: number; reasonCode: string; note: string; status: string; proposedBy: string };

const REASONS = ["GOODWILL_CREDIT", "TOPUP_CORRECTION", "BANK_CHARGES", "MISPOSTING", "WRITE_OFF", "OTHER"] as const;
const COUNTERS = ["SUSPENSE", "BANK", "REVENUE_MARGIN", "CUSTOMER_ADVANCES", "GATEWAY_CLEARING"] as const;
const short = (id: string) => id.slice(-6);

function useAct(token: string) {
  const qc = useQueryClient();
  return async (path: string, body: unknown, done: string) => {
    try {
      await adminCall(path, token, { method: "POST", body });
      toast.success(done);
      void qc.invalidateQueries({ queryKey: ["b2b-admin", "wallets"] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
}

export function BankTransfersPanel({ token }: { token: string }) {
  const act = useAct(token);
  const q = useQuery({ queryKey: ["b2b-admin", "wallets", "manual"], queryFn: () => adminCall<{ data: ManualTopUp[] }>("/admin/wallet/manual-top-ups", token), retry: false });
  const open = (q.data?.data ?? []).filter((t) => t.status === "SUBMITTED" || t.status === "CHECKED");
  return (
    <FleetPanel title="Bank-transfer top-ups" description="Check each UTR against the bank statement. A different person approves it — then the money is added to the client's wallet." icon={Banknote} bodyClassName="p-0">
      {q.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {!q.isLoading && open.length === 0 && <FleetEmptyState icon={Banknote} title="Nothing waiting" />}
      {open.map((t) => (
        <div key={t.id} className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2 text-[13px] last:border-0">
          <span className="font-mono text-[12px] text-slate-600">{t.ref}</span>
          <span className="text-slate-600">client {short(t.clientOrgId)} · {t.method} UTR <b>{t.utr}</b> · sent {t.paidOn}</span>
          <span className="font-semibold text-slate-900">{inr(t.amountPaise)}</span>
          <span className="ml-auto flex gap-1.5">
            {t.status === "SUBMITTED" ? (
              <>
                <PrimaryBtn onClick={() => act(`/admin/wallet/manual-top-ups/${t.id}/check`, { ok: true }, "Checked — another person approves")}>On the statement</PrimaryBtn>
                <SecondaryBtn onClick={() => act(`/admin/wallet/manual-top-ups/${t.id}/check`, { ok: false, note: "Not found on the bank statement" }, "Rejected")}>Not found</SecondaryBtn>
              </>
            ) : (
              <>
                <span className="self-center text-[12px] text-slate-500">checked by {t.checkedBy}</span>
                <PrimaryBtn onClick={() => act(`/admin/wallet/manual-top-ups/${t.id}/decide`, { approve: true }, "Approved — wallet credited")}>Approve</PrimaryBtn>
                <SecondaryBtn onClick={() => act(`/admin/wallet/manual-top-ups/${t.id}/decide`, { approve: false, note: "Rejected on approval" }, "Rejected")}>Reject</SecondaryBtn>
              </>
            )}
          </span>
        </div>
      ))}
    </FleetPanel>
  );
}

export function CreditLinesPanel({ token, clientOrgId }: { token: string; clientOrgId: string | null }) {
  const act = useAct(token);
  const q = useQuery({ queryKey: ["b2b-admin", "wallets", "credit"], queryFn: () => adminCall<{ data: CreditLine[] }>("/admin/wallet/credit-lines?status=PROPOSED", token), retry: false });
  const [limit, setLimit] = useState("");
  const [days, setDays] = useState("15");
  const paise = rupeesToPaise(limit);
  return (
    <FleetPanel title="Credit lines" description="A limit and due days per client. One person proposes, a different person approves. 0 switches credit off." icon={CreditCard} bodyClassName="p-0">
      {clientOrgId && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[13px]">
          <span>Client {short(clientOrgId)}: limit ₹</span>
          <Input className={`${inputSm} w-32`} value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="2,00,000" />
          <span>due in</span>
          <Input className={`${inputSm} w-16`} value={days} onChange={(e) => setDays(e.target.value)} />
          <span>days</span>
          <PrimaryBtn disabled={paise === null || !(Number(days) >= 1 && Number(days) <= 90)} onClick={() => act("/admin/wallet/credit-lines", { clientOrgId, limitPaise: paise, dueDays: Number(days) }, "Proposed — another person approves")}>Propose</PrimaryBtn>
        </div>
      )}
      {!q.isLoading && (q.data?.data ?? []).length === 0 && <FleetEmptyState icon={CreditCard} title="No credit lines waiting" hint={clientOrgId ? undefined : "Pick a client in the list to propose one."} />}
      {(q.data?.data ?? []).map((l) => (
        <div key={l.id} className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2 text-[13px] last:border-0">
          <span className="text-slate-600">client {short(l.clientOrgId)} · limit <b>{inr(l.limitPaise)}</b> · {l.dueDays} days · by {l.proposedBy}</span>
          <span className="ml-auto flex gap-1.5">
            <PrimaryBtn onClick={() => act(`/admin/wallet/credit-lines/${l.id}/decide`, { approve: true }, "Approved — on the client's wallet")}>Approve</PrimaryBtn>
            <SecondaryBtn onClick={() => act(`/admin/wallet/credit-lines/${l.id}/decide`, { approve: false }, "Rejected")}>Reject</SecondaryBtn>
          </span>
        </div>
      ))}
    </FleetPanel>
  );
}

export function AdjustmentsPanel({ token, clientOrgId }: { token: string; clientOrgId: string | null }) {
  const act = useAct(token);
  const q = useQuery({ queryKey: ["b2b-admin", "wallets", "adjustments"], queryFn: () => adminCall<{ data: Adjustment[] }>("/admin/wallet/adjustments", token), retry: false });
  const [f, setF] = useState({ rupees: "", debit: false, counter: "SUSPENSE" as (typeof COUNTERS)[number], reason: "GOODWILL_CREDIT" as (typeof REASONS)[number], note: "" });
  const paise = rupeesToPaise(f.rupees);
  const open = (q.data?.data ?? []).filter((a) => a.status === "PROPOSED" || a.status === "POSTING");
  return (
    <FleetPanel title="Wallet adjustments" description="Never edit a balance — propose a credit or debit with a reason; a different person approves it." icon={Scale} bodyClassName="p-0">
      {clientOrgId && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[13px]">
          <span>Client {short(clientOrgId)}</span>
          <select className="h-8 rounded-md border border-slate-200 px-2" value={f.debit ? "debit" : "credit"} onChange={(e) => setF({ ...f, debit: e.target.value === "debit" })}><option value="credit">Credit +</option><option value="debit">Debit −</option></select>
          <Input className={`${inputSm} w-28`} placeholder="₹" value={f.rupees} onChange={(e) => setF({ ...f, rupees: e.target.value })} />
          <select className="h-8 rounded-md border border-slate-200 px-2" value={f.counter} onChange={(e) => setF({ ...f, counter: e.target.value as (typeof COUNTERS)[number] })}>{COUNTERS.map((c) => <option key={c}>{c}</option>)}</select>
          <select className="h-8 rounded-md border border-slate-200 px-2" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value as (typeof REASONS)[number] })}>{REASONS.map((r) => <option key={r}>{r}</option>)}</select>
          <Input className={`${inputSm} w-56`} placeholder="Why (the client sees it on the statement)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <PrimaryBtn
            disabled={!paise || f.note.trim().length < 5}
            onClick={() => paise && act("/admin/wallet/adjustments", { clientOrgId, amountPaise: f.debit ? -paise : paise, counterType: f.counter, reasonCode: f.reason, note: f.note.trim() }, "Proposed — another person approves")}
          >
            Propose
          </PrimaryBtn>
        </div>
      )}
      {!q.isLoading && open.length === 0 && <FleetEmptyState icon={Scale} title="No adjustments waiting" />}
      {open.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2 text-[13px] last:border-0">
          <span className="text-slate-600">client {short(a.clientOrgId)} · {a.reasonCode} · {a.note} · by {a.proposedBy}</span>
          <span className={`font-semibold ${a.amountPaise < 0 ? "text-red-700" : "text-emerald-700"}`}>{a.amountPaise > 0 ? "+" : ""}{inr(a.amountPaise)}</span>
          <span className="ml-auto flex gap-1.5">
            <PrimaryBtn onClick={() => act(`/admin/wallet/adjustments/${a.id}/decide`, { approve: true }, "Approved — wallet updated")}>Approve</PrimaryBtn>
            <SecondaryBtn onClick={() => act(`/admin/wallet/adjustments/${a.id}/decide`, { approve: false }, "Rejected")}>Reject</SecondaryBtn>
          </span>
        </div>
      ))}
    </FleetPanel>
  );
}
