"use client";

import { Button } from "../ui/button";
import { MapPin, Search } from "lucide-react";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";

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
    <section className="border rounded-xl shadow-lg flex gap-4 w-full  mx-auto px-4 py-3 items-center bg-white justify-between">
      <MapPin className="text-[#FE5300]" />
      <select
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="w-3/2 border border-[#FE5300] rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#FE5300]"
      >
        <option value="">Select Location</option>
        {dest.map((location: Location) => {
          return (
            <option
              key={location._id}
              value={`${location.country}/${location.state}`}
            >
              {location.name.charAt(0).toUpperCase() + location.name.slice(1)}
            </option>
          );
        })}
      </select>
      <Button
        disabled={!location}
        className="bg-[#FE5300] hover:bg-[#e04a00] text-white rounded-md"
      >
        <a href={`/${location}`}>
          <Search />
        </a>
      </Button>
    </section>
  );
}

export default SearchBanner;
