"use client";

import React, { useState } from "react";
import { ArrowUpDown, CalendarDays, Clock3, MapPin, Navigation, Search, Undo2 } from "lucide-react";
import LocationAutocompleteInput from "@/components/mbgo/LocationAutocompleteInput";
import type { SpecialSearchPoint } from "@/lib/rentalSpecial";

// Search bar of the special rental pages: same look and fields as the /mbgo
// search (One Way / Round Trip, pickup, drop, date & time) without the
// Local / Outstation / Airport / Rental tabs. It only hands the search to the
// page (onSearch); prices are shown on this page, nothing navigates away.

export interface SpecialSearch {
  pickup: SpecialSearchPoint;
  drop: SpecialSearchPoint;
  tripType: "ONE_WAY" | "ROUND_TRIP";
  rideDate: string;
  rideTime: string; // "10:00 AM", as the /mbgo search sends it
  returnDate: string;
}

export const todayStr = () => new Date().toISOString().slice(0, 10);

function to12Hour(hhmm: string) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hours = h % 12 === 0 ? 12 : h % 12;
  return `${String(hours).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

function to24Hour(display: string) {
  const match = display.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return "";
  const [, h, m, ampm] = match;
  let hours = parseInt(h, 10);
  if (ampm.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${m}`;
}

// One bar on desktop (segments split by thin dividers), stacked rows inside one
// rounded card on phones. Every field is a full-width tap target.
const seg = "group relative flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50/80 focus-within:bg-orange-50/40";
const segLabel = "block text-[10.5px] font-semibold uppercase tracking-[0.08em] text-gray-400";
const segInput =
  "mt-0.5 w-full min-w-0 bg-transparent text-[15px] font-semibold text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:outline-none truncate";
const segIcon = "h-[18px] w-[18px] shrink-0";

function Segment({ icon, label, children, className = "" }: { icon: React.ReactNode; label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`${seg} ${className}`}>
      {icon}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={segLabel}>{label}</span>
        {children}
      </span>
    </label>
  );
}

export default function SpecialRentalSearch({
  initial,
  isSearching,
  onSearch,
}: {
  initial: SpecialSearch;
  isSearching: boolean;
  onSearch: (s: SpecialSearch) => void;
}) {
  const [s, setS] = useState<SpecialSearch>(initial);
  const set = (patch: Partial<SpecialSearch>) => setS((prev) => ({ ...prev, ...patch }));
  const roundTrip = s.tripType === "ROUND_TRIP";

  return (
    <div className="relative z-20 mx-auto w-full max-w-6xl rounded-3xl bg-white/95 p-3 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.25)] ring-1 ring-black/5 backdrop-blur sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-3">
        <div role="tablist" aria-label="Trip type" className="inline-flex rounded-full bg-gray-100 p-1">
          {(["ONE_WAY", "ROUND_TRIP"] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={s.tripType === type}
              onClick={() => set({ tripType: type })}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all ${
                s.tripType === type ? "bg-white text-[#FE5300] shadow-sm" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {type === "ONE_WAY" ? "One Way" : "Round Trip"}
            </button>
          ))}
        </div>
        <p className="hidden items-center gap-1.5 text-[12px] font-medium text-gray-500 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Instant fares · No hidden charges
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(s);
        }}
        className="flex flex-col gap-3 lg:flex-row lg:items-stretch"
      >
        <div className="flex flex-1 flex-col divide-y divide-gray-200 overflow-visible rounded-2xl border border-gray-200 bg-white lg:flex-row lg:divide-x lg:divide-y-0">
          {/* From / To with the swap button on their shared edge */}
          <div className="relative flex flex-col divide-y divide-gray-200 lg:flex-[2.2] lg:flex-row lg:divide-x lg:divide-y-0">
            <Segment
              icon={<Navigation className={`${segIcon} text-emerald-500`} />}
              label="From"
              className="rounded-t-2xl lg:flex-1 lg:rounded-l-2xl lg:rounded-tr-none"
            >
              <LocationAutocompleteInput
                value={s.pickup.address || ""}
                onChange={(address, coords) => set({ pickup: { address, ...(coords || {}) } })}
                placeholder="Pickup city or address"
                className={`${segInput} pr-8 lg:pr-4`}
              />
            </Segment>
            <Segment icon={<MapPin className={`${segIcon} text-[#FE5300]`} />} label="To" className="lg:flex-1 lg:pl-7">
              <LocationAutocompleteInput
                value={s.drop.address || ""}
                onChange={(address, coords) => set({ drop: { address, ...(coords || {}) } })}
                placeholder="Where to?"
                className={segInput}
              />
            </Segment>
            <button
              type="button"
              onClick={() => set({ pickup: s.drop, drop: s.pickup })}
              title="Swap pickup and drop"
              aria-label="Swap pickup and drop"
              className="absolute right-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:border-[#FE5300] hover:text-[#FE5300] lg:left-[calc(50%)] lg:right-auto lg:-translate-x-1/2"
            >
              <ArrowUpDown className="h-3.5 w-3.5 lg:rotate-90" />
            </button>
          </div>

          {/* Date + time side by side on phones too */}
          <div className="grid grid-cols-2 divide-x divide-gray-200 lg:flex lg:flex-[1.6]">
            <Segment icon={<CalendarDays className={`${segIcon} text-gray-400`} />} label="Departure" className="lg:flex-1">
              <input
                type="date"
                value={s.rideDate}
                min={todayStr()}
                onChange={(e) => set({ rideDate: e.target.value })}
                className={`${segInput} text-[14px]`}
              />
            </Segment>
            <Segment icon={<Clock3 className={`${segIcon} text-gray-400`} />} label="Pickup time" className="lg:w-[150px] lg:flex-none">
              <input
                type="time"
                value={to24Hour(s.rideTime)}
                onChange={(e) => set({ rideTime: e.target.value ? to12Hour(e.target.value) : "" })}
                className={`${segInput} text-[14px]`}
              />
            </Segment>
          </div>

          {roundTrip && (
            <Segment
              icon={<Undo2 className={`${segIcon} text-gray-400`} />}
              label="Return"
              className="rounded-b-2xl lg:w-[170px] lg:flex-none lg:rounded-r-2xl lg:rounded-bl-none"
            >
              <input
                type="date"
                value={s.returnDate}
                min={s.rideDate || todayStr()}
                onChange={(e) => set({ returnDate: e.target.value })}
                className={`${segInput} text-[14px]`}
              />
            </Segment>
          )}
        </div>

        <button
          type="submit"
          disabled={isSearching}
          className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FE5300] to-[#ff7a33] px-7 text-[15px] font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:shadow-orange-500/30 active:scale-[0.98] disabled:opacity-70 lg:h-auto lg:w-auto"
        >
          <Search className="h-[18px] w-[18px]" />
          {isSearching ? "Checking…" : "Check Prices"}
        </button>
      </form>
    </div>
  );
}
