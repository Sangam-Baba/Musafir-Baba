"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import Image from "next/image";

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
      <div className="flex flex-col gap-2 max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-3 mt-6">
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
              {tab.title}
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
              }  p-6 w-[300px] border border-[#FE5300] rounded-xl shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer`}
            >
              <div className="flex items-center text-center gap-4">
                <div className="w-3/7 flex items-center justify-center">
                  <Image
                    src={item.coverImage?.url}
                    width={500}
                    height={500}
                    alt={item.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div className="flex flex-col w-4/7 gap-2 justify-start">
                  <h3 className="text-lg md:text-xl font-bold text-gray-800">
                    {item.title}
                  </h3>
                  <p>{item.excerpt}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
