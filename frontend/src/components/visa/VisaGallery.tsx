"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Expand, Images, X } from "lucide-react";

interface GalleryImage {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

const DESKTOP_TILES = 5;

// Bento layout classes for the desktop grid, keyed by how many tiles are shown.
const tileClass = (index: number, shown: number) => {
  if (shown === 1) return "col-span-4 row-span-2";
  if (shown === 2) return "col-span-2 row-span-2";
  if (index === 0) return "col-span-2 row-span-2";
  if (shown === 3) return "col-span-2 row-span-1";
  if (shown === 4) return index === 1 ? "col-span-2 row-span-1" : "col-span-1 row-span-1";
  return "col-span-1 row-span-1";
};

function Lightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: GalleryImage[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const total = images.length;
  const touchX = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  const prev = useCallback(() => onIndex((index - 1 + total) % total), [index, total, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % total), [index, total, onIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, onClose]);

  // Lock page scroll while open, restore whatever it was before.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Keep the active thumbnail visible (scrolls only the strip, never the page).
  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = strip?.children[index] as HTMLElement | undefined;
    if (strip && thumb) {
      strip.scrollTo({ left: thumb.offsetLeft - strip.clientWidth / 2 + thumb.clientWidth / 2, behavior: "smooth" });
    }
  }, [index]);

  const current = images[index];
  const neighbours = total > 1 ? [images[(index + 1) % total], images[(index - 1 + total) % total]] : [];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image gallery"
      className="fixed inset-0 z-[1000] bg-black/95 flex flex-col animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white/90 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm font-medium tabular-nums">
          {index + 1} / {total}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close gallery"
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Stage */}
      <div
        className="relative flex-1 min-h-0 mx-2 md:mx-16"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) (dx > 0 ? prev : next)();
          touchX.current = null;
        }}
      >
        <Image
          key={current.url}
          src={current.url}
          alt={current.alt || current.caption || "Gallery image"}
          fill
          sizes="100vw"
          quality={80}
          className="object-contain select-none animate-in fade-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
          priority
        />
        {/* Preload neighbours so next/prev feel instant */}
        {neighbours.map((img) => (
          <Image key={`pre-${img.url}`} src={img.url} alt="" fill sizes="100vw" quality={80} className="hidden" loading="eager" />
        ))}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous image"
              className="hidden md:flex absolute -left-14 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="Next image"
              className="hidden md:flex absolute -right-14 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white items-center justify-center transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Caption + thumbnails */}
      <div className="shrink-0 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        <p className="text-center text-white/90 text-sm min-h-[20px] mb-3 line-clamp-2">{current.caption || current.alt || ""}</p>
        {total > 1 && (
          <>
            <div ref={thumbsRef} className="hidden md:flex gap-2 overflow-x-auto no-scrollbar justify-center-safe max-w-4xl mx-auto">
              {images.map((img, i) => (
                <button
                  key={img.url + i}
                  type="button"
                  onClick={() => onIndex(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`relative w-16 h-12 shrink-0 rounded-md overflow-hidden transition-all ${
                    i === index ? "ring-2 ring-[#FE5300] opacity-100" : "opacity-50 hover:opacity-90"
                  }`}
                >
                  <Image src={img.url} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
            {/* Mobile: dots + swipe hint instead of thumbnails */}
            <div className="flex md:hidden justify-center gap-1.5 flex-wrap max-w-[80vw] mx-auto">
              {images.slice(0, 15).map((img, i) => (
                <span
                  key={img.url + i}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-[#FE5300]" : "w-1.5 bg-white/40"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function VisaGallery({ images, country }: { images?: GalleryImage[]; country?: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const list = (images || []).filter((img) => img?.url);
  if (list.length === 0) return null;

  const shown = Math.min(list.length, DESKTOP_TILES);
  const remaining = list.length - shown;
  const label = country ? `${country} visa gallery image` : "Visa gallery image";

  return (
    <div>
      <div className="flex items-end justify-between gap-3 mb-5">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-bold font-heading text-black">{country ? `${country} Gallery` : "Gallery"}</h2>
          <div className="w-12 h-1 bg-[#FE5300]"></div>
        </div>
        {list.length > 1 && (
          <button
            type="button"
            onClick={() => setOpenIndex(0)}
            className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-[#FE5300] hover:text-[#e44a00] transition-colors shrink-0"
          >
            <Images className="w-4 h-4" /> View all {list.length}
          </button>
        )}
      </div>

      {/* Mobile: swipeable strip */}
      <div className="md:hidden -mx-4 px-4 flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-3 pb-1">
        {list.map((img, i) => (
          <button
            key={img.url + i}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="relative shrink-0 snap-center w-[82vw] aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 shadow-sm"
            aria-label={`Open image ${i + 1} of ${list.length}`}
          >
            <Image
              src={img.url}
              alt={img.alt || img.caption || label}
              fill
              sizes="82vw"
              quality={75}
              className="object-cover"
            />
            <span className="absolute top-2.5 right-2.5 text-[11px] font-semibold text-white bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 tabular-nums">
              {i + 1}/{list.length}
            </span>
            {img.caption && (
              <span className="absolute inset-x-0 bottom-0 p-3 pt-8 text-left text-white text-xs font-medium bg-gradient-to-t from-black/70 to-transparent line-clamp-2">
                {img.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Desktop: bento grid */}
      <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-3 h-[380px] lg:h-[420px]">
        {list.slice(0, shown).map((img, i) => {
          const isLast = i === shown - 1 && remaining > 0;
          const isFeatured = shown <= 2 || i === 0;
          return (
            <button
              key={img.url + i}
              type="button"
              onClick={() => setOpenIndex(i)}
              className={`group relative overflow-hidden rounded-2xl bg-gray-100 ${tileClass(i, shown)}`}
              aria-label={isLast ? `View all ${list.length} images` : `Open image ${i + 1} of ${list.length}`}
            >
              <Image
                src={img.url}
                alt={img.alt || img.caption || label}
                fill
                sizes={isFeatured ? "(max-width: 1280px) 50vw, 560px" : "(max-width: 1280px) 25vw, 280px"}
                quality={75}
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {img.caption && !isLast && (
                <span className="absolute inset-x-0 bottom-0 p-3 text-left text-white text-sm font-medium translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 line-clamp-2">
                  {img.caption}
                </span>
              )}
              {!isLast && (
                <span className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 text-gray-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Expand className="w-4 h-4" />
                </span>
              )}
              {isLast && (
                <span className="absolute inset-0 bg-black/55 group-hover:bg-black/65 transition-colors flex flex-col items-center justify-center text-white">
                  <span className="text-2xl font-bold">+{remaining}</span>
                  <span className="text-xs font-medium">View all</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {openIndex !== null && (
        <Lightbox images={list} index={openIndex} onIndex={setOpenIndex} onClose={() => setOpenIndex(null)} />
      )}
    </div>
  );
}
