"use client";

import React, { useState } from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import jaipur from "../../../public/jaipur.jpg";
import badrinath from "../../../public/badrinath.jpg";
import kashmir from "../../../public/kashmir.jpg";
import himachal from "../../../public/Himachal.jpg";
import Link from "next/link";
export function DestinationSection() {
  const [active, setActive] = useState<"domestic" | "international">(
    "domestic"
  );

  return (
    <section className="w-full px-4 md:px-8 lg:px-20 py-16">
      <div className="flex flex-col gap-2 items-center max-w-7xl mx-auto">
        {/* Heading */}
        <div className="flex flex-col gap-5 items-center w-full">
          <h1 className="text-2xl md:text-3xl font-bold text-center">
            Not Sure Where to Travel? Explore Top Destinations Across India &
            the World!
          </h1>
          <div className="w-20 h-1 bg-[#FE5300]"></div>
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
              International Trips
            </Button>
          </div>
        </div>
        <div className="flex  justify-between  items-center w-full p-2">
          <div className="text-xl font-semibold">
            {active === "domestic" ? "Domestic" : "International"} Trips
          </div>
          <div>
            <Link
              href={`https://musafirbaba.com/${
                active === "domestic" ? "india" : "india"
              }`}
              className="text-[#FE5300] font-semibold"
            >
              {" "}
              View All
            </Link>
          </div>
        </div>

        {/* Content Section */}
        {active === "domestic" && (
          <div className="flex flex-col md:flex-row gap-4 mt-10 w-full">
            <div className="flex flex-col md:flex-row gap-4 md:w-1/2">
              <div className="flex flex-col gap-4 md:w-1/2">
                <div className="relative">
                  <Link href="/india/uttrakhand">
                    <Image
                      src={badrinath}
                      alt="Uttarakhand"
                      className="rounded-2xl w-full h-56 object-cover"
                    />
                  </Link>
                  <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Uttarakhand
                  </div>
                </div>
                <div className="relative">
                  <Link href="/india/rajasthan">
                    <Image
                      src={jaipur}
                      alt="Rajasthan"
                      className="rounded-2xl w-full h-56 object-cover"
                    />
                  </Link>
                  <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Rajasthan
                  </div>
                </div>
              </div>
              <div className="md:w-1/2">
                <div className="relative">
                  <Link href="/india/kerala">
                    <Image
                      src="https://res.cloudinary.com/dmmsemrty/image/upload/v1758340822/Untitled_design_5_hgguwf.jpg"
                      alt="Kerala"
                      className="rounded-2xl w-full md:h-118 h-56 object-cover"
                      width={500}
                      height={500}
                    />
                  </Link>
                  <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Kerala
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 md:w-1/2">
              <div className="w-full">
                <div className="relative">
                  <Link href="/india/meghalaya">
                    <Image
                      src="https://res.cloudinary.com/dmmsemrty/image/upload/v1758340821/Untitled_design_6_mggpgh.jpg"
                      alt="meghalaya"
                      className="rounded-2xl w-full h-56 object-cover"
                      width={500}
                      height={500}
                    />
                  </Link>
                  <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Meghalaya
                  </div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4 w-full">
                <div className="relative md:w-1/2">
                  <Link href="/india/himachal-pradesh">
                    <Image
                      src={himachal}
                      alt="himachal"
                      className="rounded-2xl  h-56 object-cover"
                    />
                  </Link>
                  <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Himachal Pradesh
                  </div>
                </div>
                <div className="relative md:w-1/2">
                  <Link href="/india/jammu-and-kashmir">
                    <Image
                      src={kashmir}
                      alt="Kerala"
                      className="rounded-2xl h-56 object-cover"
                    />
                  </Link>
                  <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Kashmir
                  </div>
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
                  <Image
                    src="https://res.cloudinary.com/dmmsemrty/image/upload/v1758107532/Singapore_bdsaps.jpg"
                    alt="Singapore"
                    className="rounded-2xl w-full h-56 object-cover"
                    width={500}
                    height={500}
                  />
                  <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Singapore
                  </div>
                </div>
                <div className="relative">
                  <Image
                    src="https://res.cloudinary.com/dmmsemrty/image/upload/v1758087427/Untitled_design_4_yrnksb.jpg"
                    alt="Dubai"
                    className="rounded-2xl w-full h-56 object-cover"
                    width={500}
                    height={500}
                  />
                  <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Dubai
                  </div>
                </div>
              </div>
              <div className="md:w-1/2">
                <div className="relative">
                  <Image
                    src="https://res.cloudinary.com/dmmsemrty/image/upload/v1758107531/Bali_sc5oct.jpg"
                    alt="Bali"
                    className="rounded-2xl w-full md:h-118 h-56 object-center"
                    width={500}
                    height={500}
                  />
                  <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Bali
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 md:w-1/2">
              <div className="w-full">
                <div className="relative">
                  <Image
                    src="https://res.cloudinary.com/dmmsemrty/image/upload/v1758107531/Thailand_btmxk6.jpg"
                    alt="Thailand"
                    className="rounded-2xl w-full h-56 "
                    width={500}
                    height={500}
                  />
                  <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Thailand
                  </div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4 w-full">
                <div className="relative md:w-1/2">
                  <Image
                    src="https://res.cloudinary.com/dmmsemrty/image/upload/v1758087426/Untitled_design_3_g8ok0g.jpg"
                    alt="Japan"
                    className="rounded-2xl  h-56 "
                    width={500}
                    height={500}
                  />
                  <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Japan
                  </div>
                </div>
                <div className="relative md:w-1/2 ">
                  <Image
                    src="https://res.cloudinary.com/dmmsemrty/image/upload/v1758087426/Untitled_design_2_rrfsvj.jpg"
                    alt="Maldives"
                    className="rounded-2xl h-56"
                    width={500}
                    height={500}
                  />
                  <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold ">
                    Maldives
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
