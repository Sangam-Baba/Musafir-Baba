"use client";
// Bookings (bus operators, Stage 18 B6): confirmed bookings by travel date, grouped by trip, with each trip's manifest —
// every booked seat with its passenger, boarding and getting-off stop, PNR and the booker's phone — and a CSV for the
// conductor. Amounts shown are the company's net fares (what it is paid).
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Download, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "@/b2b/api";
import { GENDER_LABEL, istTime, rupees, type Manifest, type OperatorBusBooking } from "@/b2b/bus";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { inputCls } from "@/b2b/components/listing/ui";
import { OperatorReviews } from "@/b2b/components/bus/OperatorReviews";
import { PageHeader, Panel, StatCard } from "@/b2b/components/portal/ui";
import { errorMessage } from "@/b2b/messages";
import { businessDownload } from "@/b2b/payouts";
import { useBusinessSession } from "@/b2b/session-store";
import type { Me } from "@/b2b/types";

const todayIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export default function BusBookingsPage() {
  return <BusinessShell>{(me) => <BusBookings me={me} />}</BusinessShell>;
}

function ManifestPanel({ tripId }: { tripId: string }) {
  const m = useQuery({ queryKey: ["b2b", "bus-manifest", tripId], queryFn: () => b2b<Manifest>(`/bus/trips/${tripId}/manifest`) });
  if (m.isError) return <p className="text-[13px] text-red-600">{errorMessage(m.error)}</p>;
  if (!m.data) return <p className="text-[13px] text-slate-500">Loading…</p>;
  const d = m.data;
  async function csv() {
    try {
      await businessDownload(`/bus/trips/${tripId}/manifest?format=csv`, `manifest-${d.trip.date}.csv`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <Panel icon={Users} title={`Manifest — ${d.trip.stops[0]?.name ?? ""} ${istTime(d.trip.departAt)}`} subtitle={`${d.rows.length} of ${d.trip.seatCount} seats booked online`} action={<button type="button" onClick={csv} className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-[12px]"><Download className="h-3.5 w-3.5" /> CSV</button>}>
      {d.rows.length === 0 ? (
        <p className="text-[13px] text-slate-500">No online bookings on this trip yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-[12px]">
            <thead className="text-slate-500"><tr>{["Seat", "Passenger", "Age", "Gender", "Boarding", "Getting off", "PNR", "Phone"].map((h) => <th key={h} className="pb-1 pr-3 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={`${r.pnr}-${r.seat}`} className="border-t border-slate-100">
                  <td className="py-1 pr-3 font-semibold">{r.seat}</td><td className="pr-3">{r.name}</td><td className="pr-3">{r.age}</td><td className="pr-3">{GENDER_LABEL[r.gender]}</td>
                  <td className="pr-3">{r.boarding} · {istTime(r.boardingAt)}</td><td className="pr-3">{r.dropping}</td><td className="pr-3 font-mono">{r.pnr}</td><td>{r.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function BusBookings({ me }: { me: Me }) {
  const token = useBusinessSession((s) => s.accessToken);
  const can = me.permissions.includes("bus-booking.booking.read");
  const [date, setDate] = useState(todayIst());
  const [manifest, setManifest] = useState<string | null>(null);
  const list = useQuery({ queryKey: ["b2b", "bus-bookings", date, token, me.currentOrgId], queryFn: () => b2b<{ data: OperatorBusBooking[] }>(`/bus/bookings?date=${date}`), enabled: can });
  if (!can) return <p className="text-[13px] text-slate-600">You don&apos;t have access to this company&apos;s bookings.</p>;
  const items = list.data?.data ?? [];
  const trips = [...new Set(items.map((b) => b.tripId))];
  const seats = items.filter((b) => b.status === "CONFIRMED").reduce((n, b) => n + b.seats.length, 0);
  return (
    <div className="space-y-4">
      <PageHeader crumb="Bookings" title="Bus" highlight="Bookings" subtitle="Seats sold online on your trips, with the passenger list (manifest) for each trip." />
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-[12px] font-medium text-slate-700">Travel date<input type="date" value={date} onChange={(e) => (setDate(e.target.value), setManifest(null))} className={inputCls} /></label>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={ClipboardList} label="Bookings" value={list.isLoading ? "…" : items.length} />
        <StatCard icon={Users} tone="green" label="Seats sold" value={list.isLoading ? "…" : seats} />
      </div>
      {items.length === 0 && !list.isLoading ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-[13px] text-slate-500">No bookings for this date.</p>
      ) : (
        trips.map((tripId) => {
          const group = items.filter((b) => b.tripId === tripId);
          return (
            <div key={tripId} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold text-slate-800">Trip {group[0]?.from.name} · {istTime(group[0]?.from.at ?? "")}</p>
                <button type="button" onClick={() => setManifest(manifest === tripId ? null : tripId)} className="rounded-md border border-slate-300 px-2.5 py-1 text-[12px]">{manifest === tripId ? "Hide manifest" : "Manifest"}</button>
              </div>
              {manifest === tripId && <ManifestPanel tripId={tripId} />}
              <ul className="space-y-1.5">
                {group.map((b) => (
                  <li key={b.bookingId} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px]">
                    <span className="font-mono font-semibold text-slate-800">{b.ref}</span>
                    <span className="text-slate-600">{b.from.name} → {b.to.name}</span>
                    <span className="text-slate-600">Seats {b.seats.map((s) => s.no).join(", ")}</span>
                    <span className="text-slate-500">{b.contact.name} · {b.contact.phone}</span>
                    <span className="ml-auto font-medium">{rupees(b.netPaise)}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
      <OperatorReviews canReply={me.permissions.includes("bus-booking.review.reply") && !me.viewAs} />
    </div>
  );
}
