"use client";
// Business area → How it works: hotels and B2B clients see how bookings, prices, payouts, plans and the API work.
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader } from "@/b2b/components/portal/ui";
import { HowItWorks } from "@/b2b/components/guide/HowItWorks";

export default function HowItWorksPage() {
  return (
    <BusinessShell>
      {() => (
        <div className="space-y-4">
          <PageHeader title="How it" highlight="works" subtitle="From sign-up to booking to payout, with a worked example and the price breakdown." />
          <HowItWorks audience="business" />
        </div>
      )}
    </BusinessShell>
  );
}
