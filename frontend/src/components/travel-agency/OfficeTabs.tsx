"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import Image from "next/image";
import { Mail, Phone } from "lucide-react";
import Link from "next/link";

interface OfficesInterface {
  label: string;
  coverImage: {
    url: string;
    alt: string;
  };
  excerpt: string;
  title: string;
  slug: string;
}

export function OfficeTabs({ offices }: { offices: OfficesInterface[] }) {
  const [active, setActive] = useState(offices[0]?.slug);

  return (
    <section className="">
      <div className="flex flex-col gap-2 max-w-7xl mx-auto gap-10">
        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-3 ">
          {offices.map((tab) => (
            <Button
              key={tab.slug}
              size="lg"
              onClick={() => setActive(tab.slug)}
              className={` ${
                active === tab.slug
                  ? "bg-[#FE5300]"
                  : "bg-white shadow-md text-black border border-[#FE5300]"
              }`}
            >
              {tab.slug.charAt(0).toUpperCase() + tab.slug.slice(1)}
            </Button>
          ))}
        </div>

        {/* Offices */}
        <div>
          {offices.map((item, index: number) => (
            <div
              key={index}
              className={`${
                active === item.slug ? "block" : "hidden"
              }   border border-[#FE5300] rounded-xl shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer`}
            >
              <Link
                href={`/travel-agency/${item.slug}`}
                className="flex flex-col md:flex-row items-center  gap-4"
              >
                <div className="w-full md:w-1/2 flex items-center justify-center">
                  <Image
                    src={item.coverImage?.url}
                    width={500}
                    height={500}
                    alt={item.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="flex flex-col w-full md:w-1/2 gap-2 justify-start p-4">
                  <h3 className="text-lg md:text-xl font-bold text-gray-800">
                    {item.slug.charAt(0).toUpperCase() + item.slug.slice(1)}
                  </h3>
                  <p>{item.excerpt}</p>
                  <p className="flex gap-2">
                    <Mail color="#FE5300" /> care@musafirbaba.com
                  </p>
                  <p className="flex gap-2">
                    <Phone color="#FE5300" /> +91 92896 02447
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
