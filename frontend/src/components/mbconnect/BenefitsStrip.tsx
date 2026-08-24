import React from "react";

function IncomeGrowthIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="2" y1="22" x2="22" y2="22" />
      <rect x="3" y="16" width="3" height="6" rx="0.5" />
      <rect x="8" y="12" width="3" height="10" rx="0.5" />
      <rect x="13" y="8" width="3" height="14" rx="0.5" />
      <rect x="18" y="5" width="3" height="17" rx="0.5" />
      <path d="M19.5 1v2.5" />
      <path d="M18.25 2.25h2.5" />
    </svg>
  );
}

function GiftIncentiveIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 7c-1.5-2.5-4.5-2.5-4.5 0 0 1.8 3.5 2.5 4.5 2.5" />
      <path d="M12 7c1.5-2.5 4.5-2.5 4.5 0 0 1.8-3.5 2.5-4.5 2.5" />
      <rect x="3" y="7" width="18" height="4" rx="1" />
      <path d="M5 11v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9" />
      <line x1="12" y1="7" x2="12" y2="22" />
    </svg>
  );
}

function CalendarScheduleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <circle cx="7.5" cy="13" r="0.75" fill="currentColor" />
      <circle cx="12" cy="13" r="0.75" fill="currentColor" />
      <circle cx="16.5" cy="13" r="0.75" fill="currentColor" />
      <circle cx="7.5" cy="17" r="0.75" fill="currentColor" />
      <circle cx="12" cy="17" r="0.75" fill="currentColor" />
      <circle cx="16.5" cy="17" r="0.75" fill="currentColor" />
    </svg>
  );
}

function RecognitionUserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="8" r="4.5" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

const BENEFITS = [
  {
    icon: IncomeGrowthIcon,
    title: (
      <>
        <span className="text-[#FE5300]">Grow</span>{" "}
        <span className="text-gray-900">Your Income</span>
      </>
    ),
    description: "More rides, more trips, more earnings.",
  },
  {
    icon: GiftIncentiveIcon,
    title: (
      <>
        <span className="text-gray-900">Exciting</span>{" "}
        <span className="text-[#FE5300]">Incentives</span>
      </>
    ),
    description: "Daily, weekly & monthly incentives and bonuses.",
  },
  {
    icon: CalendarScheduleIcon,
    title: <span className="text-[#FE5300]">Flexible Schedule</span>,
    description: "Drive at your convenience and be your own boss.",
  },
  {
    icon: RecognitionUserIcon,
    title: <span className="text-gray-900">Respect & Recognition</span>,
    description: "Be recognized for your performance.",
  },
];

export default function BenefitsStrip() {
  return (
    <section id="benefits" className="w-full px-4 md:px-8 pb-14 md:pb-20 scroll-mt-16">
      <div className="max-w-7xl mx-auto bg-[#FFF8F1] border border-[#FFE8D6] rounded-[22px] px-6 sm:px-8 lg:px-8 py-7 md:py-8 shadow-[0_2px_12px_rgba(254,83,0,0.03)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-[#FFDEC9]">
          {BENEFITS.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 lg:px-6 first:lg:pl-0 last:lg:pr-0"
            >
              <div className="flex-shrink-0 text-[#FE5300]">
                <item.icon className="w-10 h-10 md:w-11 md:h-11" />
              </div>
              <div>
                <h3 className="text-[14.5px] md:text-[15px] font-bold leading-tight">
                  {item.title}
                </h3>
                <p className="text-[12px] md:text-[12.5px] text-gray-500 mt-1 leading-snug">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

