"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin } from "lucide-react";
import Link from "next/link";
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
import { CustomizedPackageInterface } from "./page";
import { calculateHours } from "@/utils/readingTime";
function CustomizedTourClient({
  allPkgs,
}: {
  allPkgs: CustomizedPackageInterface[];
}) {
  // const { packagesData } = pkg;
  const [filter, setFilter] = useState({
    search: "",
    sort: "",
    price: 500000,
    duration: 25,
  });
  const [filteredPkgs, setFilteredPkgs] = useState<
    CustomizedPackageInterface[]
  >(allPkgs ?? []);

  useEffect(() => {
    const result = allPkgs
      ?.filter((pkg: CustomizedPackageInterface) => {
        return (
          (pkg.title.toLowerCase().includes(filter.search.toLowerCase()) ||
            pkg.destination?.state
              ?.toLowerCase()
              .includes(filter.search.toLowerCase()) ||
            pkg.destination?.country
              .toLowerCase()
              .includes(filter.search.toLowerCase())) &&
          pkg.plans[0].price <= filter.price &&
          pkg.duration?.days <= filter.duration
        );
      })
      .sort((a, b) =>
        filter.sort === "asc"
          ? (a.plans[0].price ?? 0) - (b.plans[0].price ?? 0)
          : (b.plans[0].price ?? 0) - (a.plans[0].price ?? 0),
      );
    setFilteredPkgs(result);
  }, [filter, allPkgs]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({
      ...prev,
      [name]: name === "price" || name === "duration" ? Number(value) : value,
    }));
  };
  return (
    <section className="w-full mb-12">
      {/* FIlter */}
      <div className="w-full md:max-w-7xl mx-auto flex  px-4 md:px-6 lg:px-8 items-center justify-end my-8">
        {/* filter */}
        <div className="w-full flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 border md:border-md border-[#FE5300] rounded-xl shadow-sm">
          <div className="w-full md:max-w-[150px]">
            <Select
              value={filter.sort}
              onValueChange={(value) =>
                setFilter((prev) => ({ ...prev, sort: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sort ↑ ↓" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Sort By</SelectLabel>

                  <SelectItem key={1} value="desc">
                    High to Low
                  </SelectItem>
                  <SelectItem key={2} value="asc">
                    Low to High
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Country Search */}
          <Input
            type="text"
            name="search"
            placeholder="Search country, state..."
            value={filter.search}
            onChange={handleChange}
            className="w-full md:max-w-[300px]"
          />

          {/* Price Slider */}
          <div className="flex flex-col w-full md:max-w-[250px]">
            <Label className="text-black-500 text-sm whitespace-nowrap">
              Budget:{" "}
              <span className="font-semibold text-[#FE5300]">
                ₹{filter.price.toLocaleString()}
              </span>{" "}
              per person
            </Label>
            <Input
              type="range"
              name="price"
              onChange={handleChange}
              value={filter.price}
              min={0}
              max={500000}
              className="cursor-pointer accent-[#FE5300]"
            />
          </div>
          {/* Duration Slider */}
          <div className="flex flex-col w-full md:max-w-[150px]">
            <Label className="text-black-500 text-sm">
              Duration:{" "}
              <span className="font-semibold text-[#FE5300]">
                {filter.duration.toLocaleString()}
              </span>{" "}
              Days
            </Label>
            <Input
              type="range"
              name="duration"
              value={filter.duration}
              onChange={handleChange}
              min={1}
              max={25}
              className="cursor-pointer accent-[#FE5300]"
            />
          </div>

          {/* Reset Button */}
          <Button
            type="button"
            onClick={() => {
              const reset = {
                search: "",
                sort: "",
                price: 500000,
                duration: 25,
              };
              setFilter(reset);
              setFilteredPkgs(allPkgs);
            }}
            className="
      w-full md:w-auto 
      font-semibold 
      bg-[#FF5300] hover:bg-[#FE5300] 
      text-white 
      rounded-lg px-5 py-4
    "
          >
            Reset
          </Button>
        </div>
      </div>
      {/* Show packages under this category */}
      {filteredPkgs && filteredPkgs.length > 0 ? (
        <div
          className="max-w-7xl mx-auto w-full px-4 md:px-6 lg:px-8
    flex gap-4 overflow-x-auto no-scrollbar
    md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
    md:gap-6 md:overflow-visible"
        >
          {filteredPkgs.map((pkg: CustomizedPackageInterface) => (
            <Link
              key={pkg._id}
              href={`/holidays/customised-tour-packages/${pkg?.destination?.state}/${pkg.slug}`}
              className="cursor-pointer min-w-[280px] sm:min-w-[300px] md:min-w-0"
            >
              <Card className="overflow-hidden pt-0 pb-0 rounded-2xl shadow-md hover:shadow-xl transition cursor-pointer">
                {/* Image + Price tag */}
                <div className="relative h-56 w-full">
                  <Image
                    src={pkg.coverImage?.url}
                    alt={pkg.coverImage?.alt}
                    width={500}
                    height={500}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-[#FE5300] text-white px-3 py-1 rounded-full font-semibold text-sm shadow">
                    ₹{pkg.plans[0].price.toLocaleString("en-IN")}/- onwards
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Title */}
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {pkg.title}
                  </h3>

                  {/* Duration & Location */}
                  <div className="flex items-center justify-between text-sm text-gray-700 mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      {pkg.duration?.nights ? (
                        <span>
                          {pkg.duration?.nights}N/{pkg.duration?.days}D,
                        </span>
                      ) : (
                        <span>{pkg.duration?.days}D</span>
                      )}
                      {pkg.time?.startTime && (
                        <span>
                          ,{" "}
                          {calculateHours(
                            pkg.time?.startTime,
                            pkg.time?.endTime,
                          )}{" "}
                          hrs
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span>{pkg.destination?.name}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mt-2 line-clamp-1">
                    Any Date of your choice
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center text-3xl font-bold ">
          No packages found
        </div>
      )}
    </section>
  );
}

export default CustomizedTourClient;
