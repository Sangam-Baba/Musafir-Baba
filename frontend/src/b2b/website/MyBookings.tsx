"use client";
// "My hotel bookings" (Stage 09): the signed-in customer's bookings (their existing website login), or the ones made in
// this browser as a guest. Bookings made on another device open from the link in the confirmation email.
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";

import { errorMessage } from "../messages";
import { myHotelBookings, STATUS_TEXT } from "./checkout";
import { inr } from "./hotels";

export function MyBookings() {
  const q = useQuery({ queryKey: ["my-hotel-bookings"], queryFn: myHotelBookings });
  if (q.isLoading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>;
  if (q.isError) return <p className="rounded-xl bg-red-50 p-6 text-sm text-red-700">{errorMessage(q.error)}</p>;
  const rows = q.data?.data ?? [];
  if (rows.length === 0)
    return <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-600">No hotel bookings here yet. Booked on another device? Open the link in your confirmation email. <Link href="/hotels" className="font-medium text-[#FE5300] underline">Find a hotel</Link></p>;
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {rows.map((r) => (
        <Link key={r.bookingRef} href={`/hotels/my-bookings/${r.bookingRef}`} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm hover:bg-slate-50">
          <span className="min-w-48 font-semibold text-slate-900">{r.propertyName}<span className="block text-xs font-normal text-slate-500">{r.destination}</span></span>
          <span className="text-slate-700">{r.checkIn} → {r.checkOut}</span>
          <span className="text-slate-600">{r.leadGuest}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{STATUS_TEXT[r.bookingStatus] ?? r.bookingStatus}</span>
          <span className="ml-auto font-semibold text-slate-900">{inr(r.totalPaise)}{r.refundedPaise > 0 ? <span className="block text-xs font-normal text-emerald-700">refunded {inr(r.refundedPaise)}</span> : null}</span>
        </Link>
      ))}
    </div>
  );
}
