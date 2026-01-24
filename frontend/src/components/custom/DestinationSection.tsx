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
    "domestic",
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
            <h2 className="text-lg md:text-3xl font-bold text-center">
              Top Destinations in India & Around the World
            </h2>
            <div className="w-20 h-1 bg-[#FE5300] "></div>
            <p className="text-center">
              Discover trending destinations across India and abroad
            </p>
          </div>

          <div className="flex gap-4">
            <Button
              size="lg"
              onClick={() => setActive("domestic")}
              className={`mt-4 ${
                active === "domestic"
                  ? "bg-[#FE5300]"
                  : "bg-white shadow-md text-black border border-[#FE5300]"
              }`}
            >
              Domestic Trips
            </Button>
            <Button
              size="lg"
              onClick={() => setActive("international")}
              className={`mt-4 ${
                active === "international"
                  ? "bg-[#FE5300]"
                  : "bg-white shadow-md text-black border border-[#FE5300]"
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
          <div className="hidden md:flex md:flex-row gap-4 mt-10 w-full">
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
                      src="https://cdn.musafirbaba.com/images/Untitled_design_5_hgguwf.jpg"
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
                      src="https://cdn.musafirbaba.com/images/Untitled_design_6_mggpgh.jpg"
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
          <div className="md:flex hidden md:flex-row gap-4 mt-10 w-full ">
            <div className="flex flex-col md:flex-row gap-4 md:w-1/2">
              <div className="flex flex-col gap-4 md:w-1/2">
                <div className="relative">
                  <Link href="/destinations/singapore">
                    <Image
                      src="https://cdn.musafirbaba.com/images/Singapore_bdsaps.jpg"
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
                      src="https://cdn.musafirbaba.com/images/Untitled_design_4_yrnksb.jpg"
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
                      src="https://cdn.musafirbaba.com/images/Bali_sc5oct.jpg"
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
                      src="https://cdn.musafirbaba.com/images/Thailand_btmxk6.jpg"
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
                      src="https://cdn.musafirbaba.com/images/Untitled_design_3_g8ok0g.jpg"
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
                      src="https://cdn.musafirbaba.com/images/Untitled_design_2_rrfsvj.jpg"
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
        {active === "domestic" && (
          <div className="flex md:hidden gap-4 mt-10 w-full overflow-x-auto no-scrollbar snap-x snap-mandatory">
            {[
              {
                title: "Uttarakhand",
                href: "/destinations/uttarakhand",
                img: "https://cdn.musafirbaba.com/images/badrinath.jpg",
              },
              {
                title: "Rajasthan",
                href: "/destinations/rajasthan",
                img: "https://cdn.musafirbaba.com/images/jaipur.jpg",
              },
              {
                title: "Kerala",
                href: "/destinations/kerala",
                img: "https://cdn.musafirbaba.com/images/Untitled_design_5_hgguwf.jpg",
              },
              {
                title: "Meghalaya",
                href: "/destinations/meghalaya",
                img: "https://cdn.musafirbaba.com/images/Untitled_design_6_mggpgh.jpg",
              },
              {
                title: "Himachal Pradesh",
                href: "/destinations/himachal-pradesh",
                img: "https://cdn.musafirbaba.com/Himachal.jpg",
              },
              {
                title: "Kashmir",
                href: "/destinations/jammu-and-kashmir",
                img: "https://cdn.musafirbaba.com/kashmir.jpg",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="relative min-w-[260px] snap-start "
              >
                <Link href={item.href} className="z-10">
                  <Image
                    src={item.img}
                    alt={item.title}
                    width={260}
                    height={224}
                    className="rounded-2xl h-56 object-cover"
                  />
                </Link>

                <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 to-transparent rounded-2xl " />
                <h4 className="pointer-events-none absolute bottom-2 inset-x-0  text-white text-center py-1 font-semibold">
                  {item.title}
                </h4>
              </div>
            ))}
          </div>
        )}

        {active === "international" && (
          <div className="flex md:hidden gap-4 mt-10 w-full overflow-x-auto no-scrollbar snap-x snap-mandatory">
            {[
              {
                title: "Singapore",
                href: "/destinations/singapore",
                img: "https://cdn.musafirbaba.com/images/Singapore_bdsaps.jpg",
              },
              {
                title: "Dubai",
                href: "/destinations/dubai",
                img: "https://cdn.musafirbaba.com/images/Untitled_design_4_yrnksb.jpg",
              },
              {
                title: "Bali",
                href: "/destinations/bali",
                img: "https://cdn.musafirbaba.com/images/Bali_sc5oct.jpg",
              },
              {
                title: "Thailand",
                href: "/destinations/thailand",
                img: "https://cdn.musafirbaba.com/images/Thailand_btmxk6.jpg",
              },
              {
                title: "Japan",
                href: "/destinations/japan",
                img: "https://cdn.musafirbaba.com/images/Untitled_design_3_g8ok0g.jpg",
              },
              {
                title: "Maldives",
                href: "/destinations/maldives",
                img: "https://cdn.musafirbaba.com/images/Untitled_design_2_rrfsvj.jpg",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="relative min-w-[260px] md:min-w-0 md:flex-1 snap-start"
              >
                <Link href={item.href} className="z-10">
                  <Image
                    src={item.img}
                    alt={item.title}
                    width={500}
                    height={500}
                    className="rounded-2xl h-56 w-full object-cover"
                  />
                </Link>
                <div className=" pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 to-transparent rounded-2xl " />
                <h4 className=" pointer-events-none absolute bottom-2 inset-x-0 text-white text-center py-1 font-semibold">
                  {item.title}
                </h4>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
