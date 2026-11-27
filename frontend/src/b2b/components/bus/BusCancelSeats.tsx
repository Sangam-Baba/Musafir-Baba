"use client";
// Cancelling seats of a bus ticket (Stage 18 B7): pick seats → the refund at the slabs the ticket was sold with →
// confirm. The refund goes to the wallet at once (B2B) or back through PayU. The cancelled seats go on sale again.
import { useState } from "react";
import { toast } from "sonner";

import { B2BError, b2b } from "../../api";
import { rupees, type BusTicketView, type CancelQuote } from "../../bus";
import { errorMessage } from "../../messages";
import { idempotencyKey } from "../../wallet";

export function BusCancelSeats({ t, onDone }: { t: BusTicketView; onDone: () => void }) {
  const left = t.seats.map((s) => s.no).filter((no) => !t.cancelledSeats.includes(no));
  const [picked, setPicked] = useState<string[]>([]);
  const [quote, setQuote] = useState<CancelQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [key] = useState(() => idempotencyKey());
  if (!left.length) return null;
  async function ask(next: string[]) {
    setPicked(next);
    setQuote(null);
    if (!next.length) return;
    try {
      setQuote(await b2b<CancelQuote>(`/bookings/buses/${t.ref}/cancel-quote?seats=${next.join(",")}`));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  async function cancel() {
    if (!quote || !window.confirm(`Cancel seat${picked.length > 1 ? "s" : ""} ${picked.join(", ")}? Refund ${rupees(quote.refundPaise)}.`)) return;
    setBusy(true);
    try {
      await b2b(`/bookings/buses/${t.ref}/cancel`, { method: "POST", body: { seats: picked, expectedRefundPaise: quote.refundPaise }, headers: { "Idempotency-Key": key } });
      toast.success(`Cancelled — ${rupees(quote.refundPaise)} refunded`);
      onDone();
    } catch (err) {
      if (err instanceof B2BError && err.code === "REFUND_CHANGED") await ask(picked);
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-[12px] print:hidden">
      <p className="font-medium text-slate-800">Cancel seats</p>
      {t.cancellationPolicy && <p className="text-slate-500">Charges: {t.cancellationPolicy.summary}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {left.map((no) => (
          <button key={no} type="button" onClick={() => ask(picked.includes(no) ? picked.filter((x) => x !== no) : [...picked, no])} className={`rounded-full px-3 py-1 ${picked.includes(no) ? "bg-red-600 text-white" : "border border-slate-300 bg-white"}`}>{no}</button>
        ))}
      </div>
      {quote && (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span>Charge {rupees(quote.chargePaise)} ({quote.percent} %) · <b>Refund {rupees(quote.refundPaise)}</b></span>
          <button type="button" disabled={busy} onClick={cancel} className="rounded-md bg-red-600 px-3 py-1 font-medium text-white disabled:opacity-50">Cancel {picked.join(", ")}</button>
        </div>
      )}
    </div>
  );
}
