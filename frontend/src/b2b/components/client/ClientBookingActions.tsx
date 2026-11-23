"use client";
// On a B2B client's confirmed booking (Stage 12 part B): cancel (charge and refund shown first; a wallet booking is
// refunded straight into the wallet, a PayU booking to the card / bank) and change requests to MusafirBaba.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { errorMessage } from "../../messages";
import { idempotencyKey } from "../../wallet";
import { AMENDMENT_TYPES, type AmendmentType, type CancellationQuote, type ChangeRequest } from "../../website/checkout";
import { inr } from "../../website/hotels";

const STATUS_TEXT: Record<ChangeRequest["status"], string> = { OPEN: "Sent", IN_PROGRESS: "Being handled", WAITING_CUSTOMER: "Waiting for you", RESOLVED: "Resolved", CLOSED: "Closed" };

export function ClientBookingActions({ bookingRef, paidByWallet, canAct }: { bookingRef: string; paidByWallet: boolean; canAct: boolean }) {
  const qc = useQueryClient();
  const path = `/bookings/hotels/${encodeURIComponent(bookingRef)}`;
  const requests = useQuery({ queryKey: ["b2b", "change-requests", bookingRef], queryFn: () => b2b<{ data: ChangeRequest[] }>(`${path}/amendments`) });
  const [quote, setQuote] = useState<CancellationQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<{ type: AmendmentType; message: string } | null>(null);

  async function getQuote() {
    setBusy(true);
    try {
      setQuote(await b2b<CancellationQuote>(`${path}/cancellation-quote`, { method: "POST", body: {} }));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!quote) return;
    setBusy(true);
    try {
      const r = await b2b<{ refundPaise: number }>(`${path}/cancel`, { method: "POST", body: { quoteToken: quote.quoteToken }, headers: { "Idempotency-Key": idempotencyKey() } });
      toast.success(r.refundPaise > 0 ? `Cancelled — ${inr(r.refundPaise)} ${paidByWallet ? "is back in your wallet" : "is being refunded"}` : "Cancelled");
      setQuote(null);
      void qc.invalidateQueries({ queryKey: ["b2b"] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function sendRequest() {
    if (!ask) return;
    setBusy(true);
    try {
      await b2b<ChangeRequest>(`${path}/amendments`, { method: "POST", body: ask });
      toast.success("Sent — MusafirBaba will reply within 4 hours");
      setAsk(null);
      void qc.invalidateQueries({ queryKey: ["b2b", "change-requests", bookingRef] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 space-y-2 text-[13px]">
      {canAct && !quote && !ask && (
        <div className="flex gap-2">
          <button disabled={busy} onClick={getQuote} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5">Cancel booking</button>
          <button onClick={() => setAsk({ type: "OTHER", message: "" })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5">Ask for a change</button>
        </div>
      )}
      {quote && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p>Cancelling now: charge <b>{inr(quote.chargePaise)}</b>, refund <b>{inr(quote.refundPaise)}</b>{paidByWallet ? " straight into your wallet" : " to the card / bank used"}.</p>
          <div className="mt-2 flex gap-2">
            <button disabled={busy} onClick={cancel} className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white disabled:opacity-50">Yes, cancel</button>
            <button onClick={() => setQuote(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5">Keep it</button>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">This price is valid for 5 minutes.</p>
        </div>
      )}
      {ask && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <select className="h-8 rounded-lg border border-slate-200 bg-white px-2" value={ask.type} onChange={(e) => setAsk({ ...ask, type: e.target.value as AmendmentType })}>
            {Object.entries(AMENDMENT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <textarea className="w-full rounded-lg border border-slate-200 bg-white p-2" rows={3} maxLength={2000} placeholder="What would you like to change?" value={ask.message} onChange={(e) => setAsk({ ...ask, message: e.target.value })} />
          <div className="flex gap-2">
            <button disabled={busy || ask.message.trim().length < 2} onClick={sendRequest} className="rounded-lg bg-[#FE5300] px-3 py-1.5 font-medium text-white disabled:opacity-50">Send</button>
            <button onClick={() => setAsk(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5">Close</button>
          </div>
        </div>
      )}
      {(requests.data?.data ?? []).map((r) => (
        <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-2">
          <p className="font-medium text-slate-800">{AMENDMENT_TYPES[r.type]} · {STATUS_TEXT[r.status]}</p>
          {r.messages.slice(-2).map((m, i) => <p key={i} className="text-slate-600">{m.from.startsWith("staff") ? "MusafirBaba: " : "You: "}{m.text}</p>)}
          {r.resolution && <p className="text-emerald-700">{r.resolution}</p>}
        </div>
      ))}
    </div>
  );
}
