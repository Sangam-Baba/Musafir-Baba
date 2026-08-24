import React from "react";
import Image from "next/image";
import { Ticket, BadgePercent, ShieldCheck, Headphones } from "lucide-react";
import { GooglePlayButton, AppStoreButton } from "./MBGoAppBadges";
import MBGoSearchWidget from "./MBGoSearchWidget";

const HIGHLIGHTS = [
  { icon: Ticket, label: "Easy Booking" },
  { icon: BadgePercent, label: "Fair Prices" },
  { icon: ShieldCheck, label: "Verified Drivers" },
  { icon: Headphones, label: "24x7 Support" },
];

export default function MBGoHero() {
  return (
    <section className="relative w-full min-h-[640px] md:min-h-[720px] lg:min-h-[780px] flex flex-col justify-between pt-24 md:pt-28 lg:pt-32 pb-8 sm:pb-12 px-4 md:px-8 overflow-hidden">
      {/* Background Hero Banner Image with smooth atmospheric gradient */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src="/homebanner007.avif"
          alt="MBGo by MusafirBaba - Smart Mobility & Ride Booking App"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-white" />
      </div>

      {/* Hero Content Area */}
      <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col items-center text-center my-auto py-6 sm:py-10">
        {/* Main H1 Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[68px] font-black text-gray-950 tracking-tight leading-[1.08] drop-shadow-xs max-w-4xl">
          Your Journey. <br />
          <span className="text-gray-900">Our Responsibility.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-[15px] sm:text-lg md:text-xl text-gray-800 font-medium max-w-2xl mt-4 leading-relaxed drop-shadow-xs">
          Local rides, outstation trips, airport transfers and rentals – all in one app.
        </p>

        {/* 4 Feature Highlights */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 md:gap-8 mt-7 sm:mt-8">
          {HIGHLIGHTS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-gray-200/70 shadow-xs text-gray-800 text-[12.5px] sm:text-[13.5px] font-semibold"
            >
              <Icon className="w-4 h-4 text-[#FE5300]" />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {/* App Download Buttons */}
        <div className="mt-8 flex flex-col items-center gap-2.5">
          <span className="text-[12px] sm:text-[13px] font-bold text-gray-800 uppercase tracking-wider">
            Download MBGo App
          </span>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <GooglePlayButton />
            <AppStoreButton />
          </div>
        </div>
      </div>

      {/* Floating Interactive Booking Search Widget */}
      <div className="relative z-10 w-full mt-6 sm:mt-10">
        <MBGoSearchWidget />
      </div>
    </section>
  );
}
