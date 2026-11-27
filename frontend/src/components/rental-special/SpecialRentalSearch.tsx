"use client";

import React, { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
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

const box =
  "relative flex items-center bg-white hover:bg-gray-50/50 focus-within:bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 transition-colors shadow-2xs";
const label = "text-[11px] font-medium text-gray-500 leading-none";
const field =
  "w-full bg-transparent text-[13.5px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none mt-1 truncate";

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

  return (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-[22px] md:rounded-[26px] shadow-[0_10px_35px_rgba(0,0,0,0.08)] border border-gray-100/90 p-4 sm:p-6 relative z-20">
      <div className="flex items-center gap-2">
        {(["ONE_WAY", "ROUND_TRIP"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => set({ tripType: type })}
            className={`px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors ${
              s.tripType === type
                ? "bg-[#FE5300] border-[#FE5300] text-white"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {type === "ONE_WAY" ? "One Way" : "Round Trip"}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch(s);
        }}
        className="mt-3 sm:mt-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-3.5 items-center">
          <div className={`lg:col-span-3 ${box}`}>
            <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 flex items-center justify-center flex-shrink-0 mr-3">
              <span className="w-1 h-1 rounded-full bg-emerald-500" />
            </span>
            <div className="flex flex-col flex-1 min-w-0">
              <label className={label}>Pickup Location</label>
              <LocationAutocompleteInput
                value={s.pickup.address || ""}
                onChange={(address, coords) => set({ pickup: { address, ...(coords || {}) } })}
                placeholder="Enter pickup location"
                className={field}
              />
            </div>
            <button
              type="button"
              onClick={() => set({ pickup: s.drop, drop: s.pickup })}
              title="Swap Locations"
              className="p-1 text-gray-300 hover:text-[#FE5300] transition-colors ml-1 flex-shrink-0"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className={`lg:col-span-3 ${box}`}>
            <span className="w-3.5 h-3.5 text-red-500 flex items-center justify-center flex-shrink-0 mr-3">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </span>
            <div className="flex flex-col flex-1 min-w-0">
              <label className={label}>Drop Location</label>
              <LocationAutocompleteInput
                value={s.drop.address || ""}
                onChange={(address, coords) => set({ drop: { address, ...(coords || {}) } })}
                placeholder="Where to?"
                className={field}
              />
            </div>
          </div>

          <div className={`lg:col-span-4 ${box}`}>
            <div className="flex flex-col flex-1 min-w-0">
              <label className={label}>Date &amp; Time</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="date"
                  value={s.rideDate}
                  min={todayStr()}
                  onChange={(e) => set({ rideDate: e.target.value })}
                  className="min-w-0 basis-[58%] bg-transparent text-[12.5px] font-bold text-gray-900 focus:outline-none"
                />
                <span className="text-gray-300 shrink-0">|</span>
                <input
                  type="time"
                  value={to24Hour(s.rideTime)}
                  onChange={(e) => set({ rideTime: e.target.value ? to12Hour(e.target.value) : "" })}
                  className="min-w-0 basis-[42%] bg-transparent text-[12.5px] font-bold text-gray-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={isSearching}
              className="w-full bg-[#FE5300] hover:bg-[#e04800] active:scale-[0.98] text-white font-bold text-[14.5px] py-3.5 px-4 rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center cursor-pointer disabled:opacity-70"
            >
              {isSearching ? "Checking..." : "Check Prices"}
            </button>
          </div>
        </div>

        {s.tripType === "ROUND_TRIP" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 mt-3">
            <div className={box}>
              <div className="flex flex-col flex-1 min-w-0">
                <label className={label}>Return Date</label>
                <input
                  type="date"
                  value={s.returnDate}
                  min={s.rideDate || todayStr()}
                  onChange={(e) => set({ returnDate: e.target.value })}
                  className="w-full bg-transparent text-[13px] font-bold text-gray-900 focus:outline-none mt-1"
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
