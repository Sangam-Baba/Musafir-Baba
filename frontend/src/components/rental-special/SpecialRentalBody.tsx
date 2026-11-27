"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BlogContent } from "@/components/custom/BlogContent";
import QueryForm from "@/components/custom/QueryForm";
import { getRideQuote, type RideQuote } from "@/lib/rideApi";
import { DEFAULT_FROM, DEFAULT_RIDE_TIME, type SpecialRentalPageData } from "@/lib/rentalSpecial";
import SpecialRentalSearch, { todayStr, type SpecialSearch } from "./SpecialRentalSearch";
import SpecialRentalFares, { rupees } from "./SpecialRentalFares";
import SpecialRentalAuthor from "./SpecialRentalAuthor";
import SpecialRentalBreadcrumb from "./SpecialRentalBreadcrumb";

// Interactive part of a special rental page: the search (prices for the
// admin's start point + where to come from the server's cached quote, else
// the browser asks), then two columns — price table and content on the left,
// minimum price + enquiry form on the right.

async function fetchQuote(s: SpecialSearch): Promise<RideQuote> {
  const res = await getRideQuote({
    pickup: { address: s.pickup.address || "", lat: s.pickup.lat, lng: s.pickup.lng },
    drop: { address: s.drop.address || "", lat: s.drop.lat, lng: s.drop.lng },
    tripType: s.tripType,
    rideDate: s.rideDate,
    rideTime: s.rideTime,
    ...(s.tripType === "ROUND_TRIP" ? { returnDate: s.returnDate } : {}),
  });
  return res.data;
}

function validate(s: SpecialSearch): string | null {
  if (!s.pickup.address || !s.drop.address) return "Enter both pickup and drop locations";
  if (s.tripType === "ROUND_TRIP" && !s.returnDate) return "Please select a return date for your round trip";
  return null;
}

function MinPrice({ quote, isSearching }: { quote: RideQuote | null; isSearching: boolean }) {
  const min = quote?.offers?.length ? Math.min(...quote.offers.map((o) => o.baseFare)) : null;
  return (
    <div className="rounded-2xl border-2 border-[#FE5300] bg-white p-5 shadow-lg">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">Starting from</p>
      {min !== null ? (
        <>
          <p className="mt-1 text-3xl font-bold text-[#FE5300]">{rupees(min)}</p>
          <p className="mt-1 text-[12px] text-gray-500">
            {quote?.tripType === "ROUND_TRIP" ? "Round trip" : "One way"} · {Math.round(quote?.distanceKm ?? 0)} km
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-gray-500">{isSearching ? "Checking prices…" : "Search a route to see prices"}</p>
      )}
    </div>
  );
}

export default function SpecialRentalBody({
  page,
  initialQuote,
  typeHref,
}: {
  page: SpecialRentalPageData;
  initialQuote?: Promise<RideQuote | null> | null;
  typeHref?: string;
}) {
  const [initial] = useState<SpecialSearch>(() => ({
    pickup: page.searchFrom?.address ? page.searchFrom : { address: DEFAULT_FROM },
    drop: page.searchTo ?? {},
    tripType: "ONE_WAY",
    rideDate: todayStr(),
    rideTime: DEFAULT_RIDE_TIME,
    returnDate: "",
  }));
  const [quote, setQuote] = useState<RideQuote | null>(null);
  // True from the start when the admin's route is complete (it loads at once)
  const [isSearching, setIsSearching] = useState(() => validate(initial) === null);
  const [error, setError] = useState<string | null>(null);
  const userSearched = useRef(false); // a visitor's search always wins

  const run = useCallback(async (s: SpecialSearch, fromUser: boolean) => {
    const invalid = validate(s);
    if (invalid) {
      if (fromUser) toast.error(invalid);
      return;
    }
    if (fromUser) userSearched.current = true;
    setIsSearching(true);
    try {
      const q = await fetchQuote(s);
      setQuote(q);
      setError(q.offers.length ? null : "No vehicles currently serve this route");
    } catch (e) {
      setQuote(null);
      setError(e instanceof Error ? e.message : "Could not fetch fare, please try again");
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Prices for the admin's route: the server's cached quote when it has one,
  // otherwise the same search from the browser
  useEffect(() => {
    let active = true;
    // Promise.resolve: a missing or already-resolved value is fine too, so
    // the page can never crash here; null just means the browser asks
    Promise.resolve(initialQuote ?? null)
      .catch(() => null)
      .then((q) => {
        if (!active || userSearched.current) return;
        if (q) {
          setQuote(q);
          setError(null);
          setIsSearching(false);
        } else {
          run(initial, false);
        }
      });
    return () => {
      active = false;
    };
  }, [initialQuote, run, initial]);

  return (
    <>
      <div className="relative z-20 -mt-10 md:-mt-16 px-3 sm:px-4 md:px-8">
        <SpecialRentalSearch initial={initial} isSearching={isSearching} onSearch={(s) => run(s, true)} />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="mt-4">
          <SpecialRentalBreadcrumb
            typeName={page.specialType.name}
            typeHref={typeHref}
            pageTitle={
              page.slug
                ? page.title || page.slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
                : undefined
            }
          />
        </div>

        <div className="mt-6 mb-10 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-[68%] lg:w-[72%] min-w-0">
            <section className="mb-10">
              <SpecialRentalFares quote={quote} isSearching={isSearching} error={error} />
            </section>
            {page.content && (
              <section className="visa-prose prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4 mb-10">
                <BlogContent html={page.content} />
              </section>
            )}
            <SpecialRentalAuthor author={page.author} updatedAt={page.updatedAt} />
          </div>

          <aside className="w-full md:w-[32%] lg:w-[28%]">
            <div className="flex flex-col gap-6 md:sticky md:top-24">
              <MinPrice quote={quote} isSearching={isSearching} />
              <div id="enquiry" className="scroll-mt-28">
                <QueryForm />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
