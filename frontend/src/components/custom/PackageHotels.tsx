"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { BedDouble, ChevronLeft, ChevronRight, Expand, Images, MapPin, Star, X } from "lucide-react";

// Hotel cards in a package's "Hotels" section: a photo carousel with
// thumbnails, a full-screen viewer (arrows, swipe, keyboard, thumbnails),
// name, star rating, location and a short note with "Read more".
// Never shows a price.

export interface PackageHotelCard {
  name?: string;
  stars?: number;
  location?: string;
  description?: string;
  images?: { url?: string; alt?: string }[];
}

type Photo = { url: string; alt?: string };

// Only hotels with a name are shown; empty photo slots are skipped
export function usableHotels(hotels?: PackageHotelCard[] | null): PackageHotelCard[] {
  return (hotels ?? []).filter((h) => (h?.name || "").trim());
}

/* ------------------------------------------------------------ viewer */

function PhotoViewer({
  photos,
  start,
  title,
  onClose,
}: {
  photos: Photo[];
  start: number;
  title: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(start);
  const touchX = useRef<number | null>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const go = useCallback((i: number) => setIndex((i + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, onClose]);

  // Stop the page behind from scrolling while the viewer is open
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    thumbs.current?.children[index]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index]);

  const photo = photos[index];
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} photos`}
      className="fixed inset-0 z-[1000] flex flex-col bg-black/95 text-white backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold">{title}</p>
          <p className="text-[12px] text-white/60">
            Photo {index + 1} of {photos.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        className="relative flex-1"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const start = touchX.current;
          const end = e.changedTouches[0]?.clientX;
          if (start != null && end != null && Math.abs(end - start) > 50) go(end < start ? index + 1 : index - 1);
          touchX.current = null;
        }}
      >
        {photo && (
          <Image
            key={photo.url}
            src={photo.url}
            alt={photo.alt || `${title} photo ${index + 1}`}
            fill
            sizes="100vw"
            className="object-contain p-2 sm:p-6"
            priority
          />
        )}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/30 sm:left-6"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/30 sm:right-6"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div
          ref={thumbs}
          className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {photos.map((p, i) => (
            <button
              key={`${p.url}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition ${
                i === index ? "ring-2 ring-[#FE5300] ring-offset-2 ring-offset-black" : "opacity-50 hover:opacity-90"
              }`}
            >
              <Image src={p.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

/* ---------------------------------------------------------- carousel */

function Carousel({ photos, name, stars, onOpen }: { photos: Photo[]; name: string; stars: number; onOpen: (i: number) => void }) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  const go = (i: number) => {
    const next = (i + photos.length) % photos.length;
    track.current?.scrollTo({ left: next * (track.current?.clientWidth ?? 0), behavior: "smooth" });
    setIndex(next);
  };

  const starBadge = stars > 0 && (
    <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11.5px] font-semibold text-white backdrop-blur-md">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" /> {stars}-Star
    </span>
  );

  if (photos.length === 0) {
    return (
      <div className="relative flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-orange-50 via-amber-50 to-gray-100">
        {starBadge}
        <BedDouble className="h-10 w-10 text-orange-300" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div>
      <div className="group/photo relative aspect-[16/10] overflow-hidden bg-gray-100">
        {starBadge}
        <div
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((p, i) => (
            <button
              key={`${p.url}-${i}`}
              type="button"
              onClick={() => onOpen(i)}
              aria-label={`View ${name} photo ${i + 1} larger`}
              className="relative h-full w-full shrink-0 snap-center cursor-zoom-in"
            >
              <Image
                src={p.url}
                alt={p.alt || `${name} photo ${i + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 400px"
                className="object-cover transition-transform duration-500 group-hover/photo:scale-105"
              />
            </button>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />

        <button
          type="button"
          onClick={() => onOpen(index)}
          className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11.5px] font-semibold text-gray-900 shadow transition hover:bg-white"
        >
          {photos.length > 1 ? <Images className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
          {photos.length > 1 ? `${index + 1}/${photos.length}` : "View"}
        </button>

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 opacity-0 shadow transition group-hover/photo:opacity-100 max-md:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 opacity-0 shadow transition group-hover/photo:opacity-100 max-md:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-4 left-3 z-10 flex gap-1">
              {photos.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/60"}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-3 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {photos.map((p, i) => (
            <button
              key={`${p.url}-thumb-${i}`}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}`}
              className={`relative h-10 w-14 shrink-0 overflow-hidden rounded-md transition ${
                i === index ? "ring-2 ring-[#FE5300] ring-offset-1" : "opacity-60 hover:opacity-100"
              }`}
            >
              <Image src={p.url} alt="" fill sizes="56px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- card */

function HotelCard({ hotel }: { hotel: PackageHotelCard }) {
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const name = (hotel.name || "").trim();
  const photos = (hotel.images ?? []).filter((img): img is Photo => !!img?.url);
  const stars = Math.max(0, Math.min(5, Math.round(Number(hotel.stars) || 0)));
  const description = (hotel.description || "").trim();
  const long = description.length > 120;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-gray-200/80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(15,23,42,0.35)]">
      <Carousel photos={photos} name={name} stars={stars} onOpen={setViewerAt} />

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-[16px] font-bold leading-snug text-gray-900">{name}</h3>
        {stars > 0 && (
          <div className="flex items-center gap-0.5" aria-label={`${stars}-star hotel`}>
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} className={`h-3.5 w-3.5 ${i < stars ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} aria-hidden="true" />
            ))}
          </div>
        )}
        {hotel.location && (
          <p className="flex items-start gap-1.5 text-[12.5px] leading-snug text-gray-500">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FE5300]" aria-hidden="true" />
            <span className="line-clamp-2">{hotel.location}</span>
          </p>
        )}
        {description && (
          <div className="mt-1 border-t border-dashed border-gray-200 pt-2.5">
            <p className={`whitespace-pre-line text-[13px] leading-relaxed text-gray-600 ${expanded ? "" : "line-clamp-3"}`}>{description}</p>
            {long && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-[12.5px] font-semibold text-[#FE5300] hover:underline"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}
      </div>

      {viewerAt !== null && photos.length > 0 && (
        <PhotoViewer photos={photos} start={viewerAt} title={name} onClose={() => setViewerAt(null)} />
      )}
    </article>
  );
}

export default function PackageHotels({ hotels }: { hotels?: PackageHotelCard[] | null }) {
  const list = usableHotels(hotels);
  if (list.length === 0) return null;

  return (
    <div className={`grid grid-cols-1 gap-5 ${list.length > 1 ? "sm:grid-cols-2" : "sm:max-w-md"}`}>
      {list.map((h, i) => (
        <HotelCard key={`${h.name}-${i}`} hotel={h} />
      ))}
    </div>
  );
}
