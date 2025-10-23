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
} from "@/components/ui/carousel";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import { Clock, MapPin } from "lucide-react";
import { FaMoneyBill } from "react-icons/fa";

interface Batch {
  quad: number;
  _id: string;
}

interface Image {
  url: string;
  public_id: string;
  alt: string;
  width?: number;
  height?: number;
}
interface BestSeller {
  _id: number;
  title: string;
  description: string;
  coverImage: Image;
  destination: {
    _id: string;
    name: string;
    country: string;
    state: string;
    city: string;
  };
  batch: Batch[];
  slug: string;
  gallery: Image[];
  duration: {
    days: number;
    nights: number;
  };
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
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-wide">
            Hot Picks of the Season — Don’t Miss Out!
          </h2>
          <div className="mx-auto w-24 h-1 bg-[#FE5300] rounded-full"></div>
        </div>

        {/* Carousel */}
        <div className="w-full max-w-7xl flex justify-center">
          <Carousel
            className="w-full max-w-6xl"
            opts={{ loop: true }}
            plugins={[Autoplay({ delay: 4000, stopOnFocusIn: true })]}
          >
            <CarouselContent>
              {bestSeller?.map((pkg: BestSeller, i: number) => (
                <CarouselItem key={i}>
                  <Card className="bg-transparent border-none shadow-none  overflow-hidden p-0 m-0">
                    <CardHeader className="flex justify-center items-center text-center">
                      <h3 className="text-2xl font-bold text-white">
                        {pkg.title}
                      </h3>
                    </CardHeader>

                    <CardContent
                      className={`flex flex-col md:flex-row ${
                        i % 2 === 0 ? "md:flex-row-reverse" : ""
                      }  justify-center gap-18`}
                    >
                      <div className="w-full md:w-1/2 flex gap-4">
                        <div className="w-full flex flex-col gap-4">
                          <Image
                            src={
                              pkg?.gallery[0]?.url || pkg?.coverImage?.url || bg
                            }
                            alt={
                              pkg?.gallery[0]?.alt ||
                              pkg?.coverImage?.alt ||
                              pkg.title
                            }
                            width={600}
                            height={400}
                            className="rounded-b-[50px] rounded-tr-[50px] w-full h-[70px] md:h-[170px] object-cover shadow-lg"
                          />
                          <Image
                            src={
                              pkg?.gallery[1]?.url || pkg?.coverImage?.url || bg
                            }
                            alt={
                              pkg?.gallery[1]?.alt ||
                              pkg?.coverImage?.alt ||
                              pkg.title
                            }
                            width={600}
                            height={400}
                            className="rounded-b-[50px] rounded-tl-[50px] w-full h-[130px] md:h-[230px] object-cover shadow-lg"
                          />
                        </div>
                        <div className="w-full flex flex-col gap-4">
                          <Image
                            src={
                              pkg?.gallery[2]?.url || pkg?.coverImage?.url || bg
                            }
                            alt={
                              pkg?.gallery[2]?.alt ||
                              pkg?.coverImage?.alt ||
                              pkg.title
                            }
                            width={600}
                            height={400}
                            className="rounded-t-[50px] rounded-br-[50px] w-full h-[130px] md:h-[230px] object-cover shadow-lg"
                          />
                          <Image
                            src={
                              pkg?.gallery[3]?.url || pkg?.coverImage?.url || bg
                            }
                            alt={
                              pkg?.gallery[3]?.url ||
                              pkg?.coverImage?.alt ||
                              pkg.title
                            }
                            width={600}
                            height={400}
                            className="rounded-t-[50px] rounded-bl-[50px] w-full h-[70px] md:h-[170px] object-cover shadow-lg"
                          />
                        </div>
                      </div>

                      <div className="w-full md:w-1/2 flex flex-col gap-4 justify-start">
                        <p className="text-gray-100 leading-relaxed line-clamp-10 text-justify">
                          {pkg.description}
                        </p>
                        <div className="flex justify-between gap-4 mt-4">
                          <div className="flex items-center gap-2 text-white">
                            <MapPin
                              className="w-6 h-8 inline-block "
                              color="#FE5300"
                            />
                            {pkg?.destination?.country.charAt(0).toUpperCase() +
                              pkg?.destination?.country.slice(1)}
                            ,{" "}
                            {pkg?.destination?.state.charAt(0).toUpperCase() +
                              pkg?.destination?.state.slice(1)}
                          </div>
                          <div className="flex items-center gap-2 text-white">
                            <Clock
                              className="w-6 h-8 inline-block "
                              color="#FE5300"
                            />
                            {pkg?.duration?.nights}N/{pkg?.duration?.days}D
                          </div>
                          <div className="flex items-center gap-2 text-white">
                            <FaMoneyBill
                              className="w-6 h-8 inline-block "
                              color="#FE5300"
                            />
                            ₹ {pkg?.batch[0]?.quad.toLocaleString("en-IN")}
                          </div>
                        </div>
                        <Link
                          href={`/${pkg?.destination?.country}/${pkg?.destination?.state}/${pkg.slug}`}
                        >
                          <Button className="bg-[#FE5300] hover:bg-[#ff6a24] text-white font-semibold px-6 py-2 rounded-full shadow-md transition-all">
                            Explore Now
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>

            {/* <CarouselPrevious className="bg-white/10 border border-white/20 hover:bg-white/20 text-white" />
            <CarouselNext className="bg-white/10 border border-white/20 hover:bg-white/20 text-white" /> */}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
