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
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "../ui/button";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";

export default function RentalCarousal({
  gallery,
  vehicleName,
  vehiclePrice,
  slug,
}: {
  gallery: { url: string; alt: string }[];
  vehicleName: string;
  vehiclePrice: string;
  slug: string;
}) {
  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  return (
    <div className="relative w-full">
      <Swiper
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 4000 }}
        loop
        modules={[Navigation]}
        className="w-full h-[70vh] md:h-[85vh]"
      >
        {gallery.map((image: any) => (
          <SwiperSlide key={image.url}>
            <div className="relative w-full h-full">
              {/* Background Image */}
              <Image
                src={image.url}
                alt={image.alt}
                fill
                priority
                className="object-cover"
              />

              {/* Dark Overlay */}
              <div className="absolute inset-0 bg-black/55"></div>

              {/* Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white px-4">
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight capitalize">
                  {vehicleName}
                </h1>

                {/* <p className="mt-4 text-lg md:text-xl max-w-2xl">
                  Explore the city with comfort and style. Affordable pricing,
                  easy booking, and top-quality vehicles.
                </p> */}

                <div className="mt-6 flex flex-col sm:flex-row gap-4">
                  {!accessToken ? (
                    <Button
                      onClick={() =>
                        useAuthDialogStore
                          .getState()
                          .openDialog("login", undefined, `/rental/${slug}`)
                      }
                      size={"lg"}
                      className="m-4 bg-[#FE5300] hover:bg-[#FE5300] font-semibold text-xl"
                    >
                      Login to Book ₹{vehiclePrice}
                    </Button>
                  ) : (
                    <button className="border border-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-white hover:text-black transition">
                      Start from ₹{vehiclePrice}/day
                    </button>
                  )}
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
