"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ArrowRight, Search, X } from "lucide-react";
import type { WorldSpot } from "./WorldMap";

const IndiaStatesMap = dynamic(() => import("./IndiaStatesMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full animate-pulse bg-gray-100/60 rounded-xl" />,
});

const WorldMap = dynamic(() => import("./WorldMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full animate-pulse bg-gray-100/60 rounded-xl" />,
});

interface DomesticDestination {
  slug: string;
  label: string;
  packages: string;
  image: string;
}

const DOMESTIC_LIST: DomesticDestination[] = [
  { slug: "himachal-pradesh", label: "Himachal Pradesh", packages: "120+ Packages", image: "https://cdn.musafirbaba.com/images/nuj2rqst9gyjzyoq1uj5.jpg" },
  { slug: "uttarakhand", label: "Uttarakhand", packages: "95+ Packages", image: "https://cdn.musafirbaba.com/images/ygyz1jarqcws8hvatffi.avif" },
  { slug: "rajasthan", label: "Rajasthan", packages: "85+ Packages", image: "https://cdn.musafirbaba.com/images/zcr4ejva4nhyoo96wlad.avif" },
  { slug: "kerala", label: "Kerala", packages: "70+ Packages", image: "https://cdn.musafirbaba.com/images/i5eqj70litl7vlahk3u8.jpg" },
  { slug: "goa", label: "Goa", packages: "65+ Packages", image: "https://cdn.musafirbaba.com/images/1767601833519-goa-overview.avif" },
  { slug: "jammu-and-kashmir", label: "Jammu & Kashmir", packages: "60+ Packages", image: "https://cdn.musafirbaba.com/images/iezoy6gyql6ridn3xf8c.jpg" },
  { slug: "ladakh", label: "Ladakh", packages: "50+ Packages", image: "https://cdn.musafirbaba.com/images/onr8bqd8h8mj7fpi4duz.jpg" },
  { slug: "meghalaya", label: "Meghalaya", packages: "55+ Packages", image: "https://cdn.musafirbaba.com/images/lc0anetdtqncqlwvaoza.jpg" },
  { slug: "sikkim", label: "Sikkim", packages: "45+ Packages", image: "https://cdn.musafirbaba.com/images/rvgiqkfdnjr2u6fk1xv3.jpg" },
  { slug: "karnataka", label: "Karnataka", packages: "40+ Packages", image: "https://cdn.musafirbaba.com/images/or9cortgyvxl6vggumez.jpg" },
  { slug: "maharashtra", label: "Maharashtra", packages: "45+ Packages", image: "https://cdn.musafirbaba.com/images/1767602904757-full-day-mumbai-city-tour-with-bollywood-tour_qub3g.jpeg" },
  { slug: "gujarat", label: "Gujarat", packages: "35+ Packages", image: "https://cdn.musafirbaba.com/images/fhq32gyq4xipuilethzl.jpg" },
  { slug: "madhya-pradesh", label: "Madhya Pradesh", packages: "35+ Packages", image: "https://cdn.musafirbaba.com/images/qjdczurug2fhux5tobvy.webp" },
  { slug: "andaman-nicobar", label: "Andaman & Nicobar", packages: "40+ Packages", image: "https://cdn.musafirbaba.com/images/eudepzlumyhxom24f2xk.webp" },
  { slug: "uttar-pradesh", label: "Uttar Pradesh", packages: "50+ Packages", image: "https://cdn.musafirbaba.com/images/fkncdwzn2kbhwghk4lrw.jpg" },
  { slug: "delhi", label: "Delhi", packages: "30+ Packages", image: "https://cdn.musafirbaba.com/images/ep8bluwaihckizxrsup5.jpg" },
  { slug: "punjab", label: "Punjab", packages: "25+ Packages", image: "https://cdn.musafirbaba.com/images/mghwi3wnpnw7mx200dbz.jpg" },
  { slug: "tamil-nadu", label: "Tamil Nadu", packages: "30+ Packages", image: "https://cdn.musafirbaba.com/images/1767468499830-photo-1602216056096-3b40cc0c9944.jpg" },
  { slug: "west-bengal", label: "West Bengal", packages: "35+ Packages", image: "https://cdn.musafirbaba.com/images/mflezjaa6pc1ihgynywz.jpg" },
  { slug: "assam", label: "Assam", packages: "30+ Packages", image: "https://cdn.musafirbaba.com/images/hbksqnbkrgd1uxmnzxu4.jpg" },
  { slug: "arunachal-pradesh", label: "Arunachal Pradesh", packages: "20+ Packages", image: "https://cdn.musafirbaba.com/images/ayntvrb8wakemxdllffb.jpg" },
  { slug: "nagaland", label: "Nagaland", packages: "15+ Packages", image: "https://cdn.musafirbaba.com/images/zkzmp0opz0xeibjyth12.jpg" },
  { slug: "manipur", label: "Manipur", packages: "15+ Packages", image: "https://cdn.musafirbaba.com/media/1787572744762-Untitled design (18).avif" },
];

