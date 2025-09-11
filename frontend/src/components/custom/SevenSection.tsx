"use client"

import React, { useState } from "react"
import { Button } from "../ui/button"
import Image from "next/image"
import summer from "../../../public/Group-4img.webp"
import bg from "../../../public/bg-2.png"

export function SevenSection() {
  const [active, setActive] = useState<"summer" | "winter" | null>("summer")

  return (
    <section
      className="w-full px-4 md:px-8 lg:px-20 py-16 relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bg.src})` }}
    >
      <div className="flex flex-col gap-2 items-center relative z-10 p-8 text-white max-w-7xl mx-auto">
        {/* Heading */}
        <div className="flex flex-col gap-5 items-center w-full">
          <h1 className="text-2xl md:text-3xl font-bold">
            Explore the Spiti Valley: A Himalayan Adventure
          </h1>
          <div className="w-20 h-1 bg-[#FE5300]"></div>
          <div className="flex gap-4">
            <Button
              size="lg"
              onClick={() => setActive("summer")}
              className={`mt-4 ${
                active === "summer" ? "bg-[#FE5300]" : "bg-gray-500"
              }`}
            >
              Summer
            </Button>
            <Button
              size="lg"
              onClick={() => setActive("winter")}
              className={`mt-4 ${
                active === "winter" ? "bg-[#FE5300]" : "bg-gray-500"
              }`}
            >
              Winter
            </Button>
          </div>
        </div>

        {/* Content Section */}
        <div className="md:flex md:gap-8  w-full items-center justify-center mt-8">
          {active === "summer" && (
            <>
              <div className="w-full md:w-1/2">
                <Image
                  src={summer}
                  alt="Summer in Spiti"
                  className="rounded-2xl w-full h-ful p-4 "
                />
              </div>
              <div className="w-full md:w-1/2">
                <p className="leading-relaxed">
                  Spiti Valley in summer is a vibrant tapestry of colors,
                  culture, and breathtaking landscapes. The snow melts, revealing
                  lush green valleys dotted with charming villages.
                  <br />
                  <br />
                  Trek through high-altitude passes, explore ancient monasteries
                  like Key Monastery and Tabo Monastery, and witness the unique
                  Spitian culture. Summer is the ideal time for adventure
                  activities like trekking, camping, and mountain biking. The
                  weather is pleasant, making it perfect for exploring the
                  region’s hidden gems.
                  <br />
                  <br />
                  Contact Musafirbaba, the best travel agency in Delhi, to start
                  planning your unforgettable Spiti Valley adventure today.
                </p>
                <Button className="mt-4 bg-[#FE5300]">
                  Explore Summer Spiti Packages
                </Button>
              </div>
            </>
          )}

          {active === "winter" && (
            <>
              <div className="w-full md:w-1/2">
                <p className="leading-relaxed">
                  Dreaming of a winter adventure in Spiti Valley?
                  <br />
                  <br />
                  Musafirbaba, the best travel agency in Delhi, can make your
                  dream a reality. Winter transforms Spiti Valley into a frozen
                  wonderland, a stark yet stunning landscape of snow-covered
                  mountains and frozen rivers.
                  <br />
                  <br />
                  Experience the thrill of walking on the frozen Chadar Trek,
                  witness the rare snow leopard, and immerse yourself in the
                  tranquility of a winter landscape. While some roads may be
                  closed, the winter months offer a unique and unforgettable
                  experience for adventurous travelers.
                  <br />
                  <br />
                  Accept the challenge and discover the magic of winter in
                  Spiti.
                </p>
                <Button className="mt-4 bg-[#FE5300]">
                  Explore Winter Spiti Packages
                </Button>
              </div>
              <div className="w-full md:w-1/2">
                <Image
                  src={summer}
                  alt="Winter in Spiti"
                  className="rounded-2xl w-full h-full p-4 "
                />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
