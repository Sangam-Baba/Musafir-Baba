import { User, TrendingUp, Clock, ShieldCheck, Headset, Star } from "lucide-react";

const REASONS = [
  { icon: User, title: "More Rides", description: "Get regular ride requests & boost your income." },
  { icon: TrendingUp, title: "High Earnings", description: "Better earnings with transparent fares and incentives." },
  { icon: Clock, title: "Timely Payments", description: "Payments directly in your bank account, on time." },
  { icon: ShieldCheck, title: "Safe & Secure", description: "Verified users, SOS support and safety features." },
  { icon: Headset, title: "24x7 Support", description: "We're always here to help you on the road." },
  { icon: Star, title: "Trusted Brand", description: "Backed by MusafirBaba – a brand you can trust." },
];

export default function WhyPartnerSection() {
  return (
    <section id="why-mbconnect" className="w-full px-4 md:px-8 py-14 md:py-20 scroll-mt-16">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-[32px] leading-tight font-bold text-gray-900 text-center">
          Why Partner with <span className="text-[#FE5300]">MBConnect</span>?
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8 md:gap-6 mt-12">
          {REASONS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col items-center text-center gap-3">
              <Icon className="w-9 h-9 text-[#FE5300]" strokeWidth={1.5} />
              <p className="text-[14px] font-bold text-gray-900">{title}</p>
              <p className="text-[12px] text-gray-500 leading-snug">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
