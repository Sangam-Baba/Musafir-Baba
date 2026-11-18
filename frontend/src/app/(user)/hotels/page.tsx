// /hotels — search hotels listed on MusafirBaba with live rooms and final prices (incl. GST).
// Behind NEXT_PUBLIC_FEATURE_HOTELS: until it's switched on the page says "coming soon".
import type { Metadata } from "next";
import { Suspense } from "react";

import { HOTELS_ENABLED } from "@/b2b/website/hotels";
import { ResultsView } from "@/b2b/website/ResultsView";

export const metadata: Metadata = {
  title: "Hotels — book stays across India | MusafirBaba",
  description: "Search hotels, resorts and homestays across India with live availability and final prices including GST.",
  alternates: { canonical: "https://musafirbaba.com/hotels" },
};

export default function HotelsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-24 sm:pt-28">
      <h1 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl">Hotels</h1>
      {HOTELS_ENABLED ? (
        <Suspense>
          <ResultsView />
        </Suspense>
      ) : (
        <p className="rounded-xl bg-orange-50 p-8 text-center text-slate-700">Hotel booking is coming soon. Meanwhile, call us and we&apos;ll find you the right stay.</p>
      )}
    </main>
  );
}
