"use client";
// Search hotels (B2B dashboard, Stage 12 part A): the same search as the website, with this client's B2B prices,
// its category's hotels and its own selling price. Booking online comes with part B — "Reserve" checks the price.
import { Suspense } from "react";

import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader } from "@/b2b/components/portal/ui";
import { businessCall } from "@/b2b/client-search";
import { ResultsView } from "@/b2b/website/ResultsView";

export default function ClientHotelSearchPage() {
  return (
    <BusinessShell>
      {(me) =>
        me.permissions.includes("hotel-search.search.use") ? (
          <div className="space-y-4">
            <PageHeader title="Search" highlight="hotels" subtitle="Live availability with your B2B prices (incl. GST). Your selling price is only shown to you." />
            <Suspense>
              <ResultsView call={businessCall} basePath="/business/hotels" b2b />
            </Suspense>
          </div>
        ) : (
          <p className="text-[13px] text-slate-600">Hotel search is for verified B2B client companies. Ask your company&apos;s owner for access.</p>
        )
      }
    </BusinessShell>
  );
}
