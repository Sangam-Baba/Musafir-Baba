"use client";
import React, { useEffect, useMemo, useState } from "react";
import VehicleCard from "@/components/custom/VehicleCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ILocation {
  _id: string;
  name: string;
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

const SEAT_OPTIONS = ["4", "5", "6", "7", "8", "9", "10", "12", "14", "17", "20", "26"];

export default function RentalsClient({ 
  vehicles, 
  initialVehicleType,
  initialLocationId 
}: { 
  vehicles: IVehicle[],
  initialVehicleType?: string,
  initialLocationId?: string
}) {
  const [filter, setFilter] = useState({
    search: "",
    vehicleType: initialVehicleType || "", // car | bike | tempo-traveller
    sort: "",        // asc | desc
    price: MAX_PRICE,
    seats: "",       // only for cars (4-wheeler) — blank = all
    location: initialLocationId || "",    // location _id
  });

  const [filteredVehicles, setFilteredVehicles] = useState<IVehicle[]>(
    vehicles ?? [],
  );

  // Derive unique locations from vehicles for the location dropdown
  const locationOptions = useMemo(() => {
    const seen = new Map<string, ILocation>();
    (vehicles ?? []).forEach((v) => {
      if (v.location?._id && !seen.has(v.location._id)) {
        seen.set(v.location._id, v.location);
      }
    });
    return Array.from(seen.values());
  }, [vehicles]);

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    (vehicles ?? []).forEach((v) => {
      if (v.vehicleType) types.add(v.vehicleType);
    });
    return Array.from(types);
  }, [vehicles]);

  useEffect(() => {
    const result = (vehicles ?? [])
      .filter((vehicle: IVehicle) => {
        const searchLower = filter.search.toLowerCase();

        const matchesSearch =
          !filter.search ||
          vehicle.vehicleName.toLowerCase().includes(searchLower) ||
          vehicle.vehicleBrand.toLowerCase().includes(searchLower);

        const matchesType = filter.vehicleType
          ? vehicle.vehicleType?.toLowerCase() === filter.vehicleType.toLowerCase()
          : true;

        const matchesPrice = (vehicle.price?.daily ?? 0) <= filter.price;

        // Seats filter only applies when a seat option is chosen
        const matchesSeats = filter.seats
          ? (vehicle.seats ?? 0) === Number(filter.seats)
          : true;

        const matchesLocation = filter.location
          ? vehicle.location?._id === filter.location
          : true;

        return (
          matchesSearch &&
          matchesType &&
          matchesPrice &&
          matchesSeats &&
          matchesLocation
        );
      })
      .sort((a, b) =>
        filter.sort === "asc"
          ? (a.price?.daily ?? 0) - (b.price?.daily ?? 0)
          : filter.sort === "desc"
            ? (b.price?.daily ?? 0) - (a.price?.daily ?? 0)
            : 0,
      );

    setFilteredVehicles(result);
  }, [filter, vehicles]);

  const handleRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: Number(value) }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter((prev) => ({ ...prev, search: e.target.value }));
  };

  const handleReset = () => {
    setFilter({
      search: "",
      vehicleType: "",
      sort: "",
      price: MAX_PRICE,
      seats: "",
      location: "",
    });
    setFilteredVehicles(vehicles ?? []);
  };

  // Whether to show seats filter (only meaningful for cars)
  const showSeatsFilter =
    filter.vehicleType === "car" || filter.vehicleType === "";

  return (
    <section>
      {/* ── Filter Bar ── */}
      <div className="w-full md:max-w-7xl mx-auto flex px-4 md:px-6 lg:px-8 my-8">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm w-full flex flex-col xl:flex-row flex-wrap gap-4 xl:items-end justify-between">
          
          <div className="flex flex-wrap gap-4 w-full xl:w-auto flex-1">
            {/* Vehicle Category */}
            <div className="flex flex-col gap-1.5 w-full sm:w-48 xl:w-40 flex-1">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Category</Label>
              <Select
                value={filter.vehicleType}
                onValueChange={(value) =>
                  setFilter((prev) => ({
                    ...prev,
                    vehicleType: value === "_all" ? "" : value,
                    seats: value !== "car" ? "" : prev.seats,
                  }))
                }
              >
                <SelectTrigger className="w-full h-10 bg-white border-gray-200 focus:ring-[#FE5300] focus:border-[#FE5300] shadow-sm">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Vehicle Category</SelectLabel>
                    <SelectItem value="_all">All Categories</SelectItem>
                    {uniqueTypes.map((type) => (
                      <SelectItem key={type} value={type.toLowerCase()}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Seats */}
            {showSeatsFilter && (
              <div className="flex flex-col gap-1.5 w-full sm:w-32 xl:w-28">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Seats</Label>
                <Select
                  value={filter.seats}
                  onValueChange={(value) =>
                    setFilter((prev) => ({ ...prev, seats: value }))
                  }
                >
                  <SelectTrigger className="w-full h-10 bg-white border-gray-200 focus:ring-[#FE5300] focus:border-[#FE5300] shadow-sm">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Seats</SelectLabel>
                      {SEAT_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s} Seater
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Location */}
            <div className="flex flex-col gap-1.5 w-full sm:w-48 xl:w-48 flex-1">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Location</Label>
              <Select
                value={filter.location}
                onValueChange={(value) =>
                  setFilter((prev) => ({ ...prev, location: value === "all" ? "" : value }))
                }
              >
                <SelectTrigger className="w-full h-10 bg-white border-gray-200 focus:ring-[#FE5300] focus:border-[#FE5300] shadow-sm">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Pickup / Garage</SelectLabel>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locationOptions.map((loc) => (
                      <SelectItem key={loc._id} value={loc._id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="flex flex-col gap-1.5 w-full sm:w-48 xl:w-48 flex-1">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Vehicle Model</Label>
              <Select
                value={filter.search || "_all"}
                onValueChange={(value) =>
                  setFilter((prev) => ({
                    ...prev,
                    search: value === "_all" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="w-full h-10 bg-white border-gray-200 focus:ring-[#FE5300] focus:border-[#FE5300] shadow-sm">
                  <SelectValue placeholder="All Vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Vehicles</SelectLabel>
                    <SelectItem value="_all">All Vehicles</SelectItem>
                    {Array.from(new Set((vehicles ?? []).map((v) => v.vehicleName))).map(
                      (name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      )
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Sort */}
            <div className="flex flex-col gap-1.5 w-full sm:w-36 xl:w-36">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Sort</Label>
              <Select
                value={filter.sort}
                onValueChange={(value) =>
                  setFilter((prev) => ({ ...prev, sort: value }))
                }
              >
                <SelectTrigger className="w-full h-10 bg-white border-gray-200 focus:ring-[#FE5300] focus:border-[#FE5300] shadow-sm">
                  <SelectValue placeholder="Sort ↑ ↓" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Sort By Price</SelectLabel>
                    <SelectItem value="desc">High to Low</SelectItem>
                    <SelectItem value="asc">Low to High</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto items-start xl:items-end mt-2 xl:mt-0">
            {/* Budget */}
            <div className="flex flex-col gap-1.5 w-full sm:w-56">
              <div className="flex justify-between items-center">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Max Budget / Day</Label>
                <span className="text-[13px] font-bold text-[#FE5300]">
                  ₹{filter.price.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="h-10 flex items-center">
                <input
                  type="range"
                  name="price"
                  onChange={handleRangeChange}
                  value={filter.price}
                  min={MIN_PRICE}
                  max={MAX_PRICE}
                  step={500}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FE5300]"
                />
              </div>
            </div>

            {/* Reset */}
            <Button
              type="button"
              onClick={handleReset}
              variant="outline"
              className="w-full sm:w-auto h-10 px-6 font-semibold text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-[#FE5300] hover:border-[#FE5300] transition-colors shadow-sm"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* ── Vehicle Grid ── */}
      {filteredVehicles && filteredVehicles.length > 0 ? (
        <div
          className="max-w-7xl mx-auto w-full px-4 md:px-6 lg:px-8
          flex gap-4 overflow-x-auto no-scrollbar
          md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
          md:gap-6 md:overflow-visible"
        >
          {filteredVehicles.map((vehicle: IVehicle) => (
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
                url: `/rental/${vehicle.vehicleType?.toLowerCase() || 'other'}/${vehicle.location?.name?.toLowerCase().replace(/\s+/g, '-') || 'any'}/${vehicle.slug}`,
                pricingType: vehicle.pricingType,
                seatingOptions: vehicle.seatingOptions,
              }}
            />
          ))}
        </div>
      ) : (
        <div className="w-full flex flex-col items-center justify-center mt-8 mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center">
            No Vehicles Found
          </h2>
          <p className="text-gray-500 mt-2 text-center">
            Try changing or resetting your filters.
          </p>
        </div>
      )}
    </section>
  );
}
