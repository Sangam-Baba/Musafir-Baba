"use client";
import React from "react";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/autoplay";

import { Pagination, Autoplay } from "swiper/modules";
import Image from "next/image";
import { MapPin, Car } from "lucide-react";

export default function RentalCarousal({
  gallery,
  title,
  location,
  vehicleType
}: {
  gallery: { url: string; alt: string }[];
  title?: string;
  location?: string;
  vehicleType?: string;
  fullWidth?: boolean; // kept for backwards compatibility but unused
}) {
  if (!gallery || gallery.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left Col: Main Slider */}
      <div className="lg:col-span-9 h-[250px] md:h-[400px] relative rounded-2xl overflow-hidden shadow-md">
        <Swiper
          pagination={{ clickable: true }}
          modules={[Pagination, Autoplay]}
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          loop={true}
          className="w-full h-full [&_.swiper-pagination-bullet-active]:bg-white [&_.swiper-pagination-bullet]:bg-white/70"
        >
          {gallery.map((image, i) => (
            <SwiperSlide key={`slide-${i}`}>
              <div className="relative w-full h-full">
                <Image
                  src={image.url}
                  alt={image.alt || "Vehicle image"}
                  fill
                  className="object-cover"
                  priority={i === 0}
                />
                {/* Overlay Gradient for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Floating Badges on Main Image */}
        <div className="absolute bottom-6 left-6 z-10 flex items-center gap-2 text-sm font-medium text-white">
          {vehicleType && (
            <span className="bg-[#FE5300] px-3 py-1 rounded-full flex items-center gap-1.5 capitalize shadow-sm">
              <Car className="w-3.5 h-3.5" /> {vehicleType}
            </span>
          )}
          {location && (
            <span className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <MapPin className="w-3.5 h-3.5" /> {location}
            </span>
          )}
        </div>
      </div>

      {/* Right Col: Vertical Infinite Slider */}
      <div className="hidden lg:block lg:col-span-3 h-[400px] relative">
        <Swiper
          direction="vertical"
          slidesPerView={3}
          spaceBetween={16}
          loop={true}
          modules={[Autoplay]}
          autoplay={{ delay: 3000, disableOnInteraction: false, reverseDirection: true }}
          className="w-full h-full"
        >
          {gallery.map((image, i) => (
            <SwiperSlide key={i} className="rounded-2xl overflow-hidden relative shadow-sm">
              <Image
                src={image.url}
                alt={`side image ${i + 1}`}
                fill
                className="object-cover"
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}
