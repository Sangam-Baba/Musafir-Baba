"use client";
// The website order page (Stage 08): everything comes from the server, so it is safe to refresh or open from the email.
// Waiting for payment → review + hold countdown + "Pay with PayU"; back from PayU → "checking your payment" (polls);
// confirmed → voucher, invoice, receipt; failed → what happened (and the refund, if paid); expired → start again.
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { B2B_API } from "../api";
import { errorMessage } from "../messages";
import { DOC_LABEL, documentUrl, getOrder, orderDocuments, randomId, startPayment, submitToPayu, type Order } from "./checkout";
import { inr, MEAL_LABEL } from "./hotels";

const PROCESSING = ["HOLDING", "PAYMENT_PENDING", "CONFIRMING"];

function useCountdown(until: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!until) return null;
  const ms = Math.max(0, Date.parse(until) - now);
  return { ms, text: `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0")}` };
}

function Items({ o }: { o: Order }) {
  return (
    <div className="space-y-3">
      {o.items.map((it) => (
        <div key={it.ref} className="space-y-1 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="text-base font-semibold text-slate-900">{it.property.name}</p>
          <p className="text-slate-600">{[it.property.address.line1, it.property.area, it.property.city].filter(Boolean).join(", ")}</p>
          <p className="text-slate-700">{it.roomTypeName} · {MEAL_LABEL[it.mealPlanKey ?? ""] ?? it.ratePlanName}</p>
          <p className="text-slate-700">Check-in {it.stay.checkIn}{it.property.checkInTime ? ` from ${it.property.checkInTime}` : ""} · Check-out {it.stay.checkOut}{it.property.checkOutTime ? ` by ${it.property.checkOutTime}` : ""} · {it.stay.nights} night{it.stay.nights > 1 ? "s" : ""}</p>
          <p className="text-slate-600">Guests: {it.rooms.map((r) => r.leadGuest).join(", ")}</p>
          {it.specialRequests && <p className="text-slate-600">Requests: {it.specialRequests}</p>}
          <p className={`text-xs ${it.cancellation.nonRefundable ? "text-slate-500" : "text-emerald-700"}`}>{it.cancellation.summary}</p>
          <p className="font-mono text-xs text-slate-400">{it.ref}</p>
        </div>
      ))}
    </div>
  );
}

function Pay({ o, linkKey, onPaid }: { o: Order; linkKey: string | null; onPaid: () => void }) {
  const left = useCountdown(o.holdExpiresAt);
  const [busy, setBusy] = useState(false);
  const requestKey = useRef(randomId());
  async function pay() {
    setBusy(true);
    try {
      submitToPayu(await startPayment(o.ref, linkKey, requestKey.current));
    } catch (e) {
      toast.error(errorMessage(e));
      requestKey.current = randomId();
      setBusy(false);
      onPaid();
    }
  }
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-slate-900">{inr(o.totalPaise)}</p>
          <p className="text-xs text-slate-500">incl. {inr(o.gstPaise)} GST</p>
        </div>
        {left && (
          <p className={`flex items-center gap-1.5 text-sm ${left.ms < 5 * 60_000 ? "text-red-600" : "text-slate-600"}`}><Clock size={16} /> Rooms held for {left.text}</p>
        )}
      </div>
      <button disabled={busy || left?.ms === 0} onClick={pay} className="w-full rounded-lg bg-[#FE5300] py-3 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Opening PayU…" : `Pay ${inr(o.totalPaise)} with PayU`}
      </button>
      <p className="text-xs text-slate-500">You pay on PayU&apos;s secure page (card, UPI, net banking). We confirm only after PayU confirms the payment to us.</p>
    </div>
  );
}

function Documents({ o, linkKey }: { o: Order; linkKey: string | null }) {
  const docs = useQuery({ queryKey: ["order-docs", o.ref], queryFn: () => orderDocuments(o.ref, linkKey), refetchInterval: (q) => ((q.state.data?.data.length ?? 0) < 2 ? 10_000 : false) });
  const list = docs.data?.data ?? [];
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <p className="font-semibold text-slate-900">Your documents</p>
      {list.length === 0 && <p className="text-slate-500">Preparing your voucher and receipt…</p>}
      {list.map((d) => (
        <a key={d.id} href={documentUrl(B2B_API, o.ref, d.id, linkKey)} target="_blank" rel="noopener noreferrer" className="block text-[#FE5300] underline">
          {DOC_LABEL[d.type]}{d.number ? ` ${d.number}` : ""}
        </a>
      ))}
      <p className="text-xs text-slate-500">Each opens as a page — use your browser&apos;s Print → Save as PDF to keep a copy. We also emailed them to {o.contact.email}.</p>
    </div>
  );
}

function Status({ o, back }: { o: Order; back: boolean }) {
  if (o.status === "CONFIRMED") return <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-emerald-800"><CheckCircle2 /> Your booking {o.ref} is confirmed.</p>;
  if (PROCESSING.includes(o.status) || (back && o.status === "AWAITING_PAYMENT"))
    return <p className="flex items-center gap-2 rounded-xl bg-sky-50 p-4 text-sky-800"><Loader2 className="animate-spin" /> Checking your payment with PayU — this page updates by itself. You can close it; we&apos;ll email you.</p>;
  if (o.status === "FAILED")
    return (
      <p className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-red-800"><XCircle />
        {o.failure?.code === "ROOMS_LOST" ? `The rooms sold out before your payment reached us. Your ${inr(o.totalPaise)} is being refunded to the same card, UPI or bank account — banks usually take a few working days.` : "This booking could not be completed. Nothing was charged for it."}
      </p>
    );
  if (o.status === "EXPIRED") return <p className="rounded-xl bg-slate-100 p-4 text-slate-700">The time to pay ran out and the rooms were released. <Link href="/hotels" className="font-medium text-[#FE5300] underline">Search again</Link></p>;
  return null;
}

export function BookingView({ orderRef, linkKey, paymentResult }: { orderRef: string; linkKey: string | null; paymentResult: string | null }) {
  const back = Boolean(paymentResult) && paymentResult !== "failed";
  const order = useQuery({
    queryKey: ["order", orderRef],
    queryFn: () => getOrder(orderRef, linkKey),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      if (!s || PROCESSING.includes(s) || (back && s === "AWAITING_PAYMENT")) return 3000;
      return s === "AWAITING_PAYMENT" ? 15_000 : false;
    },
  });
  if (order.isLoading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;
  if (order.isError || !order.data) return <p className="rounded-xl bg-red-50 p-6 text-sm text-red-700">{errorMessage(order.error)}</p>;
  const o = order.data;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <Status o={o} back={back} />
        {paymentResult === "failed" && o.status === "AWAITING_PAYMENT" && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">The payment didn&apos;t go through. You can try again while the rooms are held.</p>}
        <Items o={o} />
      </div>
      <div className="space-y-4">
        {o.status === "AWAITING_PAYMENT" && !back && <Pay o={o} linkKey={linkKey} onPaid={() => void order.refetch()} />}
        {o.status === "CONFIRMED" && <Documents o={o} linkKey={linkKey} />}
        <p className="text-xs text-slate-500">Booking {o.ref} · Need help? +91 92896 02447 · care@musafirbaba.com</p>
      </div>
    </div>
  );
}
