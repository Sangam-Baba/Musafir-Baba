"use client";
// Website checkout (Stage 08): guest details for the room chosen on the hotel page → the order (rooms held 15 min) →
// the order page (review, pay with PayU). No account needed. The server re-prices the token: a changed price is shown
// before anything is taken; the same booking twice within 2 minutes asks "create another?".
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { B2BError } from "../api";
import { errorMessage } from "../messages";
import { createOrder, loadCheckoutOffer, NAME_RE, randomId, saveCheckoutOffer, type CheckoutOffer } from "./checkout";
import { guestsText, inr, MEAL_LABEL } from "./hotels";
import { PRIVACY_NOTICE_URL, recordConsent } from "@/b2b/privacy";

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;
const field = "mt-1 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm";
type Problem = { kind: "PRICE"; totalPaise: number; token: string } | { kind: "DUPLICATE"; ref: string } | { kind: "SOLD_OUT" } | null;

function Summary({ c }: { c: CheckoutOffer }) {
  return (
    <aside className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <p className="text-base font-semibold text-slate-900">{c.hotelName}</p>
      <p className="text-slate-700">{c.offer.roomTypeName} · {MEAL_LABEL[c.offer.mealPlanKey] ?? c.offer.planName}</p>
      <p className="text-slate-600">{c.checkIn} → {c.checkOut} · {guestsText(c.rooms)}</p>
      <p className={`text-xs ${c.offer.refundable ? "text-emerald-700" : "text-slate-500"}`}>{c.offer.cancellation || (c.offer.refundable ? "Refundable" : "Non-refundable")}</p>
      <div className="border-t border-slate-100 pt-2">
        <p className="text-xl font-bold text-slate-900">{inr(c.offer.price.totalPaise)}</p>
        <p className="text-xs text-slate-500">incl. {inr(c.offer.price.gstPaise)} GST</p>
      </div>
    </aside>
  );
}

function ProblemBox({ p, c, onAccept, onDuplicate }: { p: Problem; c: CheckoutOffer; onAccept: (token: string, totalPaise: number) => void; onDuplicate: () => void }) {
  if (!p) return null;
  if (p.kind === "SOLD_OUT")
    return <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Sorry — this room just sold out for your dates. <Link href={`/hotels/${c.hotelSlug}?checkIn=${c.checkIn}&checkOut=${c.checkOut}`} className="font-medium underline">Choose another room</Link></div>;
  if (p.kind === "PRICE")
    return (
      <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        <p>The price changed from {inr(c.offer.price.totalPaise)} to <strong>{inr(p.totalPaise)}</strong> (incl. GST).</p>
        <button type="button" onClick={() => onAccept(p.token, p.totalPaise)} className="rounded-lg bg-[#FE5300] px-3 py-1.5 font-semibold text-white">Continue at the new price</button>
      </div>
    );
  return (
    <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
      <p>You already have an identical booking in progress ({p.ref}).</p>
      <div className="flex flex-wrap gap-2">
        <Link href={`/hotels/booking/${p.ref}`} className="rounded-lg border border-amber-300 px-3 py-1.5 font-medium">Open it</Link>
        <button type="button" onClick={onDuplicate} className="rounded-lg bg-[#FE5300] px-3 py-1.5 font-semibold text-white">Create another booking</button>
      </div>
    </div>
  );
}

