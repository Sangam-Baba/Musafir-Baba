import Link from "next/link";

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
  return (
    <div className="flex items-center gap-2 md:gap-3 flex-wrap relative z-20">
      <span className="text-[11px] md:text-[12px] text-gray-300 font-medium flex-shrink-0">
        Try asking…
      </span>
      <div className="flex items-center gap-2 flex-wrap">
        {SUGGESTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="px-3 py-1.5 rounded-full text-[11px] md:text-[12px] font-medium text-white bg-white/10 border border-white/25 hover:bg-white/20 transition-colors backdrop-blur-sm"
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
