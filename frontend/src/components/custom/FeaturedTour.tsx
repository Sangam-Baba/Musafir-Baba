"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "../ui/button";
import PackageCard from "./PackageCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
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
    <section className="w-full px-4 md:px-8 lg:px-20 py-8 md:py-16">
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
        <div className="flex md:justify-center gap-3 mt-6 mx-5 overflow-x-auto no-scrollbar">
          {categoriesPkg.map((tab) => (
            <Button
              key={tab.slug}
              size="lg"
              onClick={() => setActive(tab.slug)}
              className={` ${
                active === tab.slug
                  ? "bg-[#FE5300]"
                  : "bg-white shadow-md text-black border border-[#FE5300]"
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Packages */}
        <div className="mt-10">
          {categoriesPkg.map((tab) => {
            // const category = tab.category;
            const isActive = active === tab.slug;

            if (!tab.categoryPackages || !tab.categoryPackages?.length)
              return null;

            return (
              <div
                key={tab.slug}
                className={`${
                  isActive ? "block" : "hidden"
                } transition-opacity duration-300`}
              >
                <div className="flex justify-end items-center mb-6">
                  {/* <h3 className="text-xl font-semibold text-[#FE5300]">
                    {tab.label}
                  </h3> */}
                  <Link
                    href={`/holidays/${tab.slug}`}
                    className="text-[#FE5300] font-semibold"
                  >
                    View All →
                  </Link>
                </div>

                <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {tab.categoryPackages.slice(0, 4).map((pkg) => (
                    <PackageCard
                      key={pkg._id}
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
                <div className="md:hidden flex flex-col items-center mx-auto px-6">
                  <Carousel
                    opts={{
                      align: "start",
                      loop: true,
                    }}
                    className="w-full"
                  >
                    <CarouselContent className="">
                      {tab.categoryPackages
                        .sort(() => Math.random() - 0.5)
                        .slice(0, 4)
                        .map((pkg, i) => (
                          <CarouselItem key={i}>
                            <div className="p-1">
                              <PackageCard
                                key={pkg._id}
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
                    {/* <CarouselPrevious className="ml-4" />
                    <CarouselNext className="mr-4" /> */}
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
