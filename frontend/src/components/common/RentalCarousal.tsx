"use client";
import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";

import "swiper/css";
import "swiper/css/navigation";

import { Navigation, Thumbs } from "swiper/modules";
import Image from "next/image";

export default function RentalCarousal({
  gallery,
}: {
  gallery: { url: string; alt: string }[];
}) {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);

  if (!gallery || gallery.length === 0) return null;

  return (
    <div className="w-full">
      {/* Desktop Layout */}
      <div className="hidden md:grid grid-cols-3 gap-4 h-[500px]">
        {/* Main Large Image */}
        <div className="col-span-2 relative rounded-2xl overflow-hidden">
          <Swiper
            loop
            navigation
            thumbs={{ swiper: thumbsSwiper }}
            modules={[Navigation, Thumbs]}
            className="w-full h-full"
          >
            {gallery.map((image) => (
              <SwiperSlide key={image.url}>
                <div className="relative w-full h-full">
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    className="object-cover hover:scale-105 transition duration-300"
                    priority
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Right Side Stacked Images */}
        <div className="grid grid-rows-3 gap-4 h-full">
          {gallery.slice(0, 3).map((image) => (
            <div
              key={image.url}
              className="relative rounded-2xl overflow-hidden cursor-pointer"
            >
              <Image
                src={image.url}
                alt={image.alt}
                fill
                className="object-cover hover:scale-105 transition duration-300"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Slider */}
      <div className="md:hidden">
        <Swiper
          loop
          navigation
          modules={[Navigation]}
          className="w-full h-[300px] rounded-2xl overflow-hidden"
        >
          {gallery.map((image) => (
            <SwiperSlide key={image.url}>
              <div className="relative w-full h-[300px]">
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  className="object-cover"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}
