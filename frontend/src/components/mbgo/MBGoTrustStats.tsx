import React from "react";

function HappyUserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2a10 10 0 0 0-7.07 17.07A10 10 0 0 0 19.07 4.93 9.93 9.93 0 0 0 12 2z" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 18a5 5 0 0 1 10 0" />
    </svg>
  );
}

function NetworkRidesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="5" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M12 7.5L6 15.5M12 7.5l6 8M8.5 18h7" />
    </svg>
  );
}

function CityLocationIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ShieldStarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 3h12a2 2 0 0 1 2 2v8a10 10 0 0 1-8 9.8A10 10 0 0 1 4 13V5a2 2 0 0 1 2-2z" />
      <path d="m12 8 1.3 2.6 3 .4-2.1 2.1.5 3-2.7-1.4-2.7 1.4.5-3-2.1-2.1 3-.4z" stroke="#FE5300" fill="#FE5300" />
    </svg>
  );
}

const STATS = [
  {
    icon: HappyUserIcon,
    stat: "50K+",
    label: "Happy Users",
  },
  {
    icon: NetworkRidesIcon,
    stat: "10K+",
    label: "Rides Completed Daily",
  },
  {
    icon: CityLocationIcon,
    stat: "200+",
    label: "Cities Covered",
  },
  {
    icon: ShieldStarIcon,
    stat: "4.7★",
    label: "Average Rating",
  },
];

export default function MBGoTrustStats() {
  return (
    <section className="w-full px-4 md:px-8 py-12 md:py-16 bg-white border-t border-gray-100/80">
      <div className="max-w-6xl mx-auto">
        {/* Section Heading */}
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-[34px] font-black text-gray-950 tracking-tight">
            Trusted by Thousands of Happy Customers
          </h2>
        </div>

        {/* 4 Stats Horizontal Rail with Vertical Dividers */}
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-6 md:gap-2 max-w-5xl mx-auto">
          {STATS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <React.Fragment key={item.label}>
                <div className="flex items-center gap-3.5 sm:gap-4 px-2 sm:px-4 flex-1 min-w-[200px] justify-center md:justify-start">
                  {/* Left Big Outline Icon */}
                  <div className="text-gray-950 flex-shrink-0">
                    <Icon className="w-10 h-10 md:w-11 md:h-11" />
                  </div>

                  {/* Right Stat & Label */}
                  <div className="flex flex-col">
                    <span className="text-2xl sm:text-3xl md:text-[30px] font-black text-[#FE5300] tracking-tight leading-none">
                      {item.stat}
                    </span>
                    <span className="text-[12px] sm:text-[13px] font-semibold text-gray-700 mt-1 whitespace-nowrap">
                      {item.label}
                    </span>
                  </div>
                </div>

                {/* Vertical divider line between metrics (Desktop/Tablet) */}
                {idx < STATS.length - 1 && (
                  <div className="hidden md:block w-[1px] h-12 bg-gray-200 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
