"use client";

import type { RideQuote } from "@/lib/rideApi";

// Price table of the special rental pages, from the same fare quote the
// /mbgo search uses (POST /ride/quote) — shown here instead of navigating.

export const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function SpecialRentalFares({
  quote,
  isSearching,
  error,
}: {
  quote: RideQuote | null;
  isSearching: boolean;
  error: string | null;
}) {
  const offers = [...(quote?.offers ?? [])].sort((a, b) => a.baseFare - b.baseFare);

  if (isSearching && !quote) {
    return <p className="py-8 text-center text-sm text-gray-500">Checking prices…</p>;
  }
  if (error) {
    return <p className="py-8 text-center text-sm text-gray-500">{error}</p>;
  }
  if (!quote) {
    return <p className="py-8 text-center text-sm text-gray-500">Enter pickup and drop to see prices.</p>;
  }

  const roundTrip = quote.tripType === "ROUND_TRIP";
  return (
    <div className={isSearching ? "opacity-60 transition-opacity" : ""}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="text-lg md:text-xl font-bold text-gray-900">Prices for this route</h2>
        <p className="text-[13px] text-gray-500">
          {Math.round(quote.distanceKm)} km · about {Math.round(quote.durationMin / 60)} h ·{" "}
          {roundTrip ? `Round trip${quote.days ? `, ${quote.days} day${quote.days > 1 ? "s" : ""}` : ""}` : "One way"}
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="bg-orange-50/70 text-[12px] uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Vehicle</th>
              <th className="px-4 py-3 font-semibold">Seats</th>
              <th className="px-4 py-3 font-semibold text-right">Fare</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {offers.map((o) => (
              <tr key={`${o.category}-${o.vehicleName}`} className="hover:bg-gray-50/60">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">{o.vehicleName}</p>
                  <p className="text-[12px] text-gray-500">{o.category}</p>
                </td>
                <td className="px-4 py-3 text-gray-700">{o.seatingCapacity}</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{rupees(o.baseFare)}</td>
                <td className="px-4 py-3 text-right">
                  <a
                    href="#enquiry"
                    className="inline-block rounded-lg border border-[#FE5300] px-3 py-1.5 text-[12px] font-semibold text-[#FE5300] hover:bg-[#FE5300] hover:text-white transition-colors"
                  >
                    Enquire
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {quote.payableOnTripNote && <p className="mt-2 text-[12px] text-gray-500">{quote.payableOnTripNote}</p>}
    </div>
  );
}
