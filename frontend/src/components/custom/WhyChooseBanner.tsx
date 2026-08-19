import { UserSearch, BadgeCheck, ShieldCheck, Headset, HeartHandshake } from "lucide-react";

// Homepage-only replacement for WhyChoose.tsx / WhyChooseUS.tsx — those stay
// untouched since WhyChooseUS is also used on the rental detail page
// (rental/[vehicleType]/[destination]/[slug]/pageClient.tsx). This is a new,
// isolated component so that page keeps its existing 6-card grid unchanged.
const POINTS = [
  { icon: UserSearch, title: "Expert Travel Planners", subtitle: "10+ years of experience to plan your perfect trip" },
  { icon: BadgeCheck, title: "Best Price Guarantee", subtitle: "We ensure you get the best value for your money" },
  { icon: ShieldCheck, title: "Hassle-free Bookings", subtitle: "Simple, secure and hassle-free process" },
  { icon: Headset, title: "24/7 Travel Support", subtitle: "We're with you at every step of your journey" },
  { icon: HeartHandshake, title: "Trusted by Thousands", subtitle: "Thousands of happy travellers trust us" },
];

export default function WhyChooseBanner() {
  return (
    <section className="w-full px-4 md:px-10 py-8 md:py-10">
      <div className="max-w-7xl mx-auto border border-[#F3DCC0] rounded-[24px] px-6 md:px-10 pt-5 pb-6 shadow-[0_2px_16px_rgba(254,83,0,0.05)]">
        {/* Heading sits centered on top of a full-width divider line */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute inset-x-0 top-1/2 border-t border-gray-200" />
          <h2 className="relative bg-white px-4 text-2xl md:text-[32px] leading-tight font-medium text-gray-900">
            Why Choose <span className="text-[#FE5300]">MusafirBaba?</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-5 gap-y-6 lg:gap-x-0 lg:divide-x lg:divide-gray-200">
          {POINTS.map(({ icon: Icon, title, subtitle }) => (
            <div key={title} className="flex items-center gap-2.5 lg:px-4">
              <span className="w-9 h-9 rounded-lg border-[1.5px] border-[#FBC89A] flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-[#FE5300]" strokeWidth={1.6} />
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-gray-900 leading-tight">{title}</p>
                <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
