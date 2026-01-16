"use client";

import Hero from "@/components/custom/Hero";
import React, { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { ImageGallery } from "@/components/custom/ImageGallery";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
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
import { Check, ChevronDown, Clock, MapPin, X } from "lucide-react";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";
import { AuthDialog } from "@/components/auth/AuthDialog";
import Breadcrumb from "@/components/common/Breadcrumb";
import WhyChoose from "@/components/custom/WhyChoose";
import { Testimonial } from "@/components/custom/Testimonial";
import { BlogContent } from "@/components/custom/BlogContent";
import PackageCard from "@/components/custom/PackageCard";
import { GroupPackageInterface } from "./page";
import ReadMore from "@/components/common/ReadMore";
type TabKey =
  | "description"
  | "highlights"
  | "itineraries"
  | "includeexclude"
  | "faqs";

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

function SlugClients({
  pkg,
  relatedGroupPackages,
}: {
  pkg: GroupPackageInterface;
  relatedGroupPackages: GroupPackageInterface[];
}) {
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);
  const auth = useAuthStore();
  const pathName = usePathname();
  const router = useRouter();

  const [active, setActive] = useState<TabKey>("description");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "description", label: "Description" },
    { key: "highlights", label: "Highlights" },
    { key: "itineraries", label: "Itineraries" },
    { key: "includeexclude", label: "Includes & Excludes" },
    { key: "faqs", label: "FAQs" },
  ];

  const price = pkg.batch?.length ? pkg?.batch[0].quad : 3999;
  const dicountedPrice = pkg.batch?.length ? pkg?.batch[0].quadDiscount : 5999;

  return (
    <section>
      <div className="relative">
        <div className="absolute z-20 w-full flex justify-center md:bottom-14 bottom-2 px-4">
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
          title={pkg.title}
          description=""
          align="center"
          height="lg"
          overlayOpacity={100}
        />
      </div>
      <div className="w-full max-w-7xl mx-auto px-8  mt-4">
        <Breadcrumb />
      </div>

      <div className="w-full max-w-7xl mx-auto px-4  my-4 md:flex">
        <section className="w-full md:w-2/3 px-4 md:py-10 py-4">
          <div className="flex flex-col gap-2  max-w-7xl mx-auto">
            {/* Tabs */}
            <div>
              {/* <h1 className="text-3xl font-bold mb-4">{pkg.title}</h1> */}
              <div className="flex gap-2">
                <span className="flex md:text-xl items-center gap-1 px-3 py-3 rounded-md">
                  <MapPin color="#FE5300" size={24} />{" "}
                  {pkg.destination.state.charAt(0).toUpperCase() +
                    pkg.destination.state.slice(1)}
                </span>
                <span className="flex md:text-xl items-center gap-1 px-3 py-3 rounded-md">
                  <Clock color="#FE5300" size={24} /> {pkg.duration.nights}N/
                  {pkg.duration.days}D
                </span>
              </div>
              {/* <p className="text-gray-600">{pkg.metaDescription}</p> */}
            </div>
            <div className="flex md:flex-wrap w-full gap-2 mt-4 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <Button
                  key={tab.key}
                  size="lg"
                  onClick={() => setActive(tab.key)}
                  className={`mt-4 ${
                    active === tab.key
                      ? "bg-[#FE5300]"
                      : "bg-white text-black border border-[#FE5300]"
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Content */}
            <div className="mt-10 w-full">
              {active === "description" && (
                <div className="rounded-xl bg-[#87E87F]/20 px-8 py-6 shadow">
                  <h2 className="font-bold text-lg mb-2">About This Tour</h2>
                  <div className="md:hidden">
                    <ReadMore content={pkg.description} />
                  </div>
                  <section className="hidden md:block prose prose-lg max-w-none mt-6">
                    <BlogContent html={pkg.description} />
                  </section>
                </div>
              )}

              {active === "highlights" && (
                <ul className="list-disc list-inside rounded-xl bg-[#87E87F]/20 px-8 py-6 shadow">
                  {pkg.highlights.map((h, i) => (
                    <li className="mb-2 text-lg" key={i}>
                      {h}
                    </li>
                  ))}
                </ul>
              )}

              {active === "itineraries" && (
                <Accordion
                  type="multiple"
                  className="relative space-y-4 rounded-xl bg-[#87E87F]/20 px-8 py-6 shadow"
                >
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
                        {item.description.split("\n").map((line, i) => (
                          <li key={i} className="ml-5">
                            {line}
                          </li>
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}

              {active === "includeexclude" && (
                <div className="space-y-8">
                  {/* Includes Section */}
                  <div className="rounded-xl bg-[#87E87F]/20 px-4 py-6 shadow">
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
                  <div className="rounded-xl bg-red-50 px-4 py-6 shadow">
                    <h3 className="text-lg font-semibold text-foreground mb-4">{`What's Not Included`}</h3>
                    <ul className="space-y-3">
                      {pkg?.exclusions.map((exc, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <X className="w-5 h-5 text-red-600 text-muted-foreground flex-shrink-0 mt-0.5" />
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
                  className="w-full space-y-3 rounded-xl bg-[#87E87F]/20 px-4 py-6 shadow"
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
                            <section className="prose prose-lg max-w-none">
                              <BlogContent html={faq.answer} />
                            </section>
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
          <Card className="hidden md:grid md:grid-cols-1 lg:grid-cols-2 mb-4 shadow-lg border-2 border-[#FE5300] hover:shadow-2xl">
            <CardHeader className="flex flex-col justify-between  ">
              <p className="whitespace-nowrap">
                Starting from{" "}
                <span className="text-sm text-muted-foreground line-through">
                  ₹ {dicountedPrice}
                </span>
              </p>
              <CardTitle className="text-4xl font-semibold tracking-tight text-[#FE5300] whitespace-nowrap">
                ₹ {price.toLocaleString()}{" "}
              </CardTitle>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                per person
              </span>
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
              className="m-4 bg-[#FE5300] hover:bg-[#FE5300] font-semibold text-xl"
            >
              Book Now
            </Button>
          </Card>
          <QueryForm />
        </div>
      </div>

      <ImageGallery title="Memories in Motion" data={pkg?.gallery ?? []} />
      <WhyChoose />
      <Testimonial data={pkg?.reviews ?? []} />
      <div className="w-full max-w-7xl mx-auto px-8  mt-4 flex flex-col items-center">
        <h2 className="text-2xl font-bold">Related Packages</h2>
        <p className="w-1/16 h-1 bg-[#FE5300] mb-4 mt-2"></p>
        {relatedGroupPackages && relatedGroupPackages.length > 0 && (
          <div className="max-w-7xl mx-auto grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 py-12 px-10">
            {relatedGroupPackages
              .slice(0, 4)
              .map((pkg: GroupPackageInterface) => (
                <PackageCard
                  key={pkg._id}
                  pkg={{
                    id: pkg._id,
                    name: pkg.title,
                    slug: pkg.slug,
                    image: pkg.coverImage ? pkg.coverImage.url : "",
                    price: pkg.batch ? pkg.batch[0]?.quad : 9999,
                    duration: `${pkg.duration.nights}N/${pkg.duration.days}D`,
                    destination:
                      pkg.destination?.name ?? pkg.destination?.state ?? "",
                    batch: pkg?.batch ? pkg?.batch : [],
                  }}
                  url={`/holidays/${pkg?.mainCategory?.slug}/${pkg?.destination?.slug}/${pkg.slug}`}
                />
              ))}
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-between items-end bg-white md:hidden mb-13 py-2 px-4 border-b border-gray-400">
        <CardHeader className="flex flex-col justify-between  ">
          <p className="whitespace-nowrap">
            Starting from{" "}
            <span className="text-sm text-muted-foreground line-through">
              ₹ {dicountedPrice}
            </span>
          </p>
          <CardTitle className="text-3xl font-semibold tracking-tight text-[#FE5300] whitespace-nowrap">
            ₹ {price.toLocaleString()}{" "}
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              per person
            </span>
          </CardTitle>
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
          className=" bg-[#FE5300] hover:bg-[#FE5300] text-md"
        >
          Book Now
        </Button>
      </div>

      <AuthDialog />
    </section>
  );
}

export default SlugClients;
