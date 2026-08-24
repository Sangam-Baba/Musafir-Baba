"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import WorldMap, { type WorldSpot } from "./WorldMap";
import { VISA_SPOTS, MAP_CENTER, MAP_SCALE } from "./VisaMadeEasySection";

export interface VisaDurations {
  [slug: string]: string;
}

export default function VisaMadeEasyPanel({ durations }: { durations: VisaDurations }) {
  const [active, setActive] = useState<string>(VISA_SPOTS.find((s) => s.slug === "japan-visa")?.slug ?? VISA_SPOTS[0].slug);

  const activeSpot = VISA_SPOTS.find((s) => s.slug === active) ?? VISA_SPOTS[0];
  const duration = durations[activeSpot.slug] || "5-7 Working Days";

  const spots: WorldSpot[] = VISA_SPOTS.map((s) => ({ slug: s.slug, label: s.country, coordinates: s.coordinates, emoji: s.emoji }));

  // Card anchors next to the active pin, but its final position is measured
  // and clamped in JS (not just a % based left/right/above/below flip) —
  // a flip alone still clipped for pins where the card's real rendered
  // height (it varies with the duration text length) is taller than the
  // room available on *either* side of the pin inside the short map box.
  const mapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardPos, setCardPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const mapEl = mapRef.current;
    const cardEl = cardRef.current;
    if (!mapEl || !cardEl) return;

    const mapRect = mapEl.getBoundingClientRect();
    const cardW = cardEl.offsetWidth;
    const cardH = cardEl.offsetHeight;
    const margin = 8;
    const gap = 14;

    const pinX = (activeSpot.xPercent / 100) * mapRect.width;
    const pinY = (activeSpot.yPercent / 100) * mapRect.height;

    let left = pinX + gap;
    if (left + cardW > mapRect.width - margin) left = pinX - gap - cardW;
    left = Math.max(margin, Math.min(left, mapRect.width - cardW - margin));

    let top = pinY - gap - cardH;
    if (top < margin) top = pinY + gap;
    top = Math.max(margin, Math.min(top, mapRect.height - cardH - margin));

    setCardPos({ left, top });
  }, [active, activeSpot.xPercent, activeSpot.yPercent]);

  return (
    <div className="bg-[#F4F5FA] rounded-2xl p-5 md:p-6 relative overflow-hidden">
      <h3 className="text-[17px] font-semibold text-gray-900">Visa Made Easy</h3>
      <p className="text-[12.5px] text-gray-500 mb-4">Covering 180+ countries worldwide</p>

      <div ref={mapRef} className="relative rounded-xl overflow-hidden bg-white/50 mb-2 aspect-[23/16] w-full">
        <WorldMap
          spots={spots}
          activeSlug={active}
          onSpotHover={(slug) => slug && setActive(slug)}
          center={MAP_CENTER}
          scale={MAP_SCALE}
          width={460}
          height={320}
        />

        {/* Floating visa card, anchored to whichever pin is active */}
        <div
          ref={cardRef}
          className="absolute w-[150px] bg-white rounded-xl shadow-lg p-3 transition-all duration-300 ease-out"
          style={
            cardPos
              ? { left: cardPos.left, top: cardPos.top }
              : { left: `${activeSpot.xPercent}%`, top: `${activeSpot.yPercent}%`, opacity: 0 }
          }
        >
          <p className="text-[13px] font-bold text-[#FE5300] mb-1.5 flex items-center gap-1.5">
            <span className="text-[16px]">{activeSpot.emoji}</span> {activeSpot.country} Visa
          </p>
          <ul className="flex flex-col gap-1 mb-2.5">
            <li className="flex items-center gap-1.5 text-[10px] text-gray-600">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" /> Visa in {duration}
            </li>
            <li className="flex items-center gap-1.5 text-[10px] text-gray-600">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" /> High Success Rate
            </li>
            <li className="flex items-center gap-1.5 text-[10px] text-gray-600">
              <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" /> Expert Assistance
            </li>
          </ul>
          <Link
            href={`/visa/${activeSpot.slug}`}
            className="flex items-center justify-center gap-1 bg-[#1D4ED8] hover:bg-[#1a43bd] text-white text-[11px] font-bold py-1.5 rounded-lg transition-colors"
          >
            <span>Apply Now</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <Link
        href="/visa"
        className="flex items-center justify-center gap-1.5 w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 text-[13px] font-bold py-2.5 rounded-xl transition-colors mt-3"
      >
        View All Visa Destinations <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
