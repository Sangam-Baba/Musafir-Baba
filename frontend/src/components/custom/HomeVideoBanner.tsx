import React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
// import Autoplay from "embla-carousel-autoplay";
import { Card, CardContent } from "../ui/card";
import { VideoBannerType } from "@/components/admin/VideoBannerList";
import Image from "next/image";
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
async function HomeVideoBanner() {
  const mediaVideo = await getAllMedia();
  return (
    <div>
      <Carousel
        className="w-full max-w-7xl p-0 m-0"
        opts={{ loop: true }}
        // plugins={[Autoplay({ delay: 4000, stopOnFocusIn: true })]}
      >
        <CarouselContent>
          {mediaVideo?.map((item: VideoBannerType, index: number) => (
            <CarouselItem key={index}>
              <div className="p-0">
                <Card className="w-full p-0 border-0 shadow-none">
                  <CardContent className="flex items-center justify-center p-0 relative">
                    <CarouselPrevious className="absolute left-0 z-10" />
                    <div className="w-full overflow-hidden rounded-xl p-0">
                      <video width={553} height={150} controls className="">
                        <source src={item.media?.url} />
                      </video>
                    </div>
                    <CarouselNext className="absolute right-0 z-10" />
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}

export default HomeVideoBanner;
