"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { BedDouble, ChevronDown, Flag, Lightbulb, MapPin, Route } from "lucide-react";

export interface ItineraryJourneyItem {
  title: string;
  description: string;
  locationImage?: { url?: string; alt?: string } | null;
  tip?: string | null;
}

// Leading emoji in a title, e.g. "🌲 Day 1: ..." -> "🌲"
const LEADING_EMOJI = /^\s*((?:\p{Extended_Pictographic}|\p{Regional_Indicator}|‍|️)+)\s*/u;
// Lines like "⛺ Overnight Camping at Bakarthach" / "Overnight stay in Manali"
const STAY_LINE = /\b(overnight|night stay|stay at|stay in)\b/i;
// Verbs stripped when shortening a stop name for the overview strip
const LEADING_VERB =
  /^(arrive(?:\s+(?:in|at))?|arrival(?:\s+(?:in|at))?|drive\s+to|trek\s+to|travel\s+to|transfer\s+to|fly\s+to|return\s+to|reach|depart(?:ure)?\s+(?:to|for)|visit|explore|proceed\s+to|head\s+to)\s+/i;

function parseItem(item: ItineraryJourneyItem, index: number) {
  const rawTitle = (item.title ?? "").trim();
  const emojiMatch = rawTitle.match(LEADING_EMOJI);
  const emoji = emojiMatch ? emojiMatch[1] : "";
  const titleNoEmoji = emojiMatch ? rawTitle.slice(emojiMatch[0].length) : rawTitle;

  // Same split rule as before: "Day 1: Location" -> badge + heading
  const splitIndex = titleNoEmoji.indexOf(":");
  const dayLabel = splitIndex !== -1 ? titleNoEmoji.slice(0, splitIndex).trim() : "";
  const place = splitIndex !== -1 ? titleNoEmoji.slice(splitIndex + 1).trim() : titleNoEmoji;

  // Short stop name: last leg of "A → B – C", without "(...)" and leading verbs
  const legs = place.split(/\s*(?:→|->|–|—|\s-\s)\s*/).filter(Boolean);
  const lastLeg = (legs[legs.length - 1] ?? place).replace(/\([^)]*\)/g, "").trim();
  const shortPlace = lastLeg.replace(LEADING_VERB, "").trim() || place || `Stop ${index + 1}`;

  const lines = (item.description ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const stays = lines.filter((l) => l.length <= 70 && STAY_LINE.test(l));
  const points = lines.filter((l) => !stays.includes(l));

  const image = item.locationImage?.url ? item.locationImage : null;
  const tip = typeof item.tip === "string" && item.tip.trim() ? item.tip.trim() : "";

  return { emoji, dayLabel, place, shortPlace, points, stays, image, tip, rawTitle };
}

