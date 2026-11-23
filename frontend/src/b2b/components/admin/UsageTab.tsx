"use client";
// B2B admin → Usage (Stage 12 part B): every client's counted calls this month, most used first (CSV), and one
// client's month — the same view the client sees.
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { B2B_API } from "../../api";
import { errorMessage } from "../../messages";
import { UsageMonth, type UsageMonthData } from "../usage/UsageMonth";
import { adminCall } from "./AdminPassGate";
import { FleetEmptyState, FleetPanel, SecondaryBtn } from "./kit";

type Row = { orgId: string; name: string; reference: string | null; billable: number; count: number };
const thisMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(new Date());

export function UsageTab({ token }: { token: string }) {
  const [month, setMonth] = useState(thisMonth);
  const [picked, setPicked] = useState<string | null>(null);
  const all = useQuery({ queryKey: ["b2b-admin", "usage", month], queryFn: () => adminCall<{ data: Row[] }>(`/admin/usage?month=${month}`, token), retry: false });
  const one = useQuery({ queryKey: ["b2b-admin", "usage", month, picked], queryFn: () => adminCall<UsageMonthData>(`/admin/usage/${picked}?month=${month}`, token), enabled: Boolean(picked) });
  async function csv() {
    try {
      const res = await fetch(`${B2B_API}/admin/usage.csv?month=${month}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Download failed");
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `musafirbaba-usage-${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }
  return (
    <div className="space-y-3">
      <FleetPanel title="Client usage" description="Counted searches, room prices, price checks and bookings per client. Billing switches on with plans (Stage 13)." icon={BarChart3} bodyClassName="p-0">
        <div className="flex items-center gap-2 px-4 py-2 text-[13px]">
          <input type="month" value={month} onChange={(e) => { setMonth(e.target.value); setPicked(null); }} className="h-8 rounded-md border border-slate-200 px-2" />
          <SecondaryBtn onClick={csv}><Download size={13} /> CSV</SecondaryBtn>
        </div>
        {all.error && <p className="p-4 text-[13px] text-red-700">{errorMessage(all.error)}</p>}
        {all.data?.data.length === 0 && <FleetEmptyState icon={BarChart3} title="No client usage this month" />}
        {all.data?.data.map((r) => (
          <button key={r.orgId} onClick={() => setPicked(picked === r.orgId ? null : r.orgId)} className={`flex w-full items-center gap-3 border-t border-slate-100 px-4 py-2 text-left text-[13px] hover:bg-slate-50 ${picked === r.orgId ? "bg-orange-50" : ""}`}>
            <span className="font-medium text-slate-900">{r.name}</span>
            {r.reference && <span className="font-mono text-[11px] text-slate-500">{r.reference}</span>}
            <span className="ml-auto font-semibold">{r.billable.toLocaleString("en-IN")}</span>
            <span className="w-28 text-right text-slate-500">{r.count.toLocaleString("en-IN")} calls</span>
          </button>
        ))}
      </FleetPanel>
      {picked && one.data && <UsageMonth data={one.data} />}
    </div>
  );
}
