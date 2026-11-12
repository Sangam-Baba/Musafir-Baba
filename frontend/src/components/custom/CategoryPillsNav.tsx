"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CategoryPillItem {
  _id: string;
  name: string;
  slug: string;
  count?: number;
}

// Row of package-type pills shown on the /holidays listing pages. Each pill
// links to that category's own page (/holidays/{slug}); "All Packages" links
// to /holidays. When the row overflows, edge fades + arrow buttons show that
// there is more to scroll.
export default function CategoryPillsNav({
  categories,
  activeSlug = "",
  totalCount,
  onAllClick,
}: {
  categories: CategoryPillItem[];
  // "" = All Packages
  activeSlug?: string;
  totalCount?: number;
  // Extra handler for the "All Packages" pill (used on /holidays to clear
  // its local category filter as well)
  onAllClick?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateArrows) : null;
    ro?.observe(el);
    // Bring the active pill into view on category pages
    const active = el.querySelector<HTMLElement>('[aria-current="page"]');
    if (active && el.scrollWidth > el.clientWidth) {
      el.scrollLeft = active.offsetLeft - el.clientWidth / 2 + active.offsetWidth / 2;
    }
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro?.disconnect();
    };
  }, [updateArrows, categories.length]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.6), behavior: "smooth" });
  };

  if (categories.length === 0) return null;
  const active = activeSlug.toLowerCase();

  return (
    <div className="relative -mx-4 lg:mx-0">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth px-4 lg:px-0 py-2"
      >
        <NavPill
          href="/holidays"
          label="All Packages"
          count={totalCount}
          active={active === ""}
          onClick={onAllClick}
        />
        {categories.map((cat) => (
          <NavPill
            key={cat._id}
            href={`/holidays/${cat.slug}`}
            label={cat.name}
            count={cat.count}
            active={active === cat.slug?.toLowerCase()}
          />
        ))}
      </div>

      {/* Left fade + arrow */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white via-white/80 to-transparent transition-opacity duration-200 ${
          canLeft ? "opacity-100" : "opacity-0"
        }`}
      />
      <button
        type="button"
        aria-label="Scroll categories left"
        tabIndex={canLeft ? 0 : -1}
        onClick={() => scrollBy(-1)}
        className={`absolute left-1 lg:left-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition-all duration-200 hover:border-[#FE5300]/40 hover:text-[#FE5300] ${
          canLeft ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {/* Right fade + arrow */}
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white via-white/80 to-transparent transition-opacity duration-200 ${
          canRight ? "opacity-100" : "opacity-0"
        }`}
      />
      <button
        type="button"
        aria-label="Scroll categories right"
        tabIndex={canRight ? 0 : -1}
        onClick={() => scrollBy(1)}
        className={`absolute right-1 lg:right-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition-all duration-200 hover:border-[#FE5300]/40 hover:text-[#FE5300] ${
          canRight ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function NavPill({
  href,
  label,
  count,
  active,
  onClick,
}: {
  href: string;
  label: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
        active
          ? "border-[#FE5300] bg-[#FE5300] text-white shadow-[0_4px_14px_rgb(254,83,0,0.25)]"
          : "border-slate-200 bg-white text-slate-700 hover:border-[#FE5300]/40 hover:text-[#FE5300]"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`rounded-full px-1.5 py-px text-[11px] tabular-nums ${
            active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
