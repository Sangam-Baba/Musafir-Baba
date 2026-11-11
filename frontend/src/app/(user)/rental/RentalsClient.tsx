"use client";
import React, { useMemo, useState } from "react";
import { IndianRupee, MapPin, RotateCcw, Search, SlidersHorizontal, Users } from "lucide-react";
import VehicleCard from "@/components/custom/VehicleCard";
import { rentalVehiclePath } from "@/lib/rentalUrl";
import {
  FilterSection,
  Pill,
  RangeField,
  SubCheck,
  subOptionClass,
} from "@/components/custom/DestinationPackagesClient";
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

interface ILocation {
  _id: string;
  name: string;
  slug?: string;
  city?: string;
  state?: string;
}

interface IVehicle {
  _id: string;
  vehicleName: string;
  vehicleBrand: string;
  vehicleYear: string;
  vehicleType: string; // "car" | "bike" | "tempo-traveller"
  vehicleTransmission: string;
  fuelType: string;
  seats: number;
  price: {
    daily: number;
    hourly: number;
  };
  gallery: { url: string; alt: string }[];
  pricingType?: "single" | "multiple";
  seatingOptions?: { seats: number; dailyPrice: number; stock?: number }[];
  slug: string;
  location?: ILocation;
}

const MAX_PRICE = 50000;
const MIN_PRICE = 500;

