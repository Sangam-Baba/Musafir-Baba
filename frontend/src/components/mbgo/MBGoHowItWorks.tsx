import React from "react";
import Image from "next/image";

function PhoneEnterDetails() {
  return (
    <svg viewBox="0 0 110 140" className="w-20 h-28 mx-auto" fill="none">
      {/* Smartphone Outer Body */}
      <rect x="12" y="6" width="86" height="128" rx="16" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
      <rect x="16" y="16" width="78" height="106" rx="8" fill="#F8FAFC" />
      {/* Speaker Notch */}
      <rect x="44" y="10" width="22" height="2.5" rx="1.2" fill="#94A3B8" />
      {/* Home / Bar */}
      <circle cx="55" cy="128" r="3" fill="#E2E8F0" />
      {/* Map Route Graphic */}
      <circle cx="55" cy="38" r="9" fill="#0D9488" opacity="0.15" />
      <circle cx="55" cy="38" r="5" fill="#0D9488" />
      <circle cx="55" cy="38" r="2" fill="#FFFFFF" />
      <path d="M35 78 Q55 58 55 45 Q55 58 75 78 Q65 92 55 92 Q45 92 35 78 Z" fill="#0D9488" opacity="0.8" />
      <path d="M42 78 Q55 65 68 78" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function PhoneChooseRide() {
  return (
    <svg viewBox="0 0 110 140" className="w-20 h-28 mx-auto" fill="none">
      {/* Smartphone Outer Body */}
      <rect x="12" y="6" width="86" height="128" rx="16" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
      <rect x="16" y="16" width="78" height="106" rx="8" fill="#F8FAFC" />
      {/* Speaker Notch */}
      <rect x="44" y="10" width="22" height="2.5" rx="1.2" fill="#94A3B8" />
      <circle cx="55" cy="128" r="3" fill="#E2E8F0" />

      {/* 3 Ride Options */}
      {/* Top Ride - Amber/Yellow */}
      <rect x="22" y="24" width="66" height="26" rx="5" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="1" />
      <path d="M32 38 Q38 32 55 32 Q72 32 78 38" stroke="#D97706" strokeWidth="1.5" fill="none" />
      <circle cx="40" cy="42" r="2.5" fill="#1F2937" />
      <circle cx="70" cy="42" r="2.5" fill="#1F2937" />

      {/* Middle Ride - White / Gray */}
      <rect x="22" y="56" width="66" height="26" rx="5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
      <path d="M32 70 Q38 64 55 64 Q72 64 78 70" stroke="#475569" strokeWidth="1.5" fill="none" />
      <circle cx="40" cy="74" r="2.5" fill="#1F2937" />
      <circle cx="70" cy="74" r="2.5" fill="#1F2937" />

      {/* Bottom Ride - Green / Teal */}
      <rect x="22" y="88" width="66" height="26" rx="5" fill="#F0FDF4" stroke="#10B981" strokeWidth="1" />
      <path d="M32 102 Q38 96 55 96 Q72 96 78 102" stroke="#059669" strokeWidth="1.5" fill="none" />
      <circle cx="40" cy="106" r="2.5" fill="#1F2937" />
      <circle cx="70" cy="106" r="2.5" fill="#1F2937" />
    </svg>
  );
}

function PhoneConfirmPay() {
  return (
    <svg viewBox="0 0 110 140" className="w-20 h-28 mx-auto" fill="none">
      {/* Smartphone Outer Body */}
      <rect x="12" y="6" width="86" height="128" rx="16" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
      <rect x="16" y="16" width="78" height="106" rx="8" fill="#F8FAFC" />
      {/* Speaker Notch */}
      <rect x="44" y="10" width="22" height="2.5" rx="1.2" fill="#94A3B8" />
      <circle cx="55" cy="128" r="3" fill="#E2E8F0" />

      {/* Payment Verified Green Donut Badge */}
      <circle cx="55" cy="50" r="14" fill="#10B981" />
      <circle cx="55" cy="50" r="6" fill="#FFFFFF" />

      {/* Card / Currency Shape */}
      <rect x="30" y="76" width="50" height="20" rx="4" fill="#0D9488" opacity="0.8" />
      <rect x="36" y="82" width="16" height="8" rx="2" fill="#FFFFFF" opacity="0.9" />
    </svg>
  );
}

function EnjoyRideScene() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-2">
      {/* City Skyline Sketch in Background */}
      <svg viewBox="0 0 120 70" className="absolute inset-x-0 bottom-6 w-full h-20 opacity-30 pointer-events-none" fill="none">
        <rect x="10" y="20" width="12" height="50" fill="#94A3B8" />
        <rect x="25" y="10" width="16" height="60" fill="#64748B" />
        <rect x="44" y="25" width="14" height="45" fill="#94A3B8" />
        <rect x="62" y="8" width="18" height="62" fill="#64748B" />
        <rect x="83" y="18" width="14" height="52" fill="#94A3B8" />
        <rect x="100" y="28" width="12" height="42" fill="#94A3B8" />
      </svg>

      {/* Floating Orange Location Pin Marker on Top */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center z-10 animate-bounce duration-1000">
        <svg viewBox="0 0 24 24" fill="#FE5300" className="w-6 h-6 drop-shadow-xs">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#FE5300" />
          <circle cx="12" cy="9" r="2.5" fill="#FFFFFF" />
        </svg>
      </div>

      {/* White Sedan Car Arriving */}
      <div className="relative w-28 h-16 mt-6 z-10">
        <Image
          src="/partner/ser1.avif"
          alt="Enjoy Your Ride with MBGo"
          fill
          className="object-contain"
        />
      </div>
    </div>
  );
}

const STEPS = [
  {
    step: 1,
    title: "Enter Details",
    description: "Enter your pickup, drop, date and time.",
    component: PhoneEnterDetails,
  },
  {
    step: 2,
    title: "Choose Your Ride",
    description: "Select from a wide range of vehicles.",
    component: PhoneChooseRide,
  },
  {
    step: 3,
    title: "Confirm & Pay",
    description: "Confirm your booking with secure payment.",
    component: PhoneConfirmPay,
  },
  {
    step: 4,
    title: "Enjoy Your Ride",
    description: "Sit back and enjoy a safe and comfortable ride.",
    component: EnjoyRideScene,
  },
];

export default function MBGoHowItWorks() {
  return (
    <section id="how-it-works" className="w-full px-4 md:px-8 py-16 md:py-24 bg-white scroll-mt-16">
      <div className="max-w-7xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-14 md:mb-18">
          <h2 className="text-2xl sm:text-3xl md:text-[34px] font-black text-gray-950 tracking-tight">
            How It Works
          </h2>
        </div>

        {/* 4 Steps Row with Connecting Lines */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 lg:gap-4 xl:gap-6">
          {STEPS.map((item, idx) => {
            const Visual = item.component;
            return (
              <React.Fragment key={item.step}>
                {/* Step Item Column */}
                <div className="flex flex-col items-center text-center w-full max-w-[220px]">
                  {/* Step Card Visual Container */}
                  <div className="relative w-[150px] h-[150px] sm:w-[165px] sm:h-[165px] bg-white rounded-[22px] border border-gray-100 shadow-[0_8px_25px_rgba(0,0,0,0.06)] flex items-center justify-center group-hover:shadow-md transition-all duration-300">
                    {/* Top-Left Yellow Circle Badge */}
                    <span className="absolute -top-3 -left-3 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FFD43B] text-gray-950 text-[15px] sm:text-[16px] font-black flex items-center justify-center shadow-xs border-3 border-white z-20">
                      {item.step}
                    </span>

                    {/* Step Visual Graphic */}
                    <div className="w-full h-full flex items-center justify-center p-2 overflow-hidden">
                      <Visual />
                    </div>
                  </div>

                  {/* Step Title & Description */}
                  <h3 className="text-[16px] sm:text-[17px] font-bold text-gray-950 mt-5 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-[13px] text-gray-500 leading-relaxed max-w-[190px] mt-1.5">
                    {item.description}
                  </p>
                </div>

                {/* Horizontal Divider Line between Steps (Desktop only) */}
                {idx < STEPS.length - 1 && (
                  <div className="hidden lg:block w-10 xl:w-16 h-[1.5px] bg-gray-200 self-center -mt-16 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
