import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

// Every tile links to a route confirmed live in this app today (see
// src/config/navLinks.ts for the same verification). Flights/Hotels go to
// new, informative-only "coming soon" pages (src/app/(user)/flights,
// .../hotels) rather than a real booking flow — same real WhatsApp/Call
// CTA those pages share with the hero search widget's Flights/Hotels tabs,
// which are left untouched on purpose.
// Real emoji icons (not lucide-in-a-circle) to match the reference design —
// same rendering approach already proven on the map pin badges elsewhere
// on this page (IndiaStatesMap.tsx / WorldMap.tsx).
const TILES = [
  { lead: "I want a", label: "Holiday", href: "/holidays", emoji: "🏝️" },
  { lead: "I need a", label: "Visa", href: "/visa", emoji: "🛂" },
  { lead: "Rent a", label: "Vehicle", href: "/rental", emoji: "🚗" },
  { lead: "Book", label: "Flights", href: "/flights", emoji: "✈️" },
  { lead: "Find", label: "Hotels", href: "/hotels", emoji: "🏨" },
  { lead: "Religious", label: "Tours", href: "/holidays/religious-tours", emoji: "🛕" },
];

export default function QuickServiceTiles() {
  return (
    <section className="w-full px-4 md:px-10 py-8 md:py-10">
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-[32px] leading-tight font-medium text-gray-900">
          What brings <span className="text-[#FE5300]">you here</span> today?
        </h2>
        <p className="text-[14px] md:text-[16px] text-gray-600 mt-1">
          Pick a service and we&apos;ll take it from there.
        </p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {TILES.map((tile) => (
          <Link key={tile.label} href={tile.href} className="block h-full">
            <div className="group flex items-center gap-3 border border-orange-100 hover:border-[#FE5300]/50 hover:shadow-sm rounded-xl p-3.5 sm:p-4 transition-colors">
              <span className="text-[30px] sm:text-[36px] leading-none flex-shrink-0" aria-hidden="true">
                {tile.emoji}
              </span>
              <span className="flex-1 min-w-0 text-[12.5px] sm:text-[13.5px] leading-tight text-gray-500">
                {tile.lead}
                <br />
                <span className="font-bold text-gray-900 text-[13.5px] sm:text-[15px]">{tile.label}</span>
              </span>
              <span className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0 group-hover:bg-[#FE5300] group-hover:border-[#FE5300] group-hover:text-white transition-colors">
                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.25} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
