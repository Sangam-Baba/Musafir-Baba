"use client";
import { useEffect, useState } from "react";
import Hero from "@/components/custom/Hero";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { DestinationInterface } from "@/app/(user)/destinations/page";
import { Search } from "lucide-react";
import ReadMore from "@/components/common/ReadMore";
import Breadcrumb from "@/components/common/Breadcrumb";
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

  const content = `

<p>
  Choosing the right destination is the foundation of every great journey.
  At MusafirBaba, our Destinations page is curated to help travelers explore
  <strong>India’s most loved regions and top international hotspots</strong>,
  backed by practical planning insights.
</p>

<p>
  This page acts as a gateway to destinations suited for every travel style—family holidays,
  romantic escapes, group tours, spiritual journeys, and adventure trips.
</p>

<h3>Explore Indian Travel Destinations</h3>

<p>
  India offers unmatched diversity—from the Himalayas to tropical beaches,
  deserts to rainforests, and ancient temples to modern cities.
  Our destination collection covers:
</p>

<ul>
  <li>Hill stations and mountain regions</li>
  <li>Spiritual and pilgrimage circuits</li>
  <li>Coastal and island destinations</li>
  <li>Heritage cities and cultural hubs</li>
  <li>Wildlife and nature retreats</li>
</ul>

<p>Each destination page is designed to help travelers understand:</p>

<ul>
  <li>What makes the place special</li>
  <li>Best time to visit</li>
  <li>Key attractions</li>
  <li>Ideal trip duration</li>
  <li>Travel suitability by season</li>
</ul>

<h3>International Destinations From India</h3>

<p>
  For travelers looking beyond borders, MusafirBaba features carefully selected
  international destinations that are popular, accessible, and travel-friendly from India.
</p>

<p>These include:</p>

<ul>
  <li>Short-haul destinations in Asia and the Middle East</li>
  <li>Honeymoon-friendly island nations</li>
  <li>Culture-rich countries</li>
  <li>Visa-friendly international locations</li>
</ul>

<p>
  Our destination insights help travellers plan international trips with clarity—especially
  regarding travel seasons, entry requirements, and overall experience expectations.
</p>

<h3>Destination Categories For Every Traveler</h3>

<p>
  Not all travelers look for the same experience. That’s why destinations are also structured
  around travel intent:
</p>

<ul>
  <li>Family-friendly destinations with comfort and safety</li>
  <li>Honeymoon destinations offering privacy and romance</li>
  <li>Group tour destinations with shared experiences</li>
  <li>Backpacking regions for budget-conscious explorers</li>
  <li>Religious destinations for spiritual journeys</li>
</ul>

<p>
  This approach ensures travellers find destinations that match their purpose—not just popularity.
</p>

<h3>How To Choose The Right Destination</h3>

<p>When selecting a destination, travelers should consider:</p>

<ul>
  <li>Time available</li>
  <li>Season and weather</li>
  <li>Budget range</li>
  <li>Travel companions</li>
  <li>Experience expectations</li>
</ul>

<p>
  Our destination pages are written to answer these exact considerations,
  helping travelers avoid mismatched planning.
</p>

<h3>Expert-Curated &amp; Continuously Updated</h3>

<p>Travel trends evolve. That’s why our destination content is:</p>

<ul>
  <li>Regularly reviewed</li>
  <li>Updated with new experiences</li>
  <li>Aligned with current travel conditions</li>
  <li>Structured for easy comparison</li>
</ul>

<h3>Planning Support Beyond Inspiration</h3>

<p>Each destination connects naturally to:</p>

<ul>
  <li>Tour categories</li>
  <li>Travel guides</li>
  <li>Blog insights</li>
  <li>Practical planning pages</li>
</ul>
`;
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
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      {/* SHow description */}

      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-8 lg:px-10 mt-10">
        <ReadMore content={content} />
      </div>

      <div className="max-w-7xl mx-auto py-16 px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mt-6">
          {filteredDestinations.map(
            (destination: DestinationInterface, i: number) => (
              <Link
                key={destination._id}
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
                      className="w-full h-32 object-cover"
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
