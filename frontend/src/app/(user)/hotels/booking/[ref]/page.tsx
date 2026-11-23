"use client";
// /hotels/booking/[ref] — the order page: pay, follow the payment, get the documents (Stage 08). Safe to refresh; the
// email link carries `?key=` so it opens on any device; PayU sends the browser back here with `?payment=…`.
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { BookingView } from "@/b2b/website/BookingView";
import { HOTELS_ENABLED } from "@/b2b/website/hotels";

function Booking() {
  const { ref } = useParams<{ ref: string }>();
  const sp = useSearchParams();
  return HOTELS_ENABLED ? <BookingView orderRef={ref} linkKey={sp.get("key")} paymentResult={sp.get("payment")} /> : <p className="text-sm text-slate-600">Hotels are coming soon.</p>;
}

export default function BookingPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Your booking</h1>
      <Suspense fallback={null}>
        <Booking />
      </Suspense>
    </main>
  );
}
