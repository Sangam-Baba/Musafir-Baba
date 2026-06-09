"use client";

import React from "react";
import { Globe, MapPin, Sliders, ShieldCheck, Users, Headset } from "lucide-react";

function WhyChooseUs() {
  const points = [
    {
      title: "500+ Travel Experiences",
      description: "A diverse portfolio of domestic, international, religious, adventure, honeymoon, family, and customised holiday packages.",
      icon: Globe,
      color: "text-blue-500",
      bgLight: "bg-blue-50/70"
    },
    {
      title: "Destination Expertise",
      description: "Carefully planned itineraries designed using local destination knowledge, travel insights, and customer preferences.",
      icon: MapPin,
      color: "text-amber-500",
      bgLight: "bg-amber-50/70"
    },
    {
      title: "Flexible Customisation Options",
      description: "Tailor hotels, sightseeing, transportation, activities, and travel duration according to your needs.",
      icon: Sliders,
      color: "text-emerald-500",
      bgLight: "bg-emerald-50/70"
    },
    {
      title: "Trusted Travel Partner Network",
      description: "Working with reliable hotels, transport providers, guides, and local partners to enhance your travel experience.",
      icon: ShieldCheck,
      color: "text-indigo-500",
      bgLight: "bg-indigo-50/70"
    },
    {
      title: "Travel Solutions For Every Traveller",
      description: "Packages designed for couples, families, groups, solo travellers, senior citizens, and corporate travellers.",
      icon: Users,
      color: "text-red-500",
      bgLight: "bg-red-50/70"
    },
    {
      title: "Dedicated Travel Assistance",
      description: "Support before, during, and after your journey to help ensure a smooth and memorable travel experience.",
      icon: Headset,
      color: "text-orange-500",
      bgLight: "bg-orange-50/70"
    }
  ];

  return (
    <section className="w-full max-w-7xl mx-auto py-2 px-4 md:px-6">
      {/* Modern Centered Airy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 max-w-6xl mx-auto mt-6">
        {points.map((pt, idx) => {
          const Icon = pt.icon;
          return (
            <div 
              key={idx}
              className="group flex flex-col items-center text-center w-full transition-all duration-300"
            >
              {/* Double-layered Curved Circular Icon Frame */}
              <div className="relative mb-5 flex items-center justify-center">
                {/* Subtle soft gradient background glow */}
                <div className={`absolute inset-0 rounded-full ${pt.bgLight} scale-90 blur-md opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 ease-out`} />
                
                {/* Solid Circular Frame */}
                <div className="relative h-20 w-20 rounded-full border border-slate-100 bg-white shadow-xs flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:border-slate-200 group-hover:shadow-sm">
                  {/* Inner color circle */}
                  <div className={`h-14 w-14 rounded-full ${pt.bgLight} flex items-center justify-center transition-transform duration-500 ease-out group-hover:rotate-12`}>
                    <Icon className={`h-6 w-6 ${pt.color} transition-transform duration-300 group-hover:scale-110`} />
                  </div>
                </div>
              </div>

              {/* Title description */}
              <div className="flex flex-col gap-2 px-4">
                <p className="text-[16px] font-bold text-slate-800 leading-snug tracking-tight group-hover:text-[#FE5300] transition-colors duration-300">
                  {pt.title}
                </p>
                <p className="text-[14px] text-slate-500 font-medium leading-relaxed">
                  {pt.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default WhyChooseUs;
