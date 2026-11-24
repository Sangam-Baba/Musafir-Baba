"use client";
// Client reports (Stage 15): bookings by month, spend by destination / branch / booker (limited to what this person
// may see, like My Bookings), and usage by month — each with a CSV download.
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader, Panel, Tabs } from "@/b2b/components/portal/ui";
import { errorMessage } from "@/b2b/messages";
import { businessDownload, columnLabel, indiaDay, indiaMonth, type ReportResult } from "@/b2b/payouts";
import { inr } from "@/b2b/website/hotels";

type Name = "bookings" | "spend" | "usage";

function ReportsView({ canUsage }: { canUsage: boolean }) {
  const [name, setName] = useState<Name>("bookings");
  const [from, setFrom] = useState(() => `${indiaMonth(-2)}-01`);
  const [to, setTo] = useState(() => indiaDay());
  const [groupBy, setGroupBy] = useState<"destination" | "branch" | "booker">("destination");
  const query = `from=${from}&to=${to}${name === "spend" ? `&groupBy=${groupBy}` : ""}`;
  const q = useQuery({ queryKey: ["b2b", "reports", name, query], queryFn: () => b2b<ReportResult>(`/reports/${name}?${query}`), retry: false });
  async function csv() {
    try {
      await businessDownload(`/reports/${name}?${query}&format=csv`, `${name}.csv`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  const tabs: { value: Name; label: string }[] = [
    { value: "bookings", label: "Bookings" },
    { value: "spend", label: "Spend" },
    ...(canUsage ? [{ value: "usage" as const, label: "Usage" }] : []),
  ];
  const r = q.data;
  return (
    <div className="space-y-4">
      <PageHeader title="Your" highlight="reports" subtitle="Bookings and spend for the dates you choose (booked date). Cancelled bookings show with their refunds." />
      <Tabs tabs={tabs} value={name} onChange={setName} />
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <label>From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-lg border border-slate-200 px-2" /></label>
        <label>To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-lg border border-slate-200 px-2" /></label>
        {name === "spend" && (
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as "destination" | "branch" | "booker")} className="h-8 rounded-lg border border-slate-200 px-2">
            <option value="destination">By destination</option>
            <option value="branch">By branch</option>
            <option value="booker">By person who booked</option>
          </select>
        )}
        <button onClick={csv} className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5"><Download size={14} /> CSV</button>
      </div>
      <Panel icon={BarChart3} title={tabs.find((t) => t.value === name)?.label ?? ""}>
        {q.isLoading && <p className="text-[13px] text-slate-500">Loading…</p>}
        {q.error && <p className="text-[13px] text-red-700">{errorMessage(q.error)}</p>}
        {r && r.rows.length === 0 && <p className="py-4 text-center text-[13px] text-slate-500">Nothing in these dates.</p>}
        {r && r.rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-left text-[12px] text-slate-500"><tr>{r.columns.map((c) => <th key={c} className="px-2 py-1.5 font-medium">{c === "key" ? (name === "spend" ? ({ destination: "Destination", branch: "Branch", booker: "Booked by" } as const)[groupBy] : "Key") : columnLabel(c)}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {r.rows.map((row, i) => (
                  <tr key={i}>
                    {r.columns.map((c) => {
                      const v = row[c];
                      return <td key={c} className={`px-2 py-1.5 ${typeof v === "number" ? "text-right" : ""}`}>{c.endsWith("Paise") && typeof v === "number" ? inr(v) : v === null || v === undefined || v === "" || v === "—" ? "—" : String(v)}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <BusinessShell>
      {(me) =>
        me.permissions.includes("orders.export.read") ? (
          <ReportsView canUsage={me.permissions.includes("metering.usage.read")} />
        ) : (
          <p className="text-[13px] text-slate-600">Your role can&apos;t see reports. Ask your company&apos;s owner.</p>
        )
      }
    </BusinessShell>
  );
}
