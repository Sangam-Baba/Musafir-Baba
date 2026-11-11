"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Clock,
  IndianRupee,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import PackageCard from "@/components/custom/PackageCard";
import { Package } from "@/app/(user)/holidays/[categorySlug]/PackageSlugClient";
import { Category } from "@/app/(user)/holidays/page";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface CombinedInterface extends Package {
  price?: number;
  subDestination?: string | { _id: string } | null;
  subDestinations?: (string | { _id: string })[] | null;
}

export interface SubDestinationOption {
  _id: string;
  name: string;
  slug: string;
}

const MAX_PRICE = 500000;
const MAX_DAYS = 25;
const DEFAULT_FILTER = {
  search: "",
  category: "",
  sort: "",
  price: MAX_PRICE,
  duration: MAX_DAYS,
};

// A package's sub-destination ids, from the older single field and the list
const subIdsOf = (pkg: CombinedInterface) => {
  const values = [pkg.subDestination, ...(pkg.subDestinations ?? [])];
  const ids = values
    .map((v) => (typeof v === "object" && v ? v._id : v))
    .filter((v): v is string => !!v);
  return [...new Set(ids)];
};

// Packages on /destinations/{slug} and /destinations/{slug}/{sub}: filters in
// a left sidebar (drawer on mobile; Places link to the sub-destination pages),
// package types as pills. Uses the same
// filter rules as MixedPackagesClient, which /holidays keeps using unchanged.
export default function DestinationPackagesClient({
  data,
  category,
  subDestinations = [],
  parentSlug,
  parentName,
  activeSubId,
}: {
  data: CombinedInterface[];
  category: Category[];
  subDestinations?: SubDestinationOption[];
  parentSlug?: string;
  parentName?: string;
  // Set on a sub-destination page to highlight it in the Places list
  activeSubId?: string;
}) {
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const update = (patch: Partial<typeof DEFAULT_FILTER>) =>
    setFilter((prev) => ({ ...prev, ...patch }));

  const filteredPkgs = useMemo(() => {
    const q = filter.search.toLowerCase();
    return (data ?? [])
      .filter((pkg) => {
        const matchesSearch =
          pkg.title.toLowerCase().includes(q) ||
          pkg.destination?.state?.toLowerCase().includes(q) ||
          pkg.destination?.country?.toLowerCase().includes(q);
        const matchesCategory = filter.category
          ? pkg.mainCategory.slug?.toLowerCase() === filter.category.toLowerCase()
          : true;
        const matchesPrice = (pkg.price ?? 0) <= filter.price;
        const matchesDuration = pkg.duration?.days <= filter.duration;
        return matchesSearch && matchesCategory && matchesPrice && matchesDuration;
      })
      .sort((a, b) =>
        filter.sort === "asc"
          ? (a.price ?? 0) - (b.price ?? 0)
          : (b.price ?? 0) - (a.price ?? 0),
      );
  }, [filter, data]);

  // Only package types that actually have packages here
  const categoryPills = useMemo(() => {
    const counts = new Map<string, number>();
    (data ?? []).forEach((pkg) => {
      const slug = pkg.mainCategory?.slug?.toLowerCase();
      if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
    });
    return category
      .filter((cat) => counts.has(cat.slug?.toLowerCase()))
      .map((cat) => ({ ...cat, count: counts.get(cat.slug.toLowerCase()) ?? 0 }));
  }, [category, data]);

  const subCounts = useMemo(() => {
    const counts = new Map<string, number>();
    (data ?? []).forEach((pkg) => {
      subIdsOf(pkg).forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
    });
    return counts;
  }, [data]);

  const isFiltered =
    filter.search !== "" ||
    filter.category !== "" ||
    filter.price !== MAX_PRICE ||
    filter.duration !== MAX_DAYS;
  const reset = () => setFilter(DEFAULT_FILTER);

  const panel = (
    <div className="divide-y divide-slate-100">
      <FilterSection title="Search" icon={Search}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filter.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Search packages..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[#FE5300]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FE5300]/15"
          />
        </div>
      </FilterSection>

      {subDestinations.length > 0 && (
        <FilterSection title="Places" icon={MapPin}>
          <div className="space-y-1">
            <SubOptionLink
              href={`/destinations/${parentSlug}`}
              label={`All of ${parentName ?? "destination"}`}
              count={activeSubId ? undefined : data?.length ?? 0}
              active={!activeSubId}
            />
            {subDestinations.map((sub) => (
              <SubOptionLink
                key={sub._id}
                href={`/destinations/${parentSlug}/${sub.slug}`}
                label={sub.name}
                count={activeSubId ? undefined : subCounts.get(sub._id) ?? 0}
                active={sub._id === activeSubId}
              />
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Budget" icon={IndianRupee}>
        <RangeField
          value={filter.price}
          min={100}
          max={MAX_PRICE}
          onChange={(v) => update({ price: v })}
          display={`Up to ₹${filter.price.toLocaleString()}`}
          suffix="/ person"
          minLabel="₹100"
          maxLabel="₹5L"
        />
      </FilterSection>

      <FilterSection title="Duration" icon={Clock}>
        <RangeField
          value={filter.duration}
          min={1}
          max={MAX_DAYS}
          onChange={(v) => update({ duration: v })}
          display={`Up to ${filter.duration} ${filter.duration === 1 ? "day" : "days"}`}
          minLabel="1 day"
          maxLabel={`${MAX_DAYS} days`}
        />
      </FilterSection>
    </div>
  );

  return (
    <section className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 my-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block w-[272px] shrink-0 lg:sticky lg:top-28">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <SlidersHorizontal className="h-4 w-4 text-[#FE5300]" />
                Filters
              </p>
              {isFiltered && (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-[#FE5300]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              )}
            </div>
            {panel}
          </div>
        </aside>

        {/* Results */}
        <div className="min-w-0 flex-1">
          {categoryPills.length > 0 && (
            <div className="-mx-4 px-4 lg:mx-0 lg:px-0 flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <Pill
                label="All Packages"
                count={data?.length ?? 0}
                active={filter.category === ""}
                onClick={() => update({ category: "" })}
              />
              {categoryPills.map((cat) => (
                <Pill
                  key={cat._id}
                  label={cat.name}
                  count={cat.count}
                  active={filter.category.toLowerCase() === cat.slug.toLowerCase()}
                  onClick={() => update({ category: cat.slug })}
                />
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-900">{filteredPkgs.length}</span>{" "}
              {filteredPkgs.length === 1 ? "package" : "packages"} found
            </p>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              {/* Filters drawer (mobile / tablet) */}
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="lg:hidden inline-flex h-9 flex-1 sm:flex-none justify-center items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-[#FE5300]/40 hover:text-[#FE5300]"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Filters
                    {isFiltered && <span className="h-1.5 w-1.5 rounded-full bg-[#FE5300]" />}
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[88%] max-w-sm overflow-y-auto p-0">
                  <SheetHeader className="border-b border-slate-100 px-5 py-4">
                    <SheetTitle className="flex items-center gap-2 text-base">
                      <SlidersHorizontal className="h-4 w-4 text-[#FE5300]" />
                      Filters
                    </SheetTitle>
                  </SheetHeader>
                  {panel}
                  <div className="px-5 py-4">
                    <button
                      type="button"
                      onClick={reset}
                      className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#FE5300]/40 hover:text-[#FE5300]"
                    >
                      Reset filters
                    </button>
                  </div>
                </SheetContent>
              </Sheet>

              <Select value={filter.sort} onValueChange={(value) => update({ sort: value })}>
                <SelectTrigger className="h-9 flex-1 sm:flex-none sm:w-[170px] rounded-lg border-slate-200 bg-white text-sm shadow-sm">
                  <SelectValue placeholder="Sort by price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Price: High to Low</SelectItem>
                  <SelectItem value="asc">Price: Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredPkgs.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
              {filteredPkgs.map((pkg) => (
                <PackageCard
                  key={pkg._id}
                  pkg={{
                    id: pkg._id,
                    name: pkg.title,
                    slug: pkg.slug,
                    image: pkg.coverImages?.[0]?.url || pkg.coverImage?.url || "/Hero1.jpg",
                    price: pkg?.price ?? 9999,
                    duration: pkg.duration?.nights
                      ? `${pkg.duration?.nights ?? 0}N/${pkg.duration.days}D`
                      : `${pkg.duration.days}D`,
                    destination: pkg.destination?.name ?? "",
                    batch: pkg?.batch ? pkg?.batch : [],
                  }}
                  url={`/holidays/${pkg?.mainCategory?.slug}/${pkg.destination.state}/${pkg.slug}`}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
              <p className="text-lg font-semibold text-slate-900">No packages match these filters</p>
              <p className="mt-1 text-sm text-slate-500">Try widening your budget or duration.</p>
              {isFiltered && (
                <button
                  type="button"
                  onClick={reset}
                  className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#FE5300] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#e54b00]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function FilterSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-5">
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        {title}
      </p>
      {children}
    </div>
  );
}

export function RangeField({
  value,
  min,
  max,
  onChange,
  display,
  suffix,
  minLabel,
  maxLabel,
  step,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  display: string;
  suffix?: string;
  minLabel: string;
  maxLabel: string;
  step?: number;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">
        {display}
        {suffix && <span className="ml-1 font-normal text-slate-500">{suffix}</span>}
      </p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 w-full cursor-pointer accent-[#FE5300]"
      />
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

export const subOptionClass = (active?: boolean) =>
  `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
    active
      ? "bg-orange-50 font-semibold text-[#FE5300]"
      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
  }`;

export function SubCheck({ active }: { active?: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
        active ? "border-[#FE5300] bg-[#FE5300] text-white" : "border-slate-300 bg-white"
      }`}
    >
      {active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
    </span>
  );
}

function SubOptionLink({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count?: number;
  active?: boolean;
}) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={subOptionClass(active)}>
      <SubCheck active={active} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && (
        <span className={`text-xs tabular-nums ${active ? "text-[#FE5300]" : "text-slate-400"}`}>{count}</span>
      )}
    </Link>
  );
}

export function Pill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 ${
        active
          ? "border-[#FE5300] bg-[#FE5300] text-white shadow-[0_4px_14px_rgb(254,83,0,0.25)]"
          : "border-slate-200 bg-white text-slate-700 hover:border-[#FE5300]/40 hover:text-[#FE5300]"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-px text-[11px] tabular-nums ${
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
