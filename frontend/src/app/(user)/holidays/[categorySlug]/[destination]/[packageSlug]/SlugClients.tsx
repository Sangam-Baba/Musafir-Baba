"use client";

import Hero from "@/components/custom/Hero";
import React, { useState, useEffect, useRef } from "react";
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
import EffectCardRelatedPackages from "@/components/custom/EffectCardRelatedPackages";
import VisaAtAGlance from "@/components/custom/VisaAtAGlance";
import HelpfulResources from "@/components/custom/HelpfulResources";
import PackageEssentialsList from "@/components/custom/PackageEssentialsList";

type TabKey =
  | "whychoose"
  | "description"
  | "itineraries"
  | "hotels"
  | "includeexclude"
  | "whychoosemusafirbaba"
  | "faqs"
  | "helpfulresources";

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

  const isClickScrollingRef = useRef(false);
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const btn = tabButtonRefs.current[active];
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [active]);

  const tabs: { key: TabKey; label: string }[] = [
    ...(pkg.whyChooseThisPackage ? [{ key: "whychoose" as TabKey, label: "Why Choose" }] : []),
    { key: "description", label: "Overview" },
    { key: "itineraries", label: "Itinerary" },
    ...(pkg.hotelsAndAccommodation ? [{ key: "hotels" as TabKey, label: "Hotels" }] : []),
    { key: "includeexclude", label: "Inclusions" },
    { key: "whychoosemusafirbaba", label: "Why Us" },
    ...(pkg.faqs && pkg.faqs.length > 0 ? [{ key: "faqs" as TabKey, label: "FAQs" }] : []),
    ...(pkg.helpfulResources && pkg.helpfulResources.length > 0 ? [{ key: "helpfulresources" as TabKey, label: "Resources" }] : []),
  ];

  const tabKeys = tabs.map((t) => t.key);
  useEffect(() => {
    if (tabKeys.length === 0) return;
    const observers: IntersectionObserver[] = [];
    tabKeys.forEach((key) => {
      const el = document.getElementById(key);
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !isClickScrollingRef.current) {
              setActive(key as TabKey);
            }
          });
        },
        { rootMargin: "-180px 0px -40% 0px", threshold: 0 }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKeys.join(',')]);

  const price = pkg.batch?.length ? pkg?.batch[0].quad : 3999;
  const dicountedPrice = pkg.batch?.length ? pkg?.batch[0].quadDiscount : 5999;

  return (
    <section className="w-full bg-slate-50 min-h-screen pb-10">
      <div className="relative">
        <div className="absolute z-20 w-full flex justify-center md:bottom-14 bottom-2 px-4">
          <ItineryDialog
            title={pkg.title}
            description={pkg.description.slice(0, 50)}
            url={pkg.itineraryDownload?.url ?? ""}
            img={pkg.coverImage?.url}
            packageId={pkg._id}
            itinerary={pkg.itinerary}
            duration={`${pkg.duration.nights}N/${pkg.duration.days}D`}
            highlights={pkg.highlights}
            destination={pkg.destination?.state || ''}
            gallery={pkg?.gallery ?? []}
            inclusions={pkg.inclusions || []}
            exclusions={pkg.exclusions || []}
            batch={pkg.batch || []}
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
        <Breadcrumb title={pkg.title} />
      </div>

      
      
      {/* Sections Above Tab Bar */}
      {(pkg.highlights?.length > 0 || pkg.packageAtAGlance || pkg.packageEssentials) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 mt-8 flex flex-col gap-8">
          
          {/* Row 1: Highlights (Unique Presentation) */}
          {pkg.highlights && pkg.highlights.length > 0 && (
            <div className="bg-gradient-to-br from-orange-50/80 to-orange-100/40 p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-orange-200/50 relative overflow-hidden">
              {/* Decorative background elements */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/60 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-200/30 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex flex-col gap-2 mb-8 relative z-10">
                <h3 className="text-2xl md:text-3xl font-black font-heading text-gray-900 tracking-tight">Tour Highlights</h3>
                <div className="w-16 h-1.5 bg-[#FE5300] rounded-full"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 relative z-10">
                {pkg.highlights.map((h, i) => (
                  <div className="flex items-start gap-3.5 group" key={i}>
                    <div className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-orange-100 group-hover:scale-110 group-hover:bg-[#FE5300] group-hover:border-[#FE5300] group-hover:shadow-md transition-all duration-300 mt-0.5">
                      <Check className="w-4 h-4 text-[#FE5300] group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-gray-700 font-medium text-[15px] leading-snug group-hover:text-gray-900 transition-colors">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Row 2: Tables Side by Side */}
          {(pkg.packageAtAGlance || pkg.packageEssentials) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              
              {pkg.packageAtAGlance && pkg.packageAtAGlance.trim() !== "" && (
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.08)] border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                  <div className="flex flex-col gap-2 mb-6">
                    <h3 className="text-xl font-bold font-heading text-black">At a Glance</h3>
                    <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                  </div>
                  <div className="mt-4">
                    <VisaAtAGlance html={pkg.packageAtAGlance} />
                  </div>
                </div>
              )}

              {pkg.packageEssentials && pkg.packageEssentials.trim() !== "" && (
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_4px_20px_-10px_rgba(0,0,0,0.08)] border border-gray-100 hover:shadow-xl transition-shadow duration-300">
                  <div className="flex flex-col gap-2 mb-6">
                    <h3 className="text-xl font-bold font-heading text-black">Package Essentials</h3>
                    <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                  </div>
                  <div className="mt-4">
                    <PackageEssentialsList html={pkg.packageEssentials} />
                  </div>
                </div>
              )}
              
            </div>
          )}
        </div>
      )}

      {/* 100% width Sticky Tab Bar Background */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] w-full mb-6 mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex flex-nowrap md:flex-wrap w-full gap-3 pb-1 overflow-x-auto no-scrollbar md:overflow-visible snap-x snap-mandatory md:snap-none">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                ref={(el) => { tabButtonRefs.current[tab.key] = el as HTMLButtonElement | null; }}
                onClick={() => {
                  setActive(tab.key);
                  const el = document.getElementById(tab.key);
                  if (el) {
                    isClickScrollingRef.current = true;
                    el.scrollIntoView({ behavior: 'smooth' });
                    setTimeout(() => { isClickScrollingRef.current = false; }, 800);
                  }
                }}
                className={`shrink-0 snap-start text-xs md:text-sm h-10 px-4 md:px-5 rounded-full transition-all duration-200 ${
                  active === tab.key
                    ? "bg-[#FE5300] hover:bg-[#FE5300] text-white shadow-md"
                    : "bg-white hover:bg-gray-50 text-black border border-[#FE5300]/50 hover:border-[#FE5300]"
                }`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full max-w-7xl mx-auto px-4 my-4 md:flex">

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
            

            {/* Content */}
            <div className="mt-10 w-full flex flex-col gap-8">
              
              {pkg.whyChooseThisPackage && (
                <div id="whychoose" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h3 className="text-xl font-bold font-heading text-black">Why Choose This Char Dham Yatra Package?</h3>
                    <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                  </div>
                  <section className="prose prose-base max-w-none text-gray-600 leading-relaxed">
                    <BlogContent html={pkg.whyChooseThisPackage} />
                  </section>
                </div>
              )}

              <div id="description" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                <div className="flex flex-col gap-2 mb-5">
                  <h3 className="text-xl font-bold font-heading text-black">Package Overview</h3>
                  <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                </div>
                <div className="md:hidden text-gray-600 leading-relaxed text-base">
                  <ReadMore content={pkg.description} />
                </div>
                <section className="hidden md:block prose prose-base max-w-none text-gray-600 leading-relaxed">
                  <BlogContent html={pkg.description} />
                </section>
              </div>

              <div id="itineraries" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h3 className="text-xl font-bold font-heading text-black">Day-Wise Itinerary</h3>
                    <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                  </div>
                  <div className="relative pt-2 space-y-2">
                    {/* Continuous Vertical Line */}
                    <div className="absolute left-[19px] top-6 bottom-6 w-[2px] bg-orange-200/50"></div>
                    
                    <Accordion
                      type="multiple"
                      className="w-full relative z-10"
                    >
                      {pkg.itinerary.map((item: Itinerary, i: number) => (
                        <AccordionItem
                          key={i}
                          value={`itinerary-${i}`}
                          className="relative border-b-0 group"
                        >
                          <AccordionTrigger
                            className="text-lg font-semibold text-gray-800 hover:no-underline py-4 flex justify-between items-center transition-colors duration-200 focus-visible:ring-0 focus-visible:outline-none pl-[52px]"
                          >
                            {/* Dot Marker */}
                            <div className="absolute left-[11px] w-[18px] h-[18px] rounded-full border-[3px] border-[#FE5300] bg-white group-hover:bg-[#FE5300] transition-colors shadow-sm mt-0.5 z-10"></div>
                            
                            {/* Title Text */}
                            <span className="text-left leading-snug group-hover:text-[#FE5300] transition-colors">
                              {item.title}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="pl-[52px] pb-6">
                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 text-gray-600 leading-relaxed shadow-sm">
                              <ul className="space-y-2 list-disc list-inside marker:text-[#FE5300]">
                                {item.description.split("\n").map((line, idx) => (
                                  line.trim() ? <li key={idx} className="text-[15px]">{line.trim()}</li> : null
                                ))}
                              </ul>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
              </div>

              {pkg.hotelsAndAccommodation && (
                <div id="hotels" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h3 className="text-xl font-bold font-heading text-black">Hotels & Accommodation</h3>
                    <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                  </div>
                  <section className="prose prose-base max-w-none text-gray-600 leading-relaxed">
                    <BlogContent html={pkg.hotelsAndAccommodation} />
                  </section>
                </div>
              )}

              <div id="includeexclude" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <div className="flex flex-col gap-2 mb-5">
                      <h3 className="text-xl font-bold font-heading text-black">{`Inclusions`}</h3>
                      <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                    </div>
                    <ul className="space-y-3">
                      {pkg?.inclusions.map((inc, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground">{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="flex flex-col gap-2 mb-5">
                      <h3 className="text-xl font-bold font-heading text-black">{`Exclusions`}</h3>
                      <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                    </div>
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
              </div>

              <div id="whychoosemusafirbaba" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0 -mx-4 md:-mx-8">
                <WhyChoose />
              </div>

              {pkg.faqs && pkg.faqs.length > 0 && (
                <div id="faqs" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                    <div className="flex flex-col gap-2 mb-5">
                      <h3 className="text-xl font-bold font-heading text-black">FAQ</h3>
                      <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                    </div>
                    <Accordion
                      type="single"
                      collapsible
                      value={openItem}
                      onValueChange={setOpenItem}
                      className="w-full space-y-3"
                    >
                      {pkg.faqs.map((faq, index) => {
                        const isOpen = openItem === `faq-${index}`;
                        return (
                          <AccordionItem
                            key={index}
                            value={`faq-${index}`}
                            className={`group overflow-hidden rounded-lg border transition-all duration-200 ${
                              isOpen
                                ? "border-1 border-[#FE5300] shadow-lg bg-white"
                                : "border-gray-200 hover:border-[#FE5300] hover:shadow-md bg-white"
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
                </div>
              )}

              {pkg.helpfulResources && pkg.helpfulResources.length > 0 && (
                <div id="helpfulresources" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0 w-full">
                  <HelpfulResources data={pkg.helpfulResources} />
                </div>
              )}

              <div id="author" className="scroll-mt-40 mb-8">
                <div className="bg-orange-50/40 rounded-2xl p-6 md:p-8 border border-orange-100 flex flex-col gap-3 shadow-sm">
                  <h4 className="text-lg md:text-xl font-bold font-heading text-gray-900">Author Information</h4>
                  <div className="flex flex-col gap-2 text-gray-600 text-sm md:text-base">
                    <p><span className="font-semibold text-gray-800">Written By:</span> MusafirBaba Travel Team</p>
                    <p><span className="font-semibold text-gray-800">Reviewed By:</span> Uttarakhand Destination Specialist</p>
                    <p><span className="font-semibold text-gray-800">Last Updated:</span> Regularly Updated Before Every Yatra Season</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        <div className="w-full md:w-1/3 px-4 py-16">
          <div className="sticky top-28 h-fit pb-10">
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
      </div>

      <ImageGallery title="Memories in Motion" data={pkg?.gallery ?? []} />
      <Testimonial data={pkg?.reviews ?? []} />
      <div className="w-full max-w-7xl mx-auto px-8  mt-4 flex flex-col items-center">
        <h2 className="text-2xl font-bold">Related Packages</h2>
        <p className="w-1/16 h-1 bg-[#FE5300] mb-4 mt-2"></p>
        {relatedGroupPackages && relatedGroupPackages.length > 0 && (
          <>
            <div className="max-w-7xl hidden mx-auto md:grid gap-6  md:grid-cols-3 lg:grid-cols-4 py-12 px-10">
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
            {/* Mobile related packages */}
            <EffectCardRelatedPackages pkgs={relatedGroupPackages} />
          </>
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
