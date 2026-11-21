"use client";
// One hotel booking for its customer (Stage 09): the stay, the cancellation terms — deadlines in hotel time and in the
// viewer's own time —, what cancelling now would cost, payments and refunds, documents, and cancelling (a signed quote
// first — charge and refund — then a confirmation; the refund goes back to the card / UPI / bank account).
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { B2B_API } from "../api";
import { errorMessage } from "../messages";
import { ChangeRequests } from "./ChangeRequests";
import { NoShowBox } from "./NoShowBox";
import { cancelHotelBooking, cancellationQuote, DOC_LABEL, documentUrl, hotelBooking, randomId, STATUS_TEXT, type CancellationQuote, type Moment } from "./checkout";
import { inr, MEAL_LABEL } from "./hotels";

const yourTime = (m: Moment) => new Date(m.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const When = ({ m }: { m: Moment }) => <span>{m.hotelTime} hotel time<span className="text-slate-400"> ({yourTime(m)} your time)</span></span>;

function CancelBox({ bookingRef, linkKey, onDone }: { bookingRef: string; linkKey: string | null; onDone: () => void }) {
  const [quote, setQuote] = useState<CancellationQuote | null>(null);
  const [agree, setAgree] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestKey] = useState(() => randomId());
  async function ask() {
    setBusy(true);
    try {
      setQuote(await cancellationQuote(bookingRef, linkKey));
      setAgree(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!quote) return;
    setBusy(true);
    try {
      const r = await cancelHotelBooking(bookingRef, linkKey, quote.quoteToken, reason.trim() || null, requestKey);
      toast.success(r.refundPaise > 0 ? `Cancelled. ${inr(r.refundPaise)} is on its way back to you.` : "Cancelled.");
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
      setQuote(null);
    } finally {
      setBusy(false);
    }
  }
  if (!quote) return <button disabled={busy} onClick={ask} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 disabled:opacity-50">{busy ? "Checking…" : "Cancel this booking"}</button>;
  return (
    <div className="space-y-2 rounded-lg bg-red-50 p-3 text-sm text-red-900">
      <p>Cancel now: charge <strong>{inr(quote.chargePaise)}</strong>, refund <strong>{inr(quote.refundPaise)}</strong> to the same card, UPI or bank account (banks usually take a few working days). This price holds for 5 minutes.</p>
      <input className="block h-9 w-full rounded-lg border border-red-200 bg-white px-2 text-sm" placeholder="Reason (optional)" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
      {quote.chargePaise > 0 && <label className="flex items-center gap-2"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> I understand {inr(quote.chargePaise)} will not be refunded.</label>}
      <div className="flex gap-2">
        <button disabled={busy || (quote.chargePaise > 0 && !agree)} onClick={confirm} className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white disabled:opacity-50">{busy ? "Cancelling…" : "Yes, cancel"}</button>
        <button onClick={() => setQuote(null)} className="rounded-lg border border-red-200 bg-white px-3 py-1.5">Keep my booking</button>
      </div>
    </div>
  );
}

export function HotelBookingDetail({ bookingRef, linkKey }: { bookingRef: string; linkKey: string | null }) {
  const q = useQuery({ queryKey: ["hotel-booking", bookingRef], queryFn: () => hotelBooking(bookingRef, linkKey) });
  if (q.isLoading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;
  if (q.isError || !q.data) return <p className="rounded-xl bg-red-50 p-6 text-sm text-red-700">{errorMessage(q.error)}</p>;
  const { booking: b, terms: t, order, payments, refunds, documents } = q.data;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-slate-900">{b.property.name}<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-700">{STATUS_TEXT[b.status] ?? b.status}</span></p>
          <p className="text-slate-600">{[b.property.address.line1, b.property.area, b.property.city].filter(Boolean).join(", ")}</p>
          <p className="text-slate-700">{b.roomTypeName} · {MEAL_LABEL[b.mealPlanKey ?? ""] ?? b.ratePlanName}</p>
          <p className="text-slate-700">Check-in {t.checkInHotelTime} · Check-out {b.stay.checkOut}{b.property.checkOutTime ? ` by ${b.property.checkOutTime}` : ""} · {b.stay.nights} night{b.stay.nights > 1 ? "s" : ""}</p>
          <p className="text-slate-600">Guests: {b.rooms.map((r) => r.leadGuest).join(", ")}</p>
          {b.specialRequests && <p className="text-slate-600">Requests: {b.specialRequests}</p>}
          <p className="font-mono text-xs text-slate-400">{b.ref} · order {order.ref}</p>
        </div>
        <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="font-semibold text-slate-900">Cancellation</p>
          {t.nonRefundable ? <p className="text-slate-700">Non-refundable: cancelling costs the full amount.</p> : t.freeUntil ? <p className="text-emerald-700">Free cancellation until <When m={t.freeUntil} /></p> : <p className="text-emerald-700">Free cancellation until check-in.</p>}
          {!t.nonRefundable && t.steps.map((s, i) => s.from && <p key={i} className="text-slate-700">From <When m={s.from} />: {s.text}</p>)}
          {b.status === "CONFIRMED" && <p className="text-slate-700">If you cancel now: charge {inr(t.ifCancelledNow.chargePaise)}, refund {inr(t.ifCancelledNow.refundPaise)}.</p>}
          {b.status === "CONFIRMED" && !t.canCancelOnline && <p className="text-xs text-slate-500">Online cancellation has closed for this stay — please call +91 92896 02447.</p>}
          {b.status === "CONFIRMED" && t.canCancelOnline && <CancelBox bookingRef={b.ref} linkKey={linkKey} onDone={() => void q.refetch()} />}
          {b.cancelled && <p className="text-slate-700">Cancelled: charge {inr(b.cancelled.chargePaise)}, refund {inr(b.cancelled.refundPaise)}.</p>}
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="text-xl font-bold text-slate-900">{inr(order.totalPaise)}</p>
          <p className="text-xs text-slate-500">incl. {inr(order.gstPaise)} GST</p>
          {payments.map((p) => <p key={p.txnId} className="text-xs text-slate-600">Paid {inr(p.amountPaise)}{p.mode ? ` · ${p.mode}` : ""} · {new Date(p.at).toLocaleString("en-IN")}</p>)}
          {refunds.map((r, i) => <p key={i} className="text-xs text-emerald-700">Refund {inr(r.amountPaise)} · {r.status === "SUCCEEDED" ? "done" : "on the way"} · {new Date(r.at).toLocaleDateString("en-IN")}</p>)}
        </div>
        {b.status === "NO_SHOW" && <NoShowBox bookingRef={b.ref} linkKey={linkKey} />}
        <ChangeRequests bookingRef={b.ref} linkKey={linkKey} rooms={b.rooms} />
        {documents.length > 0 && (
          <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <p className="font-semibold text-slate-900">Documents</p>
            {documents.map((d) => <a key={d.id} href={documentUrl(B2B_API, order.ref, d.id, linkKey)} target="_blank" rel="noopener noreferrer" className="block text-[#FE5300] underline">{DOC_LABEL[d.type]}{d.number ? ` ${d.number}` : ""}</a>)}
          </div>
        )}
        <p className="text-xs text-slate-500">Need help? +91 92896 02447 · care@musafirbaba.com</p>
      </div>
    </div>
  );
}
