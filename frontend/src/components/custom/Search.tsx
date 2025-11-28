"use client";

import { Button } from "../ui/button";
import { MapPin, Search } from "lucide-react";
import React, { useState } from "react";
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
  const [location, setLocation] = useState("");
  const { data } = useQuery({
    queryKey: ["locations"],
    queryFn: getAllLocations,
  });

  const dest = data?.data ?? [];

  return (
    <section className="relative z-20 flex w-full items-center gap-3 rounded-2xl  bg-white/95 px-4 py-1 md:py-3 shadow-xl backdrop-blur-sm">
      <MapPin className="text-[#FE5300] shrink-0" />

      <Select value={location} onValueChange={(value) => setLocation(value)}>
        <SelectTrigger className="w-full text-gray-600">
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

      <Button
        disabled={!location}
        className="flex items-center gap-1 shrink-0 rounded-md bg-[#FE5300] px-4 py-2 text-white hover:bg-[#e04a00] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <a
          href={`/destinations/${location}`}
          className="flex items-center gap-2"
        >
          <Search className="h-4 w-4" />
        </a>
      </Button>
    </section>
  );
}

export default SearchBanner;
