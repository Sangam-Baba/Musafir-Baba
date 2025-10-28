import React from "react";
import { Card } from "../ui/card";
import Image from "next/image";
import Link from "next/link";

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
          <h1 className="text-xl md:text-3xl font-bold">
            Find Your Perfect Getaway with the Best Travel Agency in Delhi
          </h1>
          <p className="w-20 h-1 bg-[#FE5300]"></p>
          <p>Handpicked India & international tours for every traveller</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 px-4">
          <Card className="flex flex-col gap-4 bg-[#EBFFF2] items-center py-4 px-4 hover:scale-105 shadow-md hover:shadow-xl transition duration-500">
            <Link
              href={data[0].url}
              className="flex flex-col gap-4 items-center "
            >
              <Image
                src={data[0].img}
                alt={data[0].title}
                width={50}
                height={50}
              />
              <h3 className="text-xl font-semibold text-center">
                {data[0].title}
              </h3>
              <p className="text-sm text-center hidden lg:block">
                {data[0].description}
              </p>
            </Link>
          </Card>

          <Card className="flex flex-col gap-4 bg-[#FFF5E4] items-center py-4 px-4 hover:scale-105 shadow-md hover:shadow-xl transition duration-500">
            <Link
              href={data[1].url}
              className="flex flex-col gap-4 items-center "
            >
              <Image
                src={data[1].img}
                alt={data[1].title}
                width={50}
                height={50}
              />
              <h3 className="text-xl font-semibold text-center">
                {data[1].title}
              </h3>
              <p className="text-sm text-center hidden lg:block">
                {data[1].description}
              </p>
            </Link>
          </Card>
          <Card className="flex flex-col gap-4 bg-[#EBFFF2] items-center py-4 px-4 hover:scale-105 shadow-md hover:shadow-xl transition duration-500">
            <Link
              href={data[2].url}
              className="flex flex-col gap-4 items-center "
            >
              <Image
                src={data[2].img}
                alt={data[2].title}
                width={50}
                height={50}
              />
              <h3 className="text-xl font-semibold text-center">
                {data[2].title}
              </h3>
              <p className="text-sm text-center hidden lg:block">
                {data[2].description}
              </p>
            </Link>
          </Card>
          <Card className="flex flex-col gap-4 bg-[#FFF5E4] items-center py-4 px-4 hover:scale-105 shadow-md hover:shadow-xl transition duration-500">
            <Link
              href={data[3].url}
              className="flex flex-col gap-4 items-center "
            >
              <Image
                src={data[3].img}
                alt={data[3].title}
                width={50}
                height={50}
              />
              <h3 className="text-xl font-semibold text-center">
                {data[3].title}
              </h3>
              <p className="text-sm text-center hidden lg:block">
                {data[3].description}
              </p>
            </Link>
          </Card>
          <Card className="flex flex-col gap-4 bg-[#EBFFF2] items-center py-4 px-4 hover:scale-105 shadow-md hover:shadow-xl transition duration-500">
            <Link
              href={data[4].url}
              className="flex flex-col gap-4 items-center "
            >
              <Image
                src={data[4].img}
                alt={data[4].title}
                width={50}
                height={50}
              />
              <h3 className="text-xl font-semibold text-center">
                {data[4].title}
              </h3>
              <p className="text-sm text-center hidden lg:block">
                {data[4].description}
              </p>
            </Link>
          </Card>
          <Card className="flex flex-col gap-4 bg-[#FFF6F6] items-center py-4 px-4 hover:scale-105 shadow-md hover:shadow-xl transition duration-500">
            <Link
              href={data[7].url}
              className="flex flex-col gap-4 items-center "
            >
              <Image
                src={data[7].img}
                alt={data[7].title}
                width={50}
                height={50}
              />
              <h3 className="text-xl font-semibold text-center">
                {data[7].title}
              </h3>
              <p className="text-sm text-center hidden lg:block">
                {data[7].description}
              </p>
            </Link>
          </Card>
          <Card className="flex flex-col gap-4 bg-[#EBFFF2] items-center py-4 px-4 hover:scale-105 shadow-md hover:shadow-xl transition duration-500">
            <Link
              href={data[5].url}
              className="flex flex-col gap-4 items-center "
            >
              <Image
                src={data[5].img}
                alt={data[5].title}
                width={50}
                height={50}
              />
              <h3 className="text-xl font-semibold text-center">
                {data[5].title}
              </h3>
              <p className="text-sm text-center hidden lg:block">
                {data[5].description}
              </p>
            </Link>
          </Card>
          <Card className="flex flex-col gap-4 bg-[#FFF6F6] items-center py-4 px-4 hover:scale-105 shadow-md hover:shadow-xl transition duration-500">
            <Link
              href={data[6].url}
              className="flex flex-col gap-4 items-center "
            >
              <Image
                src={data[6].img}
                alt={data[6].title}
                width={50}
                height={50}
              />
              <h3 className="text-xl font-semibold text-center">
                {data[6].title}
              </h3>
              <p className="text-sm text-center hidden lg:block">
                {data[6].description}
              </p>
            </Link>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default ThirdSection;
