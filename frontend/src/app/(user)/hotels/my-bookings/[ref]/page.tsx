"use client";
// /hotels/my-bookings/[ref] — one hotel booking (MBH-…) for its customer; `?key=` (the order link) opens it on any device.
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { HotelBookingDetail } from "@/b2b/website/HotelBookingDetail";
import { HOTELS_ENABLED } from "@/b2b/website/hotels";

function Detail() {
  const { ref } = useParams<{ ref: string }>();
  const sp = useSearchParams();
  return HOTELS_ENABLED ? <HotelBookingDetail bookingRef={ref} linkKey={sp.get("key")} /> : <p className="text-sm text-slate-600">Hotels are coming soon.</p>;
}

export default function HotelBookingPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Hotel booking</h1>
      <Suspense fallback={null}>
        <Detail />
      </Suspense>
    </main>
  );
}