const INTERNATIONAL_SPOTS: (WorldSpot & { packages: string })[] = [
  { slug: "dubai", label: "Dubai", packages: "50+ Packages", coordinates: [55.2708, 25.2048], emoji: "🇦🇪" },
  { slug: "abu-dhabi", label: "Abu Dhabi", packages: "30+ Packages", coordinates: [54.3773, 24.4539], emoji: "🇦🇪" },
  { slug: "singapore", label: "Singapore", packages: "40+ Packages", coordinates: [103.8198, 1.3521], emoji: "🇸🇬" },
  { slug: "thailand", label: "Thailand", packages: "45+ Packages", coordinates: [100.9925, 15.87], emoji: "🇹🇭" },
  { slug: "indonesia", label: "Indonesia", packages: "35+ Packages", coordinates: [115.1889, -8.4095], emoji: "🇮🇩" },
  { slug: "vietnam", label: "Vietnam", packages: "30+ Packages", coordinates: [108.2772, 14.0583], emoji: "🇻🇳" },
  { slug: "malaysia", label: "Malaysia", packages: "35+ Packages", coordinates: [101.9758, 4.2105], emoji: "🇲🇾" },
  { slug: "maldives", label: "Maldives", packages: "25+ Packages", coordinates: [73.2207, 3.2028], emoji: "🇲🇻" },
  { slug: "japan", label: "Japan", packages: "30+ Packages", coordinates: [138.2529, 36.2048], emoji: "🇯🇵" },
  { slug: "bhutan", label: "Bhutan", packages: "20+ Packages", coordinates: [90.4336, 27.5142], emoji: "🇧🇹" },
  { slug: "turkey", label: "Turkey", packages: "25+ Packages", coordinates: [35.2433, 38.9637], emoji: "🇹🇷" },
  { slug: "georgia", label: "Georgia", packages: "20+ Packages", coordinates: [43.3569, 42.3154], emoji: "🇬🇪" },
  { slug: "armenia", label: "Armenia", packages: "15+ Packages", coordinates: [45.0382, 40.0691], emoji: "🇦🇲" },
  { slug: "jordan", label: "Jordan", packages: "15+ Packages", coordinates: [36.2384, 30.5852], emoji: "🇯🇴" },
  { slug: "oman", label: "Oman", packages: "20+ Packages", coordinates: [57.5167, 21.4735], emoji: "🇴🇲" },
  { slug: "saudi-arabia", label: "Saudi Arabia", packages: "25+ Packages", coordinates: [45.0792, 23.8859], emoji: "🇸🇦" },
  { slug: "china", label: "China", packages: "20+ Packages", coordinates: [104.1954, 35.8617], emoji: "🇨🇳" },
  { slug: "korea", label: "Korea", packages: "20+ Packages", coordinates: [127.7669, 35.9078], emoji: "🇰🇷" },
];

