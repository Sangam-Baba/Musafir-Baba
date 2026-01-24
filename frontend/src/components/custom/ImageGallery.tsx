"use client";

import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

import { EffectCoverflow, Pagination } from "swiper/modules";

interface GalleryInterface {
  url: string;
  alt: string;
}

export function ImageGallery({
  title,
  description,
  data,
}: {
  title: string;
  description?: string;
  data?: GalleryInterface[];
}) {
  if (!data || data.length === 0) return null;

  return (
    <section className="w-full px-4 md:px-8 lg:px-20 py-10 md:py-16">
      {/* Heading */}
      <div className="flex flex-col gap-2 items-center text-center mb-8">
        <h2 className="text-lg md:text-3xl font-bold">{title}</h2>
        <div className="h-1 w-24 bg-[#FE5300] rounded-full" />
        {description && (
          <p className="text-gray-600 max-w-2xl">{description}</p>
        )}
      </div>

      <Swiper
        effect="coverflow"
        grabCursor
        centeredSlides={true}
        loop={true}
        slidesPerView={2}
        spaceBetween={0}
        coverflowEffect={{
          rotate: 50,
          stretch: 0,
          depth: 120,
          modifier: 1,
          slideShadows: true,
        }}
        pagination={{ clickable: true }}
        breakpoints={{
          640: {
            slidesPerView: 2,
          },
          1024: {
            slidesPerView: 4,
          },
          1280: {
            slidesPerView: 5,
          },
        }}
        modules={[EffectCoverflow, Pagination]}
        className="w-full max-w-7xl mx-auto"
      >
        {data.map((item, i) => (
          <SwiperSlide key={i}>
            <div className="px-2">
              <div className="relative h-[220px] sm:h-[260px] md:h-[300px] lg:h-[340px] overflow-hidden rounded-2xl shadow-lg">
                <Image
                  src={item.url}
                  alt={item.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 90vw,
                         (max-width: 1024px) 45vw,
                         30vw"
                />
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
