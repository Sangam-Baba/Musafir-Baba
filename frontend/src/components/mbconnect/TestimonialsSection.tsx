"use client";

import { useRef, useState } from "react";
import { Star } from "lucide-react";

// Names/quotes match the design, but headshot photos are replaced with
// initials avatars — these read as example/placeholder testimonials, not
// real partners with photo consent on file, so no fabricated photos.
const TESTIMONIALS = [
  {
    quote: "MBConnect has increased my income significantly. I get regular rides and payments are always on time.",
    name: "Rajesh Kumar",
    location: "Delhi",
    initials: "RK",
    color: "bg-orange-100 text-[#FE5300]",
  },
  {
    quote: "Support team is always helpful and the app is very easy to use.",
    name: "Arif Khan",
    location: "Lucknow",
    initials: "AK",
    color: "bg-blue-100 text-blue-600",
  },
  {
    quote: "Flexible working hours and good incentives make MBConnect the best partner app.",
    name: "Sandeep Singh",
    location: "Jaipur",
    initials: "SS",
    color: "bg-emerald-100 text-emerald-600",
  },
];

export default function TestimonialsSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const cardWidth = track.scrollWidth / TESTIMONIALS.length;
    setActiveIndex(Math.round(track.scrollLeft / cardWidth));
  };

  const scrollToIndex = (idx: number) => {
    const track = trackRef.current;
    if (!track) return;
    const cardWidth = track.scrollWidth / TESTIMONIALS.length;
    track.scrollTo({ left: cardWidth * idx, behavior: "smooth" });
  };

  return (
    <section className="w-full px-4 md:px-8 py-14 md:py-20 bg-gray-50/60">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-[32px] leading-tight font-bold text-gray-900 text-center">
          What Our <span className="text-[#FE5300]">Partners</span> Say
        </h2>

        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="flex md:grid md:grid-cols-3 gap-5 mt-10 overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="min-w-[85%] sm:min-w-[360px] md:min-w-0 snap-center bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4"
            >
              <span className="text-4xl text-orange-200 font-serif leading-none">&ldquo;</span>
              <p className="text-[13.5px] text-gray-700 leading-relaxed -mt-3">{t.quote}</p>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-[#FE5300] text-[#FE5300]" />
                ))}
              </div>
              <div className="flex items-center gap-3 mt-auto pt-2">
                <span className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 ${t.color}`}>
                  {t.initials}
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-gray-900">{t.name}</p>
                  <p className="text-[11.5px] text-gray-500">{t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex md:hidden items-center justify-center gap-2 mt-5">
          {TESTIMONIALS.map((t, idx) => (
            <button
              key={t.name}
              type="button"
              onClick={() => scrollToIndex(idx)}
              aria-label={`Go to testimonial ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                idx === activeIndex ? "w-5 bg-[#FE5300]" : "w-1.5 bg-orange-200"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
