"use client"

import React, { useState } from "react"
import { Button } from "../ui/button"
import Image from "next/image"
import { Card, CardContent } from "../ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin } from "lucide-react"
import Link from "next/link"
import { Loader } from "@/components/custom/loader"
import { toast } from "sonner"
import { useQuery } from "@tanstack/react-query"

interface Batch {
  _id: string
  startDate: string
  endDate: string
  quad: number
  triple: number
  double: number
  child: number
  quadDiscount: number
  tripleDiscount: number
  doubleDiscount: number
  childDiscount: number
}
interface CoverImage {
  url: string
  public_id: string
  width: number
  height: number
  alt: string
}
interface Package {
  _id: string
  title: string
  slug: string
  coverImage: CoverImage
  batch: Batch[]
  duration: {
    days: number
    nights: number
  }
  destination: Destination
  isFeatured: boolean
  status: "draft" | "published"
}
interface Destination {
  _id: string
  country: string
  state: string
  name: string
  slug: string
}
interface Category {
  _id: string
  name: string
  slug: string
  image: string
  description: string
  packages: Package[]
}
interface CategoryResponse {
  success: boolean
  data: {
    category: Category
  }
}

const getCategoryBySlug = async (slug: string): Promise<CategoryResponse> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category/${slug}`, {
    method: "GET",
    headers: { "content-type": "application/json" },
    credentials: "include",
    cache: "no-cache",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch category")
  }
  return res.json()
}

type TabSlug =
  | "customized-tour-packages"
  | "backpacking-tour-packages"
  | "weekend-tour-packages"
  | "honeymoon-tour-packages"
  | "early-bird-tour-packages"
  | "international-tour-packages"

export function FeaturedTour() {
  const [slug, setSlug] = useState<TabSlug>("customized-tour-packages")

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["category", slug],
    queryFn: () => getCategoryBySlug(slug),
    retry: 2,
  })

  if (isLoading) {
    return <Loader size="lg" message="Loading category..." />
  }
  if (isError) {
    toast.error((error as Error).message)
    return <h1>{(error as Error).message}</h1>
  }

  const { category } = data?.data ?? {}
  const packages = category?.packages ?? []

  const tabs: { key: TabSlug; label: string; slug: TabSlug }[] = [
    { key: "customized-tour-packages", label: "Customized Trips", slug: "customized-tour-packages" },
    { key: "backpacking-tour-packages", label: "Backpacking Trips", slug: "backpacking-tour-packages" },
    { key: "weekend-tour-packages", label: "Weekend Trips", slug: "weekend-tour-packages" },
    { key: "honeymoon-tour-packages", label: "Honeymoon Trips", slug: "honeymoon-tour-packages" },
    { key: "early-bird-tour-packages", label: "Early Bird 2025", slug: "early-bird-tour-packages" },
    { key: "international-tour-packages", label: "International Trips", slug: "international-tour-packages" },
  ]

  return (
    <section className="w-full px-4 md:px-8 lg:px-20 py-16">
      <div className="flex flex-col gap-2  max-w-7xl mx-auto">
        {/* Heading */}
        <div className="flex flex-col gap-5 items-center w-full">
          <h1 className="text-2xl md:text-3xl font-bold text-center">
            Featured Tour Packages
          </h1>
          <div className="w-20 h-1 bg-[#FE5300]"></div>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center w-full gap-2 mt-4 ">
            {tabs.map((tab) => (
              <Button
                key={tab.slug}
                size="lg"
                onClick={() => setSlug(tab.slug)}
                className={`mt-4 ${slug === tab.slug ? "bg-[#FE5300]" : "bg-gray-400"}`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex  justify-between  items-center w-full p-4">
          <div className="text-xl font-semibold">{category?.name} Trips</div>
          <div>
            <Link
              href={`/packages/${slug}`}
              className="text-[#FE5300] font-semibold"
            >
              View All
            </Link>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-10 w-full px-6 md:px-0">
          {packages.slice(0, 4).map((obj: Package) => {
            const price = obj.batch?  obj.batch?.[0]?.quad : 3999;
            return (
              <Card
                key={obj._id}
                className="py-0 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition"
              >
                <Link href={`/${obj.destination.country}/${obj.destination.state}/${obj.slug}`} className="block">
                <div className="relative">
                  <Image
                    src={obj.coverImage?.url}
                    alt={obj.title}
                    width={400}
                    height={250}
                    className="object-cover w-full h-48"
                  />

                  <Badge className="absolute top-2 left-2 bg-red-600 text-white">
                    Trending
                  </Badge>

                  <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    {obj.title}
                  </div>
                </div>

                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center text-gray-600 text-sm">
                    <MapPin className="w-4 h-4 mr-1" />
                    {obj.destination?.name}
                  </div>

                  <h3 className="font-semibold text-lg">{obj.title}</h3>

                  <div className="flex justify-between items-center pt-2 border-t text-sm">
                    <span>
                      From{" "}
                      <span className="text-[#FE5300] font-bold">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                    </span>
                    <span className="text-gray-500">
                      {obj.duration.days}D/{obj.duration.nights}N
                    </span>
                  </div>
                </CardContent>
                </Link>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
