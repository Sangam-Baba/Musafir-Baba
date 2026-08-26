"use client";

import * as React from "react";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

export default function Partners() {
  // Same 12 partners as before — only the layout changed, data is untouched.
  const partners = [
    {
      name: "VFS Global",
      image: "https://cdn.musafirbaba.com/images/vfs_ec9739.jpg",
    },
    {
      name: "Paytm",
      image: "https://cdn.musafirbaba.com/images/download_2_kx6up9.png",
    },
    {
      name: "MakeMyTrip",
      image: "https://cdn.musafirbaba.com/images/mmt_bzhgxl.png",
    },
    {
      name: "EaseMyTrip",
      image: "https://cdn.musafirbaba.com/images/easemytrip-logo-png_seeklogo-517976_iy4r6z.png",
    },
    {
      name: "IndiGo",
      image: "https://cdn.musafirbaba.com/images/2_zou3l6.png",
    },
    {
      name: "Goibibo",
      image: "https://cdn.musafirbaba.com/images/1_pmcv8t.png",
    },
    {
      name: "PayU",
      image: "https://cdn.musafirbaba.com/images/pay_u_ypbpf9.png",
    },
    {
      name: "RedBus",
      image: "https://cdn.musafirbaba.com/images/red_bgv024.png",
    },
    {
      name: "Air India",
      image: "https://cdn.musafirbaba.com/images/1767961958311-ai-large-default_dmageq.webp",
    },
    {
      name: "SpiceJet",
      image: "https://cdn.musafirbaba.com/images/spicejett_wvlra2.png",
    },
    {
      name: "Akasa Air",
      image: "https://cdn.musafirbaba.com/images/1767961958252-akasha_tjdowv.webp",
    },
    {
      name: "Vistara",
      image: "https://cdn.musafirbaba.com/images/vis_1_wkfaqo.png",
    },
  ];

  // Same Embla carousel + autoplay-on-hover-pause pattern already used in
  // Testimonial.tsx and FeaturedTour.tsx elsewhere in the app.
  const plugin = React.useRef(
    Autoplay({ delay: 2200, stopOnInteraction: false }),
  );

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-10 py-8 md:py-10">
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-[32px] leading-tight font-medium text-gray-900">
          Our <span className="text-[#FE5300]">Trusted Partners</span>
        </h2>
        <p className="text-[14px] md:text-[16px] text-gray-600 mt-1">
          Brands we work with to plan and book your trips.
        </p>
      </div>

      <Carousel
        plugins={[plugin.current]}
        opts={{ align: "start", loop: true }}
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {partners.map((partner) => (
            <CarouselItem
              key={partner.name}
              className="pl-3 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/6"
            >
              <div className="flex items-center justify-center border border-gray-200 rounded-xl px-4 py-5 md:py-6 bg-white hover:border-[#FE5300]/40 hover:shadow-md transition-all h-24 sm:h-28">
                <div className="relative w-full h-12 sm:h-14">
                  <Image
                    src={partner.image}
                    alt={partner.name}
                    fill
                    sizes="(max-width: 640px) 140px, (max-width: 1024px) 180px, 200px"
                    className="object-contain"
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
