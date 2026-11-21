"use client";
// B2B admin → Wallets (Stage 11): every client wallet (balance, held, credit — overdue first) with its statement,
// the two-person queues, and the daily report of money added by hand.
import { useQuery } from "@tanstack/react-query";
import { FileText, Wallet } from "lucide-react";
import { useState } from "react";

import { errorMessage } from "../../../messages";
import { inr } from "../../../website/hotels";
import { adminCall } from "../AdminPassGate";
import { FleetEmptyState, FleetPanel, FleetPill, fleetTone } from "../kit";
import { AdjustmentsPanel, BankTransfersPanel, CreditLinesPanel } from "./WalletQueues";

type ClientWallet = { clientOrgId: string; name: string; reference: string | null; balancePaise: number; heldPaise: number; creditLimitPaise: number; availablePaise: number; creditUsedPaise: number; creditDueAt: string | null; overdue: boolean; pendingOps: number };
type Statement = { openingPaise: number; closingPaise: number; lines: { at: string; description: string; memo: string | null; amountPaise: number; balancePaise: number }[] };
type Report = { date: string; totalPaise: number; rows: { kind: string; id: string; ref: string; clientOrgId: string; amountPaise: number; detail: string; checkedBy: string; approvedBy: string }[] };

const istDay = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
};

function ClientStatement({ token, orgId }: { token: string; orgId: string }) {
  const from = istDay(-29);
  const to = istDay();
  const q = useQuery({ queryKey: ["b2b-admin", "wallets", "statement", orgId], queryFn: () => adminCall<Statement>(`/admin/wallet/clients/${orgId}/statement?from=${from}&to=${to}`, token) });
  if (q.error) return <p className="px-4 py-2 text-[13px] text-red-700">{errorMessage(q.error)}</p>;
  if (!q.data) return null;
  return (
    <div className="bg-slate-50 px-4 py-2 text-[12px]">
      <p className="text-slate-500">Last 30 days · opening {inr(q.data.openingPaise)}</p>
      {q.data.lines.map((l, i) => (
        <p key={i} className="flex gap-2 text-slate-700"><span className="w-24 text-slate-500">{new Date(l.at).toLocaleDateString("en-IN")}</span><span>{l.description}</span>{l.memo && <span className="text-slate-500">{l.memo}</span>}<span className="ml-auto">{inr(l.amountPaise)}</span><span className="w-24 text-right text-slate-500">{inr(l.balancePaise)}</span></p>
      ))}
      <p className="font-medium text-slate-900">Closing {inr(q.data.closingPaise)}</p>
    </div>
  );
}

function ClientsPanel({ token, picked, onPick }: { token: string; picked: string | null; onPick: (id: string | null) => void }) {
  const q = useQuery({ queryKey: ["b2b-admin", "wallets", "clients"], queryFn: () => adminCall<{ data: ClientWallet[] }>("/admin/wallet/clients", token), retry: false });
  return (
    <FleetPanel title="Client wallets" description="Overdue credit first. Pick a client to see its statement and to propose credit or an adjustment." icon={Wallet} bodyClassName="p-0">
      {q.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {!q.isLoading && (q.data?.data ?? []).length === 0 && <FleetEmptyState icon={Wallet} title="No client wallets yet" hint="A wallet opens when a client company is verified." />}
      {(q.data?.data ?? []).map((w) => (
        <div key={w.clientOrgId}>
          <button className={`flex w-full flex-wrap items-center gap-3 px-4 py-2 text-left text-[13px] hover:bg-slate-50 ${picked === w.clientOrgId ? "bg-orange-50" : ""}`} onClick={() => onPick(picked === w.clientOrgId ? null : w.clientOrgId)}>
            <span className="font-medium text-slate-900">{w.name}</span>
            {w.reference && <span className="font-mono text-[11px] text-slate-500">{w.reference}</span>}
            {w.overdue && <FleetPill className={fleetTone.red}>Credit overdue</FleetPill>}
            {w.pendingOps > 0 && <FleetPill className={fleetTone.amber}>{w.pendingOps} finishing</FleetPill>}
            <span className="ml-auto text-slate-600">balance <b className={w.balancePaise < 0 ? "text-red-700" : "text-slate-900"}>{inr(w.balancePaise)}</b></span>
            <span className="text-slate-600">held {inr(w.heldPaise)}</span>
            {w.creditLimitPaise > 0 && <span className="text-slate-600">credit {inr(w.creditUsedPaise)} / {inr(w.creditLimitPaise)}</span>}
          </button>
          {picked === w.clientOrgId && <ClientStatement token={token} orgId={w.clientOrgId} />}
        </div>
      ))}
    </FleetPanel>
  );
}

function ManualCreditsReport({ token }: { token: string }) {
  const [date, setDate] = useState(() => istDay());
  const q = useQuery({ queryKey: ["b2b-admin", "wallets", "report", date], queryFn: () => adminCall<Report>(`/admin/wallet/manual-credits?date=${date}`, token), retry: false });
  return (
    <FleetPanel title="Manual credits report" description="Money added to wallets by hand on a day — bank transfers approved and wallet adjustments — with who checked and who approved." icon={FileText} bodyClassName="p-0">
      <div className="flex items-center gap-2 px-4 py-2 text-[13px]">
        <input type="date" className="h-8 rounded-md border border-slate-200 px-2" value={date} onChange={(e) => setDate(e.target.value)} />
        {q.data && <span className="ml-auto font-semibold text-slate-900">Total {inr(q.data.totalPaise)}</span>}
      </div>
      {q.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {q.data?.rows.length === 0 && <FleetEmptyState icon={FileText} title="Nothing added by hand on this day" />}
      {q.data?.rows.map((r) => (
        <p key={r.id} className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-1.5 text-[13px] text-slate-700">
          <span className="w-28">{r.kind === "BANK_TRANSFER" ? "Bank transfer" : "Adjustment"}</span>
          <span>client {r.clientOrgId.slice(-6)} · {r.ref} · {r.detail}</span>
          <span className="text-slate-500">{r.checkedBy} → {r.approvedBy}</span>
          <span className="ml-auto font-medium">{inr(r.amountPaise)}</span>
        </p>
      ))}
    </FleetPanel>
  );
}

const SECTIONS = [
  { key: "clients", label: "Clients" },
  { key: "queues", label: "Approvals" },
  { key: "report", label: "Manual credits report" },
] as const;

export function WalletsTab({ token }: { token: string }) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]["key"]>("clients");
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {SECTIONS.map((s) => (
          <button key={s.key} onClick={() => setSection(s.key)} className={`rounded-md border px-3 py-1 text-[12px] ${section === s.key ? "border-[#FE5300] bg-orange-50 font-medium text-[#FE5300]" : "border-slate-200 bg-white text-slate-600"}`}>{s.label}</button>
        ))}
      </div>
      {section === "clients" && (
        <>
          <ClientsPanel token={token} picked={picked} onPick={setPicked} />
          {picked && <CreditLinesPanel token={token} clientOrgId={picked} />}
          {picked && <AdjustmentsPanel token={token} clientOrgId={picked} />}
        </>
      )}
      {section === "queues" && (
        <>
          <BankTransfersPanel token={token} />
          <CreditLinesPanel token={token} clientOrgId={null} />
          <AdjustmentsPanel token={token} clientOrgId={null} />
        </>
      )}
      {section === "report" && <ManualCreditsReport token={token} />}
    </div>
  );
}
