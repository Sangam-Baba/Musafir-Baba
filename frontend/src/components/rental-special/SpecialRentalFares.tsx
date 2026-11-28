"use client";

import type { RideQuote } from "@/lib/rideApi";
import { BlogContent } from "@/components/custom/BlogContent";

// Price table of the special rental pages, from the same fare quote the
// /mbgo search uses (POST /ride/quote) — shown here instead of navigating.

export const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function SpecialRentalFares({
  quote,
  isSearching,
  error,
  title,
  intro,
}: {
  quote: RideQuote | null;
  isSearching: boolean;
  error: string | null;
  title?: string;
  intro?: string; // admin's rich HTML, shown under the heading, above the table
}) {
  const offers = [...(quote?.offers ?? [])].sort((a, b) => a.baseFare - b.baseFare);
  const heading = title?.trim() || "Prices for this route";
  const introBlock = intro ? (
    <div className="visa-prose prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4 mb-4">
      <BlogContent html={intro} />
    </div>
  ) : null;

  // No quote yet: just the status line, as before. With admin text, the
  // heading and text show too, so they don't wait for (or depend on) prices.
  const status = (message: string) => {
    const line = <p className="py-8 text-center text-sm text-gray-500">{message}</p>;
    if (!introBlock) return line;
    return (
      <div>
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3">{heading}</h2>
        {introBlock}
        {line}
      </div>
    );
  };

  if (isSearching && !quote) return status("Checking prices…");
  if (error) return status(error);
  if (!quote) return status("Enter pickup and drop to see prices.");

  const roundTrip = quote.tripType === "ROUND_TRIP";
  return (
    <div className={isSearching ? "opacity-60 transition-opacity" : ""}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="text-lg md:text-xl font-bold text-gray-900">{heading}</h2>
        <p className="text-[13px] text-gray-500">
          {Math.round(quote.distanceKm)} km · about {Math.round(quote.durationMin / 60)} h ·{" "}
          {roundTrip ? `Round trip${quote.days ? `, ${quote.days} day${quote.days > 1 ? "s" : ""}` : ""}` : "One way"}
        </p>
      </div>
      {introBlock}
      {/* Phones: one card per vehicle */}
      <ul className="space-y-2.5 sm:hidden">
        {offers.map((o) => (
          <li
            key={`${o.category}-${o.vehicleName}`}
            className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14.5px] font-semibold text-gray-900">{o.category}</p>
              <p className="truncate text-[12px] text-gray-500">
                {o.vehicleName} · {o.seatingCapacity} seats
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <p className="text-[16px] font-bold text-gray-900">{rupees(o.baseFare)}</p>
              <a href="#enquiry" className="rounded-full bg-orange-50 px-3 py-1 text-[11.5px] font-semibold text-[#FE5300] active:bg-orange-100">
                Enquire
              </a>
            </div>
          </li>
        ))}
      </ul>

      {/* Tablet and up: table */}
      <div className="hidden overflow-hidden rounded-2xl border border-gray-200 sm:block">
        <table className="w-full text-left text-sm">
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
