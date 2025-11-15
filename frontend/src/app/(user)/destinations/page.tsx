import Hero from "@/components/custom/Hero";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
// import { getCategory } from "../holidays/PackagesClient";
// import { getDestinationSeo } from "@/components/admin/DestinationSeoNew";
interface Destination {
  _id: string;
  name: string;
  country: string;
  state: string;
  coverImage: {
    url: string;
    alt: string;
  };
}
const getAllDestinations = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/destination`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return notFound();
  const data = await res.json();
  return data?.data;
};
async function page() {
  const destinations = await getAllDestinations();
  //   const res = await getCategory();
  //   const category = res?.data;

  //   const destinationSeo = await getDestinationSeo("", "");
  return (
    <section className="flex flex-col">
      <div>
        <Hero
          image="/Heroimg.jpg"
          title=""
          align="center"
          height="lg"
          overlayOpacity={0}
        />
      </div>
      <div className="flex flex-col items-center mt-5">
        <h1 className="text-3xl md:text-4xl font-bold text-center">
          Destinations
        </h1>
        <div className="w-20 h-1 bg-[#FE5300] mt-2 "></div>
      </div>
      <div className="max-w-7xl mx-auto py-16 px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 mt-6">
          {destinations.map((destination: Destination, i: number) => (
            <Link key={i} href={`/destinations/${destination.state}`}>
              <Card
                className=" pt-0
            group overflow-hidden rounded-2xl border 
            shadow-md hover:shadow-xl 
            transition-all duration-500
            hover:-translate-y-1 cursor-pointer
          "
              >
                <div className="relative overflow-hidden">
                  <Image
                    src={destination?.coverImage?.url ?? "/Heroimg.jpg"}
                    alt={destination?.coverImage?.alt ?? "Destination image"}
                    width={200}
                    height={500}
                    className="
                w-full h-32 object-cover 
                transition-transform duration-700
                group-hover:scale-110
              "
                  />
                </div>

                <CardContent className="">
                  <p className="text-sm font-semibold text-center tracking-wide">
                    {destination?.name}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default page;
