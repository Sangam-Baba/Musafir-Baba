"use client";
// Hotel statement (Stage 09): what MusafirBaba owes the hotel for each booking (pending, ready to pay, paid) and the
// payouts made (with the bank UTR), for a period by check-out date — and a CSV download. Owners only.
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { b2b, B2B_API, refreshBusinessSession } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader } from "@/b2b/components/portal/ui";
import { errorMessage } from "@/b2b/messages";
import { useBusinessSession } from "@/b2b/session-store";
import { inr } from "@/b2b/website/hotels";

type Statement = {
  from: string;
  to: string;
  lines: { bookingRef: string; orderRef: string; checkOut: string; amountPaise: number; status: "PENDING" | "ELIGIBLE" | "PAID"; paidAt: string | null }[];
  payouts: { ref: string; utr: string; paidOn: string; amountPaise: number }[];
  totals: { pendingPaise: number; readyPaise: number; paidPaise: number; payoutsPaise: number };
};
const STATUS = { PENDING: "Stay not over yet", ELIGIBLE: "Ready to pay", PAID: "Paid" } as const;
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
};

function StatementView() {
  const [from, setFrom] = useState(() => day(-30));
  const [to, setTo] = useState(() => day(30));
  const q = useQuery({ queryKey: ["b2b", "statement", from, to], queryFn: () => b2b<Statement>(`/hotel/statements?from=${from}&to=${to}`) });
  async function download() {
    const get = (token: string | null) => fetch(`${B2B_API}/hotel/statements.csv?from=${from}&to=${to}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include" });
    try {
      let res = await get(useBusinessSession.getState().accessToken);
      if (res.status === 401) res = await get(await refreshBusinessSession());
      if (!res.ok) throw new Error("Download failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `musafirbaba-statement-${from}-to-${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  const s = q.data;
  return (
    <div className="space-y-4">
      <PageHeader title="Your" highlight="statement" subtitle="What MusafirBaba owes you per booking and what was paid. Bookings become ready to pay after the stay; payouts are made by bank transfer." />
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <label>From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-lg border border-slate-200 px-2" /></label>
        <label>To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-lg border border-slate-200 px-2" /></label>
        <button onClick={download} className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5"><Download size={14} /> CSV</button>
      </div>
      {q.error && <p className="text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {s && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[["Ready to pay", s.totals.readyPaise], ["Stays not over yet", s.totals.pendingPaise], ["Paid", s.totals.paidPaise]].map(([label, v]) => (
              <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[12px] text-slate-500">{label}</p><p className="text-lg font-semibold text-slate-900">{inr(Number(v))}</p></div>
            ))}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {s.lines.length === 0 && <p className="p-6 text-center text-[13px] text-slate-500">No bookings with check-out in this period.</p>}
            {s.lines.map((l) => (
              <div key={l.bookingRef} className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-2 text-[13px] last:border-0">
                <span className="font-mono text-[12px] text-slate-600">{l.bookingRef}</span>
                <span className="text-slate-600">check-out {l.checkOut}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${l.status === "PAID" ? "bg-emerald-50 text-emerald-700" : l.status === "ELIGIBLE" ? "bg-orange-50 text-[#FE5300]" : "bg-slate-100 text-slate-600"}`}>{STATUS[l.status]}</span>
                <span className="ml-auto font-medium text-slate-900">{inr(l.amountPaise)}</span>
              </div>
            ))}
          </div>
          {s.payouts.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-[13px]">
              <p className="mb-1 font-semibold text-slate-900">Payouts</p>
              {s.payouts.map((p) => <p key={p.ref} className="text-slate-700">{p.paidOn} · {inr(p.amountPaise)} · UTR {p.utr} · {p.ref}</p>)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function StatementPage() {
  return <BusinessShell>{(me) => (me.permissions.includes("wallet.statement.read") ? <StatementView /> : <p className="text-[13px] text-slate-600">Only the hotel&apos;s owner can see the statement.</p>)}</BusinessShell>;
}
