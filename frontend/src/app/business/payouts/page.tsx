"use client";
// Hotel payouts (Stage 15): each payout MusafirBaba made (bookings, deductions, net, bank reference), and questions
// about an amount — while a question is open, the next payout waits for MusafirBaba's answer. Owners only.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, HelpCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader, Panel } from "@/b2b/components/portal/ui";
import { errorMessage } from "@/b2b/messages";
import { indiaDay, type Dispute, type PayoutLine, type PayoutStatement } from "@/b2b/payouts";
import { inr } from "@/b2b/website/hotels";

type StatementLine = { payableId: string; bookingRef: string; checkOut: string; amountPaise: number; status: "PENDING" | "ELIGIBLE" | "PAID" };
const DISPUTE_LABEL = { OPEN: "Waiting for MusafirBaba", ACCEPTED: "Accepted", REJECTED: "Not accepted" } as const;

function PayoutDetail({ id }: { id: string }) {
  const q = useQuery({ queryKey: ["b2b", "payout", id], queryFn: () => b2b<PayoutStatement>(`/hotel/payouts/${id}/statement`) });
  const s = q.data;
  if (q.error) return <p className="px-4 py-2 text-[13px] text-red-700">{errorMessage(q.error)}</p>;
  if (!s) return <p className="px-4 py-2 text-[13px] text-slate-500">Loading…</p>;
  return (
    <div className="space-y-1 bg-slate-50 px-4 py-3 text-[13px]">
      {s.lines.map((l) => (
        <p key={l.payableId} className="flex gap-3 text-slate-700"><span className="font-mono text-[12px]">{l.bookingRef}</span><span className="text-slate-500">check-out {l.checkOut}</span><span className="ml-auto">{inr(l.amountPaise)}</span></p>
      ))}
      {s.deductions.map((d) => (
        <p key={d.ruleId} className="flex text-slate-600"><span>{d.label}</span><span className="ml-auto">− {inr(d.amountPaise)}</span></p>
      ))}
      <p className="flex border-t border-slate-200 pt-1 font-semibold text-slate-900"><span>Paid to your bank{s.bankReference ? ` (ref ${s.bankReference})` : ""}</span><span className="ml-auto">{inr(s.netPaise)}</span></p>
    </div>
  );
}

function Payouts() {
  const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({ queryKey: ["b2b", "payouts"], queryFn: () => b2b<{ data: PayoutLine[] }>("/hotel/payouts") });
  const rows = q.data?.data ?? [];
  return (
    <Panel icon={Banknote} title="Payouts" subtitle="Bank transfers from MusafirBaba, usually weekly. Open one to see its bookings and deductions.">
      {q.error && <p className="text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {!q.isLoading && rows.length === 0 && <p className="py-4 text-center text-[13px] text-slate-500">No payouts yet. Bookings become ready to pay after the guest checks out.</p>}
      <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100">
        {rows.map((p) => (
          <div key={p.id}>
            <button onClick={() => setOpen(open === p.id ? null : p.id)} className="flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] hover:bg-slate-50">
              <span className="text-slate-700">{p.payables} booking{p.payables === 1 ? "" : "s"}</span>
              {p.deductions.length > 0 && <span className="text-[12px] text-slate-500">after deductions</span>}
              <span className="ml-auto font-semibold text-slate-900">{inr(p.netPaise)}</span>
            </button>
            {open === p.id && <PayoutDetail id={p.id} />}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function AskForm({ line, onDone }: { line: StatementLine; onDone: () => void }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      await b2b("/hotel/statement-disputes", { method: "POST", body: { payableId: line.payableId, message: message.trim() } });
      toast.success("Sent — MusafirBaba will answer; your next payout waits until then");
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2 bg-orange-50/40 px-4 py-2">
      <input className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-[13px]" placeholder="What looks wrong? e.g. Late checkout charge missing" value={message} onChange={(e) => setMessage(e.target.value)} />
      <button disabled={busy || message.trim().length < 5} onClick={send} className="rounded-lg bg-[#FE5300] px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50">Send question</button>
    </div>
  );
}

function Questions() {
  const qc = useQueryClient();
  const [asking, setAsking] = useState<string | null>(null);
  const mine = useQuery({ queryKey: ["b2b", "disputes"], queryFn: () => b2b<{ data: Dispute[] }>("/hotel/statement-disputes") });
  const recent = useQuery({ queryKey: ["b2b", "statement", "recent"], queryFn: () => b2b<{ lines: StatementLine[] }>(`/hotel/statements?from=${indiaDay(-90)}&to=${indiaDay(30)}`) });
  const open = new Set((mine.data?.data ?? []).filter((d) => d.status === "OPEN").map((d) => d.payableId));
  const done = () => {
    setAsking(null);
    void qc.invalidateQueries({ queryKey: ["b2b", "disputes"] });
  };
  return (
    <Panel icon={HelpCircle} title="Question an amount" subtitle="If what MusafirBaba owes you for a booking looks wrong, ask here. Your next payout waits until MusafirBaba answers.">
      {(mine.data?.data ?? []).length > 0 && (
        <div className="mb-3 space-y-1 text-[13px]">
          {(mine.data?.data ?? []).map((d) => (
            <p key={d.id} className="text-slate-700"><span className="font-mono text-[12px]">{d.bookingRef}</span> · “{d.message}” · <b>{DISPUTE_LABEL[d.status]}</b>{d.resolution ? ` — ${d.resolution}` : ""}</p>
          ))}
        </div>
      )}
      <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100">
        {(recent.data?.lines ?? []).map((l) => (
          <div key={l.payableId}>
            <div className="flex flex-wrap items-center gap-3 px-4 py-2 text-[13px]">
              <span className="font-mono text-[12px] text-slate-600">{l.bookingRef}</span>
              <span className="text-slate-500">check-out {l.checkOut}</span>
              <span className="ml-auto text-slate-900">{inr(l.amountPaise)}</span>
              {open.has(l.payableId) ? <span className="text-[12px] text-amber-700">Question open</span> : <button onClick={() => setAsking(asking === l.payableId ? null : l.payableId)} className="text-[12px] text-[#FE5300] hover:underline">Ask</button>}
            </div>
            {asking === l.payableId && <AskForm line={l} onDone={done} />}
          </div>
        ))}
        {!recent.isLoading && (recent.data?.lines ?? []).length === 0 && <p className="p-4 text-center text-[13px] text-slate-500">No bookings in the last 90 days.</p>}
      </div>
    </Panel>
  );
}

export default function PayoutsPage() {
  return (
    <BusinessShell>
      {(me) =>
        me.permissions.includes("wallet.statement.read") ? (
          <div className="space-y-4">
            <PageHeader title="Your" highlight="payouts" subtitle="What MusafirBaba paid you, and questions about an amount." />
            <Payouts />
            <Questions />
          </div>
        ) : (
          <p className="text-[13px] text-slate-600">Only the hotel&apos;s owner can see payouts.</p>
        )
      }
    </BusinessShell>
  );
}
