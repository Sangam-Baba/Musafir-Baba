"use client";

import { MapPin } from "lucide-react";
import React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Location {
  _id: string;
  name: string;
  country: string;
  state: string;
}

const getAllLocations = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/destination/only`
  );
  return res.json();
};

function SearchBanner() {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["locations"],
    queryFn: getAllLocations,
  });

  const dest = data?.data ?? [];

  return (
    <section className="relative z-20 flex w-full items-center gap-3 rounded-2xl  bg-white/95 px-4 py-1 md:py-3 shadow-xl backdrop-blur-sm">
      <MapPin className="text-[#FE5300] shrink-0" />

      <Select onValueChange={(value) => router.push(`/destinations/${value}`)}>
        <SelectTrigger className="w-full text-gray-800 focus:outline-none border-none shadow-none">
          <SelectValue placeholder="Select Location" className="" />
        </SelectTrigger>
        <SelectContent>
          {dest.map((loc: Location) => (
            <SelectItem key={loc._id} value={`${loc.state}`}>
              {" "}
              {loc.name.charAt(0).toUpperCase() + loc.name.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </section>
  );
}

export default SearchBanner;
