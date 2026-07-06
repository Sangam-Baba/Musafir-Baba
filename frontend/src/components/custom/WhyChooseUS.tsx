"use client";

import React from "react";
import { Globe, MapPin, Sliders, ShieldCheck, Users, Headset } from "lucide-react";

function WhyChooseUs() {
  const points = [
    {
      title: "500+ travel experiences",
      description: "Domestic, international, religious, adventure, honeymoon, family, and customised holiday packages.",
      icon: Globe,
    },
    {
      title: "Destination expertise",
      description: "Carefully planned itineraries using local knowledge, travel insights, and customer preferences.",
      icon: MapPin,
    },
    {
      title: "Flexible customisation",
      description: "Tailor hotels, sightseeing, transportation, activities, and travel duration to your needs.",
      icon: Sliders,
    },
    {
      title: "Trusted partner network",
      description: "Reliable hotels, transport providers, guides, and local partners to enhance your experience.",
      icon: ShieldCheck,
    },
    {
      title: "Travel solutions for everyone",
      description: "Packages for couples, families, groups, solo travellers, senior citizens, and corporates.",
      icon: Users,
    },
    {
      title: "Dedicated travel assistance",
      description: "Support before, during, and after your journey for a smooth and memorable experience.",
      icon: Headset,
    }
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        {points.map((pt, idx) => {
          const Icon = pt.icon;
          return (
            <div 
              key={idx}
              className="group flex flex-col items-start w-full border border-gray-200 rounded-[16px] p-6 md:p-8 bg-white hover:border-[#FE5300]/40 hover:shadow-sm transition-all duration-300"
            >
              {/* Clean Icon */}
              <Icon className="h-6 w-6 text-[#FE5300] mb-6 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.75} />

              {/* Title & description */}
              <div className="flex flex-col gap-2">
                <p className="text-[17px] font-medium text-gray-900 leading-snug">
                  {pt.title}
                </p>
                <p className="text-[14.5px] text-gray-600 font-normal leading-relaxed">
                  {pt.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WhyChooseUs;
