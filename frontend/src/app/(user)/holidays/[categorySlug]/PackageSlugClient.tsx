"use client";
import React, { useEffect, useState } from "react";
import PackageCard from "@/components/custom/PackageCard";
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

function GroupPkgClient({ packagesData }: { packagesData: Package[] }) {
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
          (pkg.title.toLowerCase().includes(filter.search.toLowerCase()) ||
            pkg.destination?.state
              ?.toLowerCase()
              .includes(filter.search.toLowerCase()) ||
            pkg.destination?.country
              .toLowerCase()
              .includes(filter.search.toLowerCase())) &&
          pkg.batch[0].quad <= filter.price &&
          pkg.duration?.days <= filter.duration
        );
      })
      .sort((a, b) =>
        filter.sort === "asc"
          ? (a.batch[0].quad ?? 0) - (b.batch[0].quad ?? 0)
          : (b.batch[0].quad ?? 0) - (a.batch[0].quad ?? 0),
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

  return (
    <section className="w-full">
      {/* FIlter */}
      <div className="w-full md:max-w-7xl mx-auto flex  px-4 md:px-6 lg:px-8 items-center justify-end my-8">
        {/* filter */}
        <div className="w-full grid md:grid-cols-5 gap-2 items-center p-4 border md:border-md border-[#FE5300] rounded-xl shadow-sm">
          <div className="grid grid-cols-3 gap-2 md:col-span-2">
            <div className="w-full col-span-1 md:max-w-[150px]">
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
              className="w-full col-span-2 md:max-w-[300px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 md:col-span-2">
            {/* Price Slider */}
            <div className="flex flex-col w-full md:max-w-[250px]">
              <Label className="text-black-500 text-sm whitespace-nowrap">
                Budget:{" "}
                <span className="font-semibold text-[#FE5300]">
                  ₹{filter.price.toLocaleString()}
                </span>{" "}
                -/person
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
            <div className="flex flex-col w-full md:max-w-[150px] items-end">
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
              setFilteredPkgs(packages);
            }}
            className="
      w-full md:w-auto 
      font-semibold 
      bg-[#FF5300] hover:bg-[#FE5300] 
      text-white 
      rounded-lg px-5 py-4 md:col-span-1
    "
          >
            Reset
          </Button>
        </div>
      </div>
      {/* Show packages under this category */}
      {packages && filteredPkgs.length > 0 ? (
        <div
          className="max-w-7xl mx-auto w-full px-4 md:px-6 lg:px-8
    flex gap-4 overflow-x-auto no-scrollbar
    md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
    md:gap-6 md:overflow-visible"
        >
          {filteredPkgs.map((pkg) => (
            <PackageCard
              key={pkg._id}
              pkg={{
                id: pkg._id,
                name: pkg.title,
                slug: pkg.slug,
                image: pkg.coverImage?.url ?? "",
                price: pkg?.batch ? pkg?.batch[0]?.quad : 9999,
                duration: `${pkg.duration.nights}N/${pkg.duration.days}D`,
                destination: pkg.destination?.name ?? "",
                batch: pkg?.batch ? pkg?.batch : [],
              }}
              url={`/holidays/${pkg?.mainCategory?.slug}/${pkg.destination.state}/${pkg.slug}`}
            />
          ))}
        </div>
      ) : (
        <div className="w-full flex flex-col items-center justify-center my-20">
          <h1 className="text-3xl md:text-4xl font-bold text-center">
            No Packages Found
          </h1>
        </div>
      )}
    </section>
  );
}

export default GroupPkgClient;
