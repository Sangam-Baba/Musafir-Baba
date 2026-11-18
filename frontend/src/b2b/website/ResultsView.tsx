"use client";
// /hotels: the search (from the URL), filters, sort, results with "from" prices incl. GST, map, more results.
// Prices are advisory — the hotel page checks rooms and price again before checkout.
import { useQuery } from "@tanstack/react-query";
import { BedDouble, Loader2, MapIcon, Star } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { errorMessage } from "../messages";
import { HotelMap } from "./HotelMap";
import { addDays, hotelsApi, inr, MEAL_LABEL, roomsFromParam, roomsToParam, today, type Destination, type SearchItem, type SearchResult } from "./hotels";
import { HotelSearchBar } from "./SearchBar";

type Sort = "recommended" | "price" | "star";
type Filters = { star: number[]; refundableOnly: boolean; mealPlans: string[]; maxPerNight: string };

function Card({ item, stay }: { item: SearchItem; stay: string }) {
  return (
    <a href={`/hotels/${item.slug}?${stay}`} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md sm:flex-row">
      <div className="h-44 w-full shrink-0 bg-slate-100 sm:h-auto sm:w-60">
        {item.coverUrl ? <img src={item.coverUrl} alt={item.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-slate-300"><BedDouble size={32} /></div>}
      </div>
      <div className="flex flex-1 flex-col justify-between gap-3 p-4 sm:flex-row">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-900">{item.name}</h3>
          {item.starRating > 0 && <div className="flex text-amber-500">{Array.from({ length: item.starRating }, (_, i) => <Star key={i} size={13} fill="currentColor" />)}</div>}
          <p className="text-sm text-slate-500">{[item.areaName, item.cityName].filter(Boolean).join(", ")}{item.distanceKm !== null ? ` · ${item.distanceKm} km away` : ""}</p>
          {item.from && (
            <p className="text-xs text-slate-600">
              {item.from.roomTypeName} · {MEAL_LABEL[item.from.mealPlanKey] ?? item.from.planName}
              {item.from.refundable ? <span className="ml-1 text-emerald-700">· Refundable</span> : <span className="ml-1 text-slate-500">· Non-refundable</span>}
            </p>
          )}
        </div>
        <div className="text-left sm:text-right">
          {item.from ? (
            <>
              <p className="text-xl font-bold text-slate-900">{inr(item.from.perNightPaise)}</p>
              <p className="text-xs text-slate-500">per night, incl. GST</p>
              <p className="text-xs text-slate-500">{inr(item.from.totalPaise)} total</p>
            </>
          ) : (
            <p className="text-sm font-medium text-red-600">Sold out for these dates</p>
          )}
        </div>
      </div>
    </a>
  );
}

function FilterPanel({ f, onChange }: { f: Filters; onChange: (f: Filters) => void }) {
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <div>
        <p className="mb-1.5 font-medium text-slate-800">Stars</p>
        <div className="flex flex-wrap gap-1.5">
          {[5, 4, 3, 2, 1].map((s) => (
            <button key={s} onClick={() => onChange({ ...f, star: toggle(f.star, s) })} className={`rounded-full border px-2.5 py-0.5 ${f.star.includes(s) ? "border-[#FE5300] bg-orange-50 text-[#FE5300]" : "border-slate-200 text-slate-600"}`}>{s}★</button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 font-medium text-slate-800">Meals</p>
        {Object.entries(MEAL_LABEL).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-slate-600"><input type="checkbox" checked={f.mealPlans.includes(k)} onChange={() => onChange({ ...f, mealPlans: toggle(f.mealPlans, k) })} /> {label}</label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-slate-600"><input type="checkbox" checked={f.refundableOnly} onChange={(e) => onChange({ ...f, refundableOnly: e.target.checked })} /> Refundable only</label>
      <label className="block text-slate-600">
        Max price per night (₹)
        <input type="number" min={0} value={f.maxPerNight} onChange={(e) => onChange({ ...f, maxPerNight: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2" placeholder="any" />
      </label>
    </div>
  );
}

export function ResultsView() {
  const params = useSearchParams();
  const router = useRouter();
  const [sort, setSort] = useState<Sort>("recommended");
  const [filters, setFilters] = useState<Filters>({ star: [], refundableOnly: false, mealPlans: [], maxPerNight: "" });
  const [pages, setPages] = useState<string[]>([""]);
  const [showMap, setShowMap] = useState(false);
  const type = params.get("type") as Destination["type"] | null;
  const id = params.get("id");
  const checkIn = params.get("checkIn") ?? addDays(today(), 7);
  const checkOut = params.get("checkOut") ?? addDays(checkIn, 1);
  const rooms = useMemo(() => roomsFromParam(params.get("rooms")), [params]);
  const destination = type && id ? ({ type, id, name: params.get("name") ?? "", cityId: params.get("cityId") ?? id, cityName: "" } as Destination) : null;
  const stay = `checkIn=${checkIn}&checkOut=${checkOut}&rooms=${roomsToParam(rooms)}`;
  const body = destination && {
    destination: destination.type === "AREA" ? { type: "AREA", id: destination.id, cityId: destination.cityId } : { type: destination.type, id: destination.id },
    checkIn,
    checkOut,
    rooms,
    sort,
    filters: { ...(filters.star.length ? { star: filters.star } : {}), ...(filters.mealPlans.length ? { mealPlans: filters.mealPlans } : {}), ...(filters.refundableOnly ? { refundableOnly: true } : {}), ...(filters.maxPerNight ? { priceRange: { maxPaise: Math.round(Number(filters.maxPerNight) * 100) } } : {}) },
  };
  const key = JSON.stringify(body);
  const results = useQuery({
    queryKey: ["hotels", "search", key, pages],
    enabled: Boolean(body),
    queryFn: async () => Promise.all(pages.map((cursor) => hotelsApi<SearchResult>("/hotels/search", { ...body, cursor: cursor || null }))),
  });
  const items = results.data?.flatMap((p) => p.items) ?? [];
  const last = results.data?.at(-1);
  const pick = useCallback((slug: string) => router.push(`/hotels/${slug}?${stay}`), [router, stay]);
  const reset = () => setPages([""]);

  return (
    <div className="space-y-4">
      <HotelSearchBar initial={{ destination, checkIn, checkOut, rooms }} />
      {!destination && <p className="py-10 text-center text-slate-600">Search for a city, area or hotel to see rooms and prices.</p>}
      {destination && (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <FilterPanel f={filters} onChange={(f) => (setFilters(f), reset())} />
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="text-slate-700">{results.data ? `${results.data[0]?.total ?? 0} hotel${results.data[0]?.total === 1 ? "" : "s"} in ${destination.name}` : "Searching…"}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowMap(!showMap)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700"><MapIcon size={14} /> {showMap ? "Hide map" : "Map"}</button>
                <select value={sort} onChange={(e) => (setSort(e.target.value as Sort), reset())} className="rounded-lg border border-slate-200 px-2 py-1.5 text-slate-700">
                  <option value="recommended">Recommended</option>
                  <option value="price">Price: low to high</option>
                  <option value="star">Stars</option>
                </select>
              </div>
            </div>
            {showMap && <HotelMap items={items} onPick={pick} />}
            {results.isLoading && <div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>}
            {results.isError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMessage(results.error)}</p>}
            {results.data && items.length === 0 && <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-600">No hotels with rooms for these dates. Try other dates or fewer filters.</p>}
            {items.map((i) => <Card key={i.id} item={i} stay={stay} />)}
            {last?.nextCursor && <button onClick={() => setPages([...pages, last.nextCursor as string])} className="w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-700 hover:border-[#FE5300]">Show more hotels</button>}
            <p className="text-xs text-slate-500">Prices include GST and are checked again before you pay.</p>
          </div>
        </div>
      )}
    </div>
  );
}
