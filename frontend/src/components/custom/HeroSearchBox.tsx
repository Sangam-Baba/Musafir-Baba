"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HeroSearchBox() {
  const router = useRouter();
  const [selected, setSelected] = useState("/holidays");

  const options = [
    { label: "All Services", value: "/" },
    { label: "Tour Packages", value: "/holidays" },
    { label: "Visa", value: "/visa" },
    { label: "Rental Services", value: "/rental" },
  ];

  const handleSearch = () => {
    router.push(selected);
  };

  return (
    <div className="w-full max-w-[530px] bg-white border border-gray-300 rounded-lg p-1 flex items-center gap-1 shadow-sm mt-4 md:mt-6 lg:mt-8 mb-2 md:mb-4 relative z-20">
      <div className="flex-1 relative flex items-center px-3 md:px-4">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full bg-transparent text-gray-700 text-[11px] md:text-[13px] font-medium outline-none cursor-pointer py-1 md:py-1.5 appearance-none pr-6"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 flex items-center text-gray-400">
          <svg className="w-3 h-3 md:w-4 md:h-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
      
      <button 
        onClick={handleSearch}
        className="flex items-center justify-center bg-transparent w-[26px] h-[26px] md:w-[32px] md:h-[32px] rounded-md hover:bg-orange-50 transition-colors group flex-shrink-0 mr-1"
        aria-label="Search"
      >
        <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#FE5300] group-hover:scale-110 transition-transform" strokeWidth={2.5} />
      </button>
    </div>
  );
}
