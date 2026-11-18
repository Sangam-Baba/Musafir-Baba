"use client";
// The rooms of one hotel for the chosen stay: final price incl. GST, meals, cancellation terms, rooms left.
// Live: follows `availability:property:<id>`; when the hotel's rooms or prices change the list refreshes and says so.
// "Reserve" checks the price again (price token) — booking itself opens with Stage 08.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { errorMessage } from "../messages";
import { useRealtime } from "../realtime";
import { addDays, guestsText, hotelsApi, inr, MEAL_LABEL, roomsToParam, today, type OffersResult, type PriceCheck, type RoomAsk } from "./hotels";

export function HotelOffers({ refOrSlug, initial }: { refOrSlug: string; initial: { checkIn?: string; checkOut?: string; rooms: RoomAsk[] } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [checkIn, setCheckIn] = useState(initial.checkIn ?? addDays(today(), 7));
  const [checkOut, setCheckOut] = useState(initial.checkOut ?? addDays(checkIn, 1));
  const rooms = initial.rooms;
  const [changed, setChanged] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const key = ["hotels", "offers", refOrSlug, checkIn, checkOut, roomsToParam(rooms)];
  const offers = useQuery({ queryKey: key, queryFn: () => hotelsApi<OffersResult>(`/hotels/${refOrSlug}/offers`, { checkIn, checkOut, rooms }), retry: false });
  const propertyId = offers.data?.property.id;

  useRealtime({
    getToken: async () => "", // a visitor: public room only
    enabled: Boolean(propertyId),
    rooms: propertyId ? [`availability:property:${propertyId}`] : [],
    onMessage: (m) => {
      if (m.event !== "availability:changed") return;
      setChanged(true);
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  function pickDates(inDate: string, outDate: string) {
    setCheckIn(inDate);
    setCheckOut(outDate);
    setChanged(false);
    router.replace(`?checkIn=${inDate}&checkOut=${outDate}&rooms=${roomsToParam(rooms)}`, { scroll: false });
  }

  async function reserve(token: string, id: string) {
    setChecking(id);
    try {
      const r = await hotelsApi<PriceCheck>("/hotels/offers/price-check", { priceToken: token });
      if (r.status === "SOLD_OUT") toast.error("Sorry — this room was just sold out for your dates.");
      else if (r.status === "PRICE_CHANGED") toast.warning(`The price changed from ${inr(r.quotedTotalPaise)} to ${inr(r.price?.totalPaise ?? 0)}.`);
      else toast.success(`Price confirmed: ${inr(r.price?.totalPaise ?? 0)} incl. GST. Online booking opens soon — call us to book this room.`);
      if (r.status !== "OK") void queryClient.invalidateQueries({ queryKey: key });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setChecking(null);
    }
  }

  return (
    <section id="rooms" className="space-y-3">
      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <label className="text-xs text-slate-600">Check-in<input type="date" value={checkIn} min={today()} onChange={(e) => pickDates(e.target.value, e.target.value >= checkOut ? addDays(e.target.value, 1) : checkOut)} className="mt-1 block h-10 rounded-lg border border-slate-200 px-2 text-sm" /></label>
        <label className="text-xs text-slate-600">Check-out<input type="date" value={checkOut} min={addDays(checkIn, 1)} max={addDays(checkIn, 30)} onChange={(e) => pickDates(checkIn, e.target.value)} className="mt-1 block h-10 rounded-lg border border-slate-200 px-2 text-sm" /></label>
        <span className="pb-2 text-sm text-slate-600">{guestsText(rooms)}</span>
      </div>
      {changed && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800"><RefreshCw size={14} /> Availability or price updated just now.</p>
      )}
      {offers.isLoading && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-slate-400" /></div>}
      {offers.isError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage(offers.error)}</p>}
      {offers.data?.soldOut && <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-600">Sold out for these dates. Try other dates.</p>}
      {offers.data?.offers.map((o) => (
        <div key={`${o.roomTypeId}-${o.ratePlanId}`} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">{o.roomTypeName}</p>
            <p className="text-sm text-slate-600">{MEAL_LABEL[o.mealPlanKey] ?? o.planName}</p>
            <p className={`text-xs ${o.refundable ? "text-emerald-700" : "text-slate-500"}`}>{o.cancellation || (o.refundable ? "Refundable" : "Non-refundable")}</p>
            {o.roomsLeft <= 3 && <p className="text-xs font-medium text-red-600">Only {o.roomsLeft} left</p>}
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xl font-bold text-slate-900">{inr(o.price.totalPaise)}</p>
            <p className="text-xs text-slate-500">{o.price.nights} night{o.price.nights > 1 ? "s" : ""}, {o.price.rooms} room{o.price.rooms > 1 ? "s" : ""} · incl. {inr(o.price.gstPaise)} GST</p>
            <button disabled={checking !== null} onClick={() => reserve(o.priceToken, `${o.roomTypeId}-${o.ratePlanId}`)} className="mt-2 rounded-lg bg-[#FE5300] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {checking === `${o.roomTypeId}-${o.ratePlanId}` ? "Checking…" : "Reserve"}
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