const DEFAULT_FILTER = {
  search: "",
  vehicleType: "", // car | bike | tempo-traveller (lowercased type name)
  sort: "", // asc | desc
  price: MAX_PRICE,
  seats: "", // only for cars — blank = any
  location: "", // location _id
};

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Vehicles on /rental, /rental/{type}, /rental/{location} and
// /rental/{location}/{type}.
// Same layout as DestinationPackagesClient: filters in a left sidebar (drawer
// on mobile), vehicle categories as pills. Filter rules are unchanged from the
// previous top-bar version, and the initial* props still come from the hero
// search widget's query params and the category/destination route pages.
export default function RentalsClient({
  vehicles,
  initialVehicleType,
  initialLocationId,
  initialSeats,
  initialPrice,
}: {
  vehicles: IVehicle[];
  initialVehicleType?: string;
  initialLocationId?: string;
  initialSeats?: string;
  initialPrice?: number;
}) {
  const [filter, setFilter] = useState({
    ...DEFAULT_FILTER,
    vehicleType: initialVehicleType || "",
    price: initialPrice || MAX_PRICE,
    seats: initialSeats || "",
    location: initialLocationId || "",
  });
  const update = (patch: Partial<typeof DEFAULT_FILTER>) =>
    setFilter((prev) => ({ ...prev, ...patch }));

  const all = useMemo(() => vehicles ?? [], [vehicles]);

  const filteredVehicles = useMemo(() => {
    const searchLower = filter.search.toLowerCase();
    return all
      .filter((vehicle) => {
        const matchesSearch =
          !filter.search ||
          vehicle.vehicleName.toLowerCase().includes(searchLower) ||
          vehicle.vehicleBrand.toLowerCase().includes(searchLower);
        const matchesType = filter.vehicleType
          ? vehicle.vehicleType?.toLowerCase() === filter.vehicleType.toLowerCase()
          : true;
        const matchesPrice = (vehicle.price?.daily ?? 0) <= filter.price;
        const matchesSeats = filter.seats
          ? (vehicle.seats ?? 0) === Number(filter.seats)
          : true;
        const matchesLocation = filter.location
          ? vehicle.location?._id === filter.location
          : true;
        return matchesSearch && matchesType && matchesPrice && matchesSeats && matchesLocation;
      })
      .sort((a, b) =>
        filter.sort === "asc"
          ? (a.price?.daily ?? 0) - (b.price?.daily ?? 0)
          : filter.sort === "desc"
            ? (b.price?.daily ?? 0) - (a.price?.daily ?? 0)
            : 0,
      );
  }, [filter, all]);

  // Categories that actually have vehicles, with counts
  const typePills = useMemo(() => {
    const counts = new Map<string, number>();
    all.forEach((v) => {
      const t = v.vehicleType?.toLowerCase();
      if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
    });
    return Array.from(counts, ([type, count]) => ({ type, count }));
  }, [all]);

  const locationOptions = useMemo(() => {
    const seen = new Map<string, ILocation & { count: number }>();
    all.forEach((v) => {
      if (!v.location?._id) return;
      const prev = seen.get(v.location._id);
      seen.set(v.location._id, { ...v.location, count: (prev?.count ?? 0) + 1 });
    });
    return Array.from(seen.values());
  }, [all]);

  // Seat counts present in the data (plus a pre-selected one from the URL)
  const seatOptions = useMemo(() => {
    const set = new Set<number>();
    all.forEach((v) => v.seats && set.add(v.seats));
    if (filter.seats) set.add(Number(filter.seats));
    return Array.from(set).sort((a, b) => a - b);
  }, [all, filter.seats]);

  // Seats filter is only meaningful for cars
  const showSeatsFilter = filter.vehicleType === "car" || filter.vehicleType === "";

  const isFiltered =
    filter.search !== "" ||
    filter.vehicleType !== "" ||
    filter.seats !== "" ||
    filter.location !== "" ||
    filter.price !== MAX_PRICE;
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
            placeholder="Search model or brand..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-[#FE5300]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FE5300]/15"
          />
        </div>
      </FilterSection>

      {locationOptions.length > 0 && (
        <FilterSection title="Pickup Location" icon={MapPin}>
          <div className="space-y-1">
            <OptionButton
              label="All Locations"
              count={all.length}
              active={filter.location === ""}
              onClick={() => update({ location: "" })}
            />
            {locationOptions.map((loc) => (
              <OptionButton
                key={loc._id}
                label={loc.name}
                count={loc.count}
                active={filter.location === loc._id}
                onClick={() => update({ location: loc._id })}
              />
            ))}
          </div>
        </FilterSection>
      )}

      {showSeatsFilter && seatOptions.length > 0 && (
        <FilterSection title="Seats" icon={Users}>
          <div className="flex flex-wrap gap-2">
            <SeatChip label="Any" active={filter.seats === ""} onClick={() => update({ seats: "" })} />
            {seatOptions.map((s) => (
              <SeatChip
                key={s}
                label={`${s} Seater`}
                active={filter.seats === String(s)}
                onClick={() => update({ seats: String(s) })}
              />
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Budget" icon={IndianRupee}>
        <RangeField
          value={filter.price}
          min={MIN_PRICE}
          max={MAX_PRICE}
          step={500}
          onChange={(v) => update({ price: v })}
          display={`Up to ₹${filter.price.toLocaleString("en-IN")}`}
          suffix="/ day"
          minLabel="₹500"
          maxLabel="₹50,000"
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
          {typePills.length > 0 && (
            <div className="-mx-4 px-4 lg:mx-0 lg:px-0 flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <Pill
                label="All Vehicles"
                count={all.length}
                active={filter.vehicleType === ""}
                onClick={() => update({ vehicleType: "" })}
              />
              {typePills.map(({ type, count }) => (
                <Pill
                  key={type}
                  label={titleCase(type)}
                  count={count}
                  active={filter.vehicleType.toLowerCase() === type}
                  onClick={() =>
                    setFilter((prev) => ({
                      ...prev,
                      vehicleType: type,
                      seats: type !== "car" ? "" : prev.seats,
                    }))
                  }
                />
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-900">{filteredVehicles.length}</span>{" "}
              {filteredVehicles.length === 1 ? "vehicle" : "vehicles"} found
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

          {filteredVehicles.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
              {filteredVehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle._id}
                  vehicle={{
                    coverImage: vehicle.gallery[0],
                    vehicleName: vehicle.vehicleName,
                    vehicleTransmission: vehicle.vehicleTransmission,
                    fuelType: vehicle.fuelType,
                    availableSeats: vehicle.seats,
                    price: vehicle.price,
                    vehicleBrand: vehicle.vehicleBrand,
                    vehicleYear: vehicle.vehicleYear,
                    url: rentalVehiclePath(vehicle),
                    pricingType: vehicle.pricingType,
                    seatingOptions: vehicle.seatingOptions,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
              <p className="text-lg font-semibold text-slate-900">No vehicles match these filters</p>
              <p className="mt-1 text-sm text-slate-500">Try widening your budget or changing the location.</p>
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

// Button twin of DestinationPackagesClient's SubOptionLink (same look)
function OptionButton({
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
    <button type="button" onClick={onClick} aria-pressed={active} className={subOptionClass(active)}>
      <SubCheck active={active} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className={`text-xs tabular-nums ${active ? "text-[#FE5300]" : "text-slate-400"}`}>{count}</span>
    </button>
  );
}

function SeatChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-[#FE5300] bg-orange-50 text-[#FE5300]"
          : "border-slate-200 bg-white text-slate-700 hover:border-[#FE5300]/40 hover:text-[#FE5300]"
      }`}
    >
      {label}
    </button>
  );
}