export function CheckoutView() {
  const router = useRouter();
  const [c, setC] = useState<CheckoutOffer | null | undefined>(undefined);
  const [guests, setGuests] = useState<string[]>([]);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [requests, setRequests] = useState("");
  const [agreed, setAgreed] = useState(false); // Stage 16 (DPDP): privacy notice
  const [requestKey, setRequestKey] = useState(() => randomId());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);

  useEffect(() => {
    const o = loadCheckoutOffer();
    setC(o);
    setGuests(o ? o.rooms.map(() => "") : []);
  }, []);

  if (c === undefined) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;
  if (!c) return <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-600">Your selection has expired. <Link href="/hotels" className="font-medium text-[#FE5300] underline">Search hotels</Link></p>;
  const offer = c;

  const valid = guests.every((g) => NAME_RE.test(g.trim())) && NAME_RE.test(contact.name.trim()) && EMAIL_RE.test(contact.email.trim()) && /^\+?[0-9]{10,14}$/.test(contact.phone.replace(/[\s-]/g, ""));

  async function submit(confirmDuplicate = false) {
    setBusy(true);
    setProblem(null);
    try {
      const order = await createOrder({ priceToken: offer.offer.priceToken, rooms: guests.map((g) => ({ leadGuest: g.trim() })), contact, specialRequests: requests.trim() || null, confirmDuplicate }, requestKey);
      recordConsent("hotel-checkout", order.ref);
      router.push(`/hotels/booking/${order.ref}${order.linkKey ? `?key=${order.linkKey}` : ""}`);
    } catch (e) {
      const d = e instanceof B2BError ? e.details : {};
      if (e instanceof B2BError && e.code === "PRICE_CHANGED") setProblem({ kind: "PRICE", token: String(d.priceToken), totalPaise: Number((d.price as { totalPaise?: number } | undefined)?.totalPaise ?? 0) });
      else if (e instanceof B2BError && e.code === "DUPLICATE_ORDER_SUSPECTED") setProblem({ kind: "DUPLICATE", ref: String(d.ref) });
      else if (e instanceof B2BError && e.code === "SOLD_OUT") setProblem({ kind: "SOLD_OUT" });
      else toast.error(errorMessage(e));
      setRequestKey(randomId()); // the next try is a new request
    } finally {
      setBusy(false);
    }
  }

  function acceptPrice(token: string, totalPaise: number) {
    const next = { ...offer, offer: { ...offer.offer, priceToken: token, price: { ...offer.offer.price, totalPaise } } };
    saveCheckoutOffer(next);
    setC(next);
    setProblem(null);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <form className="space-y-4 rounded-xl border border-slate-200 bg-white p-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <h2 className="text-lg font-semibold text-slate-900">Guest details</h2>
        {guests.map((g, i) => (
          <label key={i} className="block text-sm text-slate-700">Lead guest{guests.length > 1 ? `, room ${i + 1}` : ""} (as on ID)
            <input className={field} value={g} maxLength={60} onChange={(e) => setGuests(guests.map((x, j) => (j === i ? e.target.value : x)))} required />
          </label>
        ))}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm text-slate-700">Your name<input className={field} value={contact.name} maxLength={60} onChange={(e) => setContact({ ...contact, name: e.target.value })} required /></label>
          <label className="block text-sm text-slate-700">Email<input type="email" className={field} value={contact.email} maxLength={254} onChange={(e) => setContact({ ...contact, email: e.target.value })} required /></label>
          <label className="block text-sm text-slate-700">Mobile<input type="tel" className={field} value={contact.phone} maxLength={20} onChange={(e) => setContact({ ...contact, phone: e.target.value })} required /></label>
        </div>
        <label className="block text-sm text-slate-700">Special requests (optional — passed to the hotel, not guaranteed)
          <textarea className="mt-1 block h-20 w-full rounded-lg border border-slate-200 p-3 text-sm" value={requests} maxLength={500} onChange={(e) => setRequests(e.target.value)} />
        </label>
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input type="checkbox" className="mt-0.5 accent-[#FE5300]" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>I have read the <a href={PRIVACY_NOTICE_URL} target="_blank" rel="noreferrer" className="text-[#FE5300] underline">privacy policy</a> and agree that MusafirBaba uses these details for this booking and shares the guest names with the hotel.</span>
        </label>
        <ProblemBox p={problem} c={offer} onAccept={acceptPrice} onDuplicate={() => void submit(true)} />
        <button disabled={!valid || !agreed || busy} className="w-full rounded-lg bg-[#FE5300] py-3 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Holding your rooms…" : `Continue — ${inr(offer.offer.price.totalPaise)}`}
        </button>
        <p className="text-xs text-slate-500">We hold the rooms for 15 minutes while you pay. Names: letters, spaces, dot, apostrophe and hyphen.</p>
      </form>
      <Summary c={offer} />
    </div>
  );
}
