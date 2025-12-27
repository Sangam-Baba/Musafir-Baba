"use client";
import React, { useState, useEffect } from "react";
import Hero from "@/components/custom/Hero";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VisaTypesDialog } from "@/components/custom/VisaTypesDialog";
import Breadcrumb from "@/components/common/Breadcrumb";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import VisaMainCard from "@/components/custom/VisaMainCard";
export interface VisaInterface {
  id: string;
  country: string;
  coverImage?: {
    url: string;
    alt: string;
    width: number;
    height: number;
  };
  cost: number;
  duration: string;
  visaType: string;
  visaProcessed: number;
  slug: string;
  bannerImage?: {
    url: string;
    alt: string;
    width: number;
    height: number;
  };
}

function VisaClientPage({ visa }: { visa: VisaInterface[] }) {
  const [search, setSearch] = React.useState({
    country: "",
    visaType: "",
    minPrice: 0,
    maxPrice: 35000,
  });
  const [filteredVisas, setFilteredVisas] = useState<VisaInterface[]>(visa);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearch((prev) => ({
      ...prev,
      [name]:
        name === "minPrice" || name === "maxPrice" ? Number(value) : value,
    }));
  };

  useEffect(() => {
    const res = visa?.filter((visa: VisaInterface) => {
      return (
        visa.country.toLowerCase().includes(search.country.toLowerCase()) &&
        visa.visaType.toLowerCase().includes(search.visaType.toLowerCase()) &&
        visa.cost >= search.minPrice &&
        visa.cost <= search.maxPrice
      );
    });
    setFilteredVisas(res);
  }, [search, visa]);

  return (
    <section>
      <div className="">
        <Hero
          image="/Heroimg.jpg"
          title="Visa"
          overlayOpacity={100}
          height="lg"
        />
      </div>

      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>

      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5"></div>

      <div className="container lg:max-w-7xl  mx-auto py-10 px-8 space-y-4">
        <div className="w-full flex flex-col gap-3 md:flex-row md:items-center md:justify-between p-4 border md:border-none rounded-xl shadow-sm">
          {/* Icon */}
          <div className="flex items-center gap-2">
            <FilterIcon size={22} className="text-[#FE5300]" />
            <span className="font-semibold text-gray-700 md:hidden">
              Filters
            </span>
          </div>

          {/* Country Search */}
          <Input
            type="text"
            name="country"
            placeholder="Search country..."
            value={search.country}
            onChange={handleChange}
            className="w-full md:max-w-[300px]"
          />

          {/* Visa Type Dropdown */}
          <div className="w-full md:max-w-[300px]">
            <Select
              value={search.visaType}
              onValueChange={(value) =>
                setSearch((prev) => ({ ...prev, visaType: value }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Visa Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Visa Type</SelectLabel>
                  <SelectItem value="E-Visa">E-Visa</SelectItem>
                  <SelectItem value="DAC">DAC</SelectItem>
                  <SelectItem value="EVOA">EVOA</SelectItem>
                  <SelectItem value="Sticker">Sticker</SelectItem>
                  <SelectItem value="ETA">ETA</SelectItem>
                  <SelectItem value="PAR">PAR</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Price Slider */}
          <div className="flex flex-col w-full md:max-w-[250px]">
            <Label className="text-gray-500 text-sm">
              Budget:{" "}
              <span className="font-semibold text-[#FE5300]">
                ₹{search.maxPrice.toLocaleString()}
              </span>
            </Label>
            <Input
              type="range"
              name="maxPrice"
              onChange={handleChange}
              value={search.maxPrice}
              min={0}
              max={35000}
              className="cursor-pointer accent-[#FE5300]"
            />
          </div>

          {/* Reset Button */}
          <Button
            type="button"
            onClick={() => {
              const reset = {
                country: "",
                visaType: "",
                minPrice: 0,
                maxPrice: 35000,
              };
              setSearch(reset);
              setFilteredVisas(visa);
            }}
            className="
      w-full md:w-auto 
      font-semibold 
      bg-[#FF5300] hover:bg-[#FE5300] 
      text-white 
      rounded-lg px-5 py-4
    "
          >
            Reset
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visa.length === 0 && (
            <h1 className="text-2xl font-bold">No Visas found</h1>
          )}

          {filteredVisas.map((visa: VisaInterface, i: number) => {
            return <VisaMainCard key={i} visa={visa} />;
          })}
        </div>
      </div>
    </section>
  );
}

export default VisaClientPage;
