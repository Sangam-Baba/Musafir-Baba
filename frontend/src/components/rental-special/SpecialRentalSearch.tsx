"use client";

import React, { useEffect, useRef, useState } from "react";
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

// Route card on top (From / To, full addresses, never cut), then a row with
// departure, time, return and the button. Stacks into one column on phones.
const fieldLabel = "block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-gray-400";
const fieldValue = "text-[15px] font-semibold leading-snug text-gray-900";
const inputCls =
  "mt-1 w-full min-w-0 bg-transparent text-[15px] font-semibold text-gray-900 placeholder:font-medium placeholder:text-gray-400 focus:outline-none";
const chip =
  "flex min-w-0 items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/60 px-4 py-3 transition-colors hover:border-gray-300 focus-within:border-[#FE5300] focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10";

// Shows the whole address (wrapping) while not editing; tap to edit with the
// same suggestions as /mbgo (LocationAutocompleteInput, used unchanged).
function LocationField({
  label,
  icon,
  point,
  placeholder,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  point: SpecialSearchPoint;
  placeholder: string;
  onChange: (p: SpecialSearchPoint) => void;
}) {
  const [editing, setEditing] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const address = point.address || "";

  useEffect(() => {
    if (editing) boxRef.current?.querySelector("input")?.focus();
  }, [editing]);

  return (
    <div
      ref={boxRef}
      onFocus={(e) => {
        if (e.target instanceof HTMLInputElement) setEditing(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEditing(false);
      }}
      className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3.5 sm:px-5 sm:py-4"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 ring-1 ring-gray-100">{icon}</span>
      <div className="min-w-0 flex-1">
        <span className={fieldLabel}>{label}</span>
        {/* Always mounted (only hidden while the full address shows), so a
            suggestion click or "Use current location" still lands after blur */}
        <div className={editing || !address ? "" : "sr-only"}>
          <LocationAutocompleteInput
            value={address}
            onChange={(addr, coords) => onChange({ address: addr, ...(coords || {}) })}
            placeholder={placeholder}
            className={inputCls}
          />
        </div>
        {!editing && address && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Change"
            className={`${fieldValue} mt-1 block w-full whitespace-normal break-words text-left hover:text-[#FE5300]`}
          >
            {address}
          </button>
        )}
      </div>
    </div>
  );
}

function Chip({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className={chip}>
      {icon}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={fieldLabel}>{label}</span>
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
  const iconCls = "h-[18px] w-[18px] shrink-0 text-gray-400";

  return (
    <div className="relative z-20 mx-auto w-full max-w-6xl rounded-[28px] bg-white p-3.5 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.28)] ring-1 ring-black/5 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div role="tablist" aria-label="Trip type" className="inline-flex rounded-full bg-gray-100 p-1">
          {(["ONE_WAY", "ROUND_TRIP"] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={s.tripType === type}
              onClick={() => set({ tripType: type })}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-all sm:px-5 ${
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
        className="space-y-3"
      >
        {/* Route: From | To, swap button on the shared edge */}
        <div className="relative flex flex-col divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white md:flex-row md:divide-x md:divide-y-0">
          <LocationField
            label="From"
            icon={<Navigation className="h-4 w-4 text-emerald-500" />}
            point={s.pickup}
            placeholder="Pickup city or address"
            onChange={(pickup) => set({ pickup })}
          />
          <LocationField
            label="To"
            icon={<MapPin className="h-4 w-4 text-[#FE5300]" />}
            point={s.drop}
            placeholder="Where to?"
            onChange={(drop) => set({ drop })}
          />
          <button
            type="button"
            onClick={() => set({ pickup: s.drop, drop: s.pickup })}
            title="Swap pickup and drop"
            aria-label="Swap pickup and drop"
            className="absolute right-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-md transition hover:border-[#FE5300] hover:text-[#FE5300] md:left-1/2 md:right-auto md:-translate-x-1/2"
          >
            <ArrowUpDown className="h-4 w-4 md:rotate-90" />
          </button>
        </div>

        {/* When + button */}
        <div className={`grid grid-cols-2 gap-3 ${roundTrip ? "md:grid-cols-[1fr_1fr_1fr_auto]" : "md:grid-cols-[1fr_1fr_auto]"}`}>
          <Chip icon={<CalendarDays className={iconCls} />} label="Departure">
            <input type="date" value={s.rideDate} min={todayStr()} onChange={(e) => set({ rideDate: e.target.value })} className={inputCls} />
          </Chip>
          <Chip icon={<Clock3 className={iconCls} />} label="Pickup time">
            <input
              type="time"
              value={to24Hour(s.rideTime)}
              onChange={(e) => set({ rideTime: e.target.value ? to12Hour(e.target.value) : "" })}
              className={inputCls}
            />
          </Chip>
          {roundTrip && (
            <div className="col-span-2 md:col-span-1">
              <Chip icon={<Undo2 className={iconCls} />} label="Return">
                <input
                  type="date"
                  value={s.returnDate}
                  min={s.rideDate || todayStr()}
                  onChange={(e) => set({ returnDate: e.target.value })}
                  className={inputCls}
                />
              </Chip>
            </div>
          )}
          <button
            type="submit"
            disabled={isSearching}
            className="col-span-2 flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#FE5300] to-[#ff7a33] px-8 text-[15px] font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:shadow-orange-500/30 active:scale-[0.98] disabled:opacity-70 md:col-span-1 md:h-full md:min-h-[58px]"
          >
            <Search className="h-[18px] w-[18px]" />
            {isSearching ? "Checking…" : "Check Prices"}
          </button>
        </div>
      </form>
    </div>
  );
}
