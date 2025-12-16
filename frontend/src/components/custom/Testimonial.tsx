"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  // CarouselNext,
  // CarouselPrevious,
} from "@/components/ui/carousel";
import { CarouselDots } from "../ui/carousel-indicators";

export interface TestiProps {
  _id?: string;
  name: string;
  comment: string;
  location: string;
  rating?: number;
}

export function Testimonial({ data }: { data: TestiProps[] }) {
  const plugin = React.useRef(
    Autoplay({ delay: 3500, stopOnInteraction: true })
  );
  const testiData = data;

  return (
    data.length > 0 && (
      <section className="w-full px-4 md:px-8 lg:px-20 md:py-10 py-8 flex flex-col items-center">
        {/* Heading */}
        <div className="flex flex-col gap-2 items-center  text-center">
          <h2 className="text-2xl md:text-3xl font-bold">Testimonials</h2>
          <div className="h-1 w-24 bg-[#FE5300] rounded-full"></div>
          <p className="text-gray-600">Hear it from our happy travellers</p>
        </div>

        {/* Carousel */}
        <Carousel
          plugins={[plugin.current]}
          className="max-w-5xl w-full"
          onMouseEnter={plugin.current.stop}
          onMouseLeave={plugin.current.reset}
        >
          <CarouselContent>
            {testiData?.map((item, i) => (
              <CarouselItem key={i} className="md:basis-1/2 lg:basis-1/3 flex">
                <div className="p-2 w-full">
                  <Card className="rounded-3xl bg-[#ffe2a2] shadow-lg hover:shadow-2xl shadow-[#cdffc9]/100 h-full flex flex-col justify-between">
                    <CardContent className="p-6 flex flex-col gap-4">
                      <p className="text-gray-700 text-sm md:text-base leading-relaxed ">
                        “{item.comment}”
                      </p>
                      <div className="mt-4">
                        <p className="text-lg font-semibold text-[#FE5300]">
                          {item.name}
                        </p>
                        <p className="text-sm text-gray-500">{item.location}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {/* <CarouselPrevious />
        <CarouselNext /> */}
          <CarouselDots />
        </Carousel>
      </section>
    )
  );
}
