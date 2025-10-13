import { Plane, Bus, Hotel, Train } from "lucide-react";
import React from "react";
import Image from "next/image";
import Link from "next/link";

function HomeBooking() {
  return (
    <section className="relative max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between bg-[#CFFFD2] w-full px-6 md:px-12 lg:px-24 py-12 overflow-visible rounded-xl pb-0 gap-15 md:gap-0">
      {/* Left Content */}
      <div className="flex flex-col gap-4 w-full md:w-1/2 text-center md:text-left z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-[#1B1B1B]">
          Bookings
        </h2>
        <p className="text-gray-700 leading-relaxed max-w-md">
          Travel planning should be exciting, not stressful. At Musafirbaba, we
          make booking flights, trains, buses, and hotels simple, seamless, and
          secure.
        </p>

        {/* Icons */}
        <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-4">
          {[
            {
              Icon: Plane,
              label: "Flight",
              url: "https://musafirbaba.com/bookings/flight-tickets",
            },
            {
              Icon: Hotel,
              label: "Hotels",
              url: "https://musafirbaba.com/bookings/hotel-bookings",
            },
            {
              Icon: Bus,
              label: "Bus",
              url: "https://musafirbaba.com/bookings/bus-bookings",
            },
            {
              Icon: Train,
              label: "Train",
              url: "https://musafirbaba.com/bookings/train-ticket-bookings",
            },
          ].map(({ Icon, label, url }, index) => (
            <Link
              href={url}
              key={index}
              className="flex flex-col items-center text-gray-800"
            >
              <div className="bg-[#87E87F] hover:bg-[#FE5300] hover:scale-110 transition duration-500 ease-in-out p-3 rounded-lg flex items-center justify-center shadow-sm">
                <Icon color="white" className="w-8 h-8  " />
              </div>
              <p className="text-sm font-medium mt-2">{label}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Right Image */}
      <div className="w-full md:w-1/2 flex justify-center relative mt-10 md:mt-0 overflow-visible">
        {/* Green Circular Background */}
        <div className="absolute bottom-0 bg-[#87E87F] w-[150px] h-[150px] md:w-[320px] md:h-[320px] rounded-t-full z-0"></div>

        {/* Girl Image */}
        <Image
          src="/girl.png"
          alt="Coming Soon"
          width={400}
          height={400}
          className="relative h-[200px] z-10 object-contain md:w-[350px] md:h-[420px] -mt-20"
        />
      </div>
    </section>
  );
}

export default HomeBooking;
