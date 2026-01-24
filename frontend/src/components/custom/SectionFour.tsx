import React from "react";
import { Button } from "../ui/button";
import Link from "next/link";
import Image from "next/image";
import h1 from "../../../public/h1.webp";
import h2 from "../../../public/2.webp";
import h3 from "../../../public/3.webp";
export default function SectionFour() {
  return (
    <section className="w-full px-4 md:px-8 lg:px-20 md:py-16 py-8 ">
      <div className="max-w-7xl mx-auto flex flex-col-reverse md:flex-row items-center gap-12">
        {/* Text Section */}
        <div className="flex flex-col gap-4 items-center md:items-start md:w-1/2">
          <h2 className="hidden md:block text-2xl md:text-3xl font-bold">
            Delhi Tour Packages
          </h2>
          <div className="bg-[#FE5300] w-12 h-1 hidden md:block"></div>
          <p className="text-sm md:text-base leading-relaxed text-gray-700">
            At MusafirBaba, we offer customizable Delhi tour packages.
            Experience Delhi like never before with our customizable Delhi
            Darshan tours.
            <br />
            <br />
            Whether you’re interested in historical monuments, cultural
            experiences, or culinary delights, we can create a Delhi sightseeing
            itinerary tailored to your preferences.
            <br />
            <br />
            Explore Delhi’s must-see attractions, discover hidden gems, and
            create memories that will last a lifetime. Contact us to plan your
            perfect Delhi tour package!
          </p>
          <Link href="https://musafirbaba.com/holidays/customised-tour-packages/delhi">
            <Button className="w-fit bg-[#FE5300] hover:bg-[#e64a00]">
              Explore More
            </Button>
          </Link>
        </div>

        <div className="flex flex-col items-center gap-2 md:w-1/2">
          <div className=" md:hidden flex flex-col items-center gap-2 mb-4">
            <h2 className="text-2xl md:text-3xl font-bold">
              Delhi Tour Packages
            </h2>
            <div className="bg-[#FE5300] w-12 h-1"></div>
          </div>

          <Image
            src="https://cdn.musafirbaba.com/h1.webp"
            alt="Delhi Tour"
            width={250}
            height={250}
            className="w-full h-auto rounded-2xl shadow-lg"
          />

          {/* Side images (hidden on mobile) */}
          <div className="hidden md:grid grid-cols-2 gap-4 mt-4">
            <Image
              src="https://cdn.musafirbaba.com/2.webp"
              alt="Delhi Attraction"
              width={250}
              height={250}
              className=" rounded-2xl shadow-lg"
            />
            <Image
              src="https://cdn.musafirbaba.com/3.webp"
              alt="Delhi Culture"
              width={250}
              height={250}
              className=" rounded-2xl shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
