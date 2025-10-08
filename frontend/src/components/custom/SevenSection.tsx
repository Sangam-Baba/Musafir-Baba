"use client";

import React from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import bg from "../../../public/bg-2.png";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useQuery } from "@tanstack/react-query";

interface Batch {
  _id: number;
  title: string;
  description: string;
  price: number;
  coverImage: {
    url: string;
    public_id: string;
    alt: string;
    width?: number;
    height?: number;
  };
}

interface BestSeller {
  _id: number;
  title: string;
  description: string;
  coverImage: {
    url: string;
    public_id: string;
    alt: string;
    width?: number;
    height?: number;
  };
  batch: Batch[];
}
const getBestSeller = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/packages/best-seller`
  );
  if (!res.ok) throw new Error("Failed to fetch data");
  const data = await res.json();
  return data?.data || [];
};
export function SevenSection() {
  const { data: bestSeller } = useQuery({
    queryKey: ["best-seller"],
    queryFn: getBestSeller,
  });

  console.log("data is: ", bestSeller);
  return (
    <section
      className="w-full px-4 md:px-8 lg:px-20 py-16 relative bg-cover bg-center bg-no-repeat text-white"
      style={{ backgroundImage: `url(${bg.src})` }}
    >
      {/* semi-transparent dark overlay */}
      <div className="absolute inset-0 "></div>

      <div className="relative z-10 max-w-7xl mx-auto flex flex-col gap-8 items-center">
        {/* Heading */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide">
            Explore the Spiti Valley: A Himalayan Adventure
          </h1>
          <div className="mx-auto w-24 h-1 bg-[#FE5300] rounded-full"></div>
        </div>

        {/* Carousel */}
        <div className="w-full p-5">
          <Carousel className="w-full max-w-7xl">
            <CarouselContent>
              {bestSeller?.map((pkg: BestSeller, i: number) => (
                <CarouselItem key={i}>
                  <Card className="bg-transparent border-none shadow-none  overflow-hidden ">
                    <CardHeader className="flex justify-center items-center text-center">
                      <h2 className="text-2xl font-bold text-white">
                        {pkg.title}
                      </h2>
                    </CardHeader>

                    <CardContent
                      className={`flex flex-col md:flex-row ${
                        i % 2 === 0 ? "md:flex-row-reverse" : ""
                      }  justify-center gap-8 p-6`}
                    >
                      <div className="w-full md:w-1/2 flex gap-4">
                        <div className="w-full flex flex-col gap-4">
                          <Image
                            src={pkg?.coverImage?.url || bg}
                            alt={pkg?.coverImage?.alt || pkg.title}
                            width={600}
                            height={400}
                            className="rounded-b-[80px] rounded-tr-[80px] w-full h-[200px] object-cover shadow-lg"
                          />
                          <Image
                            src={pkg?.coverImage?.url || bg}
                            alt={pkg?.coverImage?.alt || pkg.title}
                            width={600}
                            height={400}
                            className="rounded-b-[80px] rounded-tl-[80px] w-full h-[300px] object-cover shadow-lg"
                          />
                        </div>
                        <div className="w-full flex flex-col gap-4">
                          <Image
                            src={pkg?.coverImage?.url || bg}
                            alt={pkg?.coverImage?.alt || pkg.title}
                            width={600}
                            height={400}
                            className="rounded-t-[80px] rounded-br-[80px] w-full h-[300px] object-cover shadow-lg"
                          />
                          <Image
                            src={pkg?.coverImage?.url || bg}
                            alt={pkg?.coverImage?.alt || pkg.title}
                            width={600}
                            height={400}
                            className="rounded-t-[80px] rounded-bl-[80px] w-full h-[200px] object-cover shadow-lg"
                          />
                        </div>
                      </div>

                      <div className="w-full md:w-1/2 flex flex-col gap-4 justify-between ">
                        <p className="text-gray-100 leading-relaxed line-clamp-10">
                          {pkg.description}
                        </p>
                        <Button className="bg-[#FE5300] hover:bg-[#ff6a24] text-white font-semibold px-6 py-2 rounded-full shadow-md transition-all">
                          Explore Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>

            <CarouselPrevious className="bg-white/10 border border-white/20 hover:bg-white/20 text-white" />
            <CarouselNext className="bg-white/10 border border-white/20 hover:bg-white/20 text-white" />
          </Carousel>
        </div>
      </div>
    </section>
  );
}
