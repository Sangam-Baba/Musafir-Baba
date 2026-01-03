"use client";
import React, { useEffect, useState } from "react";
import Hero from "@/components/custom/Hero";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { DestinationInterface } from "@/app/(user)/destinations/page";
import { Search } from "lucide-react";
function DestinationPageClient({
  destinations,
}: {
  destinations: DestinationInterface[];
}) {
  const [filter, setFilter] = useState("");
  const [filteredDestinations, setFilteredDestinations] =
    useState(destinations);

  useEffect(() => {
    const filtered = destinations.filter(
      (destination: DestinationInterface) => {
        return (
          destination.country.toLowerCase().includes(filter.toLowerCase()) ||
          destination.state.toLowerCase().includes(filter.toLowerCase()) ||
          destination.name.toLowerCase().includes(filter.toLowerCase())
        );
      }
    );
    setFilteredDestinations(filtered);
  }, [filter, destinations]);
  return (
    <section className="flex flex-col">
      <div className="relative">
        <Hero
          image="/Heroimg.jpg"
          title="Destinations"
          align="center"
          height="lg"
          overlayOpacity={100}
        />
        <div className="z-10 absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-[50%] lg:w-[35%]">
          <div
            className="
      flex items-center gap-3
      backdrop-blur-md bg-white/15 
      border border-[#FE5300]/50 
      shadow-lg rounded-full
      px-6 py-3 
      transition-all duration-300
      hover:bg-white/25
    "
          >
            <Search className="w-6 h-6 text-white" />

            <input
              placeholder="Search city, state or country..."
              onChange={(e) => setFilter(e.target.value)}
              className="
        flex-1 text-white text-lg bg-transparent border-none 
        placeholder:text-white/70 focus:ring-0 focus:outline-none
      "
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-16 px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mt-6">
          {filteredDestinations.map(
            (destination: DestinationInterface, i: number) => (
              <Link
                key={i}
                href={`/destinations/${destination.state}`}
                className="block" // Add this to make Link block-level
              >
                <Card
                  className="pt-0 group overflow-hidden rounded-2xl border 
            shadow-md hover:shadow-xl 
            transition-all duration-500
            hover:-translate-y-1 cursor-pointer"
                >
                  <div className="relative overflow-hidden pointer-events-none">
                    {" "}
                    {/* Add pointer-events-none */}
                    <Image
                      src={destination?.coverImage?.url ?? "/Heroimg.jpg"}
                      alt={destination?.coverImage?.alt ?? "Destination image"}
                      width={200}
                      height={500}
                      className="w-full h-32 object-cover 
                transition-transform duration-700
                group-hover:scale-110"
                      draggable={false} // Prevent image drag interfering with click
                    />
                  </div>

                  <CardContent className="pointer-events-none">
                    {" "}
                    {/* Add pointer-events-none */}
                    <p className="text-sm font-semibold text-center tracking-wide">
                      {destination?.name}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          )}
        </div>
      </div>
    </section>
  );
}

export default DestinationPageClient;
