"use client";
// /hotels/checkout — guest details for the room picked on the hotel page (Stage 08; online booking behind its switch).
import { CheckoutView } from "@/b2b/website/CheckoutView";
import { BOOKING_ENABLED } from "@/b2b/website/checkout";
import { HOTELS_ENABLED } from "@/b2b/website/hotels";

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Complete your booking</h1>
      {HOTELS_ENABLED && BOOKING_ENABLED ? <CheckoutView /> : <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-600">Online hotel booking opens soon. Call us at +91 92896 02447 to book.</p>}
    </main>
  );
}
