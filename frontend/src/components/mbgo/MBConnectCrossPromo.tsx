import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

function CashFlowIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="18" height="12" x="3" y="6" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 10h.01M18 14h.01" />
      <path d="M7 6V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2" strokeDasharray="2 2" />
    </svg>
  );
}

function FlexibleClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
      <path d="M12 3v-1M5.6 5.6l-.7-.7M18.4 5.6l.7-.7" />
    </svg>
  );
}

function PayoutCardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <circle cx="7" cy="15" r="1.5" fill="currentColor" />
    </svg>
  );
}

function PartnerSupportIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

const PARTNER_BENEFITS = [
  { icon: CashFlowIcon, label: "More Rides, More Earnings" },
  { icon: FlexibleClockIcon, label: "Flexible Working Hours" },
  { icon: PayoutCardIcon, label: "Timely Payments" },
  { icon: PartnerSupportIcon, label: "Dedicated Partner Support" },
];

export default function MBConnectCrossPromo() {
  return (
    <section className="w-full px-4 md:px-8 py-10 md:py-16">
      <div className="max-w-7xl mx-auto bg-[#FFF6EC] border border-[#FFE7D4] rounded-[24px] md:rounded-[32px] p-6 sm:p-10 lg:p-12 relative overflow-hidden shadow-xs">
        {/* Background Monuments Outline Watermark */}
        <div className="absolute inset-x-0 bottom-0 h-28 opacity-10 pointer-events-none flex justify-between items-end px-2">
          <svg viewBox="0 0 1200 120" className="w-full h-full" fill="none" stroke="#FE5300" strokeWidth="1.5">
            {/* Monuments sketch line */}
            <path d="M20 120 L20 70 L30 50 L40 70 L40 120 M70 120 L70 40 L85 20 L100 40 L100 120 M140 120 L140 80 Q160 50 180 80 L180 120 M230 120 L230 45 L250 15 L270 45 L270 120 M320 120 L320 60 L340 40 L360 60 L360 120 M420 120 L420 30 L445 10 L470 30 L470 120 M530 120 L530 75 Q555 45 580 75 L580 120 M640 120 L640 40 L660 15 L680 40 L680 120 M740 120 L740 65 L760 40 L780 65 L780 120 M840 120 L840 35 L865 10 L890 35 L890 120 M950 120 L950 70 Q975 45 1000 70 L1000 120 M1060 120 L1060 45 L1080 20 L1100 45 L1100 120 M1140 120 L1140 60 L1160 40 L1180 60 L1180 120" />
          </svg>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center relative z-10">
          {/* Left Column: CTA Pitch */}
          <div className="lg:col-span-4 text-center lg:text-left flex flex-col items-center lg:items-start">
            <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-black text-gray-950 tracking-tight leading-[1.18]">
              Are you a Driver <br />
              or Vehicle Owner?
            </h2>
            <p className="text-[14px] sm:text-[15px] text-gray-700 font-medium mt-3 mb-6 leading-relaxed max-w-sm">
              Join MBConnect and grow <br className="hidden sm:block" />
              your earnings with us.
            </p>

            <Link
              href="/mbconnect"
              className="inline-flex items-center gap-2 bg-[#FE5300] hover:bg-[#e04800] active:scale-95 text-white font-bold text-[14.5px] px-6 py-3.5 rounded-xl shadow-md shadow-orange-500/25 transition-all"
            >
              <span>Join MBConnect</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Center Column: Realistic Smartphone Mockup Visual */}
          <div className="lg:col-span-4 flex justify-center">
            <div className="relative w-48 sm:w-56 h-[300px] sm:h-[340px] bg-white rounded-[32px] border-4 border-gray-900 shadow-2xl p-3 flex flex-col justify-between overflow-hidden">
              {/* iPhone Notch */}
              <div className="w-20 h-3 bg-gray-900 rounded-full mx-auto z-10" />

              {/* App Screen Content */}
              <div className="flex flex-col items-center text-center my-auto w-full pt-1">
                <div className="text-xl font-black text-gray-950 tracking-tight">
                  MB<span className="text-[#FE5300]">Connect</span>
                </div>
                <span className="text-[9.5px] font-bold text-gray-400 -mt-1 tracking-wide">
                  by MusafirBaba
                </span>

                {/* White SUV Car Image */}
                <div className="relative w-full h-32 sm:h-36 mt-4">
                  <Image
                    src="/partner/ser2.avif"
                    alt="MBConnect Driver Partner"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Home indicator bar */}
              <div className="w-20 h-1 bg-gray-900 rounded-full mx-auto" />
            </div>
          </div>

          {/* Right Column: 4 Partner Feature Items directly on background */}
          <div className="lg:col-span-4 flex flex-col gap-5 sm:gap-6">
            {PARTNER_BENEFITS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-4 group"
              >
                <div className="w-6 h-6 text-gray-950 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 stroke-[2]" />
                </div>
                <span className="text-[15px] sm:text-[15.5px] font-bold text-gray-950 leading-snug">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
