"use client";

import { useState } from "react";
import Link from "next/link";
import Image, { type StaticImageData } from "next/image";
import { ArrowRight } from "lucide-react";
import IndiaStatesMap, { INDIA_SPOTS } from "./IndiaStatesMap";
import WorldMap, { type WorldSpot } from "./WorldMap";
import jaipur from "../../../public/jaipur.jpg";
import badrinath from "../../../public/badrinath.jpg";
import kashmir from "../../../public/kashmir.jpg";
import himachal from "../../../public/Himachal.jpg";

// Package counts are approximate marketing copy, same pattern as the hero's
// "500+ Tour packages" stat — no per-state package count exists in the
// backend today. Domestic state list mirrors DestinationSection.tsx's
// (duplicated, not imported, to keep this new panel fully isolated).
const DOMESTIC_LIST: { slug: string; label: string; packages: string; image: StaticImageData }[] = [
  { slug: "himachal-pradesh", label: "Himachal Pradesh", packages: "120+ Packages", image: himachal },
  { slug: "uttarakhand", label: "Uttarakhand", packages: "95+ Packages", image: badrinath },
  { slug: "rajasthan", label: "Rajasthan", packages: "85+ Packages", image: jaipur },
  { slug: "kerala", label: "Kerala", packages: "70+ Packages", image: kashmir },
  { slug: "meghalaya", label: "Meghalaya", packages: "55+ Packages", image: himachal },
  { slug: "jammu-and-kashmir", label: "Jammu & Kashmir", packages: "60+ Packages", image: kashmir },
];

const INTERNATIONAL_SPOTS: (WorldSpot & { packages: string })[] = [
  { slug: "singapore", label: "Singapore", packages: "40+ Packages", coordinates: [103.8198, 1.3521], emoji: "🇸🇬" },
  { slug: "dubai", label: "Dubai", packages: "50+ Packages", coordinates: [55.2708, 25.2048], emoji: "🇦🇪" },
  { slug: "bali", label: "Bali", packages: "35+ Packages", coordinates: [115.1889, -8.4095], emoji: "🇮🇩" },
  { slug: "thailand", label: "Thailand", packages: "45+ Packages", coordinates: [100.9925, 15.87], emoji: "🇹🇭" },
  { slug: "japan", label: "Japan", packages: "30+ Packages", coordinates: [138.2529, 36.2048], emoji: "🇯🇵" },
  { slug: "maldives", label: "Maldives", packages: "25+ Packages", coordinates: [73.2207, 3.2028], emoji: "🇲🇻" },
];

export default function ExploreDestinationsPanel() {
  const [tab, setTab] = useState<"india" | "world">("india");
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="bg-[#F4F5FA] rounded-2xl p-5 md:p-6">
      <h3 className="text-[17px] font-semibold text-gray-900">Explore Destinations</h3>

      <div className="flex items-center gap-4 mt-1 mb-4 border-b border-gray-200/70">
        {(["india", "world"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setActive(null); }}
            className={`pb-2 text-[13px] font-semibold capitalize transition-colors relative ${
              tab === t ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t}
            {tab === t && <span className="absolute -bottom-px left-0 w-full h-[2px] bg-gray-900" />}
          </button>
        ))}
      </div>

      {tab === "india" ? (
        /* India: map + vertical list side by side from lg up (unchanged from before) */
        <div className="lg:grid lg:grid-cols-[1.25fr_1fr] lg:gap-5 lg:items-start">
          <div className="rounded-xl overflow-hidden bg-white/50 mb-4 lg:mb-0 w-full aspect-[9/10]">
            <IndiaStatesMap activeSlug={active} onSpotHover={setActive} />
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Popular States
            </p>

            <div className="flex flex-col gap-1.5 mb-4">
              {DOMESTIC_LIST.map((item) => (
                <Link
                  key={item.slug}
                  href={`/destinations/${item.slug}`}
                  onMouseEnter={() => setActive(item.slug)}
                  onMouseLeave={() => setActive(null)}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 border transition-colors ${
                    active === item.slug
                      ? "bg-orange-50 border-[#FE5300]/40 shadow-sm"
                      : "bg-white/60 border-transparent hover:bg-white"
                  }`}
                >
                  <Image src={item.image} alt={item.label} width={30} height={30} className="w-[30px] h-[30px] rounded-md object-cover flex-shrink-0" />
                  <div className="min-w-0">
                    <p className={`text-[12.5px] font-semibold truncate ${active === item.slug ? "text-[#FE5300]" : "text-gray-800"}`}>
                      {item.label}
                    </p>
                    <p className="text-[10.5px] text-gray-400">{item.packages}</p>
                  </div>
                </Link>
              ))}
            </div>

            <Link
              href="/destinations"
              className="flex items-center justify-center gap-1.5 w-full bg-[#FE5300] hover:bg-[#e04800] text-white text-[13px] font-bold py-2.5 rounded-xl transition-colors"
            >
              Explore All Destinations <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* World: full-width larger map on top, list arranged horizontally below */
        <div>
          <div className="rounded-xl overflow-hidden bg-white/50 w-full aspect-[16/10] md:aspect-[2/1] mb-4">
            <WorldMap
              spots={INTERNATIONAL_SPOTS}
              activeSlug={active}
              onSpotHover={setActive}
              center={[97, 12]}
              scale={330}
              width={760}
              height={380}
            />
          </div>

          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Popular Destinations
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {INTERNATIONAL_SPOTS.map((item) => (
              <Link
                key={item.slug}
                href={`/destinations/${item.slug}`}
                onMouseEnter={() => setActive(item.slug)}
                onMouseLeave={() => setActive(null)}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 border transition-colors ${
                  active === item.slug
                    ? "bg-orange-50 border-[#FE5300]/40 shadow-sm"
                    : "bg-white/60 border-transparent hover:bg-white"
                }`}
              >
                <span className="text-[24px] leading-none flex-shrink-0" aria-hidden="true">
                  {item.emoji}
                </span>
                <div className="min-w-0">
                  <p className={`text-[12.5px] font-semibold truncate ${active === item.slug ? "text-[#FE5300]" : "text-gray-800"}`}>
                    {item.label}
                  </p>
                  <p className="text-[10.5px] text-gray-400">{item.packages}</p>
                </div>
              </Link>
            ))}
          </div>

          <Link
            href="/destinations"
            className="flex items-center justify-center gap-1.5 w-full bg-[#FE5300] hover:bg-[#e04800] text-white text-[13px] font-bold py-2.5 rounded-xl transition-colors"
          >
            Explore All Destinations <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
