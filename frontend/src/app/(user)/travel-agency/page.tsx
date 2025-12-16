import Breadcrumb from "@/components/common/Breadcrumb";
import { Metadata } from "next";
import { Faqs } from "@/components/custom/Faqs";
import Hero from "@/components/custom/Hero";
import QueryForm from "@/components/custom/QueryForm";
import WhyChoose from "@/components/custom/WhyChoose";
import { OfficeTabs } from "@/components/travel-agency/OfficeTabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { CarouselDots } from "@/components/ui/carousel-indicators";
import { Check } from "lucide-react";
import Image from "next/image";
import React from "react";
import { getVisa } from "../visa/page";
import { VisaInterface } from "../visa/visaClient";
import VisaMainCard from "@/components/custom/VisaMainCard";
import { getPackageByCategorySlug } from "../holidays/[categorySlug]/page";
import PackageCard from "@/components/custom/PackageCard";
import { Package } from "@/app/(user)/holidays/[categorySlug]/PackageSlugClient";
import Link from "next/link";
import { Testimonial } from "@/components/custom/Testimonial";
import { notFound } from "next/navigation";
import { getWebPageBySlug } from "../[...slug]/page";
import { BlogContent } from "@/components/custom/BlogContent";
const getOffices = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/webpage?parent=travel-agency`
  );
  if (!res.ok) throw new Error("Failed to fetch offices");
  const data = await res.json();
  return data?.data;
};

export async function generateMetadata(): Promise<Metadata> {
  const page = await getWebPageBySlug("travel-agency");
  const data = {
    title: "Best Travel Agency in India for Tours & Visas | Musafir Baba",
    description:
      "Looking for the best travel agency in India? MusafirBaba offers customised tour packages, India & international holidays, and fast visa services you can trust.",
    alternates: {
      canonical: `https://musafirbaba.com/travel-agency`, //new URL(`/${page.slug}`, "https://musafirbaba.com").toString(),
    },
    keywords: [
      "Travel Agency in India",
      "Best Travel Agency in India",
      "Travel Agency",
    ],
  };
  if (!page) return data;
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    keywords: page.keywords,
    alternates: {
      canonical: `https://musafirbaba.com/${page.slug}`,
    },
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription,
      url: `https://musafirbaba.com/${page.slug}`,
      type: "website",
    },
  };
}
async function page() {
  const page = await getWebPageBySlug("travel-agency");
  const offices = await getOffices();
  const sortedOffices = offices.sort(
    (a: any, b: any) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const visas = await getVisa();
  const packages = await getPackageByCategorySlug("honeymoon-packages");
  const shownVisas = ["Singapore", "Japan", "UK", "Schengen"];
  const filteredVisas = visas.filter((visa: VisaInterface) =>
    shownVisas.includes(visa.country)
  );
  const coreData = [
    {
      img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1760431452/ebqgvy2uruu6cxnehxat.png",
      title: "International Holiday Packages",
      description:
        "Tailor-made packages for Singapore, Dubai, Bali, Maldives, Thailand, and Vietnam.",
    },
    {
      img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1760432099/hzm68uopd8a6d1gjot3q.png",
      title: "Visa Services for 40+ Countries",
      description:
        "We specialise in fast and reliable visa processing for 40+ countries like Singapore, Dubai, Japan etc.",
    },
    {
      img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1760431753/vugxrcdlva6dfxebpxei.png",
      title: "Personalised Domestic Travel Packages",
      description:
        "Get personalised holiday packages for popular Indian destinations like Goa, Kerala, Himachal etc.",
    },
    {
      img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1760431651/m6zefmw04p1ynuyxhm1l.png",
      title: "Affordable Flights & Hotels",
      description:
        "Get the best deals on flight tickets and hand-picked stays across the globe for your holiday.",
    },
    {
      img: "https://res.cloudinary.com/dmmsemrty/image/upload/v1760433740/olszjeekr4hae6wcjtig.png",
      title: "Corporate & Group Travel Solutions",
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
        image={
          page?.coverImage.url ||
          "https://res.cloudinary.com/dmmsemrty/image/upload/v1765003780/dda7b162262041.5a8af0c73f8bd_aazzhr.jpg"
        }
        title={
          page?.title ||
          "Best Travel Agency in India for Complete Tour & Visa Solutions"
        }
        height="lg"
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10 md:space-y-30 space-y-20">
        <div className="flex flex-col md:flex-row gap-10">
          <div className="w-full md:w-3/5 space-y-10">
            <p>
              <BlogContent html={page.content} />
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
        <div className=" bg-white">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">
              Our Core Travel Services
            </h2>
            <div className="mx-auto w-20 h-1 bg-[#FE5300] rounded-full mt-3"></div>
            <p>Everything you need for a smooth and memorable journey</p>
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
        <div>
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">Cities We Serve</h2>
            <div className="mx-auto w-20 h-1 bg-[#FE5300] rounded-full mt-3"></div>
            <p>Local expertise, available wherever you are</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 px-6 md:px-16">
            <OfficeTabs offices={sortedOffices} />
          </div>
        </div>

        {/* Visa */}
        <div>
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">Popular Visas</h2>
            <div className="mx-auto w-20 h-1 bg-[#FE5300] rounded-full mt-3"></div>
            <p>Hassle-free visa support for global destinations</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
            {filteredVisas.length === 0 && (
              <h1 className="text-2xl font-bold">No Visas found</h1>
            )}

            {filteredVisas.map((visa: VisaInterface, i: number) => {
              return <VisaMainCard key={i} visa={visa} />;
            })}
          </div>
          <Link
            href="/visa"
            className="w-[120px] mx-auto bg-primary text-white py-2 px-4 rounded-md font-semibold text-center block mt-10"
          >
            Apply Now
          </Link>
        </div>

        {/* Packages */}

        <div>
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">Popular Packages</h2>
            <div className="mx-auto w-20 h-1 bg-[#FE5300] rounded-full mt-3"></div>
            <p>Handpicked trips loved by our travellers</p>
          </div>

          <div className="max-w-7xl  mx-auto grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-10 my-10">
            {packages?.slice(0, 4).map((pkg: Package) => (
              <PackageCard
                key={pkg._id}
                pkg={{
                  id: pkg._id,
                  name: pkg.title,
                  slug: pkg.slug,
                  image: pkg.coverImage?.url ?? "",
                  price: pkg?.batch ? pkg?.batch[0]?.quad : 9999,
                  duration: `${pkg.duration.nights}N/${pkg.duration.days}D`,
                  destination: pkg.destination?.name ?? "",
                  batch: pkg?.batch ? pkg?.batch : [],
                }}
                url={`/holidays/${pkg?.mainCategory?.slug}/${pkg.destination.state}/${pkg.slug}`}
              />
            ))}
          </div>
          <Link
            href="/holidays"
            className="w-[120px] mx-auto bg-primary text-white py-2 px-4 rounded-md font-semibold text-center block mt-10"
          >
            Book Now
          </Link>
        </div>
        <Testimonial data={[]} />
        <WhyChoose />
        <Faqs faqs={faqs} />
      </div>
    </div>
  );
}

export default page;
