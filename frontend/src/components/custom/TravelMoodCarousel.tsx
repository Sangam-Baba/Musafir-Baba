"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Mountain, CalendarClock, Users, Heart, Landmark, Backpack, Globe2, User, UsersRound, Briefcase, Sparkles, Wand2, Compass } from "lucide-react";
import type { MoodCategory } from "./TravelMoodSection";

// Cosmetic icon + accent color per category — purely decorative, falls back
// to a generic Compass/orange for any category not in this list (same
// fallback pattern VisaHome.tsx uses for its VISA_METADATA icon map), so a
// newly-created admin category never breaks this carousel, it just gets the
// default look. Colors vary per card on purpose, matching the reference's
// playful multi-color badge language instead of one repeated brand color.
const MOOD_META: Record<string, { icon: typeof Mountain; color: string }> = {
  "mountain-treks": { icon: Mountain, color: "text-sky-600" },
  "weekend-getaways": { icon: CalendarClock, color: "text-rose-500" },
  "family-tours": { icon: Users, color: "text-blue-600" },
  "honeymoon-packages": { icon: Heart, color: "text-pink-500" },
  "religious-tours": { icon: Landmark, color: "text-amber-600" },
  "backpacking-trips": { icon: Backpack, color: "text-emerald-600" },
  "international-tour-packages": { icon: Globe2, color: "text-indigo-600" },
  "solo-trip-packages": { icon: User, color: "text-teal-600" },
  "group-tour-packages": { icon: UsersRound, color: "text-violet-600" },
  "corporate-tour-packages": { icon: Briefcase, color: "text-slate-600" },
  "early-bird": { icon: Sparkles, color: "text-orange-500" },
  "customised-tour-packages": { icon: Wand2, color: "text-fuchsia-600" },
};
const DEFAULT_MOOD_META = { icon: Compass, color: "text-[#FE5300]" };

export default function TravelMoodCarousel({ categories }: { categories: MoodCategory[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollNext = () => {
    scrollerRef.current?.scrollBy({ left: 260, behavior: "smooth" });
  };

  return (
    <div className="max-w-7xl mx-auto relative">
      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((cat) => {
          const { icon: Icon, color } = MOOD_META[cat.slug] ?? DEFAULT_MOOD_META;
          const cardImage = cat.cardImage?.url ? cat.cardImage : cat.coverImage;
          return (
            <Link
              key={cat.id}
              href={`/holidays/${cat.slug}`}
              className="group flex-shrink-0 w-[150px] sm:w-[170px] snap-start"
            >
              <div className="relative h-[190px] sm:h-[210px] rounded-2xl overflow-hidden bg-gray-100">
                {cardImage.url && (
                  <Image
                    src={cardImage.url}
                    alt={cardImage.alt || cat.name}
                    fill
                    sizes="170px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                <span className="absolute left-3 bottom-3 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${color}`} strokeWidth={1.75} />
                </span>
              </div>
              <p className="mt-2 text-[13px] font-semibold text-gray-800 text-center truncate">
                {cat.name}
              </p>
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={scrollNext}
        aria-label="Show more categories"
        className="hidden md:flex absolute top-[95px] -right-4 w-9 h-9 rounded-full bg-white border border-gray-200 shadow-md items-center justify-center text-gray-600 hover:text-[#FE5300] hover:border-[#FE5300]/40 transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
