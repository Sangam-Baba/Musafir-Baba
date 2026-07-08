"use client";

import React, { useState } from "react";
import Link from "next/link";
import PackageCard from "./PackageCard";
import { ArrowRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { CarouselDots } from "../ui/carousel-indicators";

interface Batch {
  _id: string;
  startDate: string;
  endDate: string;
  quad: number;
}
interface Package {
  _id: string;
  title: string;
  slug: string;
  mainCategory: { name: string; slug: string };
  coverImage?: { url: string };
  duration: { days: number; nights: number };
  destination: { country: string; state: string };
  batch: Batch[];
}

interface Category {
  slug: string;
  label: string;
  categoryPackages: Package[];
}

export function FeaturedTour({ categoriesPkg }: { categoriesPkg: Category[] }) {
  const [active, setActive] = useState(categoriesPkg[0]?.slug);

  return (
    <section className="w-full bg-white px-4 md:px-10 py-12 md:py-20 border-t border-gray-100">
      <div className="w-full max-w-7xl mx-auto flex flex-col items-start">
        
        {/* Header Section */}
        <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="flex flex-col gap-1 items-start">
            <span className="text-[10px] md:text-[12px] font-semibold tracking-[0.08em] text-[#FE5300] uppercase">
              TOP-RATED PACKAGES
            </span>
            <h2 className="text-2xl md:text-[32px] leading-tight font-medium text-gray-900">
              <span>Featured</span> group tour packages
            </h2>
            <p className="text-[14px] md:text-[16px] text-gray-600">
              Top-rated holiday packages curated for every journey.
            </p>
          </div>
          
          <Link 
            href={`/holidays/${active}`} 
            className="flex items-center gap-1 text-[#FE5300] font-medium hover:text-[#e04800] transition-colors shrink-0 mb-1 pb-1"
          >
            View all <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex w-full overflow-x-auto no-scrollbar border-b border-gray-200 mb-8 gap-4 md:gap-8">
          {categoriesPkg.map((tab) => {
            const isActive = active === tab.slug;
            return (
              <button
                key={tab.slug}
                onClick={() => setActive(tab.slug)}
                className={`px-1 py-3 whitespace-nowrap text-[15px] md:text-base font-medium transition-colors relative ${
                  isActive
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#FE5300]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Packages */}
        <div className="w-full">
          {categoriesPkg.map((tab) => {
            const isActive = active === tab.slug;

            if (!tab.categoryPackages || !tab.categoryPackages?.length)
              return null;

            return (
              <div
                key={tab.slug}
                className={`${
                  isActive ? "block" : "hidden"
                } transition-opacity duration-300 w-full`}
              >
                <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
                  {tab.categoryPackages.slice(0, 4).map((pkg) => (
                    <PackageCard
                      key={pkg._id}
                      priority={true}
                      pkg={{
                        id: pkg._id,
                        name: pkg.title,
                        slug: pkg.slug,
                        image: pkg.coverImage?.url || "",
                        price: Number(pkg?.batch?.[0]?.quad ?? 8999),
                        duration: `${pkg.duration.nights}N/${pkg.duration.days}D`,
                        batch: pkg.batch,
                        destination:
                          pkg.destination.state.charAt(0).toUpperCase() +
                          pkg.destination.state.slice(1),
                      }}
                      url={`/holidays/${pkg.mainCategory?.slug}/${pkg.destination.state}/${pkg.slug}`}
                    />
                  ))}
                </div>
                
                <div className="md:hidden flex flex-col items-center mx-auto px-2 w-full">
                  <Carousel
                    opts={{
                      align: "start",
                      loop: true,
                    }}
                    className="w-full"
                  >
                    <CarouselContent className="">
                      {tab.categoryPackages
                        .slice(0, 4)
                        .map((pkg, i) => (
                          <CarouselItem key={i}>
                            <div className="p-1">
                              <PackageCard
                                key={pkg._id}
                                priority={i < 2}
                                pkg={{
                                  id: pkg._id,
                                  name: pkg.title,
                                  slug: pkg.slug,
                                  image: pkg.coverImage?.url || "",
                                  price: Number(pkg?.batch?.[0]?.quad ?? 8999),
                                  duration: `${pkg.duration.nights}N/${pkg.duration.days}D`,
                                  batch: pkg.batch,
                                  destination:
                                    pkg.destination.state
                                      .charAt(0)
                                      .toUpperCase() +
                                    pkg.destination.state.slice(1),
                                }}
                                url={`/holidays/${pkg.mainCategory?.slug}/${pkg.destination.state}/${pkg.slug}`}
                              />
                            </div>
                          </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselDots />
                  </Carousel>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
