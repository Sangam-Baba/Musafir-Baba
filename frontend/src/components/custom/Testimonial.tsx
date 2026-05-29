"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { CarouselDots } from "../ui/carousel-indicators";
import { MapPin, Quote } from "lucide-react";
import StarRating from "./Star";

export interface TestiProps {
  _id?: string;
  name: string;
  comment: string;
  location: string;
  rating?: number;
}

export function Testimonial({ data }: { data: TestiProps[] }) {
  const plugin = React.useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true }),
  );
  const testiData = data;

  // Curated soft background avatar colors for handcrafted human touch
  const avatarColors = [
    "bg-orange-50 text-orange-600 border-orange-100/50",
    "bg-blue-50 text-blue-600 border-blue-100/50",
    "bg-teal-50 text-teal-600 border-teal-100/50",
    "bg-purple-50 text-purple-600 border-purple-100/50",
    "bg-amber-50 text-amber-600 border-amber-100/50"
  ];

  // Subtle border variations to create dynamic visual rhythm
  const borderThemes = [
    "border-slate-100/80 hover:border-orange-200/60",
    "border-slate-100/80 hover:border-blue-200/60",
    "border-slate-100/80 hover:border-teal-200/60"
  ];

  return (
    data.length > 0 && (
      <section className="w-full py-12 flex flex-col items-center">
        {/* Headheading Area */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-10 px-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">
            Traveller Voices
          </span>
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
            Loved by Happy Travellers
          </h2>
          <div className="h-1 w-16 bg-[#FE5300] rounded-full mt-2.5 mb-3" />
          <p className="text-[13px] sm:text-[14px] text-slate-500 font-medium leading-relaxed">
            Real stories, authentic experiences, and unforgettable journeys planned by our global visa experts.
          </p>
        </div>

        {/* Carousel Slider */}
        <div className="w-full max-w-6xl px-4 mx-auto relative">
          <Carousel
            plugins={[plugin.current]}
            className="w-full"
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
          >
            <CarouselContent className="-ml-4">
              {testiData?.map((item, i) => {
                const initial = item.name ? item.name.charAt(0).toUpperCase() : "T";
                const avTheme = avatarColors[i % avatarColors.length];
                const borderTheme = borderThemes[i % borderThemes.length];
                
                // Human-centric location fallback for clean interface
                const isLocationValid = item.location && item.location !== "0" && item.location.toLowerCase() !== "undefined";

                return (
                  <CarouselItem
                    key={`test-${i}-${item._id}`}
                    className="pl-4 md:basis-1/2 lg:basis-1/3 flex"
                  >
                    <div className="p-1 w-full flex">
                      <Card className={`relative bg-white rounded-2xl border ${borderTheme} shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 ease-in-out h-full flex flex-col justify-between overflow-hidden w-full`}>
                        
                        {/* Soft quote sign backdrop */}
                        <div className="absolute top-5 right-5 text-slate-100 pointer-events-none select-none">
                          <Quote className="h-8 w-8 opacity-30 transform scale-x-[-1]" />
                        </div>

                        <CardContent className="p-6 flex flex-col justify-between h-full gap-6">
                          
                          {/* Testimonial body text */}
                          <div className="relative">
                            <p className="text-slate-600 text-[13.5px] leading-relaxed font-medium italic">
                              “{item.comment}”
                            </p>
                          </div>

                          {/* Identity area */}
                          <div className="pt-4 border-t border-slate-50 flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                              {/* Curved Dynamic Initial Avatar badge */}
                              <div className={`h-9 w-9 rounded-full border ${avTheme} font-black text-xs flex items-center justify-center shrink-0 tracking-wider shadow-2xs`}>
                                {initial}
                              </div>

                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-800 text-[13.5px] leading-tight truncate">
                                  {item.name}
                                </span>
                                
                                {isLocationValid ? (
                                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                    <MapPin size={11} className="text-slate-300 shrink-0" />
                                    <span className="truncate">{item.location}</span>
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    Verified Traveller
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Ratings section */}
                            {item.rating && (
                              <div className="flex items-center gap-2 mt-1">
                                <StarRating rating={item.rating || 4.5} />
                                <span className="text-[10px] font-black text-slate-400 font-mono mt-0.5 tracking-wider">
                                  {Number(item.rating).toFixed(1)} / 5.0
                                </span>
                              </div>
                            )}

                          </div>

                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            
            {/* Dots paginator */}
            <div className="mt-6">
              <CarouselDots />
            </div>
          </Carousel>
        </div>
      </section>
    )
  );
}
