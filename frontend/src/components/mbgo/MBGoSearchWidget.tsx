"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import LocationAutocompleteInput from "./LocationAutocompleteInput";
import { getRideQuote } from "@/lib/rideApi";
import { useRideBookingStore } from "@/store/useRideBookingStore";

function CarFrontIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.64 5H8.36a2 2 0 0 0-1.86 1.3L5 10l-2-2" />
      <path d="M4 14v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h10v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4" />
      <rect width="18" height="8" x="3" y="10" rx="2" />
      <circle cx="7" cy="14" r="1.2" fill="currentColor" />
      <circle cx="17" cy="14" r="1.2" fill="currentColor" />
    </svg>
  );
}

function PlaneTiltedIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}

function CalendarRentalIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <circle cx="12" cy="15" r="2.5" />
    </svg>
  );
}

const TABS = [
  { id: "local", label: "Local Ride", icon: CarFrontIcon },
  { id: "outstation", label: "Outstation", icon: CarFrontIcon },
  { id: "airport", label: "Airport Transfer", icon: PlaneTiltedIcon },
  { id: "rental", label: "Rental", icon: CalendarRentalIcon },
];

function to12Hour(hhmm: string) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  let hours = h % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

function to24Hour(display: string) {
  if (!display) return "";
  const match = display.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return "";
  const [, h, m, ampm] = match;
  let hours = parseInt(h, 10);
  if (ampm.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${m}`;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function MBGoSearchWidget() {
  const router = useRouter();
  const setSearch = useRideBookingStore((s) => s.setSearch);
  const setQuote = useRideBookingStore((s) => s.setQuote);

  const [activeTab, setActiveTab] = useState("local");
  const [pickup, setPickup] = useState("");
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [drop, setDrop] = useState("");
  const [dropCoords, setDropCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [rideDate, setRideDate] = useState(todayStr());
  const [rideTime, setRideTime] = useState("10:00 AM");
  const [tripType, setTripType] = useState<"ONE_WAY" | "ROUND_TRIP">("ONE_WAY");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const isRideTab = activeTab !== "rental";

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === "rental") {
      router.push("/rental");
      return;
    }

    if (!pickup || !drop) {
      toast.error("Enter both pickup and drop locations");
      return;
    }
    if (tripType === "ROUND_TRIP" && (!returnDate || !returnTime)) {
      toast.error("Please select a return date and time for your round trip");
      return;
    }

    setIsSearching(true);
    try {
      const res = await getRideQuote({
        pickup: { address: pickup, ...(pickupCoords || {}) },
        drop: { address: drop, ...(dropCoords || {}) },
      });

      if (!res.data.offers.length) {
        toast.error("No vehicles currently serve this route");
        return;
      }

      setSearch({
        activeTab: activeTab as "local" | "outstation" | "airport",
        pickup,
        drop,
        pickupCoords,
        dropCoords,
        rideDate,
        rideTime,
        tripType,
        returnDate: tripType === "ROUND_TRIP" ? returnDate : "",
        returnTime: tripType === "ROUND_TRIP" ? returnTime : "",
      });
      setQuote(res.data);
      router.push("/mbgo/vehicles");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not fetch fare, please try again");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSwap = () => {
    const p = pickup;
    const pc = pickupCoords;
    setPickup(drop);
    setPickupCoords(dropCoords);
    setDrop(p);
    setDropCoords(pc);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-[22px] md:rounded-[26px] shadow-[0_10px_35px_rgba(0,0,0,0.08)] border border-gray-100/90 p-4 sm:p-6 lg:p-7 relative z-20">
      {/* Top Tabs with Bottom Border and Underline Indicator */}
      <div className="flex items-center gap-6 sm:gap-10 md:gap-14 border-b border-gray-200/80 overflow-x-auto no-scrollbar pb-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3.5 text-[14px] sm:text-[15px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer relative ${
                isActive
                  ? "text-[#FE5300]"
                  : "text-gray-700 hover:text-gray-950 font-semibold"
              }`}
            >
              <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isActive ? "text-[#FE5300]" : "text-gray-700"}`} />
              <span>{tab.label}</span>

              {/* Active Orange Underline Bar directly matching target design */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#FE5300] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Trip type toggle (One Way / Round Trip) - only for ride-hailing tabs */}
      {isRideTab && (
        <div className="flex items-center gap-2 mt-4">
          {(["ONE_WAY", "ROUND_TRIP"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTripType(type)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors ${
                tripType === type
                  ? "bg-[#FE5300] border-[#FE5300] text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {type === "ONE_WAY" ? "One Way" : "Round Trip"}
            </button>
          ))}
        </div>
      )}

      {/* Search Input Bar Form */}
      <form onSubmit={handleSearch} className="mt-3 sm:mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-3.5 items-center">
          {/* Pickup Location */}
          <div className="lg:col-span-3 relative flex items-center bg-white hover:bg-gray-50/50 focus-within:bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 transition-colors shadow-2xs">
            {/* Green target ring icon matching design */}
            <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 flex items-center justify-center flex-shrink-0 mr-3">
              <span className="w-1 h-1 rounded-full bg-emerald-500" />
            </span>

            <div className="flex flex-col flex-1 min-w-0">
              <label className="text-[11px] font-medium text-gray-500 leading-none">
                Pickup Location
              </label>
              <LocationAutocompleteInput
                value={pickup}
                onChange={(address, coords) => {
                  setPickup(address);
                  setPickupCoords(coords);
                }}
                placeholder="Enter pickup location"
                className="w-full bg-transparent text-[13.5px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none mt-1 truncate"
              />
            </div>

            <button
              type="button"
              onClick={handleSwap}
              title="Swap Locations"
              className="p-1 text-gray-300 hover:text-[#FE5300] transition-colors ml-1 flex-shrink-0"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Drop Location */}
          <div className="lg:col-span-3 relative flex items-center bg-white hover:bg-gray-50/50 focus-within:bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 transition-colors shadow-2xs">
            {/* Red location diamond/pin matching design */}
            <span className="w-3.5 h-3.5 text-red-500 flex items-center justify-center flex-shrink-0 mr-3">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </span>

            <div className="flex flex-col flex-1 min-w-0">
              <label className="text-[11px] font-medium text-gray-500 leading-none">
                Drop Location
              </label>
              <LocationAutocompleteInput
                value={drop}
                onChange={(address, coords) => {
                  setDrop(address);
                  setDropCoords(coords);
                }}
                placeholder="Where to?"
                className="w-full bg-transparent text-[13.5px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none mt-1 truncate"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="lg:col-span-4 relative flex items-center bg-white hover:bg-gray-50/50 focus-within:bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 transition-colors shadow-2xs">
            <div className="flex flex-col flex-1 min-w-0">
              <label className="text-[11px] font-medium text-gray-500 leading-none">
                Date &amp; Time
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="date"
                  value={rideDate}
                  min={todayStr()}
                  onChange={(e) => setRideDate(e.target.value)}
                  className="min-w-0 basis-[58%] bg-transparent text-[12.5px] font-bold text-gray-900 focus:outline-none"
                />
                <span className="text-gray-300 shrink-0">|</span>
                <input
                  type="time"
                  value={to24Hour(rideTime)}
                  onChange={(e) => setRideTime(e.target.value ? to12Hour(e.target.value) : "")}
                  className="min-w-0 basis-[42%] bg-transparent text-[12.5px] font-bold text-gray-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Search Button */}
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={isSearching}
              className="w-full bg-[#FE5300] hover:bg-[#e04800] active:scale-[0.98] text-white font-bold text-[14.5px] py-3.5 px-4 rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center cursor-pointer disabled:opacity-70"
            >
              {isSearching ? "Searching..." : "Search Vehicles"}
            </button>
          </div>
        </div>

        {/* Return Date & Time - only for Round Trip */}
        {isRideTab && tripType === "ROUND_TRIP" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5 mt-3">
            <div className="relative flex items-center bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-2xs">
              <div className="flex flex-col flex-1 min-w-0">
                <label className="text-[11px] font-medium text-gray-500 leading-none">
                  Return Date
                </label>
                <input
                  type="date"
                  value={returnDate}
                  min={rideDate || todayStr()}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full bg-transparent text-[13px] font-bold text-gray-900 focus:outline-none mt-1"
                />
              </div>
            </div>
            <div className="relative flex items-center bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-2xs">
              <div className="flex flex-col flex-1 min-w-0">
                <label className="text-[11px] font-medium text-gray-500 leading-none">
                  Return Time
                </label>
                <input
                  type="time"
                  value={to24Hour(returnTime)}
                  onChange={(e) => setReturnTime(e.target.value ? to12Hour(e.target.value) : "")}
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
