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
import ReadMore from "@/components/common/ReadMore";
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
  visas?: any[];
}

function VisaClientPage({ visa }: { visa: VisaInterface[] }) {
  const [search, setSearch] = React.useState({
    country: "",
    visaType: "",
    minPrice: 0,
    maxPrice: 5000000,
  });

  const content = `
<p>Planning an international trip? Explore visa information, requirements, application guidance, processing timelines, and travel resources for destinations across the world. MusafirBaba's visa section helps travellers access country-specific visa information and assistance for over 180 countries across Asia, Europe, North America, South America, Oceania, Africa, and the Middle East.</p>

<h2>About MusafirBaba Visa Services</h2>
<p>International travel often begins with understanding the visa requirements of your destination. Every country follows its own regulations regarding eligibility, documentation, application procedures, processing timelines, and entry conditions.</p>

<p>MusafirBaba's visa section serves as a comprehensive resource for travellers looking to explore country-specific visa information and application guidance. Whether you're planning a holiday, family visit, business trip, educational journey, or special-purpose travel, you can browse destinations and access detailed visa-related information through our dedicated country pages.</p>

<p>Explore your destination below to learn more about visa requirements, application procedures, fees, processing timelines, and travel guidance.</p>
`;
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
    if (!visa) {
      setFilteredVisas([]);
      return;
    }
    
    const res = visa.filter((v: VisaInterface) => {
      let minFee = v.cost || 0;
      if (v.visas && Array.isArray(v.visas) && v.visas.length > 0) {
        let lowest = Infinity;
        v.visas.forEach((visaType) => {
          if (visaType.validityEntries && Array.isArray(visaType.validityEntries)) {
            visaType.validityEntries.forEach((entry: any) => {
              if (entry.governmentFee !== undefined && entry.governmentFee < lowest) {
                lowest = entry.governmentFee;
              }
            });
          }
        });
        if (lowest !== Infinity) minFee = lowest;
      }
      
      const searchCountry = search.country?.toLowerCase() || "";
      const searchVisaType = search.visaType?.toLowerCase() || "";
      
      const matchesCountry = !searchCountry || v.country?.toLowerCase().includes(searchCountry);
      
      const matchesVisaType = 
        !searchVisaType || 
        searchVisaType === "all" || 
        v.visaType?.toLowerCase().includes(searchVisaType) || 
        (v.visas && v.visas.some((vt: any) => vt.visaType?.toLowerCase().includes(searchVisaType)));
        
      const matchesPrice = minFee >= (search.minPrice || 0) && minFee <= (search.maxPrice || Infinity);
      
      return matchesCountry && matchesVisaType && matchesPrice;
    });
    setFilteredVisas(res);
  }, [search, visa]);

  return (
    <section className="bg-slate-50/60 min-h-screen pb-10">
      <div className="">
        <Hero
          image="/Heroimg.jpg"
          title="Visa Services for 180+ Countries"
          overlayOpacity={100}
          aspectRatio="aspect-auto"
          className="h-[140px] md:h-[180px] lg:h-[200px] [&>div.relative.z-10]:!pt-0 [&>div.relative.z-10]:!pb-0"
        />
      </div>

      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb title="Visa" />
      </div>

      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <ReadMore content={content} />
      </div>

      <div className="container lg:max-w-7xl mx-auto py-8 px-4 md:px-8 space-y-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm w-full flex flex-col md:flex-row gap-4 md:items-end justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto flex-1">
            {/* Visa Type Dropdown */}
            <div className="flex flex-col gap-1.5 w-full sm:w-48">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Visa Type</Label>
              <Select
                value={search.visaType}
                onValueChange={(value) =>
                  setSearch((prev) => ({ ...prev, visaType: value }))
                }
              >
                <SelectTrigger className="w-full h-10 bg-white border-gray-200 focus:ring-[#FE5300] focus:border-[#FE5300] shadow-sm">
                  <SelectValue placeholder="All Visas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Visa Type</SelectLabel>
                    <SelectItem value="all">All Visas</SelectItem>
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

            {/* Country Search */}
            <div className="flex flex-col gap-1.5 w-full sm:max-w-xs flex-1">
              <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Destination</Label>
              <Input
                type="text"
                name="country"
                placeholder="Search country..."
                value={search.country}
                onChange={handleChange}
                className="w-full h-10 bg-white border-gray-200 focus:ring-[#FE5300] focus:border-[#FE5300] shadow-sm"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-start md:items-end">
            {/* Price Slider */}
            <div className="flex flex-col gap-1.5 w-full sm:w-56">
              <div className="flex justify-between items-center">
                <Label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Max Budget</Label>
                <span className="text-[13px] font-bold text-[#FE5300]">
                  ₹{search.maxPrice.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="h-10 flex items-center">
                <input
                  type="range"
                  name="maxPrice"
                  onChange={handleChange}
                  value={search.maxPrice}
                  min={0}
                  max={5000000}
                  step={1000}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FE5300]"
                />
              </div>
            </div>

            {/* Reset Button */}
            <Button
              type="button"
              onClick={() => {
                setSearch({
                  country: "",
                  visaType: "",
                  minPrice: 0,
                  maxPrice: 5000000,
                });
                setFilteredVisas(visa);
              }}
              variant="outline"
              className="w-full sm:w-auto h-10 px-6 font-semibold text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-[#FE5300] hover:border-[#FE5300] transition-colors shadow-sm"
            >
              Reset
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
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
