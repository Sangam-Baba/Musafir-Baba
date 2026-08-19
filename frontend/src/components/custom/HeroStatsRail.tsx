import { Star } from "lucide-react";

// Presentational only — same hardcoded-marketing-copy pattern the old bottom
// stats bar used (see git history of app/(user)/page.tsx). Floats beside the
// hero copy on desktop; reflows into a horizontal scroll strip on mobile
// instead of disappearing, so the trust signals still reach mobile visitors.
const STATS = [
  { label: "Google Rating", value: "4.8", stars: true, caption: "(2,300+ Reviews)" },
  { label: "Happy Travellers", value: "24,000+" },
  { label: "Visa Success Rate", value: "98%" },
  { label: "Trusted Since", value: "2020" },
];

export default function HeroStatsRail() {
  return (
    <div
      className="
        flex md:flex-col gap-2 md:gap-2.5
        overflow-x-auto md:overflow-visible
        w-full md:w-auto
        md:absolute md:right-0 md:top-0
        relative z-20
        [-ms-overflow-style:none] [scrollbar-width:none]
        [&::-webkit-scrollbar]:hidden
      "
    >
      {STATS.map(({ label, value, stars, caption }) => (
        <div
          key={label}
          className="
            flex-shrink-0 bg-black/45 backdrop-blur-md border border-white/15
            rounded-xl px-4 py-2.5 md:min-w-[172px]
          "
        >
          <span className="block text-[11px] text-gray-300">{label}</span>
          <span className="flex items-center gap-1.5">
            <span className="text-[17px] font-semibold text-white leading-tight">{value}</span>
            {stars && (
              <span className="flex items-center gap-[1px]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-[#FE5300] text-[#FE5300]" />
                ))}
              </span>
            )}
          </span>
          {caption && <span className="block text-[10px] text-gray-400">{caption}</span>}
        </div>
      ))}
    </div>
  );
}
