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

export default function RentalsClient({ vehicles }: { vehicles: IVehicle[] }) {
  const [filter, setFilter] = useState({
    search: "",
    vehicleType: "", // car | bike | tempo-traveller
    sort: "",        // asc | desc
    price: MAX_PRICE,
    seats: "",       // only for cars (4-wheeler) — blank = all
    location: "",    // location _id
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
      <div className="w-full md:max-w-7xl mx-auto flex px-4 md:px-6 lg:px-8 items-center justify-end my-8">
        <div className="w-full flex flex-wrap xl:flex-nowrap gap-4 items-end p-4 border md:border-md border-[#FE5300] rounded-xl shadow-sm text-black">
          
          {/* Sort */}
          <div className="w-full sm:w-[calc(50%-8px)] lg:w-auto lg:min-w-[130px] xl:w-[130px]">
            <Select
              value={filter.sort}
              onValueChange={(value) =>
                setFilter((prev) => ({ ...prev, sort: value }))
              }
            >
              <SelectTrigger className="w-full h-10">
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

          {/* Vehicle Category */}
          <div className="w-full sm:w-[calc(50%-8px)] lg:w-auto lg:min-w-[160px] xl:w-[160px]">
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
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Category" />
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

          {/* Budget */}
          <div className="flex flex-col w-full sm:w-[calc(50%-8px)] lg:w-auto lg:min-w-[180px] xl:w-[180px] justify-end">
            <Label className="text-black-500 text-sm whitespace-nowrap px-1 mb-2">
              Budget:{" "}
              <span className="font-semibold text-[#FE5300]">
                ₹{filter.price.toLocaleString("en-IN")}
              </span>
              /day
            </Label>
            <div className="h-10 flex items-center">
              <Input
                type="range"
                name="price"
                onChange={handleRangeChange}
                value={filter.price}
                min={MIN_PRICE}
                max={MAX_PRICE}
                step={500}
                className="cursor-pointer accent-[#FE5300] w-full"
              />
            </div>
          </div>

          {/* Seats */}
          {showSeatsFilter && (
            <div className="w-full sm:w-[calc(50%-8px)] lg:w-auto lg:min-w-[110px] xl:w-[110px]">
              <Select
                value={filter.seats}
                onValueChange={(value) =>
                  setFilter((prev) => ({ ...prev, seats: value }))
                }
              >
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Seats" />
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
          <div className="flex flex-col w-full lg:flex-1 lg:min-w-[240px] xl:w-auto justify-end">
            <Label className="text-black-500 text-sm whitespace-nowrap px-1 mb-2">
              Pickup Location
            </Label>
            <Select
              value={filter.location}
              onValueChange={(value) =>
                setFilter((prev) => ({ ...prev, location: value === "all" ? "" : value }))
              }
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Location" />
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
          <div className="flex flex-col w-full sm:w-[calc(50%-8px)] lg:w-auto lg:min-w-[150px] xl:w-[150px] justify-end">
            <Select
              value={filter.search || "_all"}
              onValueChange={(value) =>
                setFilter((prev) => ({
                  ...prev,
                  search: value === "_all" ? "" : value,
                }))
              }
            >
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Search vehicle..." />
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

          {/* Reset */}
          <div className="flex flex-col w-full sm:w-[calc(50%-8px)] lg:w-auto justify-end">
            <Button
              type="button"
              onClick={handleReset}
              className="w-full h-10 font-semibold bg-[#FF5300] hover:bg-[#FE5300] text-white rounded-lg px-6 flex items-center justify-center"
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
                url: `/rental/${vehicle.slug}`,
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
