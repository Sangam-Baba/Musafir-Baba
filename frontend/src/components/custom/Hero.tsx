"use client";

import Image from "next/image";
import React, { useState } from "react";
import { stripHtml } from "@/lib/utils";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/autoplay";
import "swiper/css/free-mode";
import "swiper/css/thumbs";
import { Autoplay, EffectFade, Thumbs, FreeMode } from "swiper/modules";

type Align = "left" | "center" | "right";

type Height = "sm" | "md" | "lg" | "xl";

export interface HeroProps {
  image: string;
  images?: string[];

  title: string;

  description?: string;

  align?: Align;

  height?: Height;

  overlayOpacity?: number;

  aspectRatio?: string;

  className?: string;

  children?: React.ReactNode;
}

const heightToClasses: Record<Height, string> = {
  sm: "h-[260px] md:h-[320px]",
  md: "h-[360px] md:h-[420px]",
  lg: "h-[460px] md:h-[520px]",
  xl: "h-[560px] md:h-[640px]",
};

export default function Hero({
  image,
  title,
  description,
  align = "center",
  height = "md",
  overlayOpacity = 60,
  aspectRatio = "aspect-5/2",
  className = "",
  images,
  children,
}: HeroProps) {
  const overlay = Math.min(100, Math.max(0, overlayOpacity));
  const [thumbsSwiper, setThumbsSwiper] = useState<any>(null);

  return (
    <section
      className={`relative w-full ${aspectRatio} flex justify-center  ${className}`}
    >
      {/* Background image */}
      <div className="absolute inset-0">
        {images && images.length > 1 ? (
          <Swiper
            effect="fade"
            loop={true}
            autoplay={{
              delay: 3000,
              disableOnInteraction: false,
            }}
            thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
            modules={[Autoplay, EffectFade, Thumbs]}
            className="w-full h-full"
            allowTouchMove={false}
          >
            {images.map((img, idx) => (
              <SwiperSlide key={idx} className="w-full h-full">
                <Image
                  src={img}
                  alt={title}
                  fill
                  priority={idx === 0}
                  fetchPriority={idx === 0 ? "high" : "auto"}
                  sizes="
                  (max-width: 480px) 100vw,
                  (max-width: 768px) 100vw,
                  (max-width: 1200px) 1200px,
                  1600px
                "
                  className="object-cover"
                />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <Image
            src={image}
            alt={title}
            fill
            priority
            fetchPriority="high"
            sizes="
            (max-width: 480px) 100vw,
            (max-width: 768px) 100vw,
            (max-width: 1200px) 1200px,
            1600px
          "
            className="object-cover"
          />
        )}
        {/* Overlay */}
        <div
          className={`absolute inset-0 z-10 pointer-events-none ${
            align === "left" 
              ? "bg-gradient-to-r from-black/90 via-black/60 to-transparent" 
              : align === "right"
              ? "bg-gradient-to-l from-black/90 via-black/60 to-transparent"
              : "bg-black/60"
          }`}
        />
      </div>

      {/* Thumbnails Navigation */}
      {images && images.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center w-full px-4">
          <div className="max-w-md w-full">
            <Swiper
              onSwiper={setThumbsSwiper}
              spaceBetween={10}
              slidesPerView={4}
              freeMode={true}
              watchSlidesProgress={true}
              modules={[FreeMode, Thumbs]}
              className="thumbs-slider"
            >
              {images.map((img, idx) => (
                <SwiperSlide key={`thumb-${idx}`} className="cursor-pointer overflow-hidden rounded-md border-2 border-transparent opacity-60 [&.swiper-slide-thumb-active]:border-white [&.swiper-slide-thumb-active]:opacity-100 transition-all duration-300">
                  <div className="relative w-full h-12 md:h-16">
                    <Image
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      className="object-cover"
                      sizes="150px"
                    />
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className={`relative z-10 w-full flex items-center pt-10 md:pt-28 ${
          images && images.length > 1 ? "pb-24 md:pb-28" : "pb-10 md:pb-14"
        } ${
          align === "left"
            ? "justify-start text-left"
            : align === "right"
              ? "justify-end text-right"
              : "justify-center text-center"
        }`}
      >
        <div
          className={`px-4 md:px-8 ${
            align === "center" ? "w-full max-w-5xl" : "max-w-2xl"
          }`}
        >
          <h1
            className={`text-white text-xl sm:text-2xl md:text-5xl font-bold tracking-tight drop-shadow-xl ${
              align === "left" ? "text-center md:text-left" : align === "right" ? "text-right" : "text-center"
            }`}
          >
            {title}
          </h1>

          {description && (
            <p
              className={`mt-3 md:mt-4 text-white/90 text-sm md:text-base hidden md:block drop-shadow-lg ${
                align === "left" ? "text-center md:text-left" : align === "right" ? "text-right" : "text-center"
              }`}
            >
              {stripHtml(description)}
            </p>
          )}

          {children && (
            <div
              className={`mt-5 flex flex-wrap gap-3 ${
                align === "left" ? "justify-center md:justify-start" : align === "right" ? "justify-center md:justify-end" : "justify-center"
              }`}
            >
              {children}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
