"use client";
// The company's usage this month (Stage 12 part B): counted searches, prices and bookings — by kind, person and day.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader } from "@/b2b/components/portal/ui";
import { UsageMonth, type UsageMonthData } from "@/b2b/components/usage/UsageMonth";
import { errorMessage } from "@/b2b/messages";

const thisMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(new Date());

function Usage() {
  const [month, setMonth] = useState(thisMonth);
  const q = useQuery({ queryKey: ["b2b", "usage", month], queryFn: () => b2b<UsageMonthData>(`/usage?month=${month}`) });
  return (
    <div className="space-y-4">
      <PageHeader title="Your" highlight="usage" subtitle="Searches, room prices, price checks and bookings your team made this month." />
      <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-8 rounded-lg border border-slate-200 px-2 text-[13px]" />
      {q.error && <p className="text-[13px] text-red-700">{errorMessage(q.error)}</p>}
      {q.data && <UsageMonth data={q.data} />}
    </div>
  );
}

export default function UsagePage() {
  return <BusinessShell>{(me) => (me.permissions.includes("metering.usage.read") ? <Usage /> : <p className="text-[13px] text-slate-600">Only your company&apos;s owner, admin or accountant can see usage.</p>)}</BusinessShell>;
}
