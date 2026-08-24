import React from "react";

function DownloadAppIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <rect width="14" height="20" x="5" y="2" rx="2.5" />
      <path d="M12 7v7" />
      <path d="m9.5 11.5 2.5 2.5 2.5-2.5" />
      <path d="M10 18h4" />
    </svg>
  );
}

function SubmitDocIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M20 12V8" />
      <line x1="8" y1="10" x2="13" y2="10" />
      <line x1="8" y1="14" x2="13" y2="14" />
      <path d="M18 16a2 2 0 0 0-1.4.6l-2.2 2.2a1 1 0 0 0 0 1.4l.8.8a1 1 0 0 0 1.4 0l2.2-2.2A2 2 0 0 0 22 17a2 2 0 0 0-2-2h-.6z" />
    </svg>
  );
}

function VerifiedBadgeIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SteeringWheelIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="12" cy="12" r="3" />
      <line x1="2.5" y1="12" x2="9" y2="12" />
      <line x1="15" y1="12" x2="21.5" y2="12" />
      <line x1="12" y1="15" x2="12" y2="21.5" />
    </svg>
  );
}

function RupeeIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M6 3h12" />
      <path d="M6 8h12" />
      <path d="M6 13l8.5 8" />
      <path d="M6 13h3a4 4 0 0 0 0-8" />
    </svg>
  );
}

const STEPS = [
  {
    icon: DownloadAppIcon,
    title: "Download the App",
    description: "Install MBConnect from Google Play Store and sign up.",
  },
  {
    icon: SubmitDocIcon,
    title: "Submit Documents",
    description: "Upload required documents and complete verification.",
  },
  {
    icon: VerifiedBadgeIcon,
    title: "Get Verified",
    description: "Our team will verify your documents quickly.",
  },
  {
    icon: SteeringWheelIcon,
    title: "Go Online",
    description: "Accept rides and start serving customers in your city.",
  },
  {
    icon: RupeeIcon,
    title: "Earn More",
    description: "Complete more rides, earn incentives and grow with us.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="w-full px-4 md:px-8 py-16 md:py-24 bg-white scroll-mt-16">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-2xl md:text-[32px] font-bold text-gray-900 tracking-tight">
          How <span className="text-[#FE5300]">MBConnect</span> Works
        </h2>
        <p className="text-[14px] md:text-[15px] text-gray-500 mt-2 font-medium">
          Simple steps to start earning with us
        </p>

        <div className="relative mt-14">
          {/* Connector line — desktop only, sits behind the step circles */}
          <div className="hidden lg:block absolute top-[40px] md:top-[43px] left-[10%] right-[10%] border-t-2 border-dashed border-[#FFA46B] pointer-events-none z-0" />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-12">
            {STEPS.map(({ icon: Icon, title, description }, idx) => (
              <div key={title} className="relative z-10 flex flex-col items-center text-center group">
                <div className="relative w-20 h-20 md:w-[86px] md:h-[86px] rounded-full border-2 border-[#FFA26B] bg-white flex items-center justify-center transition-all duration-200 group-hover:border-[#FE5300] shadow-[0_2px_8px_rgba(254,83,0,0.06)]">
                  <Icon className="w-8 h-8 md:w-9 md:h-9 text-gray-900" />
                  <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 md:w-7 md:h-7 rounded-full bg-[#FE5300] text-white text-[11px] md:text-xs font-bold flex items-center justify-center shadow-sm">
                    {idx + 1}
                  </span>
                </div>
                <h3 className="text-[14.5px] md:text-[15px] font-bold text-gray-900 mt-5 leading-snug">
                  {title}
                </h3>
                <p className="text-[12px] md:text-[12.5px] text-gray-500 leading-relaxed max-w-[170px] mt-1.5">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

