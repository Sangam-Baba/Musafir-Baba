"use client";

import Hero from "@/components/custom/Hero";
import React, { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { ImageGallery } from "@/components/custom/ImageGallery";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { Loader } from "@/components/custom/loader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import QueryForm from "@/components/custom/QueryForm";
import { ItineryDialog } from "@/components/custom/ItineryDialog";
import NotFoundPage from "@/components/common/Not-Found";
import { Check, ChevronDown, Clock, MapPin, X } from "lucide-react";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";
import { AuthDialog } from "@/components/auth/AuthDialog";
import Breadcrumb from "@/components/common/Breadcrumb";
type TabKey =
  | "description"
  | "highlights"
  | "itineraries"
  | "includeexclude"
  | "faqs";

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
interface Batch {
  startDate: string;
  endDate: string;
  quad: number;
  triple: number;
  double: number;
  child: number;
  quadDiscount: number;
  doubleDiscount: number;
  tripleDiscount: number;
  childDiscount: number;
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

interface Image {
  url: string;
  public_id: string;
  alt: string;
  width?: number;
  height?: number;
}
interface Package {
  _id: string;
  title: string;
  description: string;
  destination: Destination;
  coverImage: Image;
  gallery: Image[];
  batch: Batch[];
  duration: Duration;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  maxPeople?: number;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  itinerary: Itinerary[];
  itineraryDownload?: Image;
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

const getSinglePackages = async (
  state: string,
  slug: string
): Promise<QueryResponse> => {
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

function SlugClients({
  slug,
  state,
  country,
}: {
  slug: string;
  state: string;
  country: string;
}) {
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);
  const auth = useAuthStore();
  const pathName = usePathname();
  const StateName = state;
  const router = useRouter();

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
    return <NotFoundPage />;
  }

  const pkg = data?.data[0];

  if (!pkg) {
    return <p>No package found.</p>;
  }
  const price = pkg.batch?.length ? pkg?.batch[0].quad : 3999;
  const dicountedPrice = pkg.batch?.length ? pkg?.batch[0].quadDiscount : 5999;

  return (
    <section>
      <div className="relative">
        <div className="absolute z-20 w-full flex justify-center bottom-25 px-4">
          <ItineryDialog
            title={pkg.title}
            description={pkg.description.slice(0, 50)}
            url={pkg.itineraryDownload?.url ?? ""}
            img={pkg.coverImage?.url}
            packageId={pkg._id}
          />
        </div>
        <Hero
          image={pkg.coverImage.url ?? ""}
          title=""
          description=""
          align="center"
          height="lg"
          overlayOpacity={20}
        />
      </div>
      <div className="w-full max-w-7xl mx-auto px-8  mt-4">
        <Breadcrumb />
      </div>

      <div className="w-full max-w-7xl mx-auto px-4  my-4 md:flex">
        <section className="w-full md:w-2/3 px-4  py-16">
          <div className="flex flex-col gap-2  max-w-7xl mx-auto">
            {/* Tabs */}
            <div>
              <h1 className="text-3xl font-bold mb-4">{pkg.title}</h1>
              <div className="flex gap-2">
                <span className="flex items-center gap-1">
                  <MapPin color="#FE5300" size={14} />{" "}
                  {pkg.destination.state.charAt(0).toUpperCase() +
                    pkg.destination.state.slice(1)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock color="#FE5300" size={14} /> {pkg.duration.days}D/
                  {pkg.duration.nights}N
                </span>
              </div>
              {/* <p className="text-gray-600">{pkg.metaDescription}</p> */}
            </div>
            <div className="flex flex-wrap  w-full gap-2 mt-4 ">
              {tabs.map((tab) => (
                <Button
                  key={tab.key}
                  size="lg"
                  onClick={() => setActive(tab.key)}
                  className={`mt-4 ${
                    active === tab.key ? "bg-[#FE5300]" : "bg-gray-400"
                  }`}
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
                  <p className="text-justify whitespace-pre-line">
                    {pkg.description}
                  </p>
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
                <Accordion type="multiple" className="relative space-y-4">
                  {pkg.itinerary.map((item: Itinerary, i: number) => (
                    <AccordionItem
                      key={i}
                      value={`itinerary-${i}`}
                      className="relative border-l-2 border-dotted border-[#FE5300] border-b-0 pl-8"
                    >
                      {/* Timeline circle */}
                      <div className="absolute -left-[11px] top-4 w-5 h-5 rounded-full border-2 border-[#FE5300] bg-white flex items-center justify-center shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-[#FE5300]" />
                      </div>

                      {/* Accordion Header */}
                      <AccordionTrigger
                        className="text-lg font-semibold text-gray-800 hover:no-underline py-2 
                     flex justify-between items-center transition-colors duration-200 
                     hover:text-[#FE5300] focus-visible:ring-0 focus-visible:outline-none"
                      >
                        {item.title}
                      </AccordionTrigger>

                      {/* Accordion Content */}
                      <AccordionContent className="text-gray-600 text-sm ">
                        {item.description}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}

              {active === "includeexclude" && (
                <div className="space-y-8">
                  {/* Includes Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">{`What's Included`}</h3>
                    <ul className="space-y-3">
                      {pkg?.inclusions.map((inc, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground">{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Excludes Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-4">{`What's Not Included`}</h3>
                    <ul className="space-y-3">
                      {pkg?.exclusions.map((exc, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <X className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-muted-foreground">
                            {exc}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {active === "faqs" && (
                <Accordion
                  type="single"
                  collapsible
                  value={openItem}
                  onValueChange={setOpenItem}
                  className="w-full space-y-3"
                >
                  {pkg?.faqs.map((faq, index) => {
                    const isOpen = openItem === `faq-${index}`;
                    return (
                      <AccordionItem
                        key={index}
                        value={`faq-${index}`}
                        className={`group overflow-hidden rounded-lg border transition-all duration-200 ${
                          isOpen
                            ? "border-1 border-[#FE5300] shadow-lg"
                            : "border-gray-200 hover:border-[#FE5300] hover:shadow-md"
                        }`}
                      >
                        <AccordionTrigger
                          className={`px-6 py-4 text-left font-semibold transition-colors ${
                            isOpen
                              ? "text-blue-600"
                              : "text-gray-900 hover:text-[#FE5300]"
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              className={`flex-shrink-0 rounded-full p-2 transition-colors ${
                                isOpen
                                  ? "bg-blue-100"
                                  : "bg-gray-100 group-hover:bg-blue-50"
                              }`}
                            >
                              <ChevronDown
                                className={`h-5 w-5 transition-transform duration-300 ${
                                  isOpen ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                            <span className="text-base md:text-lg">
                              {faq.question}
                            </span>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="px-6 pb-4 pt-0">
                          <div className="ml-11 space-y-3 text-gray-600 leading-relaxed">
                            {faq.answer}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>
          </div>
        </section>
        <div className="w-full md:w-1/3 px-4 py-16 ">
          <Card className="mb-4 shadow-lg">
            <CardHeader className="flex flex-col justify-between  ">
              <p>
                Starting from{" "}
                <span className="text-sm text-muted-foreground line-through">
                  ₹ {dicountedPrice}
                </span>
              </p>
              <CardTitle className="text-4xl font-semibold tracking-tight text-[#FE5300]">
                ₹ {price}{" "}
              </CardTitle>
              <span className="text-sm text-muted-foreground">per person</span>
            </CardHeader>
            <Button
              onClick={() => {
                if (!auth.isAuthenticated) {
                  useAuthDialogStore
                    .getState()
                    .openDialog("login", undefined, `${pathName}/${pkg._id}`);
                } else {
                  router.push(`./${pkg.slug}/${pkg._id}`);
                }
              }}
              size={"lg"}
              className="m-4 bg-[#FE5300] hover:bg-[#FE5300] font-bold text-xl"
            >
              Book Now
            </Button>
          </Card>
          <QueryForm />
        </div>
      </div>
      <ImageGallery />
      <AuthDialog />
    </section>
  );
}

export default SlugClients;
