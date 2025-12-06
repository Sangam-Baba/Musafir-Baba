import Breadcrumb from "@/components/common/Breadcrumb";
import { Faqs } from "@/components/custom/Faqs";
import Hero from "@/components/custom/Hero";
import QueryForm from "@/components/custom/QueryForm";
import VisaHome from "@/components/custom/VisaHome";
import WhyChoose from "@/components/custom/WhyChoose";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { CarouselDots } from "@/components/ui/carousel-indicators";
import { Check } from "lucide-react";
import Image from "next/image";
import React from "react";

function page() {
  const coreData = [
    {
      img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1760431452/ebqgvy2uruu6cxnehxat.png",
      title: "International Holiday Packages",
      description:
        "Tailor-made packages for Singapore Dubai Bali Maldives Thailand Vietnam",
    },
    {
      img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1760432099/hzm68uopd8a6d1gjot3q.png",
      title: "Visa Services for 40+ Countries",
      description:
        "We specialise in fast and reliable visa processing for Singapore Dubai Japan Visa Schengen Visa Malaysia eVisa  Maldives Thailand Vietnam",
    },
    {
      img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1760431753/vugxrcdlva6dfxebpxei.png",
      title: "Domestic Travel Packages",
      description:
        "Popular Indian destinations: Singapore Dubai Bali Maldives Thailand Vietnam",
    },
    {
      img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1760431651/m6zefmw04p1ynuyxhm1l.png",
      title: "Flights & Hotels",
      description: "Get the best deals on flight tickets and hand-picked stays",
    },
    {
      img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1760433740/olszjeekr4hae6wcjtig.png",
      title: "Corporate & Group Travel",
      description:
        "Complete MICE solutions including hotel bookings, event coordination and logistics.",
    },
  ];

  const faqs = [
    {
      id: 1,
      question: "Which is the best travel agency in India?",
      answer:
        "MusafirBaba is among the most trusted agencies offering visa services and customised tours across India",
    },
    {
      id: 2,
      question: "Do you offer services outside Delhi?",
      answer: "Yes, we support customers from all major Indian cities",
    },
    {
      id: 3,
      question: "Are your packages customisable?",
      answer:
        "Yes, every itinerary can be personalised according to your budget and travel style",
    },
    {
      id: 4,
      question: "Can I get visa-only services?",
      answer:
        "Absolutely. Visa assistance is available even if you don’t book a package.",
    },
  ];
  return (
    <div>
      <Hero
        image="/Hero1.jpg"
        title="Travel Agency Services in India – Tours, Visas & Holiday Packages"
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row gap-10">
          <div className="w-full md:w-3/5 space-y-10">
            <p>
              Welcome to MusafirBaba, the best travel agency in India, known for
              its one of India’s most trusted names in travel planning. We help
              travellers across India with visa assistance, customised tour
              packages, flight bookings, hotel reservations, and end-to-end
              travel management — all under one roof. Whether you are planning
              your next holiday from Delhi, Mumbai, Bangalore, Noida, or any
              other city, our expert team ensures transparent pricing, smooth
              processing, and complete travel support.
            </p>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                Why Travellers Choose MusafirBaba
              </h2>
              <p className="w-2/16 h-1 bg-[#FE5300] mb-4 mt-2 rounded-full"></p>
            </div>

            <ul className="space-y-4">
              <li className="flex gap-2 items-center ">
                <Check className="text-[#FE5300] w-6 h-6" strokeWidth={4} />
                <p className="">40+ Countries Visa Support</p>
              </li>
              <li className="flex gap-2 items-center ">
                <Check className="text-[#FE5300] w-6 h-6" strokeWidth={4} />
                <p className="">Custom International & Domestic Packages</p>
              </li>
              <li className="flex gap-2 items-center ">
                <Check className="text-[#FE5300] w-6 h-6" strokeWidth={4} />
                <p className="">Best Prices on Flights & Hotels</p>
              </li>
              <li className="flex gap-2 items-center ">
                <Check className="text-[#FE5300] w-6 h-6" strokeWidth={4} />
                <p className="">Fast Processing & Dedicated Support</p>
              </li>
              <li className="flex gap-2 items-center ">
                <Check className="text-[#FE5300] w-6 h-6" strokeWidth={4} />
                <p className="">
                  Trusted by Families, Couples, Corporate Groups
                </p>
              </li>
            </ul>
          </div>
          <div className="w-full md:w-2/5">
            <QueryForm />
          </div>
        </div>

        {/* Core Services */}
        <div className="py-12 bg-white">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold">
              Our Core Travel Services
            </h2>
            <div className="mx-auto w-20 h-1 bg-[#FE5300] rounded-full mt-3"></div>
          </div>

          <div className="hidden md:flex flex-wrap justify-center gap-8 px-6 md:px-16">
            {coreData.map((item, index) => (
              <div
                key={index}
                className="p-6 w-[300px] border border-[#FE5300] rounded-xl shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-20 h-20 flex items-center justify-center">
                    <Image
                      src={item.img}
                      width={500}
                      height={500}
                      alt={item.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-800">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {/* Carosal */}
          <div className="md:hidden flex flex-col gap-2 items-center mt-8">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full max-w-sm"
            >
              <CarouselContent>
                {coreData.map((data, i) => (
                  <CarouselItem key={i} className="">
                    <div className="flex flex-col gap-2 items-center">
                      <Image
                        src={data.img}
                        width={500}
                        height={500}
                        alt={data.title}
                        className="rounded-2xl w-15 h-15"
                      />
                      <div className=" space-y-1">
                        <p className="text-md font-semibold text-center">
                          {data.title}
                        </p>
                        <p className="text-sm text-center">
                          {data.description}
                        </p>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselDots />
            </Carousel>
          </div>
        </div>

        {/* Cities We Serve */}
        {/* <div>
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold">Cities We Serve</h2>
            <div className="mx-auto w-20 h-1 bg-[#FE5300] rounded-full mt-3"></div>
            <p>Travel Agency Services in Major Cities</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 px-6 md:px-16">
            {citiesData.map((item, index) => (
              <div
                key={index}
                className="p-6 w-[300px] border border-[#FE5300] rounded-xl shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-20 h-20 flex items-center justify-center">
                    <Image
                      src={item.img}
                      width={500}
                      height={500}
                      alt={item.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-800">
                    {item.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div> */}

        {/* Visa */}
        <div>
          <VisaHome />
        </div>
        {/* Packages */}
        <div></div>
        <WhyChoose />
        <Faqs faqs={faqs} />
      </div>
    </div>
  );
}

export default page;