// Itinerary shown as a journey route: an overview strip of all stops, then a
// vertical route whose line fills in as the reader scrolls. Display only —
// takes the package's itinerary array as-is.
export default function ItineraryJourney({ itinerary }: { itinerary: ItineraryJourneyItem[] }) {
  // Image URLs that failed to load: treated as "no image" (emoji/number shows instead)
  const [brokenUrls, setBrokenUrls] = useState<Record<string, true>>({});
  const markBroken = (url?: string) => {
    if (url) setBrokenUrls((prev) => (prev[url] ? prev : { ...prev, [url]: true }));
  };
  const items = useMemo(
    () =>
      (itinerary ?? []).map((item, i) => {
        const parsed = parseItem(item, i);
        return parsed.image?.url && brokenUrls[parsed.image.url] ? { ...parsed, image: null } : parsed;
      }),
    [itinerary, brokenUrls],
  );
  const [open, setOpen] = useState<string[]>(["itinerary-0"]);
  const [progress, setProgress] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Route line fill follows scroll position through the timeline
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = railRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const anchor = window.innerHeight * 0.6;
      const p = rect.height > 0 ? (anchor - rect.top) / rect.height : 0;
      setProgress(Math.min(1, Math.max(0, p)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  if (items.length === 0) return null;

  const allOpen = open.length === items.length;
  const toggleAll = () => setOpen(allOpen ? [] : items.map((_, i) => `itinerary-${i}`));

  const goTo = (i: number) => {
    const key = `itinerary-${i}`;
    setOpen((prev) => (prev.includes(key) ? prev : [...prev, key]));
    const el = itemRefs.current[i];
    if (el) {
      // Leave room for the sticky header + tab bar
      const top = el.getBoundingClientRect().top + window.scrollY - 180;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const reached = (i: number) =>
    items.length === 1 ? progress > 0 : progress >= i / (items.length - 1) - 0.02;

  return (
    <div className="w-full pt-2 pb-4">
      {/* Route overview */}
      <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50/70 via-white to-white p-4 md:p-5 shadow-sm mb-8">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
            <Route className="h-4 w-4 text-[#FE5300]" />
            Route overview
            <span className="normal-case tracking-normal font-semibold text-gray-400">
              · {items.length} {items.length === 1 ? "stop" : "stops"}
            </span>
          </p>
          {items.length > 1 && (
            <button
              type="button"
              onClick={toggleAll}
              className="shrink-0 text-xs font-semibold text-[#FE5300] hover:underline underline-offset-4"
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          )}
        </div>

        <div className="-mx-4 md:-mx-5 px-4 md:px-5 overflow-x-auto no-scrollbar">
          <ol className="flex items-start min-w-max">
            {items.map((it, i) => (
              <li key={i} className="flex items-start">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  className="group flex w-[96px] md:w-[112px] flex-col items-center gap-1.5 text-center focus-visible:outline-none"
                  title={it.rawTitle}
                >
                  <StopMarker item={it} index={i} total={items.length} size="sm" active={open.includes(`itinerary-${i}`)} onImageError={markBroken} />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#FE5300]">
                    {it.dayLabel || `Stop ${i + 1}`}
                  </span>
                  <span className="line-clamp-2 text-[12px] font-semibold leading-tight text-gray-700 group-hover:text-[#FE5300] transition-colors">
                    {it.shortPlace}
                  </span>
                </button>
                {i < items.length - 1 && (
                  <span
                    aria-hidden
                    className="mt-[18px] h-0 w-6 md:w-10 border-t-2 border-dashed border-[#FE5300]/50"
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Journey timeline */}
      <div ref={railRef} className="relative">
        {/* Track + scroll-filled route line */}
        {items.length > 1 && (
          <div aria-hidden className="absolute left-[19px] md:left-[23px] top-6 bottom-10 w-0">
            <div className="absolute inset-0 border-l-2 border-dashed border-orange-200" />
            <div
              className="absolute left-[-1px] top-0 w-[2px] rounded-full bg-gradient-to-b from-[#FE5300] to-orange-400 transition-[height] duration-150 ease-out"
              style={{ height: `${progress * 100}%` }}
            />
          </div>
        )}

        <AccordionPrimitive.Root type="multiple" value={open} onValueChange={setOpen} className="flex flex-col">
          {items.map((it, i) => {
            const key = `itinerary-${i}`;
            const isOpen = open.includes(key);
            return (
              <AccordionPrimitive.Item
                key={key}
                value={key}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                className="relative flex gap-3 md:gap-5 pb-5 md:pb-6 last:pb-0"
              >
                <div className="relative z-10 shrink-0 pt-2">
                  <StopMarker item={it} index={i} total={items.length} size="lg" active={isOpen || reached(i)} onImageError={markBroken} />
                </div>

                <div
                  className={`min-w-0 flex-1 rounded-xl border bg-white shadow-sm transition-all duration-300 hover:shadow-md ${
                    isOpen ? "border-[#FE5300]/30" : "border-gray-100 hover:border-[#FE5300]/30"
                  }`}
                >
                  <AccordionPrimitive.Header>
                    <AccordionPrimitive.Trigger className="group flex w-full items-center gap-3 p-3 md:p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FE5300]/30 rounded-xl">
                      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {it.dayLabel && (
                            <span className="rounded border border-orange-100/50 bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FE5300]">
                              {it.dayLabel}
                            </span>
                          )}
                          {i === 0 && items.length > 1 && (
                            <span className="rounded bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-600">
                              Start
                            </span>
                          )}
                          {i === items.length - 1 && items.length > 1 && (
                            <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-500">
                              Finish
                            </span>
                          )}
                        </div>
                        <span className="text-[13px] md:text-[15px] font-semibold leading-snug text-gray-800 group-hover:text-[#FE5300] transition-colors">
                          {it.place}
                        </span>
                        {!isOpen && it.stays.length > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-500">
                            <BedDouble className="h-3 w-3 text-gray-400" />
                            <span className="line-clamp-1">{it.stays[0]}</span>
                          </span>
                        )}
                      </div>
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-180 group-data-[state=open]:text-[#FE5300]" />
                    </AccordionPrimitive.Trigger>
                  </AccordionPrimitive.Header>

                  <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <div className="flex flex-col gap-3 px-3 md:px-4 pb-3 md:pb-4">
                      {it.image?.url && (
                        <div className="relative h-36 sm:h-44 md:h-52 w-full overflow-hidden rounded-lg bg-gray-100">
                          <Image
                            src={it.image.url}
                            alt={it.image.alt || it.place}
                            fill
                            sizes="(max-width: 768px) 100vw, 640px"
                            quality={70}
                            loading="lazy"
                            className="object-cover"
                            onError={() => markBroken(it.image?.url)}
                          />
                          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                            <MapPin className="h-3 w-3" />
                            {it.shortPlace}
                          </span>
                        </div>
                      )}

                      {it.points.length > 0 && (
                        <ul className="flex flex-col gap-2 rounded-lg border border-gray-100/80 bg-gray-50/60 p-3 md:p-4 text-gray-600">
                          {it.points.map((line, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FE5300]/60" />
                              <span className="text-[12px] md:text-[13px] leading-relaxed">{line}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {it.stays.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {it.stays.map((s, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/70 px-3 py-1 text-[11px] md:text-xs font-medium text-indigo-700"
                            >
                              <BedDouble className="h-3.5 w-3.5" />
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {it.tip && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/70 p-3 text-[12px] md:text-[13px] text-amber-800">
                          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          <span>
                            <span className="font-semibold">Travel tip: </span>
                            {it.tip}
                          </span>
                        </div>
                      )}
                    </div>
                  </AccordionPrimitive.Content>
                </div>
              </AccordionPrimitive.Item>
            );
          })}
        </AccordionPrimitive.Root>
      </div>
    </div>
  );
}

// Round stop marker: day photo (small, optimized), else the title emoji,
// else the stop number. Last stop gets a finish flag when it has nothing else.
function StopMarker({
  item,
  index,
  total,
  size,
  active,
  onImageError,
}: {
  item: ReturnType<typeof parseItem>;
  index: number;
  total: number;
  size: "sm" | "lg";
  active?: boolean;
  onImageError?: (url?: string) => void;
}) {
  const dim = size === "sm" ? "h-9 w-9" : "h-10 w-10 md:h-12 md:w-12";
  const px = size === "sm" ? 36 : 48;
  const isFirst = index === 0 && total > 1;
  const isLast = index === total - 1 && total > 1;

  return (
    <span
      className={`relative flex ${dim} shrink-0 items-center justify-center rounded-full border-2 bg-white shadow-sm transition-all duration-300 ${
        active ? "border-[#FE5300] ring-4 ring-orange-100" : "border-orange-200"
      }`}
    >
      {item.image?.url ? (
        <span className="absolute inset-[2px] overflow-hidden rounded-full">
          <Image
            src={item.image.url}
            alt=""
            width={px}
            height={px}
            sizes={`${px}px`}
            quality={70}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => onImageError?.(item.image?.url)}
          />
        </span>
      ) : item.emoji ? (
        <span className={size === "sm" ? "text-base" : "text-lg md:text-xl"} aria-hidden>
          {item.emoji}
        </span>
      ) : isLast ? (
        <Flag className="h-4 w-4 text-[#FE5300]" />
      ) : (
        <span className="text-xs md:text-sm font-bold text-[#FE5300]">{index + 1}</span>
      )}
      {(isFirst || isLast) && (
        <span
          className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white ${
            isFirst ? "bg-green-500" : "bg-red-500"
          }`}
        />
      )}
    </span>
  );
}
