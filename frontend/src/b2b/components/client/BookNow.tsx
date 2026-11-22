"use client";
// "Book now" (Stage 12 part B) on a room in the B2B dashboard: lead guest per room, the guest's contact, the company's
// own reference → the rooms are held for the order and the agent goes to pay (wallet / credit or PayU). A changed price
// is shown and the agent books again on the new price.
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { B2BError, b2b } from "../../api";
import { errorMessage } from "../../messages";
import { idempotencyKey } from "../../wallet";
import type { Order } from "../../website/checkout";
import { inr, type Offer } from "../../website/hotels";

const input = "h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[13px]";

export function BookNow({ offer }: { offer: Offer }) {
  const router = useRouter();
  const rooms = Math.max(1, offer.price.rooms || 1);
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(offer.priceToken);
  const [total, setTotal] = useState(offer.price.totalPaise);
  const [guests, setGuests] = useState<string[]>(() => Array.from({ length: rooms }, () => ""));
  const [f, setF] = useState({ name: "", email: "", phone: "", reference: "", requests: "" });
  const [busy, setBusy] = useState(false);
  const [key] = useState(idempotencyKey);

  async function book(e: React.FormEvent, confirmDuplicate = false) {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        priceToken: token,
        rooms: guests.map((g) => ({ leadGuest: g.trim() })),
        contact: { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() },
        customerReference: f.reference.trim() || null,
        specialRequests: f.requests.trim() || null,
        ...(confirmDuplicate ? { confirmDuplicate: true } : {}),
      };
      const o = await b2b<Order>("/client/orders", { method: "POST", body, headers: { "Idempotency-Key": confirmDuplicate ? idempotencyKey() : key } });
      router.push(`/business/orders/${encodeURIComponent(o.ref)}`);
    } catch (err) {
      if (err instanceof B2BError && err.code === "PRICE_CHANGED") {
        const d = err.details as { price?: { totalPaise?: number }; priceToken?: string };
        if (d.priceToken) setToken(d.priceToken);
        if (d.price?.totalPaise) setTotal(d.price.totalPaise);
        toast.warning(`The price changed to ${inr(d.price?.totalPaise ?? 0)} — check it and book again.`);
      } else if (err instanceof B2BError && err.code === "DUPLICATE_ORDER_SUSPECTED") {
        if (window.confirm("You booked the same room a moment ago. Book it again?")) return book(e, true);
      } else toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 mr-2 rounded-lg bg-[#FE5300] px-4 py-2 text-sm font-semibold text-white">
        Book now
      </button>
    );
  return (
    <form onSubmit={book} className="mt-3 space-y-2 rounded-lg border border-orange-200 bg-orange-50/40 p-3 text-left text-[13px]">
      <p className="font-medium text-slate-800">Book this room · {inr(total)} incl. GST · pay from your wallet or by PayU</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {guests.map((g, i) => (
          <input key={i} className={input} required minLength={2} placeholder={rooms > 1 ? `Lead guest, room ${i + 1} *` : "Lead guest name *"} value={g} onChange={(e) => setGuests(guests.map((x, j) => (j === i ? e.target.value : x)))} />
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <input className={input} required placeholder="Contact name *" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={input} required type="email" placeholder="Contact email *" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className={input} required placeholder="Contact phone *" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={input} maxLength={60} placeholder="Your reference (optional)" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
        <input className={input} maxLength={500} placeholder="Special requests (optional)" value={f.requests} onChange={(e) => setF({ ...f, requests: e.target.value })} />
      </div>
      <div className="flex gap-2">
        <button disabled={busy} className="rounded-lg bg-[#FE5300] px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? "Holding the rooms…" : "Continue to payment"}</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 bg-white px-3 py-2">Cancel</button>
      </div>
      <p className="text-[11px] text-slate-500">The rooms are held for you for 15 minutes while you pay.</p>
    </form>
  );
}
