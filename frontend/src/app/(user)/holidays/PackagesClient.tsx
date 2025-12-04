"use client";
import React, { useEffect, useState } from "react";
import Hero from "@/components/custom/Hero";
import Breadcrumb from "@/components/common/Breadcrumb";
import PackageCard from "@/components/custom/PackageCard";
import { Package } from "./[categorySlug]/PackageSlugClient";
import { notFound } from "next/navigation";
// import Pagination from "@/components/common/Pagination";
// import { useRouter } from "next/navigation";
import { Category } from "./page";
import { FilterIcon } from "lucide-react";
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

interface PackageResponse {
  data: Package[];
  total: number;
  page: number;
  pages: number;
}

export default function PackagesClient({
  data,
  category,
}: {
  data: PackageResponse;
  category: Category[];
}) {
  const [filter, setFilter] = useState({
    search: "",
    category: "",
    price: 50000,
    duration: 10,
  });
  const [filteredPkgs, setFilteredPkgs] = useState<Package[]>(data?.data ?? []);

  useEffect(() => {
    const result = data?.data?.filter((pkg: Package) => {
      return (
        (pkg.title.toLowerCase().includes(filter.search.toLowerCase()) ||
          pkg.destination?.state
            ?.toLowerCase()
            .includes(filter.search.toLowerCase()) ||
          pkg.destination?.country
            .toLowerCase()
            .includes(filter.search.toLowerCase())) &&
        pkg.mainCategory.slug
          ?.toLowerCase()
          .includes(filter.category.toLowerCase()) &&
        pkg.batch[0].quad <= filter.price &&
        pkg.duration?.days <= filter.duration
      );
    });
    setFilteredPkgs(result);
  }, [filter, data?.data]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({
      ...prev,
      [name]: name === "price" || name === "duration" ? Number(value) : value,
    }));
  };
  if (data?.data?.length === 0) return notFound();

  return (
    <section>
      <Hero
        image="https://res.cloudinary.com/dmmsemrty/image/upload/v1761815676/tour_package_k5ijnt.webp"
        title="Holidays"
        align="center"
        height="lg"
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      <div className="w-full md:max-w-7xl mx-auto flex  px-4 md:px-6 lg:px-8 items-center justify-end my-8">
        {/* filter */}
        <div className="w-full flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 border md:border-none rounded-xl shadow-sm">
          {/* Icon */}
          <div className="flex items-center gap-2">
            <FilterIcon size={22} className="text-[#FE5300]" />
            <span className="font-semibold text-gray-700 md:hidden">
              Filters
            </span>
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

          {/* Price Slider */}
          <div className="flex flex-col w-full md:max-w-[250px]">
            <Label className="text-gray-500 text-sm">
              Budget:{" "}
              <span className="font-semibold text-[#FE5300]">
                ₹{filter.price.toLocaleString()}
              </span>
            </Label>
            <Input
              type="range"
              name="price"
              onChange={handleChange}
              min={0}
              max={50000}
              className="cursor-pointer"
            />
          </div>
          {/* Duration Slider */}
          <div className="flex flex-col w-full md:max-w-[50px]">
            <Label className="text-gray-500 text-sm">
              Days:{" "}
              <span className="font-semibold text-[#FE5300]">
                {filter.duration.toLocaleString()}
              </span>
            </Label>
            <Input
              type="number"
              name="duration"
              onChange={handleChange}
              min={1}
              max={10}
              className="cursor-pointer"
            />
          </div>

          {/* Reset Button */}
          <Button
            type="button"
            onClick={() => {
              const reset = {
                search: "",
                category: "",
                price: 50000,
                duration: 10,
              };
              setFilter(reset);
              setFilteredPkgs(data?.data);
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
        <div className="max-w-7xl  mx-auto grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-10">
          {filteredPkgs?.map((pkg: Package) => (
            <PackageCard
              key={pkg._id}
              pkg={{
                id: pkg._id,
                name: pkg.title,
                slug: pkg.slug,
                image: pkg.coverImage?.url ?? "/Hero1.jpg",
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
        <div className="w-full flex flex-col items-center justify-center mt-8">
          <h1 className="text-3xl md:text-4xl font-bold text-center">
            No Packages Found
          </h1>
        </div>
      )}
    </section>
  );
}
