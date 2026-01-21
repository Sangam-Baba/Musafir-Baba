"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  // CarouselNext,
  // CarouselPrevious,
} from "@/components/ui/carousel";
import Image from "next/image";

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
  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true }),
  );
  if (!data || data.length === 0) return null;
  const finalImages = data;
  return (
    <section className="w-full px-4 md:px-8 lg:px-20 md:py-16 py-8 flex flex-col items-center">
      {/* Heading */}
      <div className="flex flex-col gap-2 items-center py-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
        <div className="h-1 w-24 bg-[#FE5300] rounded-full"></div>
        <p className="text-gray-600">{description}</p>
      </div>

      {/* Carousel */}
      <Carousel
        plugins={[plugin.current]}
        className="max-w-6xl w-full"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <CarouselContent>
          {finalImages.map((item, i) => (
            <CarouselItem
              key={i}
              className="md:basis-1/2 lg:basis-1/4 flex justify-center"
            >
              <div className="p-4 w-full">
                <div
                  className="overflow-hidden rounded-xl shadow-md transform transition-transform duration-500 hover:scale-105"
                  style={{
                    transform: "perspective(1000px) rotateY(5deg)", // slight curve effect
                  }}
                >
                  <Image
                    width={550}
                    height={550}
                    src={item.url}
                    alt={item.alt}
                    className="w-full h-80 object-cover"
                  />
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </section>
  );
}
