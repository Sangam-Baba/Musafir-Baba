"use client";
// One client's month of counted calls (Stage 12 part B) — the same view for the client and MusafirBaba: totals by
// kind, by person and a bar per day. Nothing is charged yet (plans and billing come with Stage 13).
export type UsageMonthData = {
  orgId: string;
  month: string;
  billable: number;
  byMetric: Record<string, { count: number; billable: number }>;
  byUser: Record<string, number>;
  byDay: { day: string; count: number }[];
};
const KIND: Record<string, string> = { "hotel.search": "Hotel searches", "hotel.offers": "Room prices (hotel page)", "hotel.pricecheck": "Price checks", "hotel.order": "Bookings" };

export function UsageMonth({ data, userName }: { data: UsageMonthData; userName?: (id: string) => string }) {
  const max = Math.max(1, ...data.byDay.map((d) => d.count));
  return (
    <div className="space-y-3 text-[13px]">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[12px] text-slate-500">Counted this month</p><p className="text-lg font-semibold text-slate-900">{data.billable.toLocaleString("en-IN")}</p></div>
        {Object.entries(KIND).map(([k, label]) => (
          <div key={k} className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[12px] text-slate-500">{label}</p><p className="text-lg font-semibold text-slate-900">{(data.byMetric[k]?.billable ?? 0).toLocaleString("en-IN")}</p>{(data.byMetric[k]?.count ?? 0) > (data.byMetric[k]?.billable ?? 0) && <p className="text-[11px] text-slate-400">+{(data.byMetric[k]?.count ?? 0) - (data.byMetric[k]?.billable ?? 0)} free refreshes</p>}</div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <p className="mb-2 font-semibold text-slate-900">By day</p>
        {data.byDay.length === 0 ? <p className="text-slate-500">Nothing counted yet this month.</p> : (
          <div className="flex h-32 items-end gap-1" role="img" aria-label="Counted calls per day">
            {data.byDay.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center justify-end" title={`${d.day}: ${d.count}`}>
                <div className="w-full rounded-t bg-[#FE5300]/80" style={{ height: `${(d.count / max) * 100}%` }} />
                <span className="mt-1 text-[10px] text-slate-400">{d.day.slice(8)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {Object.keys(data.byUser).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-1 font-semibold text-slate-900">By person (all calls)</p>
          {Object.entries(data.byUser).sort((a, b) => b[1] - a[1]).map(([u, n]) => (
            <p key={u} className="flex justify-between border-b border-slate-100 py-1 last:border-0"><span className="text-slate-700">{userName ? userName(u) : u}</span><span className="font-medium">{n.toLocaleString("en-IN")}</span></p>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-500">Counted: searches, room prices, price checks and bookings that worked. Destination suggestions and hotel content are free. Nothing is charged yet.</p>
    </div>
  );
}
