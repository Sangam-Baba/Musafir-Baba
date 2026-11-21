"use client";
// One hotel booking for its customer (Stage 09): the stay, the cancellation terms — deadlines in hotel time and in the
// viewer's own time —, what cancelling now would cost, payments and refunds, documents. Cancel comes with S09-T05.
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { B2B_API } from "../api";
import { errorMessage } from "../messages";
import { DOC_LABEL, documentUrl, hotelBooking, STATUS_TEXT, type Moment } from "./checkout";
import { inr, MEAL_LABEL } from "./hotels";

const yourTime = (m: Moment) => new Date(m.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const When = ({ m }: { m: Moment }) => <span>{m.hotelTime} hotel time<span className="text-slate-400"> ({yourTime(m)} your time)</span></span>;

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
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="text-xl font-bold text-slate-900">{inr(order.totalPaise)}</p>
          <p className="text-xs text-slate-500">incl. {inr(order.gstPaise)} GST</p>
          {payments.map((p) => <p key={p.txnId} className="text-xs text-slate-600">Paid {inr(p.amountPaise)}{p.mode ? ` · ${p.mode}` : ""} · {new Date(p.at).toLocaleString("en-IN")}</p>)}
          {refunds.map((r, i) => <p key={i} className="text-xs text-emerald-700">Refund {inr(r.amountPaise)} · {r.status === "SUCCEEDED" ? "done" : "on the way"} · {new Date(r.at).toLocaleDateString("en-IN")}</p>)}
        </div>
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
