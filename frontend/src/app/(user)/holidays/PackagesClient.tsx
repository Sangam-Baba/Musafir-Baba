"use client";
import React from "react";
import Hero from "@/components/custom/Hero";
import Breadcrumb from "@/components/common/Breadcrumb";
import PackageCard from "@/components/custom/PackageCard";
import { Package } from "./[categorySlug]/PackageSlugClient";
import { notFound } from "next/navigation";
import Pagination from "@/components/common/Pagination";
import { useRouter } from "next/navigation";
import { Category } from "./page";
import { Filter, FilterIcon } from "lucide-react";

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
  const router = useRouter();

  const handlePageChange = (newPage: number) => {
    router.push(`?page=${newPage}`);
  };

  if (data?.data?.length === 0) return notFound();

  return (
    <section>
      <Hero
        image="https://res.cloudinary.com/dmmsemrty/image/upload/v1761815676/tour_package_k5ijnt.webp"
        title=""
        align="center"
        height="lg"
        overlayOpacity={0}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      <div className="w-full md:max-w-7xl mx-auto flex  px-4 md:px-6 lg:px-8 items-center justify-between my-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-center">
            Holidays
          </h1>
          <div className="w-20 h-1 bg-[#FE5300] mt-2"></div>
        </div>
        {/* filter */}
        <div className="flex gap-2 justify-between border rounded-md border-gray-600 p-1">
          <FilterIcon />
          <select
            className="focus-none"
            onChange={(e) => router.push(`/holidays/${e.target.value}`)}
          >
            <option value="All">All</option>
            {category.map((cat: Category) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Show packages under this category */}
      {data && data?.data.length > 0 && (
        <div className="max-w-7xl  mx-auto grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-10">
          {data?.data.map((pkg: Package) => (
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
      <Pagination
        totalPages={Math.ceil(data?.total / 15)}
        currentPage={data?.page}
        onPageChange={handlePageChange}
      />
    </section>
  );
}
