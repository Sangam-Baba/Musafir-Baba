"use client";
// /buses/booking/[ref]?key — the bus booking page: pay, status, e-ticket, cancel seats (Stage 18 B8). PayU returns here;
// the email links here with the booking's private key.
import { Suspense } from "react";

import { BUS_WEB_ENABLED } from "@/b2b/website/bus/busWeb";
import { BusBookingWeb } from "@/b2b/website/bus/BusBookingWeb";

export default function BusBookingPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:pt-28">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Your bus booking</h1>
      {BUS_WEB_ENABLED ? <Suspense><BusBookingWeb /></Suspense> : <p className="rounded-xl bg-orange-50 p-8 text-center text-slate-700">Online bus booking is coming soon.</p>}
    </main>
  );
}
