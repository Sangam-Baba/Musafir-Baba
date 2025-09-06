"use client";

import Hero from "@/components/custom/Hero";
import React, { useState} from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { ImageGallery } from "@/components/custom/ImageGallery";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { useBookingStore } from "@/store/useBookingStore";
import { Loader } from "@/components/custom/loader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion";
import { Calendar } from "lucide-react";
import { Card , CardContent, CardFooter, CardHeader, CardTitle, CardDescription, CardAction, } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

type TabKey = "description" | "highlights" | "itineraries" | "includeexclude" | "faqs";

interface Destination {
  _id: string;
  name: string;
  country: string;
  state: string;
  city?: string;
  description: string;
  coverImage: string;
  slug: string;
}
interface Price {
  adult: number;
  child: number;
  currency: string;
}
export interface Category {
  _id: string;
  name: string;
  slug: string;
}
export interface SEO {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
}
export interface Duration {
  days: number;
  nights: number;
}
export interface Faqs {
  question: string;
  answer: string;
}
export interface Itinerary {
  title: string;
  description: string;
}
interface Package {
  _id: string;
  title: string;
  description: string;
  destination: Destination;
  coverImage: string;
  gallery: string[];
  price: Price;
  category: Category[];
  duration: Duration;
  seo: SEO;
  keywords: string[];
  startDates: string[];
  endDates: string[];
  maxPeople?: number;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  itinerary: Itinerary[];
  faqs: Faqs[];
  isFeatured: boolean;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  slug: string;
  __v: number;
}
interface QueryResponse {
  success: boolean;
  data: Package[];
  total: number;
  page: number;
  totalPages: number;
}

const getSinglePackages = async (state: string, slug: string): Promise<QueryResponse> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/packages/?destination=${state}&slug=${slug}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  if (!res.ok) {
    throw new Error("Failed to fetch Package");
  }
  return res.json();
};

function PackageDetails() {
  const auth=useAuthStore();
  console.log(auth);
  const { slug, state } = useParams<{ state: string; slug: string }>();
  const StateName = state;
  const router=useRouter();
  const store= useBookingStore((state) => state);
  console.log(store);
  const adults= useBookingStore((state) => state.adults);
  const children = useBookingStore((state) => state.children);
  const price= useBookingStore((state) => state.price);
  const date=useBookingStore((state) => state.date);
  const setDate=useBookingStore((state) => state.setDate);
  const setPrice = useBookingStore((state) => state.setPrice);
  const setAdults = useBookingStore((state) => state.setAdults);
  const setChildren = useBookingStore((state) => state.setChildren);
 


  const [active, setActive] = useState<TabKey>("description");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "description", label: "Description" },
    { key: "highlights", label: "Highlights" },
    { key: "itineraries", label: "Itineraries" },
    { key: "includeexclude", label: "Includes & Excludes" },
    { key: "faqs", label: "FAQs" },
  ];

  const { data, isLoading, isError } = useQuery<QueryResponse>({
    queryKey: ["package", state, slug],
    queryFn: () => getSinglePackages(StateName, slug),
    retry: 2,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) return <Loader size="lg" message="Loading package..." />;
  if (isError) {
    toast.error(`No package found for ${StateName}`);
    return <p className="text-center text-gray-600 mt-6">No package found.</p>;
  }

  const pkg = data?.data[0];
  
  if (!pkg) {
    return <p>No package found.</p>;
  }
    const recalcPrice = (newAdults: number, newChildren: number) => {
    setPrice(newAdults * pkg.price.adult + newChildren * pkg.price.child);
  };

  return (
    <section>
      <Hero
        image={pkg.coverImage ?? ""}
        title={pkg.title}
        description={pkg.seo?.metaDescription ?? ""}
        align="center"
        height="lg"
        overlayOpacity={55}
      />

      <ImageGallery />
      <div className="w-full px-4 md:px-8 lg:px-20 py-8 md:flex">
      <section className="w-full md:w-1/2 px-4 md:px-8 lg:px-20 py-16">
        <div className="flex flex-col gap-2 items-center max-w-7xl mx-auto">
          {/* Tabs */}
          <div className="flex flex-wrap justify-center w-full gap-2 mt-4 ">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                size="lg"
                onClick={() => setActive(tab.key)}
                className={`mt-4 ${active === tab.key ? "bg-[#FE5300]" : "bg-gray-400"}`}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Content */}
          <div className="mt-10 w-full">
            {active === "description" && (
              <div>
                <h2 className="font-bold text-lg mb-2">About This Tour</h2>
                <p>{pkg.description}</p>
              </div>
            )}

            {active === "highlights" && (
              <ul className="list-disc list-inside">
                {pkg.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            )}

            {active === "itineraries" && (
              <Accordion type="single" collapsible className="w-full">
                {pkg.itinerary.map((item, i) => (
                  <AccordionItem value={`itinerary-${i}`} key={i} className="rounded-2xl shadow-lg p-4">
                    <AccordionTrigger>{item.title}</AccordionTrigger>
                    <AccordionContent className="text-justify">{item.description}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            {active === "includeexclude" && (
              <div>
                <h2 className="font-bold">Includes</h2>
                <ul className="list-disc list-inside">
                  {pkg.inclusions.map((inc, i) => <li key={i}>{inc}</li>)}
                </ul>
                <h2 className="font-bold mt-4">Excludes</h2>
                <ul className="list-disc list-inside">
                  {pkg.exclusions.map((exc, i) => <li key={i}>{exc}</li>)}
                </ul>
              </div>
            )}

            {active === "faqs" && (
              <Accordion type="single" collapsible className="w-full">
                {pkg.faqs.map((faq, i) => (
                  <AccordionItem value={`faq-${i}`} key={i} className="rounded-2xl shadow-lg p-4">
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent className="text-justify">{faq.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </div>
      </section>
      <div className="w-full md:w-1/2 px-4 md:px-8 lg:px-20 py-16">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-semibold tracking-tight">From: ₹{price} </CardTitle>
          </CardHeader>
          <CardContent className="p-4 rounded-2xl shadow-lg space-y-2 m-4">
            <div className="flex justify-around items-center">
              <p>Date:</p>
              <Calendar className="w-4 h-4 text-blue-600" />
              <Input type="date" value={date} onChange={(e) => {setDate(e.target.value); setPrice(adults * pkg.price.adult  + children * pkg.price.child)}} />
            </div>
            <div className="flex justify-between items-center">
              <p className="font-semibold text-lg">Adults:</p>
              <Button onClick={()=> {if(adults>0) {setAdults(adults-1); recalcPrice(adults - 1, children);}}} size="sm">-</Button>
              <span className="mx-2">{adults}</span>
              <Button  onClick={()=> {setAdults(adults+1); recalcPrice(adults + 1, children);}} size="sm">+</Button>
            </div>
            <div className="flex justify-between items-center">
              <p className="font-semibold text-lg">Child:</p>
              <Button  onClick={()=>  { if(children>0 ){setChildren(children-1); recalcPrice(adults, children - 1);}}} size="sm">-</Button>
              <span className="mx-2">{children}</span>
              <Button  onClick={()=>{ setChildren(children+1); recalcPrice(adults, children + 1);}} size="sm">+</Button>
            </div>
            
          </CardContent>
          <Button onClick={() => {
            if(!auth.isAuthenticated){router.push("/auth/login")}
             else {router.push(`/booking/${state}/${pkg.slug}`)}}} size={"lg"} className="m-4 ">Book Now</Button>
        </Card>
      </div>
      </div>
    </section>
  );
}

export default PackageDetails;
