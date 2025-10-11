"use client";

import React, { useState } from "react";
import { Button } from "../ui/button";
import Link from "next/link";
import { Loader } from "@/components/custom/loader";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import PackageCard from "./PackageCard";

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
interface Package {
  _id: string;
  title: string;
  slug: string;
  coverImage: CoverImage;
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
  image: string;
  description: string;
  packages: Package[];
}
interface CategoryResponse {
  success: boolean;
  data: {
    category: Category;
  };
}

const getCategoryBySlug = async (slug: string): Promise<CategoryResponse> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/category/${slug}`,
    {
      method: "GET",
      headers: { "content-type": "application/json" },
      credentials: "include",
      cache: "no-cache",
    }
  );
  if (!res.ok) {
    throw new Error("Failed to fetch category");
  }
  return res.json();
};

type TabSlug =
  | "customized-tour-package"
  | "backpacking-trips"
  | "weekend-gateway"
  | "honeymoon-package"
  | "early-bird-2026"
  | "international-tour-packages";

export function FeaturedTour() {
  const [slug, setSlug] = useState<TabSlug>("customized-tour-package");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["category", slug],
    queryFn: () => getCategoryBySlug(slug),
    retry: 2,
  });

  if (isLoading) {
    return <Loader size="lg" message="Loading category..." />;
  }
  if (isError) {
    toast.error((error as Error).message);
    return <h1>{(error as Error).message}</h1>;
  }

  const { category } = data?.data ?? {};
  const packages = category?.packages ?? [];

  const tabs: { key: TabSlug; label: string; slug: TabSlug }[] = [
    {
      key: "customized-tour-package",
      label: "Customized Trips",
      slug: "customized-tour-package",
    },
    {
      key: "backpacking-trips",
      label: "Backpacking Trips",
      slug: "backpacking-trips",
    },
    {
      key: "weekend-gateway",
      label: "Weekend Trips",
      slug: "weekend-gateway",
    },
    {
      key: "honeymoon-package",
      label: "Honeymoon Trips",
      slug: "honeymoon-package",
    },
    {
      key: "early-bird-2026",
      label: "Early Bird 2026",
      slug: "early-bird-2026",
    },
    {
      key: "international-tour-packages",
      label: "International Trips",
      slug: "international-tour-packages",
    },
  ];

  return (
    <section className="w-full px-4 md:px-8 lg:px-20 py-16">
      <div className="flex flex-col gap-2  max-w-7xl mx-auto">
        {/* Heading */}
        <div className="flex flex-col gap-5 items-center w-full">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            Featured Tour Packages
          </h2>
          <div className="w-20 h-1 bg-[#FE5300]"></div>

          {/* Tabs */}
          <h3 className="flex flex-wrap justify-center w-full gap-2 mt-4 ">
            {tabs.map((tab) => (
              <Button
                key={tab.slug}
                size="lg"
                onClick={() => setSlug(tab.slug)}
                className={`mt-4 ${
                  slug === tab.slug ? "bg-[#FE5300]" : "bg-gray-400"
                }`}
              >
                {tab.label}
              </Button>
            ))}
          </h3>
        </div>

        <div className="flex  justify-end  items-center w-full p-4">
          <div>
            <Link
              href={`/holidays/${slug}`}
              className="text-[#FE5300] font-semibold"
            >
              View All
            </Link>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-10 w-full px-6 md:px-0">
          {packages.slice(0, 4).map((pkg) => (
            <PackageCard
              key={pkg._id}
              pkg={{
                id: pkg._id,
                name: pkg.title,
                slug: pkg.slug,
                image: pkg.coverImage ? pkg.coverImage.url : "",
                price: pkg.batch ? pkg.batch[0].quad : 9999,
                duration: `${pkg.duration.nights}N/${pkg.duration.days}D`,
                destination:
                  pkg.destination.state.charAt(0).toUpperCase() +
                  pkg.destination.state.slice(1),
                batch: pkg?.batch ? pkg?.batch : [],
              }}
              url={`/${pkg.destination.country}/${pkg.destination.state}/${pkg.slug}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
