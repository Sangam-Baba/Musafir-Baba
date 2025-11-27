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
import { coverImage } from "@/app/(user)/news/page";
const images = [
  {
    id: 1,
    url: frame5,
    public_id: "",
    width: 0,
    height: 0,
    alt: "",
  },
  {
    id: 2,
    url: frame1,
    alt: "",
  },
  {
    id: 3,
    url: frame2,
    alt: "",
  },
  {
    id: 4,
    url: frame3,
    alt: "",
  },
  {
    id: 5,
    url: frame4,
    alt: "",
  },
  {
    id: 6,
    img: frame5,
    alt: "",
  },
  {
    id: 7,
    url: frame6,
    alt: "",
  },
  {
    id: 8,
    url: frame7,
    alt: "",
  },
  {
    id: 9,
    url: frame8,
    alt: "",
  },
];

export function ImageGallery({
  title,
  description,
  data,
}: {
  title: string;
  description?: string;
  data?: coverImage[];
}) {
  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  );
  const finalImages = data ? (data?.length > 0 ? data : images) : images;
  return (
    <section className="w-full px-4 md:px-8 lg:px-20 md:py-16 py-8 flex flex-col items-center">
      {/* Heading */}
      <div className="flex flex-col gap-2 items-center py-4 text-center">
        <h4 className="text-2xl md:text-3xl font-bold">{title}</h4>
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
                    src={item.url as string}
                    alt={item.alt}
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
