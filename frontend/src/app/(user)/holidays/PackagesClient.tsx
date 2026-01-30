"use client";
import React, { useEffect, useState } from "react";
import PackageCard from "@/components/custom/PackageCard";
import { Package } from "./[categorySlug]/PackageSlugClient";
import { notFound } from "next/navigation";
import { Category } from "./page";
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

interface CombinedInterface extends Package {
  price?: number;
}

export default function MixedPackagesClient({
  data,
  category,
}: {
  data: CombinedInterface[];
  category: Category[];
}) {
  const [filter, setFilter] = useState({
    search: "",
    category: "",
    sort: "",
    price: 500000,
    duration: 25,
  });
  const [filteredPkgs, setFilteredPkgs] = useState<CombinedInterface[]>(
    data ?? [],
  );

  useEffect(() => {
    const result = data
      ?.filter((pkg: CombinedInterface) => {
        const matchesSearch =
          pkg.title.toLowerCase().includes(filter.search.toLowerCase()) ||
          pkg.destination?.state
            ?.toLowerCase()
            .includes(filter.search.toLowerCase()) ||
          pkg.destination?.country
            ?.toLowerCase()
            .includes(filter.search.toLowerCase());

        const matchesCategory = filter.category
          ? pkg.mainCategory.slug?.toLowerCase() ===
            filter.category.toLowerCase()
          : true;

        const matchesPrice = (pkg.price ?? 0) <= filter.price;

        const matchesDuration = pkg.duration?.days <= filter.duration;

        return (
          matchesSearch && matchesCategory && matchesPrice && matchesDuration
        );
      })
      .sort((a, b) =>
        filter.sort === "asc"
          ? (a.price ?? 0) - (b.price ?? 0)
          : (b.price ?? 0) - (a.price ?? 0),
      );

    setFilteredPkgs(result);
  }, [filter, data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({
      ...prev,
      [name]: name === "price" || name === "duration" ? Number(value) : value,
    }));
  };
  if (data?.length === 0) return notFound();

  return (
    <section>
      <div className="w-full md:max-w-7xl mx-auto flex  px-4 md:px-6 lg:px-8 items-center justify-end my-8">
        {/* filter */}
        <div className="w-full grid md:grid-cols-3 gap-3 md:items-center md:justify-between p-4 border md:border-md border-[#FE5300] rounded-xl shadow-sm">
          {/* Dropdown */}
          <div className="grid grid-cols-2 gap-2">
            {/* Visa Type Dropdown */}
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

            {/* Visa Type Dropdown */}
            <div className="w-full md:max-w-[300px]">
              <Select
                value={filter.category}
                onValueChange={(value) =>
                  setFilter((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Package Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Package Type</SelectLabel>
                    {category.map((cat: Category) => (
                      <SelectItem key={cat._id} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Price Slider */}
            <div className="flex flex-col w-full md:max-w-[200px]">
              <Label className="text-black-500 text-sm whitespace-nowrap px-1">
                Budget:
                <span className="font-semibold text-[#FE5300]">
                  ₹{filter.price.toLocaleString()}
                </span>
                -/Person
              </Label>
              <Input
                type="range"
                name="price"
                onChange={handleChange}
                value={filter.price}
                min={100}
                max={500000}
                className="cursor-pointer accent-[#FE5300]"
              />
            </div>
            {/* Duration Slider */}
            <div className="flex flex-col w-full md:max-w-[150px] items-end">
              <Label className="text-black-500 text-sm ">
                Duration:{" "}
                <span className="font-semibold text-[#FE5300]">
                  {filter.duration.toLocaleString()}
                </span>
                Days
              </Label>
              <Input
                type="range"
                name="duration"
                onChange={handleChange}
                value={filter.duration}
                min={1}
                max={25}
                className="cursor-pointer accent-[#FE5300]"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {/* Country Search */}
            <Input
              type="text"
              name="search"
              placeholder="Search country, state..."
              value={filter.search}
              onChange={handleChange}
              className="w-full col-span-2 md:max-w-[300px]"
            />
            {/* Reset Button */}
            <Button
              type="button"
              onClick={() => {
                const reset = {
                  search: "",
                  category: "",
                  sort: "",
                  price: 500000,
                  duration: 25,
                };
                setFilter(reset);
                setFilteredPkgs(data);
              }}
              className="
      w-full md:w-auto col-span-1
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
      </div>

      {/* Show packages under this category */}
      {filteredPkgs && filteredPkgs.length > 0 ? (
        <>
          <div
            className="
    max-w-7xl mx-auto w-full px-4 md:px-6 lg:px-8
    flex gap-4 overflow-x-auto no-scrollbar
    md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
    md:gap-6 md:overflow-visible
  "
          >
            {filteredPkgs?.map((pkg: CombinedInterface) => (
              // <div key={pkg._id} className="min-w-[280px] md:min-w-0">
              <PackageCard
                key={pkg._id}
                pkg={{
                  id: pkg._id,
                  name: pkg.title,
                  slug: pkg.slug,
                  image: pkg.coverImage?.url ?? "/Hero1.jpg",
                  price: pkg?.price ?? 9999,
                  duration: pkg.duration?.nights
                    ? `${pkg.duration?.nights ?? 0}N/${pkg.duration.days}D`
                    : `${pkg.duration.days}D`,
                  destination: pkg.destination?.name ?? "",
                  batch: pkg?.batch ? pkg?.batch : [],
                }}
                url={`/holidays/${pkg?.mainCategory?.slug}/${pkg.destination.state}/${pkg.slug}`}
              />
              // </div>
            ))}
          </div>
        </>
      ) : (
        <div className="w-full flex flex-col items-center justify-center mt-8">
          <h1 className="text-3xl md:text-4xl font-bold text-center">
            No Packages Found
          </h1>
        </div>
      )}
    </section>
  );
}
