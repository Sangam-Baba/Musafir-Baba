import React from "react";

function ShieldCheckVector(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function RupeeVector(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 4h12" />
      <path d="M6 9h12" />
      <path d="M6 14l8.5 7" />
      <path d="M6 14h3a4.5 4.5 0 0 0 0-9" />
    </svg>
  );
}

function CarFrontVector(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m21 8-2 2-1.5-3.7A2 2 0 0 0 15.64 5H8.36a2 2 0 0 0-1.86 1.3L5 10l-2-2" />
      <path d="M4 14v4a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h10v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-4" />
      <rect width="18" height="8" x="3" y="10" rx="2" />
      <circle cx="7" cy="14" r="1.2" fill="currentColor" />
      <circle cx="17" cy="14" r="1.2" fill="currentColor" />
    </svg>
  );
}

function ShieldLockVector(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 10a3 3 0 0 1 6 0v2H9v-2z" />
      <rect width="8" height="5" x="8" y="12" rx="1" />
    </svg>
  );
}

function HeadsetVector(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 14h2a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H3v7z" />
      <path d="M21 14h-2a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h2v7z" />
      <path d="M3 11V9a9 9 0 0 1 18 0v2" />
      <path d="M19 16v1a2 2 0 0 1-2 2h-3" />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" />
    </svg>
  );
}

function RosetteAwardVector(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="9" r="6" />
      <polygon points="12 6 13 8 15.5 8.3 13.5 10 14 12.5 12 11.2 10 12.5 10.5 10 8.5 8.3 11 8" fill="currentColor" />
      <path d="m8.5 14-2.5 7 6-3 6 3-2.5-7" />
    </svg>
  );
}

const BENEFITS = [
  {
    icon: ShieldCheckVector,
    title: "Verified & Trained Drivers",
  },
  {
    icon: RupeeVector,
    title: "Transparent Pricing",
  },
  {
    icon: CarFrontVector,
    title: "Wide Range of Vehicles",
  },
  {
    icon: ShieldLockVector,
    title: "Safe & Secure Journeys",
  },
  {
    icon: HeadsetVector,
    title: "24x7 Customer Support",
  },
  {
    icon: RosetteAwardVector,
    title: "Powered by MusafirBaba",
  },
];

export default function WhyChooseMBGo() {
  return (
    <section id="why-mbgo" className="w-full px-4 md:px-8 py-14 md:py-20 bg-[#FCF9F3] scroll-mt-16 border-y border-[#F3ECE0]/60">
      <div className="max-w-7xl mx-auto">
        {/* Section Heading */}
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-[34px] font-black text-gray-950 tracking-tight">
            Why Choose MBGo?
          </h2>
        </div>

        {/* 6 Circular Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8 lg:gap-6 justify-items-center">
          {BENEFITS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex flex-col items-center text-center group cursor-default w-full max-w-[150px]"
              >
                {/* Yellow-tinted circle badge matching design */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FFE57F] flex items-center justify-center text-gray-950 shadow-xs transition-all duration-300 group-hover:scale-110 group-hover:shadow-md mb-3.5">
                  <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>

                {/* Title */}
                <h3 className="text-[13px] sm:text-[13.5px] font-bold text-gray-900 leading-snug text-center">
                  {item.title}
                </h3>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
