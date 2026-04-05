"use client";
import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/navigation";

import { Navigation, Thumbs, Autoplay } from "swiper/modules";
import Image from "next/image";
import "swiper/css/autoplay";

export default function RentalCarousal({
  gallery,
  fullWidth = false,
  title,
}: {
  gallery: { url: string; alt: string }[];
  fullWidth?: boolean;
  title?: string;
}) {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);

  if (!gallery || gallery.length === 0) return null;

  return (
    <div className="w-full overflow-hidden">
      {/* Desktop Layout */}
      <div className={`hidden md:grid gap-2 ${fullWidth ? 'grid-cols-4 w-full h-[60vh] md:h-[75vh]' : 'grid-cols-3 h-[500px] max-w-7xl mx-auto px-4'}`}>
        {/* Main Large Image */}
        <div className={`${fullWidth ? 'col-span-3' : 'col-span-2'} relative ${!fullWidth ? 'rounded-2xl overflow-hidden' : ''}`}>
          <Swiper
            loop
            navigation
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
            }}
            thumbs={{ swiper: thumbsSwiper }}
            modules={[Navigation, Thumbs, Autoplay]}
            className="w-full h-full"
          >
            {gallery.map((image) => (
              <SwiperSlide key={image.url}>
                <div className="relative w-full h-full">
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    className="object-cover"
                    priority
                  />
                  {fullWidth && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end justify-start p-10 md:p-16">
                      <div className="max-w-4xl">
                        <h1 className="text-white text-4xl md:text-7xl font-black uppercase tracking-tight drop-shadow-2xl">
                          {title}
                        </h1>
                        <div className="w-24 h-2 bg-[#FE5300] mt-4 rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Right Side Stacked Images */}
        <div className="grid grid-rows-3 gap-2 h-full">
          {gallery.slice(0, 3).map((image, index) => (
            <div
              key={image.url}
              className={`relative ${!fullWidth ? 'rounded-2xl' : ''} overflow-hidden cursor-pointer group`}
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                className="object-cover group-hover:scale-110 transition duration-700"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition duration-500" />
              
              {/* Overlay for "More Images" on the last thumbnail slot */}
              {index === 2 && gallery.length > 3 && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white backdrop-blur-[2px] group-hover:bg-black/40 transition-colors">
                  <span className="text-2xl font-black">+ {gallery.length - 3}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">More Photos</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Slider */}
      <div className={`md:hidden ${fullWidth ? 'relative w-full h-[50vh]' : 'max-w-7xl mx-auto px-4 h-[300px] mt-4'}`}>
        <div className={`w-full h-full relative ${!fullWidth ? 'rounded-2xl overflow-hidden shadow-lg' : ''}`}>
          <Swiper
            loop
            navigation
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
            }}
            modules={[Navigation, Autoplay]}
            className="w-full h-full"
          >
            {gallery.map((image) => (
              <SwiperSlide key={image.url}>
                <div className="relative w-full h-full">
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    className="object-cover"
                  />
                  {fullWidth && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-6">
                      <h1 className="text-white text-3xl font-bold text-center drop-shadow-lg uppercase">
                        {title}
                      </h1>
                    </div>
                  )}
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  );
}
