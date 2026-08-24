"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";

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

export default function MBGoSearchWidget() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("local");
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [dateTime, setDateTime] = useState("Today, 10:00 AM");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "rental") {
      router.push("/rental");
    } else {
      router.push(`/rental?type=${activeTab}&pickup=${encodeURIComponent(pickup)}&drop=${encodeURIComponent(drop)}`);
    }
  };

  const handleSwap = () => {
    setPickup(drop);
    setDrop(pickup);
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

      {/* Search Input Bar Form */}
      <form onSubmit={handleSearch} className="mt-5 sm:mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-3.5 items-center">
          {/* Pickup Location */}
          <div className="lg:col-span-4 relative flex items-center bg-white hover:bg-gray-50/50 focus-within:bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 transition-colors shadow-2xs">
            {/* Green target ring icon matching design */}
            <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 flex items-center justify-center flex-shrink-0 mr-3">
              <span className="w-1 h-1 rounded-full bg-emerald-500" />
            </span>

            <div className="flex flex-col flex-1 min-w-0">
              <label className="text-[11px] font-medium text-gray-500 leading-none">
                Pickup Location
              </label>
              <input
                type="text"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
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
          <div className="lg:col-span-4 relative flex items-center bg-white hover:bg-gray-50/50 focus-within:bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 transition-colors shadow-2xs">
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
              <input
                type="text"
                value={drop}
                onChange={(e) => setDrop(e.target.value)}
                placeholder="Where to?"
                className="w-full bg-transparent text-[13.5px] font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none mt-1 truncate"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="lg:col-span-2 relative flex items-center justify-between bg-white hover:bg-gray-50/50 focus-within:bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 transition-colors shadow-2xs">
            <div className="flex flex-col flex-1 min-w-0">
              <label className="text-[11px] font-medium text-gray-500 leading-none">
                Date &amp; Time
              </label>
              <input
                type="text"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full bg-transparent text-[13.5px] font-bold text-gray-900 focus:outline-none mt-1 truncate"
              />
            </div>

            {/* Orange Calendar Icon on the right matching design */}
            <div className="w-6 h-6 rounded-md border border-[#FE5300]/80 text-[#FE5300] flex items-center justify-center ml-2 flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <rect width="18" height="18" x="3" y="4" rx="2" />
                <path d="M3 10h18" />
                <path d="M8 2v4" />
                <path d="M16 2v4" />
              </svg>
            </div>
          </div>

          {/* Search Button */}
          <div className="lg:col-span-2">
            <button
              type="submit"
              className="w-full bg-[#FE5300] hover:bg-[#e04800] active:scale-[0.98] text-white font-bold text-[14.5px] py-3.5 px-4 rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center cursor-pointer"
            >
              Search Vehicles
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
