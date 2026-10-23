"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

// Every href here is a route that was already live in the previous hero's
// filter-pill row (same /holidays/{slug} pattern) or the verified /visa
// slugs from navLinks.ts — nothing new or unverified, just restyled as
// "try asking" suggestions instead of category pills.
const SUGGESTIONS = [
  { label: "Honeymoon getaways", href: "/holidays/honeymoon-packages" },
  { label: "Family trip ideas", href: "/holidays/family-tours" },
  { label: "Visa services", href: "/visa" },
  { label: "Long weekend trips", href: "/holidays/weekend-getaways" },
];

export default function TrySearchChips() {
  const router = useRouter();
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  const handleClick = (href: string) => {
    if (loadingHref) return;
    setLoadingHref(href);
    router.push(href);
  };

  return (
    <div className="flex items-center gap-2 md:gap-3 flex-wrap relative z-20">
      <span className="text-[11px] md:text-[12px] text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] font-semibold flex-shrink-0">
        Try asking…
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        {SUGGESTIONS.map((s) => {
          const isLoading = loadingHref === s.href;
          const isAnyLoading = loadingHref !== null;

          return (
            <button
              key={s.href}
              type="button"
              onClick={() => handleClick(s.href)}
              disabled={isAnyLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] md:text-[12px] font-medium transition-all backdrop-blur-md cursor-pointer active:scale-95 ${
                isLoading
                  ? "bg-[#FE5300] text-white border border-[#FE5300] shadow-md scale-105 font-semibold"
                  : isAnyLoading
                  ? "opacity-40 text-white/70 bg-black/30 border border-white/15 cursor-not-allowed"
                  : "text-white bg-black/35 border border-white/30 hover:bg-black/50 hover:border-white/50 hover:scale-105 shadow-xs"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-white" />
                  <span>Searching {s.label}…</span>
                </>
              ) : (
                <span>{s.label}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
