"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { BedDouble, ChevronLeft, ChevronRight, MapPin, Star } from "lucide-react";

// Compact hotel cards in a package's "Hotels" section: a small photo
// (swipe / arrows) beside name, star rating, location and a short note.
// Never shows a price.

export interface PackageHotelCard {
  name?: string;
  stars?: number;
  location?: string;
  description?: string;
  images?: { url?: string; alt?: string }[];
}

// Only hotels with a name are shown; empty photo slots are skipped
export function usableHotels(hotels?: PackageHotelCard[] | null): PackageHotelCard[] {
  return (hotels ?? []).filter((h) => (h?.name || "").trim());
}

function Photos({ images, name }: { images: { url: string; alt?: string }[]; name: string }) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  const go = (i: number) => {
    const next = (i + images.length) % images.length;
    track.current?.scrollTo({ left: next * (track.current?.clientWidth ?? 0), behavior: "smooth" });
    setIndex(next);
  };

  if (images.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-50 to-gray-100">
        <BedDouble className="h-7 w-7 text-orange-300" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="group relative h-full w-full overflow-hidden bg-gray-100">
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (el.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((img, i) => (
          <div key={`${img.url}-${i}`} className="relative h-full w-full shrink-0 snap-center">
            <Image
              src={img.url}
              alt={img.alt || `${name} photo ${i + 1}`}
              fill
              sizes="160px"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous photo"
            className="absolute left-1 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow transition group-hover:flex"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next photo"
            className="absolute right-1 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow transition group-hover:flex"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Photo ${i + 1}`}
                className={`h-1 rounded-full transition-all ${i === index ? "w-3 bg-white" : "w-1 bg-white/60"}`}
              />
            ))}
          </div>
          <span className="absolute right-1 top-1 rounded-full bg-black/55 px-1.5 py-px text-[10px] font-medium text-white">
            {index + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}

function Stars({ value }: { value: number }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value}-star hotel`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < value ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} aria-hidden="true" />
      ))}
    </div>
  );
}

export default function PackageHotels({ hotels }: { hotels?: PackageHotelCard[] | null }) {
  const list = usableHotels(hotels);
  if (list.length === 0) return null;

  return (
    <div className={`grid grid-cols-1 gap-3 ${list.length > 1 ? "md:grid-cols-2" : "md:max-w-xl"}`}>
      {list.map((h, i) => {
        const name = (h.name || "").trim();
        const images = (h.images ?? []).filter((img): img is { url: string; alt?: string } => !!img?.url);
        const stars = Math.max(0, Math.min(5, Math.round(Number(h.stars) || 0)));
        return (
          <article
            key={`${name}-${i}`}
            className="flex gap-3 overflow-hidden rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Small photo (4:3), swipeable when there are several */}
            <div className="h-[90px] w-[120px] shrink-0 overflow-hidden rounded-lg sm:h-[105px] sm:w-[140px]">
              <Photos images={images} name={name} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[15px] font-bold leading-snug text-gray-900">{name}</h3>
                {stars > 0 && (
                  <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{stars}-Star</span>
                )}
              </div>
              <Stars value={stars} />
              {h.location && (
                <p className="flex items-start gap-1 text-[12px] text-gray-600">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FE5300]" aria-hidden="true" />
                  {h.location}
                </p>
              )}
              {h.description && (
                <p className="line-clamp-2 whitespace-pre-line text-[12.5px] leading-snug text-gray-600" title={h.description}>
                  {h.description}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
