"use client";
// B2B admin → How it works: the whole B2B + hotel system with one worked example (for MusafirBaba staff).
import { BookOpen } from "lucide-react";

import { AdminPageHeader, FleetPage, SECTION } from "@/b2b/components/admin/kit";
import { HowItWorks } from "@/b2b/components/guide/HowItWorks";

export default function B2BGuidePage() {
  return (
    <FleetPage>
      <AdminPageHeader
        section={SECTION}
        icon={BookOpen}
        title="How the B2B system works"
        description="Who does what, a worked example from sign-up to payout, where the money goes, and where each thing is in admin."
        actions={<a href="/admin/b2b" className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50">← Back to B2B admin</a>}
      />
      <HowItWorks audience="admin" />
    </FleetPage>
  );
}
