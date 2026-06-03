"use client";

import React from "react";
import { Globe, Award, MapPin, CheckCircle2, ShieldCheck, Truck, Lock } from "lucide-react";

export default function VisaWhyChoose() {
  const points = [
    {
      title: "Visa Services for 180 Countries",
      icon: Globe,
      color: "text-blue-500",
      bgLight: "bg-blue-50/70"
    },
    {
      title: "End-to-End Visa Assistance",
      icon: Award,
      color: "text-amber-500",
      bgLight: "bg-amber-50/70"
    },
    {
      title: "Safety and Confidentiality",
      icon: MapPin,
      color: "text-emerald-500",
      bgLight: "bg-emerald-50/70"
    },
    {
      title: "No hidden charges",
      icon: CheckCircle2,
      color: "text-indigo-500",
      bgLight: "bg-indigo-50/70"
    },
    {
      title: "99% on time delivery",
      icon: ShieldCheck,
      color: "text-red-500",
      bgLight: "bg-red-50/70"
    },
    {
      title: "10+ years of experience",
      icon: Truck,
      color: "text-orange-500",
      bgLight: "bg-orange-50/70"
    },
    {
      title: "Transparency and hassle-free experience",
      icon: Lock,
      color: "text-teal-500",
      bgLight: "bg-teal-50/70"
    }
  ];

  return (
    <section className="w-full max-w-6xl mx-auto py-12 px-4 md:px-6">
      {/* Premium Header */}
      <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-xl sm:text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
          Why choose <span className="text-[#FE5300]">MusafirBaba</span>
        </h2>
        <div className="h-1 w-20 bg-[#FE5300] rounded-full mt-3.5 mb-3" />
        <p className="text-[13px] sm:text-[14px] text-slate-500 font-medium leading-relaxed">
          MusafirBaba combine unmatched expertise, absolute transparency, and doorstep support to make your global travel smooth and worry-free.
        </p>
      </div>

      {/* Modern Centered Airy Grid */}
      <div className="flex flex-wrap justify-center gap-x-12 gap-y-10 max-w-5xl mx-auto">
        {points.map((pt, idx) => {
          const Icon = pt.icon;
          return (
            <div 
              key={idx}
              className="group flex flex-col items-center text-center w-[240px] transition-all duration-300"
            >
              {/* Double-layered Curved Circular Icon Frame */}
              <div className="relative mb-4 flex items-center justify-center">
                {/* Subtle soft gradient background glow */}
                <div className={`absolute inset-0 rounded-full ${pt.bgLight} scale-90 blur-md opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 ease-out`} />
                
                {/* Solid Circular Frame */}
                <div className="relative h-16 w-16 rounded-full border border-slate-100 bg-white shadow-xs flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-slate-200 group-hover:shadow-sm">
                  {/* Inner color circle */}
                  <div className={`h-12 w-12 rounded-full ${pt.bgLight} flex items-center justify-center transition-transform duration-500 ease-out group-hover:rotate-12`}>
                    <Icon className={`h-5 w-5 ${pt.color} transition-transform duration-300 group-hover:scale-110`} />
                  </div>
                </div>
              </div>

              {/* Title description */}
              <p className="text-[13.5px] font-bold text-slate-700 leading-snug tracking-tight group-hover:text-[#FE5300] transition-colors duration-300 px-2">
                {pt.title}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
