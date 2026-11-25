"use client";
// /buses/trip/[id]?from&to — pick seats and add passengers (Stage 18 B8; behind NEXT_PUBLIC_FEATURE_BUS).
import { Suspense } from "react";

import { BUS_WEB_ENABLED } from "@/b2b/website/bus/busWeb";
import { BusSeatsWeb } from "@/b2b/website/bus/BusSeatsWeb";

export default function BusTripPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:pt-28">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Choose your seats</h1>
      {BUS_WEB_ENABLED ? <Suspense><BusSeatsWeb /></Suspense> : <p className="rounded-xl bg-orange-50 p-8 text-center text-slate-700">Online bus booking is coming soon.</p>}
    </main>
  );
}
