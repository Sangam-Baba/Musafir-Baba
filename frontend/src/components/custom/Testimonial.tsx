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
import { MapPin } from "lucide-react";

export interface TestiProps {
  _id?: string;
  name: string;
  comment: string;
  location: string;
  rating?: number;
}

const GoogleIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const GoogleStars = ({ count }: { count: number }) => (
  <div className="flex gap-[2px]">
    {[...Array(5)].map((_, i) => (
      <svg 
        key={i} 
        className={`w-4 h-4 ${i < Math.floor(count) ? 'text-[#FBBC05] fill-[#FBBC05]' : 'text-gray-300 fill-gray-300'}`} 
        viewBox="0 0 20 20" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

export function Testimonial({ data }: { data: TestiProps[] }) {
  const plugin = React.useRef(
    Autoplay({ delay: 3500, stopOnInteraction: false }),
  );
  
  // High contrast avatar colors commonly seen in Google Reviews
  const avatarColors = [
    "bg-[#d93025] text-white", // Red
    "bg-[#188038] text-white", // Green
    "bg-[#1967d2] text-white", // Blue
    "bg-[#e37400] text-white", // Orange
    "bg-[#8e24aa] text-white"  // Purple
  ];

  if (!data || data.length === 0) return null;

  return (
    <section className="w-full bg-white px-4 md:px-10 py-10 md:py-14 border-t border-gray-100">
      <div className="w-full max-w-7xl mx-auto flex flex-col items-start">
        
        <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="flex flex-col gap-1 items-start">
            <span className="text-[10px] md:text-[12px] font-semibold tracking-[0.08em] text-[#FE5300] uppercase">
              TESTIMONIALS
            </span>
            <h2 className="text-2xl md:text-[32px] leading-tight font-medium text-gray-900">
              <span>Loved by</span> happy travellers
            </h2>
            <div className="flex items-center gap-2">
            <span className="text-[14px] md:text-[15px] text-gray-600 font-medium">Excellent 4.8 out of 5 based on</span>
            <div className="scale-[0.8] origin-center -mx-1">
              <GoogleIcon />
            </div>
            <span className="text-[14px] md:text-[15px] text-gray-900 font-semibold">Reviews</span>
          </div>
          </div>
        </div>

        {/* Carousel Slider */}
        <div className="w-full">
          <Carousel
            plugins={[plugin.current]}
            className="w-full"
            opts={{ align: "start", loop: true }}
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
          >
            <CarouselContent className="-ml-4">
              {data.map((item, i) => {
                const initial = item.name ? item.name.charAt(0).toUpperCase() : "T";
                const avTheme = avatarColors[i % avatarColors.length];
                const isLocationValid = item.location && item.location !== "0" && item.location.toLowerCase() !== "undefined";

                return (
                  <CarouselItem
                    key={`test-${i}-${item._id}`}
                    className="pl-4 basis-[85%] sm:basis-[48%] md:basis-[33%] lg:basis-[28%] flex"
                  >
                    <div className="py-2 w-full flex">
                      <Card className="bg-white rounded-[12px] border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 w-full h-full flex flex-col p-4">
                        
                        {/* Google Review Header */}
                        <div className="flex items-start justify-between w-full mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-[15px] shrink-0 ${avTheme}`}>
                              {initial}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-semibold text-[13px] text-gray-900 leading-tight">
                                {item.name}
                              </span>
                              <span className="text-[11px] text-gray-500 font-normal flex items-center gap-1">
                                {isLocationValid ? (
                                  <>
                                    <MapPin className="w-2.5 h-2.5" />
                                    {item.location}
                                  </>
                                ) : (
                                  "Verified Traveller"
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="scale-[0.75] origin-top-right -mr-1 -mt-1">
                            <GoogleIcon />
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="mb-2">
                          <GoogleStars count={item.rating || 5} />
                        </div>

                        {/* Review Body */}
                        <div className="relative flex-1">
                          <p className="text-gray-700 text-[13px] leading-[1.6] line-clamp-4">
                            {item.comment}
                          </p>
                        </div>
                      </Card>
                    </div>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            
            <div className="mt-4 flex justify-center w-full">
              <CarouselDots />
            </div>
          </Carousel>
        </div>
      </div>
    </section>
  );
}
