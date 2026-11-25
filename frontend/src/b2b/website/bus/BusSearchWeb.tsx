"use client";
// /buses — search buses between two cities on a date (website prices: final, incl. GST). The search lives in the URL
// (?from&to&date&ac&seatType&sort), so results can be shared and the back button works.
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BusFront, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AMENITY_LABEL, duration, istTime, KIND_LABEL } from "../../bus";
import { errorMessage } from "../../messages";
import { inr, today } from "../hotels";
import { busCities, searchBuses } from "./busWeb";

const field = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#FE5300]";

export function BusSearchWeb() {
  const router = useRouter();
  const params = useSearchParams();
  const q = { from: params.get("from") ?? "", to: params.get("to") ?? "", date: params.get("date") ?? today(), ac: params.get("ac") ?? "", seatType: params.get("seatType") ?? "", sort: params.get("sort") ?? "departure" };
  const [form, setForm] = useState(q);
  const cities = useQuery({ queryKey: ["bus-cities"], queryFn: busCities, staleTime: 3_600_000 });
  const ready = Boolean(q.from && q.to && q.date);
  const results = useQuery({ queryKey: ["bus-search", q], queryFn: () => searchBuses(q), enabled: ready });
  const name = (id: string) => cities.data?.find((c) => c.id === id)?.name ?? "";
  function go(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/buses?${new URLSearchParams(Object.entries(form).filter(([, v]) => v) as [string, string][]).toString()}`);
  }
  return (
    <div className="space-y-5">
      <form onSubmit={go} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[1fr_1fr_10rem_8rem_auto] lg:items-end">
        <label className="text-sm font-medium text-slate-700">From<select required value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className={field}><option value="">Leaving from</option>{cities.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">To<select required value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} className={field}><option value="">Going to</option>{cities.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="text-sm font-medium text-slate-700">Date<input required type="date" min={today()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={field} /></label>
        <label className="text-sm font-medium text-slate-700">Bus<select value={form.ac} onChange={(e) => setForm({ ...form, ac: e.target.value })} className={field}><option value="">Any</option><option value="AC">AC</option><option value="NON_AC">Non-AC</option></select></label>
        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FE5300] px-5 py-2.5 text-sm font-semibold text-white"><Search className="h-4 w-4" /> Search buses</button>
      </form>
      {!ready ? (
        <p className="rounded-xl bg-orange-50 p-6 text-center text-slate-700">Pick where you&apos;re going and when.</p>
      ) : results.isLoading ? (
        <p className="text-slate-500">Finding buses…</p>
      ) : results.isError ? (
        <p className="rounded-xl bg-red-50 p-4 text-red-700">{errorMessage(results.error)}</p>
      ) : (results.data?.data.length ?? 0) === 0 ? (
        <p className="rounded-xl bg-slate-50 p-6 text-center text-slate-600">No buses from {name(q.from)} to {name(q.to)} on {q.date}. Try another date.</p>
      ) : (
        <ul className="space-y-3">
          {results.data?.data.map((r) => (
            <li key={r.tripId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-4">
                <BusFront className="h-7 w-7 text-[#FE5300]" />
                <div className="min-w-[160px] flex-1">
                  <p className="font-semibold text-slate-900">{r.operatorName}</p>
                  <p className="text-sm text-slate-500">{r.bus.acType === "AC" ? "AC" : "Non-AC"} {KIND_LABEL[r.bus.kind]}</p>
                </div>
                <p className="text-center"><b className="text-lg">{istTime(r.departAt)}</b><span className="block text-xs text-slate-500">{r.boardingPoints[0]?.name}</span></p>
                <p className="text-xs text-slate-400">{duration(r.durationMinutes)} <ArrowRight className="inline h-3 w-3" /></p>
                <p className="text-center"><b className="text-lg">{istTime(r.arriveAt)}</b><span className="block text-xs text-slate-500">{r.droppingPoints[0]?.name}</span></p>
                <p className="text-right"><span className="block text-xs text-slate-500">from</span><b className="text-xl text-slate-900">{inr(r.fromPricePaise)}</b><span className="block text-xs text-slate-500">{r.seatsLeft} seats left</span></p>
                <Link href={`/buses/trip/${r.tripId}?from=${r.boardingPoints[0]?.stopId}&to=${r.droppingPoints[0]?.stopId}&date=${q.date}&fromCity=${q.from}&toCity=${q.to}`} className="rounded-lg bg-[#FE5300] px-4 py-2 text-sm font-semibold text-white">Select seats</Link>
              </div>
              {r.bus.amenities.length > 0 && <p className="mt-2 text-xs text-slate-500">{r.bus.amenities.map((a) => AMENITY_LABEL[a]).join(" · ")}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
