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

import frame1 from "../../../public/frame1.webp";
import frame2 from "../../../public/frame2.jpg";
import frame3 from "../../../public/frame3.jpg";
import frame4 from "../../../public/frame4.webp";
import frame5 from "../../../public/frame5.jpg";
import frame6 from "../../../public/frame6.jpg";
import frame7 from "../../../public/frame7.jpg";
import frame8 from "../../../public/frame8.webp";
const images = [
  {
    id: 1,
    img: frame5,
  },
  {
    id: 2,
    img: frame1,
  },
  {
    id: 3,
    img: frame2,
  },
  {
    id: 4,
    img: frame3,
  },
  {
    id: 5,
    img: frame4,
  },
  {
    id: 6,
    img: frame5,
  },
  {
    id: 7,
    img: frame6,
  },
  {
    id: 8,
    img: frame7,
  },
  {
    id: 9,
    img: frame8,
  },
];

export function ImageGallery() {
  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  );

  return (
    <section className="w-full px-4 md:px-8 lg:px-20 md:py-16 py-8 flex flex-col items-center">
      {/* Heading */}
      <div className="flex flex-col gap-2 items-center py-4 text-center">
        <h4 className="text-2xl md:text-3xl font-bold">Journey In Frames</h4>
        <div className="h-1 w-24 bg-[#FE5300] rounded-full"></div>
        <p className="text-gray-600">
          Picture Perfect Moments with the Best Travel Agency in Delhi
        </p>
      </div>

      {/* Carousel */}
      <Carousel
        plugins={[plugin.current]}
        className="max-w-6xl w-full"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <CarouselContent>
          {images.map((item) => (
            <CarouselItem
              key={item.id}
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
                    src={item.img}
                    alt={`trip-${item.id}`}
                    className="w-full h-80 object-cover"
                  />
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {/* <CarouselPrevious />
        <CarouselNext /> */}
      </Carousel>
    </section>
  );
}
