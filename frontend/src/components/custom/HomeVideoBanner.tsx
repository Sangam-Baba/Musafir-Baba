"use client";
import React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { VideoBannerType } from "@/components/admin/VideoBannerList";
export const getAllMedia = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/videobanner`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Failed to fetch media");
  const data = await res.json();
  return data?.data;
};
function HomeVideoBanner({ data }: { data: VideoBannerType[] }) {
  // const mediaVideo = await getAllMedia();
  return (
    <div className="w-full max-w-7xl mx-auto">
      <Carousel
        opts={{ loop: true }}
        plugins={[Autoplay({ delay: 5000, stopOnInteraction: false })]}
        className="w-full"
      >
        <CarouselContent>
          {data?.map((item: VideoBannerType, index: number) => (
            <CarouselItem key={index}>
              <a
                href={item.link}
                className="relative w-full overflow-hidden rounded-lg"
              >
                <video
                  className="w-full h-full object-cover rounded-xl"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="none"
                  controls={false}
                  poster={item.media?.thumbnail_url}
                  style={{ aspectRatio: "553/150" }} // KEY
                >
                  <source src={item.media?.url} />
                </video>

                <CarouselPrevious className="absolute left-3 top-1/2 -translate-y-1/2 z-20" />
                <CarouselNext className="absolute right-3 top-1/2 -translate-y-1/2 z-20" />
              </a>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}

export default HomeVideoBanner;
