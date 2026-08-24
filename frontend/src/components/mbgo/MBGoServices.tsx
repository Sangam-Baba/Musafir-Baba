import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

function CarFrontIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.64 5H8.36a2 2 0 0 0-1.86 1.3L5 10l-2-2" />
      <path d="M4 14v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h10v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4" />
      <rect width="18" height="8" x="3" y="10" rx="2" />
      <circle cx="7" cy="14" r="1" fill="currentColor" />
      <circle cx="17" cy="14" r="1" fill="currentColor" />
    </svg>
  );
}

function RoadHighwayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 19L9 5" />
      <path d="M20 19L15 5" />
      <line x1="12" y1="5" x2="12" y2="8" strokeDasharray="1 1" />
      <line x1="12" y1="11" x2="12" y2="14" strokeDasharray="1 1" />
      <line x1="12" y1="17" x2="12" y2="20" strokeDasharray="1 1" />
    </svg>
  );
}

function PlaneTiltedIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
    </svg>
  );
}

function CalendarBadgeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <circle cx="8" cy="14" r="1" fill="currentColor" />
      <circle cx="12" cy="14" r="1" fill="currentColor" />
      <circle cx="16" cy="14" r="1" fill="currentColor" />
    </svg>
  );
}

const SERVICES = [
  {
    id: "local-rides",
    title: "Local Rides",
    badgeIcon: CarFrontIcon,
    image: "/partner/ser1.avif",
    description: "Travel within the city with comfort and ease.",
    actionText: "Book Local Ride",
  },
  {
    id: "outstation-trips",
    title: "Outstation Trips",
    badgeIcon: RoadHighwayIcon,
    image: "/partner/ser2.avif",
    description: "One way or round trip to your favourite destinations.",
    actionText: "Book Outstation",
  },
  {
    id: "airport-transfers",
    title: "Airport Transfers",
    badgeIcon: PlaneTiltedIcon,
    image: "/partner/ser3.avif",
    description: "Punctual pickups and drops for a stress-free journey.",
    actionText: "Book Airport Cab",
  },
  {
    id: "car-rentals",
    title: "Car Rentals",
    badgeIcon: CalendarBadgeIcon,
    image: "/partner/ser4.avif",
    description: "Self drive or chauffeur driven cars on rent.",
    actionText: "Explore Rentals",
  },
];

export default function MBGoServices() {
  return (
    <section id="services" className="w-full px-4 md:px-8 py-16 md:py-24 bg-white scroll-mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <div className="text-center mb-14 md:mb-18">
          <h2 className="text-2xl sm:text-3xl md:text-[34px] font-bold text-gray-900 tracking-tight">
            Services We Offer
          </h2>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6 lg:gap-7">
          {SERVICES.map((item) => {
            const BadgeIcon = item.badgeIcon;
            return (
              <div
                key={item.id}
                className="relative bg-white rounded-2xl md:rounded-[22px] border border-gray-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_32px_rgba(254,83,0,0.12)] hover:border-orange-200 transition-all duration-300 flex flex-col group p-4 sm:p-5 pt-7"
              >
                {/* Floating Top Yellow Circular Badge centered on card header */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-[#FFC837] text-gray-950 flex items-center justify-center shadow-md border-4 border-white transition-transform duration-300 group-hover:scale-110">
                  <BadgeIcon className="w-5 h-5" />
                </div>

                {/* Card Visual Image */}
                <div className="relative w-full h-36 sm:h-40 rounded-xl overflow-hidden bg-gray-50 mb-4 flex-shrink-0">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Card Title & Description */}
                <h3 className="text-lg md:text-[18.5px] font-bold text-gray-900 tracking-tight leading-snug">
                  {item.title}
                </h3>
                <p className="text-[13px] sm:text-[13.5px] text-gray-500 leading-relaxed mt-1.5 mb-5 flex-1">
                  {item.description}
                </p>

                {/* Action Link scrolling smoothly to Search Widget */}
                <a
                  href="#top"
                  className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[#FE5300] hover:text-[#d44500] transition-colors group-hover:translate-x-1 duration-200 pt-2 border-t border-gray-100"
                >
                  <span>{item.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
