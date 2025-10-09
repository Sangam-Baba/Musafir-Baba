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

const testi = [
  {
    id: 1,
    name: "Poonom Ranjan",
    title: "Traveler",
    content: `Musafirbaba provided excellent service in a highly professional manner. They went above and beyond to assist me, and I want to give a special shoutout to Anu, my tour manager.`,
  },
  {
    id: 2,
    name: "Anupam Ray",
    title: "Traveler",
    content: `I loved booking through Musafirbaba. I have recommended them to so many people! Great deals, easy to get things organised, had a great experience.`,
  },
  {
    id: 3,
    name: "Rohit Singh",
    title: "Traveler",
    content:
      "Booking with Musafir Baba was the best decision for our family trip. Everything was perfectly organized — from comfortable stays to local guides who truly knew the hidden gems.",
  },
  {
    id: 4,
    name: "Shubham Sharma",
    title: "Traveler",
    content:
      "I was amazed at how easy Musafir Baba made the entire process. The itinerary was well-balanced, giving me enough time to explore and relax. It felt like I had a personal travel partner by my side throughout the journey.",
  },
  {
    id: 5,
    name: "Dr. Ritu Mishra",
    title: "Traveler",
    content:
      "The team at Musafir Baba is incredibly professional yet so friendly. They were always available for any questions, and every little detail was taken care of. I’ll definitely be planning my next trip with them again!",
  },
];

export function Testimonial() {
  const plugin = React.useRef(
    Autoplay({ delay: 3500, stopOnInteraction: true })
  );

  return (
    <section className="w-full px-4 md:px-8 lg:px-20 py-16 flex flex-col items-center">
      {/* Heading */}
      <div className="flex flex-col gap-2 items-center py-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold">
          Why Choose Musafirbaba?
        </h2>
        <div className="h-1 w-24 bg-[#FE5300] rounded-full"></div>
        <p className="text-gray-600">Hear it from our happy travelers ✨</p>
      </div>

      {/* Carousel */}
      <Carousel
        plugins={[plugin.current]}
        className="max-w-5xl w-full"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <CarouselContent>
          {testi.map((item) => (
            <CarouselItem
              key={item.id}
              className="md:basis-1/2 lg:basis-1/3 flex"
            >
              <div className="p-2 w-full">
                <Card className="rounded-3xl bg-[#ffe2a2] shadow-lg hover:shadow-2xl shadow-[#cdffc9]/100 h-full flex flex-col justify-between">
                  <CardContent className="p-6 flex flex-col gap-4">
                    <p className="text-gray-700 text-sm md:text-base leading-relaxed italic">
                      “{item.content}”
                    </p>
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold text-[#FE5300]">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-500">{item.title}</p>
                    </div>
                  </CardContent>
                </Card>
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
