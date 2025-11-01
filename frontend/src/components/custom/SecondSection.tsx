"use client";

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
    <section className="w-full ">
      {/* <div className="absolute inset-0 bg-white/10 z-10 "></div> */}
      <div className="max-w-7xl mx-auto flex justify-around items-center px-8  gap-6">
        <div className="flex flex-col gap-2 items-center">
          <Image
            src="/smile.png"
            alt="logo"
            width={100}
            height={100}
            className="w-10 h-10 md:w-14 md:h-14 lg:w-18 lg:h-18 "
          />
          {/* <Smile className="w-10 h-10 md:w-14 md:h-14 lg:w-18 lg:h-18 text-[#FF5733]" /> */}
          <p className="text-xl md:text-2xl font-bold text-black">{counter}</p>
          <p className="text-sm text-black">Happy Travellers</p>
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
          <p className="text-xl md:text-2xl font-bold text-black">4.8/5</p>
          <p className="text-sm text-black">Google Ratings</p>
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
          <p className="text-xl md:text-2xl font-bold text-black">500+</p>
          <p className="text-sm text-black">Tour Packages</p>
        </div>
      </div>
    </section>
  );
}

export default SecondSection;
