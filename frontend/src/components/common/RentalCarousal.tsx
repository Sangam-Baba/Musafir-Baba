"use client";
import React, { useRef, useState } from "react";

import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperType } from "swiper";

// Import Swiper styles
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";
import "swiper/css/thumbs";

// import required modules
import { FreeMode, Navigation, Thumbs } from "swiper/modules";
import Image from "next/image";

export default function RentalCarousal({
  gallery,
}: {
  gallery: { url: string; alt: string }[];
}) {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);

  return (
    <>
      <Swiper
        spaceBetween={10}
        navigation={true}
        thumbs={{ swiper: thumbsSwiper }}
        modules={[FreeMode, Navigation, Thumbs]}
        className="mySwiper2"
      >
        {gallery.map((image) => (
          <SwiperSlide key={image.url}>
            <Image
              src={gallery[0].url}
              alt={gallery[0].alt}
              width={500}
              height={500}
            />
          </SwiperSlide>
        ))}
      </Swiper>
      <Swiper
        onSwiper={setThumbsSwiper}
        spaceBetween={10}
        slidesPerView={4}
        freeMode={true}
        watchSlidesProgress={true}
        modules={[FreeMode, Navigation, Thumbs]}
        className="mySwiper"
      >
        {gallery.map((image) => (
          <SwiperSlide key={image.url}>
            <Image
              src={gallery[0].url}
              alt={gallery[0].alt}
              width={500}
              height={500}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </>
  );
}
