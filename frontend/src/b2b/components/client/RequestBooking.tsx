"use client";
// "Request booking" (D37) on a room in the B2B dashboard: the agent gives the customer's details; MusafirBaba arranges
// the stay offline and confirms or declines it. No payment and no rooms are taken here. A changed price is shown and
// the agent sends again on the new price.
import { useState } from "react";
import { toast } from "sonner";

import { B2BError, b2b } from "../../api";
import type { BookingRequest } from "../../booking-requests";
import { errorMessage } from "../../messages";
import { inr, type Offer } from "../../website/hotels";

const input = "h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[13px]";

export function RequestBooking({ offer }: { offer: Offer }) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(offer.priceToken);
  const [total, setTotal] = useState(offer.price.totalPaise);
  const [f, setF] = useState({ name: "", phone: "", email: "", reference: "", guests: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<BookingRequest | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const guestNames = f.guests.split(",").map((g) => g.trim()).filter(Boolean);
      const body = { priceToken: token, customer: { name: f.name.trim(), phone: f.phone.trim() || null, email: f.email.trim() || null, reference: f.reference.trim() || null, guestNames }, notes: f.notes.trim() || null };
      const r = await b2b<BookingRequest>("/booking-requests", { method: "POST", body });
      setSent(r);
      toast.success(`Request ${r.ref} sent — MusafirBaba will confirm it with you`);
    } catch (err) {
      if (err instanceof B2BError && err.code === "PRICE_CHANGED") {
        const d = err.details as { price?: { totalPaise?: number }; priceToken?: string };
        if (d.priceToken) setToken(d.priceToken);
        if (d.price?.totalPaise) setTotal(d.price.totalPaise);
        toast.warning(`The price changed to ${inr(d.price?.totalPaise ?? 0)} — check it and send again.`);
      } else toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (sent) return <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">Request <strong>{sent.ref}</strong> sent. Follow it under Booking Requests.</p>;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 rounded-lg bg-[#FE5300] px-4 py-2 text-sm font-semibold text-white">
        Request booking
      </button>
    );
  return (
    <form onSubmit={send} className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-[13px]">
      <p className="font-medium text-slate-800">Request this room for your customer · {inr(total)} incl. GST</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={input} placeholder="Customer name *" required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={input} placeholder="Your reference (optional)" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
        <input className={input} placeholder="Customer phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
        <input className={input} type="email" placeholder="Customer email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      </div>
      <input className={input} placeholder="Guest names, separated by commas" value={f.guests} onChange={(e) => setF({ ...f, guests: e.target.value })} />
      <textarea className={`${input} h-16 py-1.5`} placeholder="Notes for MusafirBaba (e.g. late check-in)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
      <p className="text-xs text-slate-500">No payment now — MusafirBaba confirms the room and the payment with you directly.</p>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded-lg bg-[#FE5300] px-4 py-2 font-semibold text-white disabled:opacity-60">{busy ? "Sending…" : "Send request"}</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-700">Cancel</button>
      </div>
    </form>
  );
}
