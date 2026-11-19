"use client";
// Finance → Accounts and corrections: every ledger account with its balance (worked out from the journal), the
// entries of one account, and correcting entries — one person proposes, a different person approves before anything
// is posted.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Loader2, Plus, Scale, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { REASON_CODES, REASON_LABEL, rupeesToPaise, type Adjustment, type JournalEntry, type LedgerAccount, type ReasonCode } from "../../../finance";
import { errorMessage } from "../../../messages";
import { inr } from "../../../website/hotels";
import { adminCall } from "../AdminPassGate";
import { FleetEmptyState, FleetPanel, FleetPill, fleetSelectClass, fleetTone, Input, inputSm, PrimaryBtn, SecondaryBtn } from "../kit";

const ADJ_TONE: Record<Adjustment["status"], string> = { PROPOSED: fleetTone.amber, POSTED: fleetTone.emerald, REJECTED: fleetTone.slate };
const accountLabel = (a: LedgerAccount) => `${a.name}${a.ownerType === "PLATFORM" ? "" : ` · ${a.ownerOrgId.slice(-6)}`}`;

function Entries({ account, token, names }: { account: LedgerAccount; token: string; names: Map<string, string> }) {
  const q = useQuery({ queryKey: ["b2b-admin", "finance", "entries", account.id], queryFn: () => adminCall<{ data: JournalEntry[] }>(`/admin/accounts/${account.id}/entries`, token) });
  if (q.isLoading) return <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400" /></div>;
  if (q.error) return <p className="px-4 py-2 text-[12px] text-red-700">{errorMessage(q.error)}</p>;
  const rows = q.data?.data ?? [];
  if (rows.length === 0) return <p className="px-4 py-2 text-[12px] text-slate-500">No entries yet.</p>;
  return (
    <ul className="divide-y divide-slate-100 bg-slate-50 text-[12px]">
      {rows.map((e) => (
        <li key={e.id} className="px-4 py-2">
          <p className="text-slate-500">{new Date(e.at).toLocaleString("en-IN")} · {e.purpose} · {e.reference.type}/{e.reference.id} · by {e.createdBy}</p>
          {e.memo && <p className="text-slate-600">{e.memo}</p>}
          <ul className="mt-1 space-y-0.5">
            {e.lines.map((l, i) => (
              <li key={i} className={l.accountId === account.id ? "font-medium text-slate-800" : "text-slate-600"}>
                {l.debitPaise ? `Dr ${inr(l.debitPaise)}` : `Cr ${inr(l.creditPaise ?? 0)}`} · {names.get(l.accountId) ?? l.accountId}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function Accounts({ token, accounts, loading }: { token: string; accounts: LedgerAccount[]; loading: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const names = new Map(accounts.map((a) => [a.id, accountLabel(a)]));
  return (
    <FleetPanel title="Accounts" description="Balances are worked out from the journal every few minutes — the time shows how fresh each one is." icon={BookOpen} bodyClassName="p-0">
      {loading && <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>}
      {!loading && accounts.length === 0 && <FleetEmptyState icon={BookOpen} title="No accounts yet" />}
      <div className="divide-y divide-slate-100">
        {accounts.map((a) => (
          <div key={a.id}>
            <button className="flex w-full flex-wrap items-center gap-2 px-4 py-2 text-left text-[13px] hover:bg-slate-50" onClick={() => setOpen(open === a.id ? null : a.id)}>
              <span className="min-w-56 font-medium text-slate-800">{accountLabel(a)}</span>
              <FleetPill className={fleetTone.slate}>{a.ownerType}</FleetPill>
              <span className="ml-auto font-mono text-slate-800">{inr(a.balancePaise)}</span>
              <span className="w-40 text-right text-[11px] text-slate-400">{a.asOf ? new Date(a.asOf).toLocaleString("en-IN") : "not worked out yet"}</span>
            </button>
            {open === a.id && <Entries account={a} token={token} names={names} />}
          </div>
        ))}
      </div>
    </FleetPanel>
  );
}

type DraftLine = { accountId: string; side: "debit" | "credit"; amount: string };

function ProposeForm({ token, accounts, onDone }: { token: string; accounts: LedgerAccount[]; onDone: () => void }) {
  const [reasonCode, setReason] = useState<ReasonCode>("BANK_CHARGES");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ accountId: "", side: "debit", amount: "" }, { accountId: "", side: "credit", amount: "" }]);
  const [busy, setBusy] = useState(false);
  const paise = lines.map((l) => rupeesToPaise(l.amount));
  const sum = (side: DraftLine["side"]) => lines.reduce((s, l, i) => s + (l.side === side ? (paise[i] ?? 0) : 0), 0);
  const balanced = sum("debit") > 0 && sum("debit") === sum("credit");
  const ready = balanced && note.trim().length >= 5 && lines.every((l, i) => l.accountId && paise[i]);
  const set = (i: number, patch: Partial<DraftLine>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  async function submit() {
    setBusy(true);
    try {
      const body = { reasonCode, note: note.trim(), lines: lines.map((l, i) => ({ accountId: l.accountId, [l.side === "debit" ? "debitPaise" : "creditPaise"]: paise[i] })) };
      await adminCall("/admin/adjustments", token, { method: "POST", body });
      toast.success("Proposed — another person with approval rights must approve it");
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-[13px]">
      <div className="flex flex-wrap gap-2">
        <select className={fleetSelectClass} value={reasonCode} onChange={(e) => setReason(e.target.value as ReasonCode)}>
          {REASON_CODES.map((r) => <option key={r} value={r}>{REASON_LABEL[r]}</option>)}
        </select>
        <Input className={`${inputSm} flex-1`} placeholder="Why (at least 5 characters) — e.g. bank fee on 18 Nov statement" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {lines.map((l, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <select className={`${fleetSelectClass} min-w-64`} value={l.accountId} onChange={(e) => set(i, { accountId: e.target.value })}>
            <option value="">Account…</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a)}</option>)}
          </select>
          <select className={fleetSelectClass} value={l.side} onChange={(e) => set(i, { side: e.target.value as DraftLine["side"] })}>
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </select>
          <Input className={`${inputSm} w-32`} placeholder="₹ amount" value={l.amount} onChange={(e) => set(i, { amount: e.target.value })} />
          {lines.length > 2 && <button aria-label="Remove line" onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-slate-400" /></button>}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <SecondaryBtn onClick={() => setLines([...lines, { accountId: "", side: "debit", amount: "" }])}><Plus className="h-3.5 w-3.5" /> Line</SecondaryBtn>
        <span className={`text-[12px] ${balanced ? "text-emerald-700" : "text-slate-500"}`}>Debits {inr(sum("debit"))} · Credits {inr(sum("credit"))}{balanced ? " · balanced" : " · must be equal"}</span>
        <span className="ml-auto"><PrimaryBtn disabled={!ready || busy} onClick={submit}>Propose</PrimaryBtn></span>
      </div>
    </div>
  );
}

function AdjustmentRow({ a, token, names }: { a: Adjustment; token: string; names: Map<string, string> }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function decide(action: "approve" | "reject") {
    setBusy(true);
    try {
      await adminCall(`/admin/adjustments/${a.id}/${action}`, token, { method: "POST", body: { note: note.trim() || null } });
      toast.success(action === "approve" ? "Approved — posted to the journal" : "Rejected");
      void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "finance"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-1 px-4 py-2 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <FleetPill className={ADJ_TONE[a.status]}>{a.status}</FleetPill>
        <span className="font-medium text-slate-800">{REASON_LABEL[a.reasonCode]}</span>
        <span className="text-slate-600">{a.note}</span>
        <span className="ml-auto text-[11px] text-slate-400">proposed by {a.proposedBy} · {new Date(a.createdAt).toLocaleString("en-IN")}</span>
      </div>
      <ul className="text-[12px] text-slate-600">
        {a.lines.map((l, i) => <li key={i}>{l.debitPaise ? `Dr ${inr(l.debitPaise)}` : `Cr ${inr(l.creditPaise ?? 0)}`} · {names.get(l.accountId) ?? l.accountId}</li>)}
      </ul>
      {a.decidedBy && <p className="text-[12px] text-slate-500">{a.status === "POSTED" ? "Approved" : "Rejected"} by {a.decidedBy}{a.decisionNote ? ` — ${a.decisionNote}` : ""}</p>}
      {a.status === "PROPOSED" && (
        <div className="flex flex-wrap items-center gap-2">
          <Input className={`${inputSm} w-72`} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <PrimaryBtn disabled={busy} onClick={() => decide("approve")}>Approve & post</PrimaryBtn>
          <SecondaryBtn danger disabled={busy} onClick={() => decide("reject")}>Reject</SecondaryBtn>
        </div>
      )}
    </div>
  );
}

function Corrections({ token, accounts }: { token: string; accounts: LedgerAccount[] }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const q = useQuery({ queryKey: ["b2b-admin", "finance", "adjustments"], queryFn: () => adminCall<{ data: Adjustment[] }>("/admin/adjustments", token) });
  const names = new Map(accounts.map((a) => [a.id, accountLabel(a)]));
  const rows = q.data?.data ?? [];
  return (
    <FleetPanel
      title="Corrections"
      description="Balances are never edited. A correction is a new balanced entry: one person proposes it with a reason, a different person approves it."
      icon={Scale}
      bodyClassName="p-0"
      actions={<SecondaryBtn onClick={() => setAdding(!adding)}><Plus className="h-3.5 w-3.5" /> {adding ? "Close" : "Propose a correction"}</SecondaryBtn>}
    >
      {adding && <ProposeForm token={token} accounts={accounts} onDone={() => { setAdding(false); void queryClient.invalidateQueries({ queryKey: ["b2b-admin", "finance", "adjustments"] }); }} />}
      {q.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {!q.isLoading && rows.length === 0 && <FleetEmptyState icon={Scale} title="No corrections" />}
      <div className="divide-y divide-slate-100">{rows.map((a) => <AdjustmentRow key={a.id} a={a} token={token} names={names} />)}</div>
    </FleetPanel>
  );
}

export function LedgerPanel({ token }: { token: string }) {
  const q = useQuery({ queryKey: ["b2b-admin", "finance", "accounts"], queryFn: () => adminCall<{ data: LedgerAccount[] }>("/admin/accounts", token) });
  const accounts = q.data?.data ?? [];
  return (
    <div className="space-y-3">
      {q.error && <p className="text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      <Accounts token={token} accounts={accounts} loading={q.isLoading} />
      <Corrections token={token} accounts={accounts} />
    </div>
  );
}
