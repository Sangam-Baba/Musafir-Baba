import { Globe, HandCoins, Clock3, Sparkles, ShieldCheck, Star } from "lucide-react";

// Static marketing copy — same hardcoded-USP pattern as the old hero stat
// bar and WhyChoose section. "180+ Countries Covered" matches the existing
// "180+ Visa countries" figure used elsewhere on the homepage.
const BADGES = [
  { icon: Globe, title: "180+", subtitle: "Countries Covered" },
  { icon: HandCoins, title: "Best Price", subtitle: "Guarantee" },
  { icon: Clock3, title: "24/7 Travel", subtitle: "Support" },
  { icon: Sparkles, title: "Customised", subtitle: "Tours" },
  { icon: ShieldCheck, title: "Secure Booking", subtitle: "100% Safe & Easy" },
  { icon: Star, title: "5 Star Rated", subtitle: "By Travellers" },
];

export default function TrustBadgesRow() {
  return (
    <section className="w-full px-4 md:px-10 py-8 md:py-10 border-t border-gray-100">
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {BADGES.map(({ icon: Icon, title, subtitle }) => (
          <div
            key={title + subtitle}
            className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3.5"
          >
            <Icon className="w-6 h-6 text-[#FE5300] flex-shrink-0" strokeWidth={1.75} />
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] font-semibold text-gray-900">{title}</span>
              <span className="text-[11px] text-gray-500">{subtitle}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
