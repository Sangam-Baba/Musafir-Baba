"use client"

import React, { useState } from "react"
import { Button } from "../ui/button"
import Image from "next/image"
import jaipur from "../../../public/jaipur.jpg"
import badrinath from "../../../public/badrinath.jpg"
import keral from "../../../public/keral.jpg"
import kashmir from "../../../public/kashmir.jpg"
import himachal from "../../../public/Himachal.jpg"
import { Card, CardContent } from "../ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin } from "lucide-react"
import Link from "next/link"

type Tour = {
  image: string
  title: string
  subtitle: string
  location: string
  price: number
  duration: string
  isTrending: boolean
}

type TabKey =
  | "Customized"
  | "Backpacking"
  | "Weekend"
  | "Early"
  | "Honeymoon"
  | "International"

const data: Record<TabKey, Tour[]> = {
  Customized: [
    { image: jaipur.src, title: "Jaipur", subtitle: "Jaipur Tour Package", location: "Jaipur", price: 20999, duration: "10D/9N", isTrending: true },
    { image: keral.src, title: "Kerala", subtitle: "Kerala Tour Package", location: "Kerala", price: 24999, duration: "7D/6N", isTrending: true },
    { image: himachal.src, title: "Himachal", subtitle: "Himachal Tour Package", location: "Himachal", price: 18999, duration: "8D/7N", isTrending: false },
    { image: badrinath.src, title: "Badrinath", subtitle: "Badrinath Tour Package", location: "Uttarakhand", price: 20999, duration: "10D/9N", isTrending: true },
  ],
  Backpacking: [
    { image: badrinath.src, title: "Badrinath", subtitle: "Badrinath Backpacking", location: "Uttarakhand", price: 15999, duration: "5D/4N", isTrending: true },
    { image: kashmir.src, title: "Kashmir", subtitle: "Kashmir Backpacking", location: "Kashmir", price: 17999, duration: "6D/5N", isTrending: false },
  ],
  Weekend: [
    { image: badrinath.src, title: "Badrinath", subtitle: "Badrinath Backpacking", location: "Uttarakhand", price: 15999, duration: "5D/4N", isTrending: true },
    { image: kashmir.src, title: "Kashmir", subtitle: "Kashmir Backpacking", location: "Kashmir", price: 17999, duration: "6D/5N", isTrending: false },
    { image: himachal.src, title: "Himachal", subtitle: "Himachal Tour Package", location: "Himachal", price: 18999, duration: "8D/7N", isTrending: false },
    { image: badrinath.src, title: "Badrinath", subtitle: "Badrinath Tour Package", location: "Uttarakhand", price: 20999, duration: "10D/9N", isTrending: true },

  ],
  Early: [
    { image: badrinath.src, title: "Badrinath", subtitle: "Badrinath Backpacking", location: "Uttarakhand", price: 15999, duration: "5D/4N", isTrending: true },
    { image: kashmir.src, title: "Kashmir", subtitle: "Kashmir Backpacking", location: "Kashmir", price: 17999, duration: "6D/5N", isTrending: false },
  ],
  Honeymoon: [
    { image: badrinath.src, title: "Badrinath", subtitle: "Badrinath Backpacking", location: "Uttarakhand", price: 15999, duration: "5D/4N", isTrending: true },
    { image: kashmir.src, title: "Kashmir", subtitle: "Kashmir Backpacking", location: "Kashmir", price: 17999, duration: "6D/5N", isTrending: false },
  ],
  International: [
    { image: badrinath.src, title: "Badrinath", subtitle: "Badrinath Backpacking", location: "Uttarakhand", price: 15999, duration: "5D/4N", isTrending: true },
    { image: kashmir.src, title: "Kashmir", subtitle: "Kashmir Backpacking", location: "Kashmir", price: 17999, duration: "6D/5N", isTrending: false },
    { image: himachal.src, title: "Himachal", subtitle: "Himachal Tour Package", location: "Himachal", price: 18999, duration: "8D/7N", isTrending: false },
    { image: badrinath.src, title: "Badrinath", subtitle: "Badrinath Tour Package", location: "Uttarakhand", price: 20999, duration: "10D/9N", isTrending: true },
  ],
}

export function FeaturedTour() {
  const [active, setActive] = useState<TabKey>("Customized")

  const tabs: { key: TabKey; label: string }[] = [
    { key: "Customized", label: "Customized Trips" },
    { key: "Backpacking", label: "Backpacking Trips" },
    { key: "Weekend", label: "Weekend Trips" },
    { key: "Honeymoon", label: "Honeymoon Trips" },
    { key: "Early", label: "Early Bird 2025" },
    { key: "International", label: "International Trips" },
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
                key={tab.key}
                size="lg"
                onClick={() => setActive(tab.key)}
                className={`mt-4 ${
                  active === tab.key ? "bg-[#FE5300]" : "bg-gray-400"
                }`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex  justify-between  items-center w-full p-4">
          <div className="text-xl font-semibold">{active} Trips</div>
          <div>
              <Link href={`https://musafirbaba.com/packages/${active.toLowerCase()}`} className="text-[#FE5300] font-semibold" > View All</Link>
          </div>
        </div>
        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-10 w-full px-6 md:px-0">
          {data[active].map((obj) => (
            <Card
              key={obj.title}
              className="rounded-xl overflow-hidden shadow-md hover:shadow-lg transition"
            >
              <div className="relative">
                <Image
                  src={obj.image}
                  alt={obj.title}
                  width={400}
                  height={250}
                  className="object-cover w-full h-48"
                />

                {/* Trending Badge */}
                {obj.isTrending && (
                  <Badge className="absolute top-2 left-2 bg-red-600 text-white">
                    Trending
                  </Badge>
                )}

                {/* Title Overlay */}
                <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                  {obj.title}
                </div>
              </div>

              <CardContent className="p-4 space-y-2">
                {/* Location */}
                <div className="flex items-center text-gray-600 text-sm">
                  <MapPin className="w-4 h-4 mr-1" />
                  {obj.location}
                </div>

                {/* Subtitle */}
                <h3 className="font-semibold text-lg">{obj.subtitle}</h3>

                {/* Price & Duration */}
                <div className="flex justify-between items-center pt-2 border-t text-sm">
                  <span>
                    From{" "}
                    <span className="text-[#FE5300] font-bold">
                      ₹{obj.price.toLocaleString("en-IN")}
                    </span>
                  </span>
                  <span className="text-gray-500">{obj.duration}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
