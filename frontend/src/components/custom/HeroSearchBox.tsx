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
    <div className="w-full max-w-3xl bg-white border border-gray-300 rounded-lg p-1 flex items-center gap-1 shadow-sm mt-8 md:mt-12 lg:mt-16 mb-4 relative z-20">
      <div className="flex-1 w-full relative flex items-center bg-transparent px-2 md:px-3">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full bg-transparent text-gray-700 text-sm md:text-base outline-none cursor-pointer py-1.5 md:py-2 appearance-none pr-8"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2 flex items-center px-2 text-gray-400">
          <svg className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
      
      <button 
        onClick={handleSearch}
        className="flex items-center justify-center gap-2 bg-white border border-gray-300 text-black px-6 md:px-8 py-1.5 md:py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        <Search className="w-4 h-4" />
        Search
      </button>
    </div>
  );
}
