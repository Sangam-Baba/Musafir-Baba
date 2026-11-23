"use client";
// B2B admin → Orders → Offline booking (Stage 12 part B): book a hotel for a client who asked by phone or email — the
// client's own B2B price, paid from its wallet / credit, the reason kept on the order, the client told.
import { useQuery } from "@tanstack/react-query";
import { PhoneForwarded } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../../messages";
import { inr, type Offer, type OffersResult } from "../../website/hotels";
import { adminCall } from "./AdminPassGate";
import { FleetPanel, Input, inputSm, PrimaryBtn, SecondaryBtn } from "./kit";

type Client = { clientOrgId: string; name: string; availablePaise: number; overdue: boolean };
const idemKey = () => `offline-${Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("")}`;

export function OfflineBookingPanel({ token }: { token: string }) {
  const clients = useQuery({ queryKey: ["b2b-admin", "wallets", "clients"], queryFn: () => adminCall<{ data: Client[] }>("/admin/wallet/clients", token), retry: false });
  const [open, setOpen] = useState(false);
  const [s, setS] = useState({ clientOrgId: "", hotelRef: "", checkIn: "", checkOut: "", adults: "2", rooms: "1" });
  const [offers, setOffers] = useState<OffersResult | null>(null);
  const [pick, setPick] = useState<Offer | null>(null);
  const [f, setF] = useState({ guest: "", name: "", email: "", phone: "", reference: "", note: "" });
  const [busy, setBusy] = useState(false);
  const client = (clients.data?.data ?? []).find((c) => c.clientOrgId === s.clientOrgId);

  async function find() {
    setBusy(true);
    try {
      const rooms = Array.from({ length: Number(s.rooms) || 1 }, () => ({ adults: Number(s.adults) || 1, childrenAges: [] }));
      setOffers(await adminCall<OffersResult>("/admin/offline-bookings/offers", token, { method: "POST", body: { clientOrgId: s.clientOrgId, hotelRef: s.hotelRef.trim(), stay: { checkIn: s.checkIn, checkOut: s.checkOut, rooms } } }));
      setPick(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function book() {
    if (!pick) return;
    setBusy(true);
    try {
      const r = await adminCall<{ order: { ref: string; status: string; failure: { code: string } | null }; payment: { error?: string } | null }>("/admin/offline-bookings", token, {
        method: "POST",
        headers: { "Idempotency-Key": idemKey() },
        body: {
          clientOrgId: s.clientOrgId,
          priceToken: pick.priceToken,
          rooms: Array.from({ length: pick.price.rooms || 1 }, () => ({ leadGuest: f.guest.trim() })),
          contact: { name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() },
          customerReference: f.reference.trim() || null,
          note: f.note.trim(),
        },
      });
      if (r.order.status === "CONFIRMED") toast.success(`Booked ${r.order.ref} — paid from the client's wallet; the client has been told`);
      else toast.error(`Not booked (${r.payment?.error ?? r.order.failure?.code ?? r.order.status}) — the rooms were let go`);
      setPick(null);
      setOffers(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FleetPanel title="Offline booking" description="A client asked by phone or email: book for them at their own B2B price, paid from their wallet or credit." icon={PhoneForwarded} bodyClassName="p-0">
      {!open ? (
        <div className="px-4 py-2"><SecondaryBtn onClick={() => setOpen(true)}>Book for a client</SecondaryBtn></div>
      ) : (
        <div className="space-y-2 px-4 py-3 text-[13px]">
          <div className="flex flex-wrap items-center gap-2">
            <select className="h-8 rounded-md border border-slate-200 px-2" value={s.clientOrgId} onChange={(e) => setS({ ...s, clientOrgId: e.target.value })}>
              <option value="">Client…</option>
              {(clients.data?.data ?? []).map((c) => <option key={c.clientOrgId} value={c.clientOrgId}>{c.name}{c.overdue ? " (credit overdue)" : ""}</option>)}
            </select>
            {client && <span className="text-slate-600">available {inr(client.availablePaise)}</span>}
            <Input className={`${inputSm} w-48`} placeholder="Hotel reference or slug" value={s.hotelRef} onChange={(e) => setS({ ...s, hotelRef: e.target.value })} />
            <input type="date" className="h-8 rounded-md border border-slate-200 px-2" value={s.checkIn} onChange={(e) => setS({ ...s, checkIn: e.target.value })} />
            <input type="date" className="h-8 rounded-md border border-slate-200 px-2" value={s.checkOut} onChange={(e) => setS({ ...s, checkOut: e.target.value })} />
            <Input className={`${inputSm} w-16`} value={s.rooms} onChange={(e) => setS({ ...s, rooms: e.target.value })} aria-label="Rooms" />
            <span>rooms ×</span>
            <Input className={`${inputSm} w-16`} value={s.adults} onChange={(e) => setS({ ...s, adults: e.target.value })} aria-label="Adults per room" />
            <span>adults</span>
            <PrimaryBtn disabled={busy || !s.clientOrgId || !s.hotelRef || !s.checkIn || !s.checkOut} onClick={find}>Client&apos;s prices</PrimaryBtn>
          </div>
          {offers?.offers.map((o) => (
            <button key={`${o.roomTypeId}-${o.ratePlanId}`} onClick={() => setPick(o)} className={`flex w-full items-center gap-2 rounded-md border px-3 py-1.5 text-left ${pick === o ? "border-[#FE5300] bg-orange-50" : "border-slate-200"}`}>
              <span className="font-medium">{o.roomTypeName}</span><span className="text-slate-600">{o.planName} · {o.cancellation}</span><span className="ml-auto font-semibold">{inr(o.price.totalPaise)}</span>
            </button>
          ))}
          {offers && offers.offers.length === 0 && <p className="text-slate-500">Nothing available for these dates.</p>}
          {pick && (
            <div className="grid gap-2 sm:grid-cols-3">
              <Input className={inputSm} placeholder="Lead guest" value={f.guest} onChange={(e) => setF({ ...f, guest: e.target.value })} />
              <Input className={inputSm} placeholder="Contact name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              <Input className={inputSm} placeholder="Contact email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              <Input className={inputSm} placeholder="Contact phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
              <Input className={inputSm} placeholder="Client's reference" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
              <Input className={inputSm} placeholder="How / when the client asked (kept on the order)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
              <PrimaryBtn disabled={busy || f.guest.trim().length < 2 || f.note.trim().length < 5 || !f.name || !f.email || !f.phone} onClick={book}>Book {inr(pick.price.totalPaise)} from the wallet</PrimaryBtn>
            </div>
          )}
        </div>
      )}
    </FleetPanel>
  );
}
