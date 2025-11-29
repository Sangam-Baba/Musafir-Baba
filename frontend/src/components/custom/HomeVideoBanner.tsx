"use client";
import React from "react";
import { useEffect, useRef, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { VideoBannerType } from "@/components/admin/VideoBannerList";
import Image from "next/image";

function HomeVideoBanner({ data }: { data: VideoBannerType[] }) {
  // const mediaVideo = await getAllMedia();
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setIsVisible(true),
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="w-full max-w-7xl mx-auto">
      {!isVisible && (
        <div className="w-full h-[200px] bg-gray-400 aspect-w-553 aspect-h-200">
          <Image
            src={data?.[0]?.media?.thumbnail_url}
            fill
            alt="h1"
            className="rounded-2xl w-full"
          />
        </div>
      )}
      {isVisible && (
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
                    style={{ aspectRatio: "553/200" }} // KEY
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
      )}
    </div>
  );
}

export default HomeVideoBanner;
