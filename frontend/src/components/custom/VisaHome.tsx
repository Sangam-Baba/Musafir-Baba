import React from "react";
import { Visa } from "@/app/(user)/visa/visaClient";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import Link from "next/link";
import Image from "next/image";
import { Globe } from "lucide-react";
import PopupQueryForm from "./PopupQueryForm";

const getVisa = async (search: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/visa/?country=${search}`,
    {
      next: { revalidate: 3600 },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch visas");
  const data = await res.json();
  return data?.data; // []
};
async function VisaHome() {
  const visa: Visa[] = await getVisa("");
  const finalVisa = [
    "UAE",
    "Schengen",
    "USA",
    "UK",
    "Canada",
    "Australia",
    "Singapore",
    "Japan",
    "Vietnam",
    "China",
    "New Zealand",
    "Turkey",
  ];
  const shownVisa = visa
    .filter((visa) => finalVisa.includes(visa.country))
    .sort(
      (a, b) => finalVisa.indexOf(a.country) - finalVisa.indexOf(b.country)
    );
  return (
    <section className="w-full mx-auto px-4 md:px-8 lg:px-20 md:py-16 py-8">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <div className="flex flex-col gap-2 items-center">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            Popular Visa Services for Indian Travellers
          </h2>
          <p className="w-20 h-1 bg-[#FE5300] text-center"></p>
          <p className=" text-center">
            Fast, reliable visa assistance for top travel destinations.
          </p>
        </div>
        <div className="flex  justify-end  items-center w-full p-2">
          <div>
            <Link href="/visa" className="text-[#FE5300] font-semibold">
              {" "}
              View All →
            </Link>
          </div>
        </div>
        <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-6 gap-6 mt-8 px-4">
          {shownVisa.slice(0, 12).map((data, i) => {
            return (
              <Link key={i} href={`/visa/${data.slug}`}>
                <div className="group relative  overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:border-blue-400">
                  {/* Flag Image */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
                    <Image
                      src={data.bannerImage?.url || data.coverImage?.url || ""}
                      alt={data.bannerImage?.alt || "Musafirbaba Visa"}
                      width={200}
                      height={50}
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-emerald-500" />
                  </div>

                  {/* Content Section */}
                  <div className="flex flex-col justify-between p-4 ">
                    {/* Header with country name and icon */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        {/* <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                          Visa
                        </p> */}
                        <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors mt-1 line-clamp-1">
                          {data.country}
                        </h3>
                      </div>
                      <Globe className="w-5 h-5 text-neutral-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
                    </div>

                    {/* Pricing and CTA */}
                    {/* <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">
                          Starting from
                        </p>
                        <p className="text-md font-bold text-neutral-900">
                          {data.cost}
                          <span className="text-xs text-neutral-500 font-normal ml-1">
                            + fees
                          </span>
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-blue-600 transform group-hover:translate-x-1 transition-transform" />
                    </div> */}
                  </div>

                  {/* Hover effect border */}
                  <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-blue-400/30 transition-colors pointer-events-none" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Carosal */}

        <div className=" md:hidden flex flex-col gap-2 items-center mt-8 px-4 w-full">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full max-w-sm"
          >
            <CarouselContent>
              {shownVisa.slice(0, 12).map((data, i) => (
                <CarouselItem key={i} className="basis-1/2">
                  <Link key={i} href={`/visa/${data.slug}`}>
                    <div className="group relative  overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:border-blue-400">
                      {/* Background gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Flag Image */}
                      <div className="relative h-25 w-full overflow-hidden bg-neutral-100">
                        <Image
                          src={data.bannerImage?.url || "/placeholder.svg"}
                          alt={data.bannerImage?.alt || "Musafirbaba Visa"}
                          width={200}
                          height={30}
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-emerald-500" />
                      </div>

                      {/* Content Section */}
                      <div className="flex flex-col justify-between p-4 ">
                        {/* Header with country name and icon */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            {/* <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                          Visa
                        </p> */}
                            <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors mt-1 line-clamp-1">
                              {data.country}
                            </h3>
                          </div>
                          <Globe className="w-5 h-5 text-neutral-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
                        </div>
                      </div>

                      {/* Hover effect border */}
                      <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-blue-400/30 transition-colors pointer-events-none" />
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="ml-6" />
            <CarouselNext className="mr-6" />
            {/* <CarouselDots /> */}
          </Carousel>
        </div>
        <div className="mt-6">
          <PopupQueryForm />
        </div>
      </div>
    </section>
  );
}

export default VisaHome;
