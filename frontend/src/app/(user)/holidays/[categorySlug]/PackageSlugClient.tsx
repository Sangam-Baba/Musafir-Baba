"use client";
import React, { useEffect, useState } from "react";
import { Clock, IndianRupee, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import PackageCard from "@/components/custom/PackageCard";
import { FilterSection, RangeField } from "@/components/custom/DestinationPackagesClient";
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

interface Batch {
  _id: string;
  startDate: string;
  endDate: string;
  quad: number;
  triple: number;
  double: number;
  child: number;
  quadDiscount: number;
  tripleDiscount: number;
  doubleDiscount: number;
  childDiscount: number;
}
interface CoverImage {
  url: string;
  public_id: string;
  width: number;
  height: number;
  alt: string;
}
export interface Package {
  _id: string;
  title: string;
  slug: string;
  coverImage: CoverImage;
  coverImages?: CoverImage[];
  mainCategory: Category;
  batch: Batch[];
  duration: {
    days: number;
    nights: number;
  };
  destination: Destination;
  isFeatured: boolean;
  status: "draft" | "published";
}
interface Destination {
  _id: string;
  country: string;
  state: string;
  name: string;
  slug: string;
}
interface Category {
  _id: string;
  name: string;
  slug: string;
  coverImage: CoverImage;
  description: string;
}

function GroupPkgClient({
  packagesData,
  categoryNav,
}: {
  packagesData: Package[];
  // Optional category pills row (rendered above the results)
  categoryNav?: React.ReactNode;
}) {
  const [filter, setFilter] = useState({
    search: "",
    sort: "",
    price: 500000,
    duration: 25,
  });
  const [filteredPkgs, setFilteredPkgs] = useState<Package[]>(
    packagesData ?? [],
  );

  useEffect(() => {
    const result = packagesData
      .filter((pkg: Package) => {
        return (
          (pkg.title?.toLowerCase().includes(filter.search.toLowerCase()) ||
            pkg.destination?.state
              ?.toLowerCase()
              .includes(filter.search.toLowerCase()) ||
            pkg.destination?.country
              ?.toLowerCase()
              .includes(filter.search.toLowerCase())) &&
          (pkg.batch?.[0]?.quad ?? 0) <= filter.price &&
          (pkg.duration?.days ?? 0) <= filter.duration
        );
      })
      .sort((a, b) =>
        filter.sort === "asc"
          ? (a.batch?.[0]?.quad ?? 0) - (b.batch?.[0]?.quad ?? 0)
          : (b.batch?.[0]?.quad ?? 0) - (a.batch?.[0]?.quad ?? 0),
      );
    setFilteredPkgs(result);
  }, [filter, packagesData]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({
      ...prev,
      [name]: name === "price" || name === "duration" ? Number(value) : value,
    }));
  };
  const packages = packagesData ?? [];

  // Same reset as before: default filter values + full package list
  const resetFilters = () => {
    const reset = {
      search: "",
      sort: "",
      price: 500000,
      duration: 25,
    };
    setFilter(reset);
    setFilteredPkgs(packages);
  };
  const isFiltered =
    filter.search !== "" || filter.price !== 500000 || filter.duration !== 25;

  const panel = (
    <div className="divide-y divide-slate-100">
      <FilterSection title="Search" icon={Search}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            name="search"
            value={filter.search}
            onChange={handleChange}
            placeholder="Search country, state..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[#FE5300]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FE5300]/15"
          />
        </div>
      </FilterSection>

      <FilterSection title="Budget" icon={IndianRupee}>
        <RangeField
          value={filter.price}
          min={0}
          max={500000}
          onChange={(v) => setFilter((prev) => ({ ...prev, price: v }))}
          display={`Up to ₹${filter.price.toLocaleString()}`}
          suffix="/ person"
          minLabel="₹0"
          maxLabel="₹5L"
        />
      </FilterSection>

      <FilterSection title="Duration" icon={Clock}>
        <RangeField
          value={filter.duration}
          min={1}
          max={25}
          onChange={(v) => setFilter((prev) => ({ ...prev, duration: v }))}
          display={`Up to ${filter.duration} ${filter.duration === 1 ? "day" : "days"}`}
          minLabel="1 day"
          maxLabel="25 days"
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
                  onClick={resetFilters}
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
          {categoryNav && <div className="mb-2">{categoryNav}</div>}
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
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
                      onClick={resetFilters}
                      className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-[#FE5300]/40 hover:text-[#FE5300]"
                    >
                      Reset filters
                    </button>
                  </div>
                </SheetContent>
              </Sheet>

              <Select
                value={filter.sort}
                onValueChange={(value) =>
                  setFilter((prev) => ({ ...prev, sort: value }))
                }
              >
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

      {/* Show packages under this category */}
      {packages && filteredPkgs.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
          {filteredPkgs.map((pkg) => (
            <PackageCard
              key={pkg._id}
              pkg={{
                id: pkg._id,
                name: pkg.title,
                slug: pkg.slug,
                image: pkg.coverImages?.[0]?.url || pkg.coverImage?.url || "https://musafirbaba.com/logo.svg",
                price: pkg?.batch?.[0]?.quad ?? 9999,
                duration: `${pkg.duration?.nights ?? 0}N/${pkg.duration?.days ?? 0}D`,
                destination: pkg.destination?.name ?? "",
                batch: pkg?.batch ? pkg?.batch : [],
              }}
              url={`/holidays/${pkg?.mainCategory?.slug}/${pkg.destination.state}/${pkg.slug}`}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-slate-900">No Packages Found</p>
          <p className="mt-1 text-sm text-slate-500">Try widening your budget or duration.</p>
          {isFiltered && (
            <button
              type="button"
              onClick={resetFilters}
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

export default GroupPkgClient;
