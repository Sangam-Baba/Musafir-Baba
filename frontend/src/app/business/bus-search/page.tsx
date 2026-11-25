"use client";
// Search Buses (B2B clients, Stage 18 B5): from city → to city on a date, filters, then a bus's seat map for the chosen
// boarding and getting-off points, with B2B prices (price + GST); pick seats, add passengers and book (B6).
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BusFront, Loader2, Search } from "lucide-react";
import { useState } from "react";

import { b2b } from "@/b2b/api";
import { AMENITY_LABEL, duration, istTime, KIND_LABEL, rupees, type BusResult, type BuyerSeatMap } from "@/b2b/bus";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { BusBookForm } from "@/b2b/components/bus/BusBookForm";
import { SeatMap, seatAt } from "@/b2b/components/bus/SeatMap";
import { inputCls } from "@/b2b/components/listing/ui";
import { PageHeader, Panel, Pill } from "@/b2b/components/portal/ui";
import type { Masters } from "@/b2b/listing";
import { errorMessage } from "@/b2b/messages";
import type { Me } from "@/b2b/types";

const todayIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export default function BusSearchPage() {
  return <BusinessShell>{(me) => <BusSearch me={me} />}</BusinessShell>;
}

function Seats({ trip, me }: { trip: BusResult; me: Me }) {
  const [from, setFrom] = useState(trip.boardingPoints[0]?.stopId ?? "");
  const [to, setTo] = useState(trip.droppingPoints[0]?.stopId ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const map = useQuery({ queryKey: ["b2b", "bus-seats", trip.tripId, from, to], queryFn: () => b2b<BuyerSeatMap>(`/buses/trips/${trip.tripId}/seats?from=${from}&to=${to}`) });
  const seats = map.data?.decks.flatMap((d) => d.seats) ?? [];
  const decks = (map.data?.decks ?? []).map((d) => ({ ...d, seats: d.seats.map((s) => ({ ...s, taken: s.available ? 0 : 1 })) }));
  const total = picked.reduce((t, no) => t + (seats.find((s) => s.no === no)?.price?.totalPaise ?? 0), 0);
  const pick = (deckIndex: number, row: number, col: number) => {
    const d = map.data?.decks[deckIndex];
    const s = d && (seatAt(d, row, col) as (typeof seats)[number] | undefined);
    if (!s?.available) return;
    setPicked(picked.includes(s.no) ? picked.filter((x) => x !== s.no) : [...picked, s.no].slice(0, 10));
  };
  return (
    <div className="space-y-3 border-t border-slate-100 pt-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-[11px] text-slate-600">Boarding at
          <select value={from} onChange={(e) => (setFrom(e.target.value), setPicked([]))} className={inputCls}>
            {trip.boardingPoints.map((p) => <option key={p.stopId} value={p.stopId}>{p.name} · {istTime(p.at)}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-slate-600">Getting off at
          <select value={to} onChange={(e) => (setTo(e.target.value), setPicked([]))} className={inputCls}>
            {trip.droppingPoints.map((p) => <option key={p.stopId} value={p.stopId}>{p.name} · {istTime(p.at)}</option>)}
          </select>
        </label>
      </div>
      {map.isError ? (
        <p className="text-[13px] text-red-600">{errorMessage(map.error)}</p>
      ) : !map.data ? (
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <SeatMap decks={decks} selected={picked} onCell={pick} />
          <div className="space-y-2 text-[13px]">
            <p className="text-slate-600">Pick up to 10 seats. Pink seats are for women only.</p>
            {picked.length > 0 && (
              <div className="rounded-md border border-slate-200 p-3">
                {picked.map((no) => <p key={no} className="flex justify-between"><span>Seat {no}</span><span>{rupees(seats.find((s) => s.no === no)?.price?.totalPaise ?? 0)}</span></p>)}
                <p className="mt-2 flex justify-between border-t border-slate-100 pt-2 font-semibold"><span>Total (incl. GST)</span><span>{rupees(total)}</span></p>
              </div>
            )}
            {picked.length > 0 && (me.permissions.includes("orders.order.create") && !me.viewAs ? (
              <BusBookForm key={picked.join(",")} me={me} tripId={trip.tripId} fromStopId={from} toStopId={to} seats={seats.filter((s) => picked.includes(s.no))} totalPaise={total} />
            ) : (
              <p className="text-[12px] text-slate-500">You can see prices; booking needs the Booking Agent or Admin role.</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({ r, open, onToggle, me }: { r: BusResult; open: boolean; onToggle: () => void; me: Me }) {
  return (
    <li className={`rounded-lg border bg-white p-4 ${open ? "border-[#FE5300]" : "border-slate-200"}`}>
      <button type="button" onClick={onToggle} className="flex w-full flex-wrap items-center gap-4 text-left">
        <BusFront className="h-6 w-6 text-slate-400" />
        <span className="min-w-[160px] flex-1">
          <span className="block text-[14px] font-semibold text-slate-900">{r.operatorName}</span>
          <span className="block text-[12px] text-slate-500">{r.bus.acType === "AC" ? "AC" : "Non-AC"} {KIND_LABEL[r.bus.kind]}{r.bus.name ? ` · ${r.bus.name}` : ""}</span>
        </span>
        <span className="text-center text-[13px]"><b>{istTime(r.departAt)}</b><span className="block text-[11px] text-slate-500">{r.boardingPoints[0]?.name}</span></span>
        <span className="text-[11px] text-slate-400">{duration(r.durationMinutes)} <ArrowRight className="inline h-3 w-3" /></span>
        <span className="text-center text-[13px]"><b>{istTime(r.arriveAt)}</b><span className="block text-[11px] text-slate-500">{r.droppingPoints[0]?.name}</span></span>
        <span className="text-right"><span className="block text-[11px] text-slate-500">from</span><b className="text-[15px] text-slate-900">{rupees(r.fromPricePaise)}</b></span>
        <Pill tone={r.seatsLeft < 5 ? "amber" : "green"}>{r.seatsLeft} seats left</Pill>
      </button>
      {r.bus.amenities.length > 0 && <p className="mt-2 text-[11px] text-slate-500">{r.bus.amenities.map((a) => AMENITY_LABEL[a]).join(" · ")}</p>}
      {open && <Seats trip={r} me={me} />}
    </li>
  );
}

function BusSearch({ me }: { me: Me }) {
  const can = me.permissions.includes("bus-booking.search.use");
  const masters = useQuery({ queryKey: ["b2b", "masters"], queryFn: () => b2b<Masters>("/catalog/masters"), staleTime: 300_000 });
  const [form, setForm] = useState({ from: "", to: "", date: todayIst(), ac: "", seatType: "", sort: "departure" });
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const results = useQuery({ queryKey: ["b2b", "bus-search", query], queryFn: () => b2b<{ data: BusResult[] }>(`/buses/search?${query}`), enabled: Boolean(query) });
  if (!can) return <p className="text-[13px] text-slate-600">You don&apos;t have access to bus search.</p>;
  const cities = masters.data?.cities ?? [];
  function go(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams({ from: form.from, to: form.to, date: form.date, sort: form.sort, ...(form.ac ? { ac: form.ac } : {}), ...(form.seatType ? { seatType: form.seatType } : {}) });
    setOpen(null);
    setQuery(p.toString());
  }
  return (
    <div className="space-y-4">
      <PageHeader crumb="Search Buses" title="Search" highlight="Buses" subtitle="Find buses between two cities and see the exact seats with your B2B price." />
      <Panel icon={Search} title="Where and when">
        <form onSubmit={go} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7 lg:items-end">
          <label className="text-[12px] font-medium text-slate-700 lg:col-span-2">From
            <select required value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className={inputCls}><option value="">— city —</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </label>
          <label className="text-[12px] font-medium text-slate-700 lg:col-span-2">To
            <select required value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} className={inputCls}><option value="">— city —</option>{cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </label>
          <label className="text-[12px] font-medium text-slate-700">Date<input required type="date" min={todayIst()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} /></label>
          <label className="text-[12px] font-medium text-slate-700">AC
            <select value={form.ac} onChange={(e) => setForm({ ...form, ac: e.target.value })} className={inputCls}><option value="">Any</option><option value="AC">AC</option><option value="NON_AC">Non-AC</option></select>
          </label>
          <button className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#FE5300] px-3 py-2 text-[13px] font-medium text-white"><Search className="h-4 w-4" /> Search</button>
          <label className="text-[12px] font-medium text-slate-700">Seat
            <select value={form.seatType} onChange={(e) => setForm({ ...form, seatType: e.target.value })} className={inputCls}><option value="">Any</option><option value="SLEEPER">Sleeper</option><option value="SEMI_SLEEPER">Semi-sleeper</option><option value="SEATER">Seater</option></select>
          </label>
          <label className="text-[12px] font-medium text-slate-700">Sort
            <select value={form.sort} onChange={(e) => setForm({ ...form, sort: e.target.value })} className={inputCls}><option value="departure">Departure</option><option value="price">Price</option></select>
          </label>
        </form>
      </Panel>
      {!query ? null : results.isLoading ? (
        <p className="text-[13px] text-slate-500">Searching…</p>
      ) : results.isError ? (
        <p className="text-[13px] text-red-600">{errorMessage(results.error)}</p>
      ) : (results.data?.data.length ?? 0) === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-[13px] text-slate-500">No buses found for that day.</p>
      ) : (
        <ul className="space-y-2">{results.data?.data.map((r) => <ResultCard key={r.tripId} r={r} me={me} open={open === r.tripId} onToggle={() => setOpen(open === r.tripId ? null : r.tripId)} />)}</ul>
      )}
    </div>
  );
}
