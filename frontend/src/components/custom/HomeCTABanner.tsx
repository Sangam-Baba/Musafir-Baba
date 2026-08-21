import Image from "next/image";
import Link from "next/link";
import { FaWhatsapp } from "react-icons/fa";
import { MessageSquareText, Package, BadgePercent, Headset, Sparkles } from "lucide-react";
import { getWhatsAppLink } from "@/config/contact";

// Homepage-only CTA banner, placed right before the footer. Built as real
// HTML/CSS from the public/homeCTA.png reference (not the raw image as the
// banner itself) so the text stays readable and the layout reflows on
// mobile instead of shrinking an ultra-wide image down to nothing.
//
// homeCTA.png (1628x153) is a full mockup, not a plain photo — it already
// has "Ready to create your next memory?" and the buttons baked into its
// right ~80%. Only the hiker silhouette on its left ~20% (roughly the first
// 320px) is usable as a decorative background; showing any more of the
// image would duplicate the real HTML heading/buttons rendered below.
const FEATURES = [
  { label: "Quick Enquiry", icon: MessageSquareText },
  { label: "Custom Packages", icon: Package },
  { label: "Best Deals", icon: BadgePercent },
  { label: "Talk to Expert", icon: Headset },
];

export default function HomeCTABanner() {
  return (
    <section className="relative w-full overflow-hidden mt-8 md:mt-10">
      {/* Background Image that smoothly blends from scenic hiker on left to vibrant orange on right */}
      <div className="absolute inset-0 bg-[#FE5300]">
        <Image
          src="/ctabannerimage.avif"
          alt="Create your next memory"
          fill
          sizes="100vw"
          className="object-cover object-left md:object-center"
        />
        {/* Soft overlay ensuring crisp text contrast on the right */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FE5300]/10 via-35% to-[#FE5300]/60 pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:pl-[340px] md:pr-10 lg:pl-[420px] py-8 md:py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-2xl md:text-[30px] leading-tight font-bold text-white">
            Ready to create your next{" "}
            <span className="italic font-serif font-normal">memory</span>?
          </h2>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {FEATURES.map(({ label, icon: Icon }) => (
              <span key={label} className="flex items-center gap-1.5 text-white/90 text-[13px] font-medium">
                <span className="w-6 h-6 rounded-full border border-white/50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                </span>
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            href="/plan-my-trip"
            className="flex items-center gap-2 bg-white text-[#FE5300] font-bold text-[12.5px] px-5 py-3 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" /> PLAN MY TRIP
          </Link>
          <a
            href={getWhatsAppLink()}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="flex items-center gap-2 bg-white text-gray-900 font-bold text-[12.5px] px-5 py-3 rounded-md hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <FaWhatsapp className="w-4 h-4 text-[#25D366]" /> TALK TO EXPERT
          </a>
        </div>
      </div>
    </section>
  );
}
