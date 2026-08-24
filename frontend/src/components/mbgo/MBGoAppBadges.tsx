import React from "react";

export function GooglePlayIcon(props: React.SVGProps<SVGSVGElement>) {
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

export function AppStoreIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 384 512" className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 fill-current" {...props}>
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.8 69.5-34.3z" />
    </svg>
  );
}

export function GooglePlayButton({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://play.google.com/store/apps/details?id=com.musafirbaba.mbgo"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2.5 bg-black hover:bg-neutral-900 text-white px-3.5 py-2 md:px-4 md:py-2 rounded-lg border border-neutral-700/80 transition-transform active:scale-95 shadow-md ${className}`}
    >
      <GooglePlayIcon />
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[8px] uppercase tracking-wider text-gray-300 font-medium">
          GET IT ON
        </span>
        <span className="text-[13.5px] md:text-[14.5px] font-semibold text-white tracking-tight">
          Google Play
        </span>
      </div>
    </a>
  );
}

export function AppStoreButton({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://apps.apple.com/app/mbgo-musafirbaba/id6470000000"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2.5 bg-black hover:bg-neutral-900 text-white px-3.5 py-2 md:px-4 md:py-2 rounded-lg border border-neutral-700/80 transition-transform active:scale-95 shadow-md ${className}`}
    >
      <AppStoreIcon />
      <div className="flex flex-col text-left leading-tight">
        <span className="text-[8px] uppercase tracking-wider text-gray-300 font-medium">
          Download on the
        </span>
        <span className="text-[13.5px] md:text-[14.5px] font-semibold text-white tracking-tight">
          App Store
        </span>
      </div>
    </a>
  );
}
