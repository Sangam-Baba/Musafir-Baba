"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import PackageCard from "./PackageCard";

interface Package {
  _id: string;
  title: string;
  slug: string;
  coverImage?: { url: string };
  batch?: { quad: number }[];
  duration: { days: number; nights: number };
  destination: { country: string; state: string };
}

interface Category {
  slug: string;
  label: string;
  category: {
    packages: Package[];
  } | null;
}

export function FeaturedTour({ categories }: { categories: Category[] }) {
  const [active, setActive] = useState(categories[0]?.slug);

  return (
    <section className="w-full px-4 md:px-8 lg:px-20 py-16">
      <div className="flex flex-col gap-2 max-w-7xl mx-auto">
        {/* Heading */}
        <div className="flex flex-col gap-2 items-center w-full text-center">
          <h2 className="text-2xl md:text-3xl font-bold">
            Featured Group Tour Packages
          </h2>
          <div className="w-20 h-1 bg-[#FE5300]" />
          <p>Top-rated holiday packages curated for every journey</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {categories.map((tab) => (
            <Button
              key={tab.slug}
              size="lg"
              onClick={() => setActive(tab.slug)}
              className={`transition-colors ${
                active === tab.slug ? "bg-[#FE5300]" : "bg-gray-400"
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Packages */}
        <div className="mt-10">
          {categories.map((tab) => {
            const category = tab.category;
            const isActive = active === tab.slug;

            if (!category || !category.packages?.length) return null;

            return (
              <div
                key={tab.slug}
                className={`${
                  isActive ? "block" : "hidden"
                } transition-opacity duration-300`}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold text-[#FE5300]">
                    {tab.label}
                  </h3>
                  <Link
                    href={`/holidays/${tab.slug}`}
                    className="text-[#FE5300] font-semibold"
                  >
                    View All →
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {category.packages.slice(0, 4).map((pkg) => (
                    <PackageCard
                      key={pkg._id}
                      pkg={{
                        id: pkg._id,
                        name: pkg.title,
                        slug: pkg.slug,
                        image: pkg.coverImage?.url || "",
                        price: pkg.batch?.[0]?.quad || 9999,
                        duration: `${pkg.duration.nights}N/${pkg.duration.days}D`,
                        destination:
                          pkg.destination.state.charAt(0).toUpperCase() +
                          pkg.destination.state.slice(1),
                      }}
                      url={`/${pkg.destination.country}/${pkg.destination.state}/${pkg.slug}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
