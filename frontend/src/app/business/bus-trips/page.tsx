"use client";
// Trips & seats (bus operators, Stage 18 B3): the trips of the coming days, made from schedules 90 days ahead. Open a
// trip to see its stops and its seat map (the layout as it was when the trip was made); taken seats are shaded.
// Blocking seats for counter sales comes with B4.
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";

import { b2b } from "@/b2b/api";
import { istTime, legsTaken, type Trip, type TripDetail as TripWithSeats } from "@/b2b/bus";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { SeatMap } from "@/b2b/components/bus/SeatMap";
import { PageHeader, Panel, Pill } from "@/b2b/components/portal/ui";
import { errorMessage } from "@/b2b/messages";
import { useBusinessSession } from "@/b2b/session-store";
import type { Me } from "@/b2b/types";

const todayIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const plusDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

export default function BusTripsPage() {
  return <BusinessShell>{(me) => <Trips me={me} />}</BusinessShell>;
}

function TripDetail({ id, token, orgId }: { id: string; token: string | null; orgId: string | null }) {
  const trip = useQuery({ queryKey: ["b2b", "bus-trip", id, token, orgId], queryFn: () => b2b<TripWithSeats>(`/bus/trips/${id}`) });
  if (trip.isError) return <p className="text-[13px] text-red-600">{errorMessage(trip.error)}</p>;
  if (!trip.data) return <Loader2 className="h-5 w-5 animate-spin text-slate-400" />;
  const t = trip.data;
  const taken = t.decks.flatMap((d) => d.seats).filter((s) => s.taken);
  return (
    <Panel title={`${t.stops[0]?.name ?? ""} → ${t.stops[t.stops.length - 1]?.name ?? ""}`} subtitle={`${istTime(t.departAt)} · ${t.seatCount} seats · ${taken.length} with legs taken`}>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <ol className="space-y-1.5 text-[13px]">
          {t.stops.map((s) => (
            <li key={s.stopId} className="flex gap-2"><span className="w-28 shrink-0 text-slate-500">{istTime(s.at)}</span><span className="font-medium text-slate-800">{s.name}</span><span className="text-[11px] text-slate-400">{[s.boarding && "board", s.dropping && "get off"].filter(Boolean).join(" · ")}</span></li>
          ))}
        </ol>
        <div className="space-y-2">
          <SeatMap decks={t.decks} />
          {taken.length > 0 && <p className="text-[12px] text-slate-600">Taken: {taken.map((s) => `${s.no} (${legsTaken(s.taken ?? 0)}/${t.stops.length - 1} legs)`).join(", ")}</p>}
        </div>
      </div>
    </Panel>
  );
}

function Trips({ me }: { me: Me }) {
  const token = useBusinessSession((s) => s.accessToken);
  const canRead = me.permissions.includes("bus-inventory.trip.read");
  const [from, setFrom] = useState(todayIst());
  const [open, setOpen] = useState<string | null>(null);
  const to = plusDays(from, 6);
  const list = useQuery({ queryKey: ["b2b", "bus-trips", from, token, me.currentOrgId], queryFn: () => b2b<{ data: Trip[] }>(`/bus/trips?from=${from}&to=${to}`), enabled: canRead });
  if (!canRead) return <p className="text-[13px] text-slate-600">You don&apos;t have access to the trips of this company.</p>;
  const items = list.data?.data ?? [];
  return (
    <div className="space-y-4">
      <PageHeader crumb="Trips & seats" title="Trips &" highlight="seats" subtitle="Trips are made from your schedules for the next 90 days. Open one to see its stops and seats." />
      <div className="flex items-center gap-2 text-[13px]">
        <button type="button" aria-label="Previous week" onClick={() => setFrom(plusDays(from, -7))} disabled={from <= todayIst()} className="rounded border border-slate-300 p-1 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
        <span className="font-medium text-slate-800">{from} – {to}</span>
        <button type="button" aria-label="Next week" onClick={() => setFrom(plusDays(from, 7))} className="rounded border border-slate-300 p-1"><ChevronRight className="h-4 w-4" /></button>
      </div>
      {list.isLoading ? (
        <p className="text-[13px] text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-[13px] text-slate-500">No trips this week. Trips appear a few hours after a schedule is added.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((t) => (
            <li key={t.id} className="space-y-2">
              <button type="button" onClick={() => setOpen(open === t.id ? null : t.id)} className={`flex w-full flex-wrap items-center gap-3 rounded-lg border bg-white px-4 py-3 text-left text-[13px] ${open === t.id ? "border-[#FE5300]" : "border-slate-200"}`}>
                <span className="w-36 shrink-0 font-medium text-slate-900">{istTime(t.departAt)}</span>
                <span className="min-w-0 flex-1 text-slate-700">{t.stops[0]?.name} → {t.stops[t.stops.length - 1]?.name}</span>
                <span className="text-[12px] text-slate-500">{t.seatCount} seats</span>
                <Pill tone={t.status === "SCHEDULED" ? "green" : "red"}>{t.status === "SCHEDULED" ? "Scheduled" : "Cancelled"}</Pill>
              </button>
              {open === t.id && <TripDetail id={t.id} token={token} orgId={me.currentOrgId} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
