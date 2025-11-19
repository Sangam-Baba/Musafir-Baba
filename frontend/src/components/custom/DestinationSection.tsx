"use client";

import React, { useState } from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import jaipur from "../../../public/jaipur.jpg";
import badrinath from "../../../public/badrinath.jpg";
import kashmir from "../../../public/kashmir.jpg";
import himachal from "../../../public/Himachal.jpg";
import Link from "next/link";
// import { Card } from "../ui/card";
export function DestinationSection() {
  const [active, setActive] = useState<"domestic" | "international">(
    "domestic"
  );

  // const destinations = [
  //   {
  //     name: "Jaipur",
  //     image: jaipur,
  //     url: "jaipur",
  //   },
  //   {
  //     name: "Badrinath",
  //     image: badrinath,
  //     url: "badrinath",
  //   },
  //   {
  //     name: "Kashmir",
  //     image: kashmir,
  //     url: "kashmir",
  //   },
  //   {
  //     name: "Himachal",
  //     image: himachal,
  //     url: "himachal",
  //   },
  //   {
  //     name: "Jaipur",
  //     image: jaipur,
  //     url: "jaipur",
  //   },
  //   {
  //     name: "Badrinath",
  //     image: badrinath,
  //     url: "badrinath",
  //   },
  //   {
  //     name: "Kashmir",
  //     image: kashmir,
  //     url: "kashmir",
  //   },
  //   {
  //     name: "Himachal",
  //     image: himachal,
  //     url: "himachal",
  //   },
  // ];
  return (
    <section className="w-full px-4 md:px-8 lg:px-20 py-8 md:py-16 ">
      <div className="flex flex-col gap-2 items-center max-w-7xl mx-auto">
        {/* Heading */}
        <div className="flex flex-col gap-5 items-center w-full">
          <div className="flex flex-col items-center space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-center">
              Top Destinations in India & Around the World
            </h2>
            <div className="w-20 h-1 bg-[#FE5300]"></div>
            <p>Discover trending destinations across India and abroad</p>
          </div>

          <div className="flex gap-4">
            <Button
              size="lg"
              onClick={() => setActive("domestic")}
              className={`mt-4 ${
                active === "domestic" ? "bg-[#FE5300]" : "bg-gray-400"
              }`}
            >
              Domestic Trips
            </Button>
            <Button
              size="lg"
              onClick={() => setActive("international")}
              className={`mt-4 ${
                active === "international" ? "bg-[#FE5300]" : "bg-gray-400"
              }`}
            >
              <h3>International Trips</h3>
            </Button>
          </div>
        </div>
        <div className="flex  justify-end  items-center w-full p-2">
          <div>
            <Link
              href={`/${
                active === "domestic" ? "destinations" : "destinations"
              }`}
              className="text-[#FE5300] font-semibold"
            >
              {" "}
              View All →
            </Link>
          </div>
        </div>

        {/* Content Section */}
        {active === "domestic" && (
          <div className="flex flex-col md:flex-row gap-4 mt-10 w-full">
            <div className="flex flex-col md:flex-row gap-4 md:w-1/2">
              <div className="flex flex-col gap-4 md:w-1/2">
                <div className="relative">
                  <Link href="/destinations/uttarakhand">
                    <Image
                      src={badrinath}
                      alt="Uttarakhand"
                      className="rounded-2xl w-full h-56 object-cover"
                    />
                  </Link>
                  <h4 className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Uttarakhand
                  </h4>
                </div>
                <div className="relative">
                  <Link href="/destinations/rajasthan">
                    <Image
                      src={jaipur}
                      alt="Rajasthan"
                      className="rounded-2xl w-full h-56 object-cover"
                    />
                  </Link>
                  <h4 className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Rajasthan
                  </h4>
                </div>
              </div>
              <div className="md:w-1/2">
                <div className="relative">
                  <Link href="/destinations/kerala">
                    <Image
                      src="https://res.cloudinary.com/dmmsemrty/image/upload/v1758340822/Untitled_design_5_hgguwf.jpg"
                      alt="Kerala"
                      className="rounded-2xl w-full md:h-118 h-56 object-cover"
                      width={500}
                      height={500}
                    />
                  </Link>
                  <h4 className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Kerala
                  </h4>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 md:w-1/2">
              <div className="w-full">
                <div className="relative">
                  <Link href="/destinations/meghalaya">
                    <Image
                      src="https://res.cloudinary.com/dmmsemrty/image/upload/v1758340821/Untitled_design_6_mggpgh.jpg"
                      alt="meghalaya"
                      className="rounded-2xl w-full h-56 object-cover"
                      width={500}
                      height={500}
                    />
                  </Link>
                  <h4 className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Meghalaya
                  </h4>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4 w-full">
                <div className="relative md:w-1/2">
                  <Link href="/destinations/himachal-pradesh">
                    <Image
                      src={himachal}
                      alt="himachal"
                      className="rounded-2xl  h-56 object-cover"
                    />
                  </Link>
                  <h4 className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Himachal Pradesh
                  </h4>
                </div>
                <div className="relative md:w-1/2">
                  <Link href="/destinations/jammu-and-kashmir">
                    <Image
                      src={kashmir}
                      alt="Kerala"
                      className="rounded-2xl h-56 object-cover"
                    />
                  </Link>
                  <h4 className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Kashmir
                  </h4>
                </div>
              </div>
            </div>
          </div>
        )}

        {active === "international" && (
          <div className="flex flex-col md:flex-row gap-4 mt-10 w-full">
            <div className="flex flex-col md:flex-row gap-4 md:w-1/2">
              <div className="flex flex-col gap-4 md:w-1/2">
                <div className="relative">
                  <Link href="/destinations/singapore">
                    <Image
                      src="https://res.cloudinary.com/dmmsemrty/image/upload/v1758107532/Singapore_bdsaps.jpg"
                      alt="Singapore"
                      className="rounded-2xl w-full h-56 object-cover"
                      width={500}
                      height={500}
                    />
                  </Link>
                  <h4 className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Singapore
                  </h4>
                </div>
                <div className="relative">
                  <Link href="/destinations/dubai">
                    <Image
                      src="https://res.cloudinary.com/dmmsemrty/image/upload/v1758087427/Untitled_design_4_yrnksb.jpg"
                      alt="Dubai"
                      className="rounded-2xl w-full h-56 object-cover"
                      width={500}
                      height={500}
                    />
                  </Link>
                  <h4 className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Dubai
                  </h4>
                </div>
              </div>
              <div className="md:w-1/2">
                <div className="relative">
                  <Link href="/destinations/bali">
                    <Image
                      src="https://res.cloudinary.com/dmmsemrty/image/upload/v1758107531/Bali_sc5oct.jpg"
                      alt="Bali"
                      className="rounded-2xl w-full md:h-118 h-56 object-center"
                      width={500}
                      height={500}
                    />
                  </Link>
                  <h4 className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Bali
                  </h4>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 md:w-1/2">
              <div className="w-full">
                <div className="relative">
                  <Link href="/destinations/thailand">
                    <Image
                      src="https://res.cloudinary.com/dmmsemrty/image/upload/v1758107531/Thailand_btmxk6.jpg"
                      alt="Thailand"
                      className="rounded-2xl w-full h-56 "
                      width={500}
                      height={500}
                    />
                  </Link>
                  <h4 className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Thailand
                  </h4>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4 w-full">
                <div className="relative md:w-1/2">
                  <Link href="/destinations/japan">
                    <Image
                      src="https://res.cloudinary.com/dmmsemrty/image/upload/v1758087426/Untitled_design_3_g8ok0g.jpg"
                      alt="Japan"
                      className="rounded-2xl  h-56 "
                      width={500}
                      height={500}
                    />
                  </Link>
                  <h4 className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Japan
                  </h4>
                </div>
                <div className="relative md:w-1/2 ">
                  <Link href="/destinations/maldives">
                    <Image
                      src="https://res.cloudinary.com/dmmsemrty/image/upload/v1758087426/Untitled_design_2_rrfsvj.jpg"
                      alt="Maldives"
                      className="rounded-2xl h-56"
                      width={500}
                      height={500}
                    />
                  </Link>
                  <h4 className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold ">
                    Maldives
                  </h4>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* <div className="flex flex-wrap gap-2">
        {destinations.map((dest, i) => (
          <Card
            key={i}
            className="flex flex-col md:flex-row items-center pt-0 overflow-hidden  hover:scale-105 shadow-md hover:shadow-xl transition duration-500"
          >
            <Link href={`${dest.url}`}>
              <Image
                src={dest.image}
                alt={`${dest.name} musafirbaba`}
                width={200}
                height={200}
              ></Image>
              <p>{dest.name}</p>
            </Link>
          </Card>
        ))}
      </div> */}
    </section>
  );
}
