"use client";
// /buses/booking/[ref]?key — the website bus booking (Stage 18 B8). Everything comes from the server, so it's safe to
// refresh or open from the email: waiting → hold countdown + "Pay with PayU"; back from PayU → "checking your payment";
// confirmed → the e-ticket (print) and cancelling seats; failed / expired → what happened (and the refund, if paid).
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { rupees, type BusTicketView, type CancelQuote } from "../../bus";
import { BusTicket } from "../../components/bus/BusTicket";
import { errorMessage } from "../../messages";
import { randomId, startPayment, submitToPayu } from "../checkout";
import { busCancelQuote, cancelBusSeats, getBusOrder, type BusOrder } from "./busWeb";

const PROCESSING = ["HOLDING", "PAYMENT_PENDING", "CONFIRMING"];

function Countdown({ until }: { until: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!until) return null;
  const ms = Math.max(0, Date.parse(until) - now);
  return <span className="inline-flex items-center gap-1 text-sm text-amber-700"><Clock className="h-4 w-4" /> Seats held for {Math.floor(ms / 60_000)}:{String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0")}</span>;
}

function Pay({ o, linkKey }: { o: BusOrder; linkKey: string | null }) {
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
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
      <Countdown until={o.holdExpiresAt} />
      <b className="ml-auto text-xl">{rupees(o.totalPaise)}</b>
      <button type="button" disabled={busy} onClick={pay} className="inline-flex items-center gap-2 rounded-lg bg-[#FE5300] px-5 py-2.5 font-semibold text-white disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />} Pay with PayU</button>
    </div>
  );
}

function CancelSeats({ t, linkKey, onDone }: { t: BusTicketView; linkKey: string | null; onDone: () => void }) {
  const left = t.seats.map((s) => s.no).filter((no) => !t.cancelledSeats.includes(no));
  const [picked, setPicked] = useState<string[]>([]);
  const [quote, setQuote] = useState<CancelQuote | null>(null);
  const [busy, setBusy] = useState(false);
  if (t.status !== "CONFIRMED" || !left.length) return null;
  async function ask(next: string[]) {
    setPicked(next);
    setQuote(null);
    if (next.length) setQuote(await busCancelQuote(t.ref, next, linkKey).catch((e) => (toast.error(errorMessage(e)), null)));
  }
  async function cancel() {
    if (!quote || !window.confirm(`Cancel ${picked.join(", ")}? Refund ${rupees(quote.refundPaise)}.`)) return;
    setBusy(true);
    try {
      await cancelBusSeats(t.ref, picked, quote.refundPaise, linkKey);
      toast.success(`Cancelled — ${rupees(quote.refundPaise)} will be refunded`);
      onDone();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm print:hidden">
      <p className="font-semibold">Cancel seats</p>
      {t.cancellationPolicy && <p className="text-slate-500">Charges: {t.cancellationPolicy.summary}</p>}
      <div className="mt-2 flex flex-wrap gap-2">{left.map((no) => <button key={no} type="button" onClick={() => ask(picked.includes(no) ? picked.filter((x) => x !== no) : [...picked, no])} className={`rounded-full px-3 py-1 ${picked.includes(no) ? "bg-red-600 text-white" : "border border-slate-300 bg-white"}`}>{no}</button>)}</div>
      {quote && <div className="mt-3 flex flex-wrap items-center gap-3"><span>Charge {rupees(quote.chargePaise)} · <b>Refund {rupees(quote.refundPaise)}</b></span><button type="button" disabled={busy} onClick={cancel} className="rounded-lg bg-red-600 px-3 py-1.5 font-medium text-white disabled:opacity-50">Cancel {picked.join(", ")}</button></div>}
    </div>
  );
}

export function BusBookingWeb() {
  const { ref } = useParams<{ ref: string }>();
  const linkKey = useSearchParams().get("key");
  const q = useQuery({ queryKey: ["bus-order", ref, linkKey], queryFn: () => getBusOrder(ref, linkKey), refetchInterval: (query) => (PROCESSING.includes(query.state.data?.status ?? "") ? 3000 : false) });
  if (q.isError) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{errorMessage(q.error)}</p>;
  if (!q.data) return <Loader2 className="h-6 w-6 animate-spin text-slate-400" />;
  const o = q.data;
  const t = o.items[0];
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Booking {o.ref}</p>
      {o.status === "AWAITING_PAYMENT" && <Pay o={o} linkKey={linkKey} />}
      {PROCESSING.includes(o.status) && <p className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-slate-700"><Loader2 className="h-4 w-4 animate-spin" /> Checking your payment…</p>}
      {(o.status === "CONFIRMED" || o.status === "COMPLETED") && <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 font-semibold text-emerald-800"><CheckCircle2 className="h-5 w-5" /> Confirmed — your e-ticket is below and in your email.</p>}
      {(o.status === "FAILED" || o.status === "EXPIRED") && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="flex items-center gap-2 font-semibold"><XCircle className="h-5 w-5" /> {o.status === "EXPIRED" ? "The seat hold ran out." : "This booking didn't go through."}</p>
          {o.payment.verified && <p className="mt-1">Your payment is being refunded to the same card, UPI or bank account.</p>}
          <Link href="/buses" className="mt-2 inline-block font-medium underline">Search again</Link>
        </div>
      )}
      {o.status === "CANCELLED" && <p className="rounded-xl bg-slate-50 p-4 text-slate-700">This booking is cancelled. Refunds go back to the same card, UPI or bank account.</p>}
      {t && <BusTicket t={t} />}
      {t && <CancelSeats t={t} linkKey={linkKey} onDone={() => q.refetch()} />}
    </div>
  );
}
