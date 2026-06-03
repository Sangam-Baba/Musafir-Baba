"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useSearch, SearchResult } from "./useSearch";
import SearchDropdown from "./SearchDropdown";

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { results, isLoading } = useSearch(query);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        } else if (results.length > 0) {
          handleSelect(results[0]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    window.open(result.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div ref={containerRef} className="relative w-full z-50">
      <div
        className={`p-[3px] md:p-[4px] rounded-full w-full transition-all duration-300 ${
          isOpen ? "shadow-[0_8px_30px_rgba(254,83,0,0.3)] scale-[1.01]" : "shadow-[0_8px_30px_rgb(0,0,0,0.1)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.15)]"
        } bg-[linear-gradient(90deg,#FE5300,#ff0080,#7928ca,#00dfd8,#74ff18,#FE5300)] animate-border-gradient`}
      >
        <div
          className={`flex items-center w-full h-[52px] md:h-[60px] backdrop-blur-xl rounded-full transition-all duration-300 bg-white/95 hover:bg-white`}
        >
        <div className="pl-5 md:pl-6 shrink-0 flex items-center justify-center">
          <Search className="w-[18px] h-[18px] md:w-5 md:h-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          autoFocus={true}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search destinations, tours, blogs..."
          className="w-full h-full px-3 md:px-4 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 text-[14px] md:text-[15px] font-medium"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="pr-5 md:pr-6 shrink-0 text-gray-300 hover:text-gray-500 transition-colors opacity-100"
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        )}
        </div>
      </div>

      <SearchDropdown
        isOpen={isOpen && query.length >= 2}
        isLoading={isLoading}
        results={results}
        query={query}
        onClose={() => setIsOpen(false)}
        onSelect={handleSelect}
        selectedIndex={selectedIndex}
      />
    </div>
  );
}
