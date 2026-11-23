"use client";
// /hotels/my-bookings — a customer's hotel bookings (Stage 09; owner: a new page, the existing bookings page untouched).
import { MyBookings } from "@/b2b/website/MyBookings";
import { BOOKING_ENABLED } from "@/b2b/website/checkout";
import { HOTELS_ENABLED } from "@/b2b/website/hotels";

export default function MyHotelBookingsPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">My hotel bookings</h1>
      {HOTELS_ENABLED && BOOKING_ENABLED ? <MyBookings /> : <p className="text-sm text-slate-600">Hotel booking opens soon.</p>}
    </main>
  );
}
