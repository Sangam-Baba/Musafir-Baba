"use client";
import React, { useEffect, useState } from "react";
import Hero from "@/components/custom/Hero";
import PackageCard from "@/components/custom/PackageCard";
import img1 from "../../../../../public/Hero1.jpg";
import Breadcrumb from "@/components/common/Breadcrumb";
import { FilterIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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

function SingleCategoryPage({
  categoryData,
  packagesData,
}: {
  categoryData: Category;
  packagesData: Package[];
}) {
  const [filter, setFilter] = useState({
    search: "",
    price: 50000,
    duration: 10,
  });
  const [filteredPkgs, setFilteredPkgs] = useState<Package[]>(
    packagesData ?? []
  );

  useEffect(() => {
    const result = packagesData.filter((pkg: Package) => {
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
    });
    setFilteredPkgs(result);
  }, [filter, packagesData]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({
      ...prev,
      [name]: name === "price" || name === "duration" ? Number(value) : value,
    }));
  };

  const category = categoryData ?? {};
  const packages = packagesData ?? [];

  return (
    <section className="w-full mb-12">
      <Hero
        image={packages[0]?.coverImage?.url || img1.src}
        title={category?.name}
        description={category?.description}
        align="center"
        height="lg"
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      {/* FIlter */}
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
              value={filter.duration}
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
                price: 50000,
                duration: 10,
              };
              setFilter(reset);
              setFilteredPkgs(packages);
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
      {packages && filteredPkgs.length > 0 && (
        <div className="max-w-7xl  mx-auto grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-10 my-20">
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
      )}
    </section>
  );
}

export default SingleCategoryPage;
