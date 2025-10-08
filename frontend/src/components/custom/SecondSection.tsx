"use client";

import { Smile, Star, Route } from "lucide-react";
import React, { useEffect, useState } from "react";
import Image from "next/image";
const getCount = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/counter/68e6549442582b78aea7c191`,
    { cache: "no-store" } // ensures fresh data
  );
  if (!res.ok) throw new Error("Failed to fetch counter");
  return res.json();
};

const updateCounter = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/counter/68e6549442582b78aea7c191`,
    { method: "PATCH" }
  );
  if (!res.ok) throw new Error("Failed to update counter");
  return res.json();
};

function SecondSection() {
  const [counter, setCounter] = useState<number>(999);

  useEffect(() => {
    const updateAndFetch = async () => {
      try {
        await updateCounter();
        const data = await getCount();
        setCounter(data.count);
      } catch (error) {
        console.error(error);
      }
    };
    updateAndFetch();
  }, []);

  return (
    <section className="w-full px-4 md:px-8 lg:px-20 py-16">
      <div className="max-w-7xl mx-auto flex justify-around items-center px-8 py-4">
        <div className="flex flex-col gap-2 items-center">
          <Image
            src="/smile.png"
            alt="logo"
            width={100}
            height={100}
            className="w-10 h-10 md:w-14 md:h-14 lg:w-18 lg:h-18"
          />
          {/* <Smile className="w-10 h-10 md:w-14 md:h-14 lg:w-18 lg:h-18 text-[#FF5733]" /> */}
          <h1 className="text-2xl font-bold">{counter}+</h1>
          <p className="text-sm">Happy Travellers</p>
        </div>

        <div className="flex flex-col gap-2 items-center">
          <Image
            src="/google.png"
            alt="logo"
            width={100}
            height={100}
            className="w-10 h-10 md:w-14 md:h-14 lg:w-18 lg:h-18"
          />
          {/* <Star className="w-10 h-10 md:w-14 md:h-14 lg:w-18 lg:h-18 text-[#FF5733]" /> */}
          <h1 className="text-2xl font-bold">4.8/5</h1>
          <p className="text-sm">Google Ratings</p>
        </div>

        <div className="flex flex-col gap-2 items-center">
          <Image
            src="/map.png"
            alt="logo"
            width={100}
            height={100}
            className="w-10 h-10 md:w-14 md:h-14 lg:w-18 lg:h-18"
          />
          {/* <Route className="w-10 h-10 md:w-14 md:h-14 lg:w-18 lg:h-18 text-[#FF5733]" /> */}
          <h1 className="text-2xl font-bold">200+</h1>
          <p className="text-sm">Tour Packages</p>
        </div>
      </div>
    </section>
  );
}

export default SecondSection;
