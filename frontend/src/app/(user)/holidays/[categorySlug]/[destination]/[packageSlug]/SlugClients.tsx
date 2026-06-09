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
import {
  Accordion as FaqAccordion,
  AccordionContent as FaqAccordionContent,
  AccordionItem as FaqAccordionItem,
  AccordionTrigger as FaqAccordionTrigger,
} from "@/components/ui/accordion";
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

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
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
        <Hero
          image={pkg.coverImage.url ?? ""}
          images={[
            pkg.coverImage?.url,
            ...(pkg.gallery?.map((g: any) => g.url) || [])
          ].filter(Boolean)}
          title={pkg.title}
          description=""
          align="left"
          aspectRatio="min-h-[380px] md:min-h-[420px] lg:min-h-[550px]"
          overlayOpacity={100}
        >
          <div className="flex flex-col gap-5 w-full mt-4">
            {pkg.banner_text && pkg.banner_text.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 w-full">
                {pkg.banner_text.map((text, i) => (
                  <div key={i} className="flex items-center gap-2 drop-shadow-md">
                    <Check className="w-4 h-4 text-[#FE5300] shrink-0" />
                    <p className="text-white text-sm md:text-[15px] font-medium max-w-3xl text-left leading-tight">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-start">
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
          </div>
        </Hero>
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
                <h2 className="text-2xl md:text-3xl font-black font-heading text-gray-900 tracking-tight">Tour Highlights</h2>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
              
              {pkg.packageAtAGlance && pkg.packageAtAGlance.trim() !== "" && (
                <div className="w-full flex flex-col pt-2 px-4 md:px-4">
                  <div className="flex flex-col gap-2 mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">At a Glance</h2>
                    <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                  </div>
                  <div className="mt-4">
                    <VisaAtAGlance html={pkg.packageAtAGlance} />
                  </div>
                </div>
              )}

              {pkg.packageEssentials && pkg.packageEssentials.trim() !== "" && (
                <div className="w-full flex flex-col pt-2 px-4 md:px-4">
                  <div className="flex flex-col gap-2 mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">Package Essentials</h2>
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
                    <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">Why Choose This Char Dham Yatra Package?</h2>
                    <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                  </div>
                  <section className="prose prose-base max-w-none text-gray-600 leading-relaxed">
                    <BlogContent html={pkg.whyChooseThisPackage} />
                  </section>
                </div>
              )}

              <div id="description" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                <div className="flex flex-col gap-2 mb-5">
                  <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">Package Overview</h2>
                  <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                </div>
                <div className="md:hidden text-gray-600 leading-relaxed text-base">
                  <ReadMore content={pkg.description} />
                </div>
                <section className="hidden md:block prose prose-base max-w-none text-gray-600 leading-relaxed">
                  <BlogContent html={pkg.description} />
                </section>
              </div>

              <div id="itineraries" className="scroll-mt-40 mb-8 pb-6 border-b border-gray-200 last:border-0 overflow-hidden">
                  <div className="flex flex-col gap-2 mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">Journey Route</h2>
                    <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                  </div>
                  
                  <div className="relative pt-4 pb-4 w-full">
                    <Accordion
                      type="multiple"
                      defaultValue={["itinerary-0"]}
                      className="w-full relative z-10 flex flex-col gap-0"
                    >
                      {pkg.itinerary.map((item: Itinerary, i: number) => {
                        const isEven = i % 2 === 0;
                        const isLast = i === pkg.itinerary.length - 1;

                        return (
                          <AccordionItem
                            key={i}
                            value={`itinerary-${i}`}
                            className="relative border-b-0 group w-full"
                          >
                            {/* SVG Curved Route Line (Only drawn if not last item) */}
                            {!isLast && (
                              <div className="absolute top-[28px] left-[28px] w-[40px] h-full z-0 pointer-events-none">
                                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                                  {isEven ? (
                                    <path d="M 0 0 C 0 50, 100 50, 100 100" stroke="#FE5300" strokeWidth="2.5" strokeDasharray="6 6" fill="none" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                                  ) : (
                                    <path d="M 100 0 C 100 50, 0 50, 0 100" stroke="#FE5300" strokeWidth="2.5" strokeDasharray="6 6" fill="none" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                                  )}
                                </svg>
                              </div>
                            )}

                            {/* Node Marker */}
                            <div className={`absolute top-[20px] ${isEven ? 'left-[20px]' : 'left-[60px]'} w-[16px] h-[16px] rounded-full bg-white border-[3px] border-[#FE5300] shadow-md z-20 flex items-center justify-center group-hover:scale-125 transition-all duration-300`}>
                               {i === 0 && <div className="w-[6px] h-[6px] bg-green-500 rounded-full"></div>}
                               {isLast && i !== 0 && <div className="w-[6px] h-[6px] bg-red-500 rounded-full"></div>}
                            </div>

                            {/* Content Card */}
                            <div className="ml-[90px] md:ml-[110px] relative z-30 pb-6 md:pb-8 pr-4 sm:pr-6 md:pr-8">
                              <div className="bg-white border border-gray-100/80 hover:border-[#FE5300]/30 shadow-sm hover:shadow-md rounded-xl overflow-hidden transition-all duration-300">
                                <AccordionTrigger
                                  className="text-sm font-semibold text-gray-800 hover:no-underline p-3 md:p-4 flex items-start transition-colors duration-200 focus-visible:ring-0 focus-visible:outline-none"
                                >
                                  <div className="leading-snug transition-colors flex flex-col gap-1 w-full text-left items-start">
                                    {(() => {
                                      const splitIndex = item.title.indexOf(':');
                                      if (splitIndex !== -1) {
                                        const dayPart = item.title.substring(0, splitIndex).trim();
                                        const locationPart = item.title.substring(splitIndex + 1).trim();
                                        return (
                                          <>
                                            <span className="text-[10px] font-bold text-[#FE5300] uppercase tracking-wider bg-orange-50 px-2 py-0.5 rounded border border-orange-100/50">{dayPart}</span>
                                            <span className="text-[13px] md:text-[14px] font-semibold text-gray-800 group-hover:text-[#FE5300] transition-colors mt-0.5 leading-snug">{locationPart}</span>
                                          </>
                                        );
                                      }
                                      return <span className="text-[13px] md:text-[14px] font-semibold text-gray-800 group-hover:text-[#FE5300] transition-colors">{item.title}</span>;
                                    })()}
                                  </div>
                                </AccordionTrigger>
                                
                                <AccordionContent className="px-3 md:px-4 pb-3 md:pb-4 pt-0 flex flex-col items-start">
                                  <div className="bg-gray-50/60 rounded-lg p-3 md:p-4 text-gray-600 leading-relaxed text-left border border-gray-100/80 w-full">
                                    <ul className="space-y-2 relative z-10 flex flex-col">
                                      {item.description.split("\n").map((line, idx) => (
                                        line.trim() ? (
                                          <li key={idx} className="flex items-start gap-2 justify-start">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#FE5300]/60 shrink-0 mt-1.5"></div>
                                            <span className="text-[12px] md:text-[13px] leading-relaxed">{line.trim()}</span>
                                          </li>
                                        ) : null
                                      ))}
                                    </ul>
                                  </div>
                                </AccordionContent>
                              </div>
                            </div>

                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
              </div>

              {pkg.hotelsAndAccommodation && (
                <div id="hotels" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">Hotels & Accommodation</h2>
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
                      <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">{`Inclusions`}</h2>
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
                      <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">{`Exclusions`}</h2>
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

              {pkg.faqs && pkg.faqs.length > 0 && (
                <div id="faqs" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">FAQs</h2>
                    <div className="w-12 h-1 bg-[#FE5300]"></div>
                  </div>
                  <FaqAccordion
                    type="single"
                    value={openItem}
                    onValueChange={(val) => { if (val) setOpenItem(val); }}
                    className="w-full space-y-2"
                  >
                  {pkg.faqs.map((faq, index) => {
                    const isOpen = openItem === `faq-${index}`;
                    return (
                      <FaqAccordionItem
                        key={index}
                        value={`faq-${index}`}
                        className="border-b border-gray-200 py-1 md:py-2"
                      >
                        <FaqAccordionTrigger className="text-xs md:text-sm font-bold font-heading text-black hover:text-[#FE5300] transition-colors hover:no-underline text-left">
                          {faq.question}
                        </FaqAccordionTrigger>
                        <FaqAccordionContent className="text-justify pt-3">
                          <section className="prose prose-sm max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4">
                            <BlogContent html={faq.answer} />
                          </section>
                        </FaqAccordionContent>
                      </FaqAccordionItem>
                    );
                  })}
                  </FaqAccordion>
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

              {pkg.helpfulResources && pkg.helpfulResources.length > 0 && (
                <div id="helpfulresources" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0 w-full">
                  <HelpfulResources data={pkg.helpfulResources} />
                </div>
              )}

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

      <div className="flex flex-col gap-12 md:gap-20 mt-12 md:mt-16 pb-16">

        <Testimonial data={pkg?.reviews ?? []} />
        <div className="w-full max-w-7xl mx-auto px-8 flex flex-col items-center">
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
      </div>

      {/* Why Choose MusafirBaba - Full Width */}
      <div id="whychoosemusafirbaba" className="w-full border-t border-gray-200 pt-12 pb-16 mt-8">
        <WhyChoose />
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
