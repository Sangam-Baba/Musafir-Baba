import React from "react";
import { Card } from "../ui/card";
import Image from "next/image";
import Link from "next/link";
import { CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
const data = [
  {
    title: "Weekend Getaway",
    description:
      " Plan your perfect weekend getaway with relaxing trips and memorable experiences.",
    img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1757402014/j3jyqodvzgarftilb3dd.png",
    url: "/holidays/weekend-getaway",
  },
  {
    title: "Honeymoon Package",
    description:
      "Celebrate love with our romantic honeymoon packages and unforgettable memories.",
    img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1757399660/mscievdho61vs6fhhlzj.png",
    url: "/holidays/honeymoon-package",
  },
  {
    title: "Customized Tour Package",
    description:
      " Create your perfect journey with our fully personalized travel packages.",
    img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1757400475/rmgdcyoxb9knlangdols.png",
    url: "/holidays/customized-tour-package",
  },
  {
    title: "Group Tour Packages",
    description:
      "Travel together with our group tours for fun, bonding, and new experiences.",
    img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1757400865/j6sun08brrmcaovhbqh1.png",
    url: "/holidays/group-tour-packages",
  },
  {
    title: "Solo Tour Packages",
    description:
      "Go on a solo trip and create unique memories, explore freely, and embrace adventure",
    img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1757505917/service-1_2_xzguaq.svg",
    url: "/holidays/solo-tour-packages",
  },
  {
    title: "Family Tour Packages",
    description:
      "Plan the perfect family trip with fun, adventure, and memorable moments together.",
    img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1757505061/service-2_1_u6yuzr.png",
    url: "/holidays/family-tours",
  },
  {
    title: "Corporate Tour Packages",
    description:
      "Seamless Corporate Tour Packages for teammates, business trips, and stress free travel planning.",
    img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1757505061/service-8_pgcnpk.png",
    url: "/holidays/corporate-tour-package",
  },
  {
    title: "Backpacking Trips",
    description:
      "Experience adventure and freedom like never before with our backpacking tours.",
    img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1757505061/service-9_ztf8ca.png",
    url: "/holidays/backpacking-trips",
  },
];
function ThirdSection() {
  return (
    <section className="w-full mx-auto px-4 md:px-8 lg:px-20 py-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-2 items-center">
          <h1 className="text-xl md:text-3xl font-bold text-center">
            Find Your Perfect Getaway with the Best Travel Agency in Delhi
          </h1>
          <p className="w-20 h-1 bg-[#FE5300] text-center"></p>
          <p className="text-sm text-center">
            Handpicked India & international tours for every traveller
          </p>
        </div>
        <div className="hidden md:grid  grid-cols-3 lg:grid-cols-4 gap-4 mt-8 px-4">
          {data.map((data, i) => {
            return (
              <Card
                key={i}
                className={`flex flex-col gap-4 ${
                  i % 2 === 0 ? "bg-[#FFF5E4]" : "bg-[#EBFFF2]"
                } items-center py-4 px-4 hover:scale-105 shadow-md hover:shadow-xl transition duration-500`}
              >
                <Link
                  href={data.url}
                  className="flex flex-col gap-4 items-center "
                >
                  <Image
                    src={data.img}
                    alt={data.title}
                    width={50}
                    height={50}
                  />
                  <h3 className="text-xl font-semibold text-center">
                    {data.title}
                  </h3>
                  <p className="text-sm text-center hidden lg:block">
                    {data.description}
                  </p>
                </Link>
              </Card>
            );
          })}
        </div>
        <div className=" md:hidden flex flex-col gap-2 items-center mt-8 px-4">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full max-w-sm"
          >
            <CarouselContent>
              {data.map((data, i) => (
                <CarouselItem key={i} className="basis-1/2">
                  <div className="p-1">
                    <Card
                      key={i}
                      className={`flex flex-col gap-4 ${
                        i % 2 === 0 ? "bg-[#FFF5E4]" : "bg-[#EBFFF2]"
                      } items-center py-4 px-4 hover:scale-105 shadow-md hover:shadow-xl transition duration-500`}
                    >
                      <Link
                        href={data.url}
                        className="flex flex-col gap-4 items-center "
                      >
                        <Image
                          src={data.img}
                          alt={data.title}
                          width={50}
                          height={50}
                        />
                        <h3 className="text-xl font-semibold text-center">
                          {data.title}
                        </h3>
                        <p className="text-sm text-center hidden lg:block">
                          {data.description}
                        </p>
                      </Link>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </div>
    </section>
  );
}

export default ThirdSection;
