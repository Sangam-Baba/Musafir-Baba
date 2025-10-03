import Image from "next/image";
import React from "react";
import bus from "../../../public/bus.jpg";
import train from "../../../public/train.jpg";
import flight from "../../../public/flight.jpeg";
import hotel from "../../../public/hotel.jpg";
import { Button } from "../ui/button";
export function BusBooking() {
  return (
    <section className="w-full px-4 ">
      <div className="flex flex-col gap-10 items-center max-w-7xl mx-auto">
        <div className="flex flex-col gap-2 items-center">
          <h1 className="text-3xl md:text-4xl font-bold">
            Start Booking With Us
          </h1>
          <div className="w-20 h-1 bg-[#FE5300]"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col items-center ">
            <Image
              src={bus}
              width={500}
              height={500}
              alt="h1"
              className="rounded-2xl w-full h-50 hover:scale-105 shadow-md hover:shadow-xl transition duration-500"
            />
            <Button className="mt-4 bg-[#FE5300]">Bus Booking</Button>
          </div>
          <div className="flex flex-col items-center">
            <Image
              src={train}
              width={500}
              height={500}
              alt="h1"
              className="rounded-2xl w-full h-50 hover:scale-105 shadow-md hover:shadow-xl transition duration-500"
            />
            <Button className="mt-4 bg-[#FE5300]">Train Booking</Button>
          </div>
          <div className="flex flex-col items-center">
            <Image
              src={flight}
              width={500}
              height={500}
              alt="h1"
              className="rounded-2xl w-full h-50 hover:scale-105 shadow-md hover:shadow-xl transition duration-500 "
            />
            <Button className="mt-4 bg-[#FE5300]">Flight Booking</Button>
          </div>
          <div className="flex flex-col items-center">
            <Image
              src={hotel}
              width={500}
              height={500}
              alt="h1"
              className="rounded-2xl w-full h-50 hover:scale-105 shadow-md hover:shadow-xl transition duration-500"
            />
            <Button className="mt-4 bg-[#FE5300]">Hotel Booking</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