export default function ExploreDestinationsPanel() {
  const [tab, setTab] = useState<"india" | "world">("india");
  const [active, setActive] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredDomestic = useMemo(() => {
    if (!searchQuery.trim()) return DOMESTIC_LIST;
    const q = searchQuery.toLowerCase().trim();
    return DOMESTIC_LIST.filter(
      (item) => item.label.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredInternational = useMemo(() => {
    if (!searchQuery.trim()) return INTERNATIONAL_SPOTS;
    const q = searchQuery.toLowerCase().trim();
    return INTERNATIONAL_SPOTS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="bg-[#F4F5FA] rounded-2xl p-5 md:p-6 shadow-xs border border-gray-100">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[18px] font-bold text-gray-900 tracking-tight">Explore Destinations</h3>
          <p className="text-[12px] text-gray-500 mt-0.5">Interactive map & popular travel packages</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-200/70 p-1 rounded-xl">
            {(["india", "world"] as const).map((t) => {
              const isSelected = tab === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTab(t);
                    setActive(null);
                    setSearchQuery("");
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-bold capitalize transition-all cursor-pointer ${
                    isSelected
                      ? "bg-white text-gray-900 shadow-xs"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {t === "india" ? "India" : "World"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {tab === "india" ? (
        /* India: Interactive Map on Left, Full Searchable States List on Right */
        <div className="lg:grid lg:grid-cols-[1.15fr_1fr] lg:gap-6 lg:items-start">
          <div className="rounded-2xl overflow-hidden bg-white/70 border border-gray-100/80 mb-4 lg:mb-0 w-full aspect-[9/10] shadow-xs flex items-center justify-center p-2">
            <IndiaStatesMap activeSlug={active} onSpotHover={setActive} />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  All Travel States
                </span>
                <span className="text-[10.5px] font-bold text-[#FE5300] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/70">
                  {DOMESTIC_LIST.length} Available
                </span>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search state (e.g. Goa, Kerala, Sikkim)..."
                className="w-full bg-white text-[12.5px] text-gray-800 placeholder-gray-400 pl-8.5 pr-8 py-2 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#FE5300] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Scrollable list */}
            <div className="max-h-[300px] overflow-y-auto pr-1 flex flex-col gap-1.5 mb-4 scrollbar-thin scrollbar-thumb-gray-200">
              {filteredDomestic.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-[12.5px]">
                  No destinations found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredDomestic.map((item) => {
                  const isHovered = active === item.slug;
                  return (
                    <Link
                      key={item.slug}
                      href={`/destinations/${item.slug}`}
                      onMouseEnter={() => setActive(item.slug)}
                      onMouseLeave={() => setActive(null)}
                      className={`flex items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 border transition-all cursor-pointer ${
                        isHovered
                          ? "bg-orange-50 border-[#FE5300]/50 shadow-xs translate-x-0.5"
                          : "bg-white/80 border-gray-100 hover:bg-white hover:border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative w-[32px] h-[32px] rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                          <Image
                            src={item.image}
                            alt={item.label}
                            fill
                            sizes="32px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-[12.5px] font-bold truncate leading-tight ${
                              isHovered ? "text-[#FE5300]" : "text-gray-800"
                            }`}
                          >
                            {item.label}
                          </p>
                          <p className="text-[10.5px] text-gray-500 font-medium">
                            {item.packages}
                          </p>
                        </div>
                      </div>

                      <ArrowRight
                        className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${
                          isHovered ? "text-[#FE5300] translate-x-0.5" : "text-gray-300"
                        }`}
                      />
                    </Link>
                  );
                })
              )}
            </div>

            <Link
              href="/destinations"
              className="flex items-center justify-center gap-1.5 w-full bg-[#FE5300] hover:bg-[#e04800] active:scale-[0.99] text-white text-[13px] font-bold py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Explore All Destinations <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* World: Full-width Map on top, searchable grid below */
        <div>
          <div className="rounded-2xl overflow-hidden bg-white/70 border border-gray-100/80 w-full aspect-[16/9] md:aspect-[2.2/1] mb-4 shadow-xs flex items-center justify-center p-2">
            <WorldMap
              spots={INTERNATIONAL_SPOTS}
              activeSlug={active}
              onSpotHover={setActive}
              center={[75, 20]}
              scale={230}
              width={760}
              height={380}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                All Global Destinations
              </span>
              <span className="text-[10.5px] font-bold text-[#FE5300] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/70">
                {INTERNATIONAL_SPOTS.length} Available
              </span>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search global destination..."
                className="w-full bg-white text-[12.5px] text-gray-800 placeholder-gray-400 pl-8.5 pr-8 py-1.5 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#FE5300] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-3 pt-1 mb-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            {filteredInternational.length === 0 ? (
              <div className="w-full py-6 text-center text-gray-400 text-[12.5px]">
                No destinations found matching &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredInternational.map((item) => {
                const isHovered = active === item.slug;
                return (
                  <Link
                    key={item.slug}
                    href={`/destinations/${item.slug}`}
                    onMouseEnter={() => setActive(item.slug)}
                    onMouseLeave={() => setActive(null)}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border transition-all cursor-pointer flex-shrink-0 min-w-[165px] ${
                      isHovered
                        ? "bg-orange-50 border-[#FE5300]/50 shadow-xs scale-[1.02]"
                        : "bg-white/80 border-gray-100 hover:bg-white hover:border-gray-200"
                    }`}
                  >
                    <span className="text-[22px] leading-none flex-shrink-0" aria-hidden="true">
                      {item.emoji}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`text-[12.5px] font-bold truncate leading-tight ${
                          isHovered ? "text-[#FE5300]" : "text-gray-800"
                        }`}
                      >
                        {item.label}
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium">{item.packages}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <Link
            href="/destinations"
            className="flex items-center justify-center gap-1.5 w-full bg-[#FE5300] hover:bg-[#e04800] active:scale-[0.99] text-white text-[13px] font-bold py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Explore All Destinations <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
