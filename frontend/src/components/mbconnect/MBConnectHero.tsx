import Image from "next/image";
import { Users, IndianRupee, ShieldCheck, Headset, ArrowRight } from "lucide-react";
import { getWhatsAppLink } from "@/config/contact";
import ComingSoonBadge from "./ComingSoonBadge";

const STATS = [
  { icon: Users, label: "More Rides Everyday" },
  { icon: IndianRupee, label: "Timely Payments" },
  { icon: ShieldCheck, label: "100% Safe & Secure" },
  { icon: Headset, label: "24x7 Partner Support" },
];

export default function MBConnectHero() {
  return (
    // md+: fixed aspect-[13/8] matches mbconnectwebsitebanner.avif's real
    // 5204x3200 (≈1.626:1) dimensions, so object-cover shows the full
    // composition (driver + phone mockup, both baked into the image)
    // un-cropped. Below md that same ratio makes the section too short for
    // this much stacked text plus the fixed navbar overlapping the top, so
    // mobile instead uses a generous min-height with the image cropping
    // more freely (a dedicated mobile-cropped image can replace this later).
    <section className="relative w-full min-h-[540px] sm:min-h-[560px] md:min-h-0 md:aspect-[13/8] overflow-hidden">
      <Image
        src="/partner/mbconnectwebsitebanner.avif"
        alt="MBConnect driver partner"
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        className="object-cover object-[75%_center] md:object-center"
      />
      {/* On desktop the image's own reserved blank space is enough contrast
          for the text. Below md that space gets cropped too tight to rely
          on, so a scrim guarantees legibility regardless of exact crop. */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/75 to-transparent md:hidden" />

      {/* pt-20 clears the fixed navbar on mobile, where content is
          padding-pushed rather than purely centered. */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 md:px-8 pt-20 md:pt-0 flex items-start md:items-center">
        <div className="max-w-[210px] sm:max-w-[320px] md:max-w-[440px]">
          <h1 className="text-2xl sm:text-4xl md:text-[44px] lg:text-[52px] font-extrabold text-gray-900 leading-[1.08] tracking-tight">
            More Rides.
            <br />
            <span className="text-[#FE5300]">More Earnings.</span>
            <br />
            Your Way.
          </h1>
          <p className="mt-2 md:mt-4 text-[12px] sm:text-[15px] md:text-base text-gray-700">
            MBConnect by MusafirBaba is the trusted partner app for drivers and vehicle owners.
          </p>

          <div className="grid grid-cols-2 gap-2 sm:gap-4 mt-4 md:mt-8">
            {STATS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 rounded-full bg-white border border-orange-100 shadow-sm flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-[#FE5300]" strokeWidth={2} />
                </span>
                <span className="text-[9px] sm:text-[11px] md:text-[11.5px] font-medium text-gray-700 leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-4 md:mt-8">
            <a
              href={getWhatsAppLink("Hi, I'd like to join MBConnect as a driver partner.")}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="flex items-center gap-1.5 sm:gap-2 bg-[#FE5300] hover:bg-[#e04800] text-white text-[11px] sm:text-[13px] md:text-[14px] font-bold px-3.5 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-lg transition-colors"
            >
              Join MBConnect Today <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </a>
            <ComingSoonBadge className="scale-[0.7] sm:scale-90 md:scale-100 origin-left" />
          </div>
        </div>
      </div>
    </section>
  );
}
