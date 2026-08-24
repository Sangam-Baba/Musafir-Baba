import React from "react";

function GooglePlayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 512 512" className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" {...props}>
      <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1z" fill="#ea4335" />
      <path d="M47 36.3L47 475.7c0 13.9 7.6 26.6 19.8 33.1L289 270.4 47 36.3z" fill="#4285f4" />
      <path d="M325.3 277.7l60.1 60.1L104.6 499l220.7-221.3z" fill="#34a853" />
      <path
        d="M455.5 229.4l-70.1-40.2-60.1 60.1 60.1 60.1 70.1-40.2c16.3-9.4 26.6-26.6 26.6-45.4s-10.3-36-26.6-45.4z"
        fill="#fbbc04"
      />
    </svg>
  );
}

export function QRCodeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor">
      {/* Top Left Corner */}
      <rect x="2" y="2" width="28" height="28" rx="2" fill="none" stroke="currentColor" strokeWidth="4" />
      <rect x="9" y="9" width="14" height="14" rx="1" />

      {/* Top Right Corner */}
      <rect x="70" y="2" width="28" height="28" rx="2" fill="none" stroke="currentColor" strokeWidth="4" />
      <rect x="77" y="9" width="14" height="14" rx="1" />

      {/* Bottom Left Corner */}
      <rect x="2" y="70" width="28" height="28" rx="2" fill="none" stroke="currentColor" strokeWidth="4" />
      <rect x="9" y="77" width="14" height="14" rx="1" />

      {/* Timing lines & patterns */}
      <rect x="36" y="10" width="6" height="6" />
      <rect x="48" y="10" width="6" height="6" />
      <rect x="58" y="10" width="6" height="6" />
      <rect x="10" y="36" width="6" height="6" />
      <rect x="10" y="48" width="6" height="6" />
      <rect x="10" y="58" width="6" height="6" />

      {/* Data Blocks */}
      <rect x="36" y="36" width="10" height="10" rx="1" />
      <rect x="52" y="36" width="8" height="8" />
      <rect x="68" y="40" width="10" height="6" />
      <rect x="84" y="36" width="12" height="8" />
      <rect x="36" y="52" width="8" height="12" />
      <rect x="48" y="50" width="14" height="8" />
      <rect x="68" y="52" width="14" height="10" />
      <rect x="88" y="50" width="8" height="12" />
      <rect x="36" y="70" width="8" height="14" />
      <rect x="50" y="66" width="12" height="8" />
      <rect x="48" y="80" width="16" height="10" />
      <rect x="70" y="70" width="10" height="8" />
      <rect x="86" y="70" width="10" height="12" />
      <rect x="70" y="84" width="12" height="12" />
      <rect x="88" y="88" width="8" height="8" />
    </svg>
  );
}

export function GooglePlayButton({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://play.google.com/store/apps/details?id=com.musafirbaba.mbconnect"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2.5 bg-black hover:bg-neutral-900 text-white px-3.5 py-2 md:px-4 md:py-2.5 rounded-lg border border-neutral-700/80 transition-transform active:scale-95 shadow-md ${className}`}
    >
      <GooglePlayIcon />
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[8.5px] uppercase tracking-wider text-gray-300 font-medium">
          GET IT ON
        </span>
        <span className="text-[14px] md:text-[15px] font-semibold text-white tracking-tight">
          Google Play
        </span>
      </div>
    </a>
  );
}

export default function CTABanner() {
  return (
    <section className="w-full px-4 md:px-8 pb-14 md:pb-20">
      <div className="max-w-7xl mx-auto bg-gradient-to-r from-[#FE5300] via-[#FF5E0E] to-[#FF7728] rounded-[22px] md:rounded-[26px] px-6 sm:px-10 lg:px-12 py-8 md:py-10 flex flex-col lg:flex-row items-center justify-between gap-8 shadow-lg shadow-orange-500/10">
        <div className="text-center lg:text-left">
          <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-bold text-white tracking-tight">
            Ready to Earn More?
          </h2>
          <p className="text-[14px] sm:text-[15px] text-white/95 mt-2 font-normal">
            Join thousands of happy partners and grow with MBConnect.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center lg:justify-end gap-4 sm:gap-5">
          <GooglePlayButton />

          <div className="flex items-center gap-3 bg-transparent">
            <div className="bg-white p-1.5 rounded-xl shadow-md flex items-center justify-center">
              <QRCodeIcon className="w-12 h-12 sm:w-14 sm:h-14 text-black" />
            </div>
            <div className="text-white text-[13px] sm:text-[14px] font-semibold leading-tight text-left">
              <p>Scan to</p>
              <p>Download App</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

