"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LocateFixed, Loader2 } from "lucide-react";
import { searchLocations, reverseGeocode, type LocationSuggestion } from "@/lib/rideApi";

interface Coords {
  lat: number;
  lng: number;
}

interface LocationAutocompleteInputProps {
  value: string;
  onChange: (address: string, coords: Coords | null) => void;
  placeholder?: string;
  className?: string;
}

export default function LocationAutocompleteInput({
  value,
  onChange,
  placeholder,
  className = "",
}: LocationAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // The dropdown is rendered in a portal (see render below) so it can't be
  // clipped by an ancestor's overflow-hidden (e.g. the hero image wrapper)
  // and won't visually collide with whatever field follows it when the
  // layout stacks to a single column on mobile. Its position is computed
  // from the input's own bounding rect instead of relying on CSS `absolute`
  // positioning relative to a parent.
  const updateRect = () => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setRect({ top: r.bottom + 8, left: r.left, width: r.width });
  };

  useEffect(() => {
    if (!isOpen) return;
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideContainer = containerRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideContainer && !insideDropdown) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen || value.trim().length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsSearching(true);
    const seq = ++requestSeq.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchLocations(value);
        if (seq === requestSeq.current) setSuggestions(res.data);
      } catch {
        if (seq === requestSeq.current) setSuggestions([]);
      } finally {
        if (seq === requestSeq.current) setIsSearching(false);
      }
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isOpen]);

  const handleSelect = (s: LocationSuggestion) => {
    onChange(s.address, { lat: s.lat, lng: s.lng });
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await reverseGeocode(position.coords.latitude, position.coords.longitude);
          onChange(res.data.address, { lat: res.data.lat, lng: res.data.lng });
        } finally {
          setIsLocating(false);
          setIsOpen(false);
        }
      },
      () => setIsLocating(false),
    );
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value, null);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />

      {isOpen &&
        rect &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width }}
            className="z-[999] bg-white rounded-xl border border-gray-200 shadow-lg max-h-64 overflow-y-auto"
          >
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium text-[#FE5300] hover:bg-orange-50 border-b border-gray-100"
            >
              {isLocating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5" />
              )}
              Use current location
            </button>

            {isSearching && (
              <div className="px-3.5 py-2.5 text-[12.5px] text-gray-400">Searching...</div>
            )}

            {!isSearching &&
              suggestions.map((s, i) => (
                <button
                  key={`${s.lat}-${s.lng}-${i}`}
                  type="button"
                  onClick={() => handleSelect(s)}
                  className="w-full text-left px-3.5 py-2.5 text-[13px] text-gray-800 hover:bg-gray-50 leading-snug"
                >
                  {s.address}
                </button>
              ))}

            {!isSearching && value.trim().length >= 3 && suggestions.length === 0 && (
              <div className="px-3.5 py-2.5 text-[12.5px] text-gray-400">No results found</div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
