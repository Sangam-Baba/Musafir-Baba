// /buses — search buses across India with seat maps and final prices (incl. GST). Behind NEXT_PUBLIC_FEATURE_BUS:
// until it's switched on the page says "coming soon" (Stage 18 B8). The old /bus link keeps its own redirect.
import type { Metadata } from "next";
import { Suspense } from "react";

import { BUS_WEB_ENABLED } from "@/b2b/website/bus/busWeb";
import { BusSearchWeb } from "@/b2b/website/bus/BusSearchWeb";

export const metadata: Metadata = {
  title: "Bus tickets — book seats online | MusafirBaba",
  description: "Search buses between cities, pick your exact seat and pay online. Final prices including GST.",
  alternates: { canonical: "https://musafirbaba.com/buses" },
};

export default function BusesPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-24 sm:pt-28">
      <h1 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl">Bus tickets</h1>
      {BUS_WEB_ENABLED ? (
        <Suspense>
          <BusSearchWeb />
        </Suspense>
      ) : (
        <p className="rounded-xl bg-orange-50 p-8 text-center text-slate-700">Online bus booking is coming soon. Meanwhile, call us at +91 92896 02447.</p>
      )}
    </main>
  );
}
