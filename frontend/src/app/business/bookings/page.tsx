"use client";
// Hotel bookings (Stage 08): confirmed bookings of the hotel's properties — guests, dates, room, requests and what the
// hotel is owed. New ones wait for "Acknowledge" (reminders go out after 15, 30 and 60 minutes until someone does).
// A new booking also plays a sound and shows a notice anywhere in the business area (the bell).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader } from "@/b2b/components/portal/ui";
import { errorMessage } from "@/b2b/messages";
import type { Me } from "@/b2b/types";
import { inr, MEAL_LABEL } from "@/b2b/website/hotels";

type HotelBooking = {
  ref: string;
  status: string;
  propertyName: string | null;
  roomTypeName: string | null;
  ratePlanName: string | null;
  mealPlanKey: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: { adults: number; children: number; leadGuest: string | null; guests: string[] }[];
  specialRequests: string | null;
  payablePaise: number | null;
  cancellation: string | null;
  confirmedAt: string | null;
  acknowledgedAt: string | null;
};
const KEY = ["b2b", "hotel-bookings"];

function Booking({ b, canAck }: { b: HotelBooking; canAck: boolean }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const waiting = b.status === "CONFIRMED" && !b.acknowledgedAt;
  async function acknowledge() {
    setBusy(true);
    try {
      await b2b(`/hotel/bookings/${b.ref}/acknowledge`, { method: "POST", body: {} });
      toast.success(`Booking ${b.ref} acknowledged`);
      void queryClient.invalidateQueries({ queryKey: KEY });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={`space-y-1.5 border-b border-slate-100 px-4 py-3 text-[13px] last:border-0 ${waiting ? "bg-orange-50/50" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[12px] text-slate-600">{b.ref}</span>
        <span className="font-medium text-slate-900">{b.propertyName}</span>
        {waiting ? <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-[#FE5300]"><BellRing size={12} /> New — please acknowledge</span> : b.acknowledgedAt && <span className="flex items-center gap-1 text-[11px] text-emerald-700"><CheckCircle2 size={12} /> Acknowledged</span>}
        {b.status !== "CONFIRMED" && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{b.status}</span>}
        {b.payablePaise !== null && <span className="ml-auto text-slate-800">{inr(b.payablePaise)} <span className="text-[11px] text-slate-500">to you incl. your GST</span></span>}
      </div>
      <p className="text-slate-700">{b.checkIn} → {b.checkOut} · {b.nights} night{b.nights > 1 ? "s" : ""} · {b.roomTypeName} · {MEAL_LABEL[b.mealPlanKey ?? ""] ?? b.ratePlanName}</p>
      <p className="text-slate-600">{b.rooms.map((r, i) => `Room ${i + 1}: ${r.leadGuest ?? "—"}${r.guests.length ? ` + ${r.guests.join(", ")}` : ""} (${r.adults} adult${r.adults > 1 ? "s" : ""}${r.children ? `, ${r.children} child` : ""})`).join(" · ")}</p>
      {b.specialRequests && <p className="text-slate-600">Requests: {b.specialRequests}</p>}
      {waiting && canAck && <button disabled={busy} onClick={acknowledge} className="mt-1 rounded-lg bg-[#FE5300] px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-60">Acknowledge</button>}
    </div>
  );
}

function Bookings({ me }: { me: Me }) {
  const [waitingOnly, setWaitingOnly] = useState(false);
  const list = useQuery({ queryKey: [...KEY, me.currentOrgId, waitingOnly], queryFn: () => b2b<{ data: HotelBooking[] }>(`/hotel/bookings${waitingOnly ? "?waiting=true" : ""}`), refetchInterval: 60_000 });
  const canAck = me.permissions.includes("hotel-booking.booking.acknowledge") && !me.viewAs;
  return (
    <div className="space-y-4">
      <PageHeader title="Your" highlight="bookings" subtitle="Confirmed and paid by the guest through MusafirBaba. Acknowledge each new booking — we remind you after 15 minutes and call you after an hour." />
      <div className="flex gap-1.5">
        {[false, true].map((w) => (
          <button key={String(w)} onClick={() => setWaitingOnly(w)} className={`rounded-full border px-3 py-1 text-[12px] ${waitingOnly === w ? "border-[#FE5300] bg-orange-50 text-[#FE5300]" : "border-slate-200 bg-white text-slate-600"}`}>{w ? "Waiting for acknowledgement" : "All"}</button>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {list.isLoading && <p className="p-6 text-center text-[13px] text-slate-500">Loading…</p>}
        {list.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(list.error)}</p>}
        {list.data?.data.length === 0 && <p className="p-8 text-center text-[13px] text-slate-600">{waitingOnly ? "Nothing waiting." : "No bookings yet."}</p>}
        {list.data?.data.map((b) => <Booking key={b.ref} b={b} canAck={canAck} />)}
      </div>
    </div>
  );
}

export default function HotelBookingsPage() {
  return <BusinessShell>{(me) => (me.permissions.includes("hotel-booking.booking.acknowledge") ? <Bookings me={me} /> : <p className="text-[13px] text-slate-600">This page is for hotels.</p>)}</BusinessShell>;
}
