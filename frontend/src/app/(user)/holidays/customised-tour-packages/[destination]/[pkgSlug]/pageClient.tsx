"use client";

import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";
import { useCustomizedBookingStore } from "@/store/useCutomizedBookingStore";
import { Loader } from "@/components/custom/loader";
import Breadcrumb from "@/components/common/Breadcrumb";
import { Clock, MapPin, ArrowBigRight, Highlighter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Check, X, ShieldCheck, Users, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import PackageCard from "@/components/custom/PackageCard";
import { Faqs } from "@/components/custom/Faqs";
import WhyChoose from "@/components/custom/WhyChoose";
import { Testimonial } from "@/components/custom/Testimonial";
import { Reviews } from "@/app/admin/holidays/new/page";
import { ImageGallery } from "@/components/custom/ImageGallery";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCards, Pagination, Autoplay } from "swiper/modules";

// Import Swiper styles
import "swiper/css";
import "swiper/css/effect-cards";
import "swiper/css/pagination";
import ReadMore from "@/components/common/ReadMore";
import { BlogContent } from "@/components/custom/BlogContent";
import { stripHtml } from "@/lib/utils";
import VisaAtAGlance from "@/components/custom/VisaAtAGlance";
import HelpfulResources from "@/components/custom/HelpfulResources";

interface Plan {
  _id: string;
  title: string;
  include: string;
  price: number;
}
interface Highlight {
  title: string;
}
interface Itinerary {
  title: string;
  description: string;
}
interface Faqs {
  _id: string;
  question: string;
  answer: string;
}
interface CoverImage {
  url: string;
  public_id: string;
  width: number;
  height: number;
  alt: string;
}
interface Destination {
  _id: string;
  country: string;
  state: string;
  name: string;
  slug: string;
}
interface Package {
  _id: string;
  title: string;
  description: string;
  slug: string;
  coverImage: CoverImage;
  coverImages?: CoverImage[];
  gallery: CoverImage[];
  plans: Plan[];
  reviews: Reviews[];
  duration: {
    days: number;
    nights: number;
  };
  time?: {
    startTime: string;
    endTime: string;
  };
  highlight: Highlight[];
  itinerary: Itinerary[];
  faqs: Faqs[];
  destination: Destination;
  mainCategory: {
    name: string;
    slug: string;
  };
  status: "draft" | "published";
  experienceAtAGlance?: string;
  aboutThisExperience?: string;
  placesCovered?: string;
  whoIsThisExperienceFor?: string;
  customizationOptions?: string;
  inclusions?: string[];
  exclusions?: string[];
  helpfulResources?: { title: string; url: string }[];
}

export default function CustomizedPackageClient({
  pkg,
  relatedPackages,
}: {
  pkg: Package;
  relatedPackages: Package[];
}) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const openDialog = useAuthDialogStore((state) => state.openDialog);
  const setFormBookData = useCustomizedBookingStore(
    (state) => state.setFormBookData,
  );

  const initialPlan = pkg?.plans && pkg.plans.length > 0 ? pkg.plans[0] : null;

  const [formData, setFormData] = React.useState({
    date: new Date().toISOString().split("T")[0],
    noOfPeople: 1,
    noOfChildren: 0,
    totalPrice: initialPlan ? initialPlan.price : 0,
    plan: initialPlan ? initialPlan.title : "",
    packageId: pkg?._id,
    status: "pending",
  });

  type TabKey = "itineraries" | "highlights" | "description" | "glance" | "about-experience" | "places" | "who-for" | "customization" | "inclusions" | "gallery" | "faqs" | "resources";
  const getFirstActiveTab = (): TabKey => {
    if (pkg.aboutThisExperience && stripHtml(pkg.aboutThisExperience).trim().length > 0) return "about-experience";
    if (pkg.placesCovered && stripHtml(pkg.placesCovered).trim().length > 0) return "places";
    if (pkg.itinerary && pkg.itinerary.length > 0) return "itineraries";
    if (pkg.whoIsThisExperienceFor && stripHtml(pkg.whoIsThisExperienceFor).trim().length > 0) return "who-for";
    if ((pkg.inclusions && pkg.inclusions.length > 0) || (pkg.exclusions && pkg.exclusions.length > 0)) return "inclusions";
    if (pkg.customizationOptions && stripHtml(pkg.customizationOptions).trim().length > 0) return "customization";
    if (pkg.description && stripHtml(pkg.description).trim().length > 0) return "description";
    if (pkg.gallery && pkg.gallery.length > 0) return "gallery";
    if (pkg.helpfulResources && pkg.helpfulResources.length > 0) return "resources";
    if (pkg.faqs && pkg.faqs.length > 0) return "faqs";
    return "about-experience";
  };
  const [activeTab, setActiveTab] = useState<TabKey>(getFirstActiveTab());
  const isClickScrollingRef = useRef(false);
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const btn = tabButtonRefs.current[activeTab];
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  const hasContent = (html?: string) => {
    if (!html) return false;
    return stripHtml(html).trim().length > 0;
  };

  const tabs: { key: TabKey; label: string }[] = [
    ...(hasContent(pkg.aboutThisExperience) ? [{ key: "about-experience" as TabKey, label: "About This Experience" }] : []),
    ...(hasContent(pkg.placesCovered) ? [{ key: "places" as TabKey, label: "Places Covered" }] : []),
    ...(pkg.itinerary && pkg.itinerary.length > 0 ? [{ key: "itineraries" as TabKey, label: "Experience Flow" }] : []),
    ...(hasContent(pkg.whoIsThisExperienceFor) ? [{ key: "who-for" as TabKey, label: "Who It's For" }] : []),
    ...((pkg.inclusions && pkg.inclusions.length > 0) || (pkg.exclusions && pkg.exclusions.length > 0) ? [{ key: "inclusions" as TabKey, label: "Inclusions & Exclusions" }] : []),
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
              setActiveTab(key as TabKey);
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

  const handleSelectPlan = (plan: Plan) => {
    setFormData((prev) => ({
      ...prev,
      plan: plan.title,
      totalPrice: plan.price * prev.noOfPeople + plan.price * 0.6 * prev.noOfChildren,
    }));
  };

  const handlePeopleChange = (delta: number) => {
    setFormData((prev) => {
      const newPeople = Math.max(1, prev.noOfPeople + delta);
      const selectedPlan = pkg?.plans.find((p: Plan) => p.title === prev.plan);
      const totalPrice = selectedPlan ? newPeople * selectedPlan.price + selectedPlan.price * 0.6 * prev.noOfChildren : 0;
      return { ...prev, noOfPeople: newPeople, totalPrice };
    });
  };

  const handleChildrenChange = (delta: number) => {
    setFormData((prev) => {
      const newChildren = Math.max(0, prev.noOfChildren + delta);
      const selectedPlan = pkg?.plans.find((p: Plan) => p.title === prev.plan);
      const totalPrice = selectedPlan ? prev.noOfPeople * selectedPlan.price + selectedPlan.price * 0.6 * newChildren : 0;
      return { ...prev, noOfChildren: newChildren, totalPrice };
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, date: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.plan) {
      toast.error("Please select a plan before booking");
      return;
    }

    setFormBookData(formData);

    const redirectUrl = `/holidays/customised-tour-packages/${pkg?.destination?.state}/${pkg.slug}/${pkg._id}`;

    if (!accessToken) {
      openDialog("login", undefined, redirectUrl);
    } else {
      router.push(redirectUrl);
    }
  };

  if (!pkg) return <Loader message="Loading..." />;

  return (
    <section className="w-full bg-gray-50 pb-20 min-h-screen">
      <form onSubmit={handleSubmit} method="post" className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full relative">
            
            {/* LEFT COLUMN */}
            <div className="lg:col-span-9 flex flex-col gap-6">
              
              {/* Images Container */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Left Col: Main Slider */}
                <div className="md:col-span-3 h-[250px] md:h-[400px] relative rounded-2xl overflow-hidden shadow-md">
                  <Swiper
                    pagination={{ clickable: true }}
                    modules={[Pagination, Autoplay]}
                    autoplay={{ delay: 3000, disableOnInteraction: false }}
                    loop={true}
                    className="w-full h-full [&_.swiper-pagination-bullet-active]:bg-white [&_.swiper-pagination-bullet]:bg-white/70"
                  >
                    {[...(pkg?.coverImages?.map(img => img.url) || (pkg?.coverImage?.url ? [pkg.coverImage.url] : [])), ...(pkg?.gallery?.map((g: any) => g.url) || [])]
                      .filter(Boolean)
                      .map((img, i) => (
                        <SwiperSlide key={i}>
                          <Image
                            src={img}
                            alt={`${pkg.title} image ${i + 1}`}
                            fill
                            className="object-cover"
                          />
                        </SwiperSlide>
                      ))}
                  </Swiper>
                </div>

                {/* Right Col: Vertical Infinite Slider */}
                <div className="hidden md:block h-[400px] relative">
                  <Swiper
                    direction="vertical"
                    slidesPerView={3}
                    spaceBetween={16}
                    loop={true}
                    modules={[Autoplay]}
                    autoplay={{ delay: 3000, disableOnInteraction: false, reverseDirection: true }}
                    className="w-full h-full"
                  >
                    {[...(pkg?.gallery?.map((g: any) => g.url) || []), ...(pkg?.coverImages?.map(img => img.url) || (pkg?.coverImage?.url ? [pkg.coverImage.url] : [])), "/Hero1.jpg", "/Hero2.jpg"]
                      .filter(Boolean)
                      .map((img, i) => (
                        <SwiperSlide key={i} className="rounded-2xl overflow-hidden relative shadow-sm">
                          <Image
                            src={img}
                            alt={`${pkg.title} side image ${i + 1}`}
                            fill
                            className="object-cover"
                          />
                        </SwiperSlide>
                      ))}
                  </Swiper>
                </div>
              </div>
            
              {/* Breadcrumb & Title */}
              <div className="w-full mt-2">
                <Breadcrumb title={pkg.title} />
              </div>
              <div className="w-full">
                <h1 className="text-3xl font-bold mb-4">{pkg.title}</h1>
                <div className="flex gap-2 mb-2">
                  <span className="flex items-center gap-1">
                    <MapPin color="#FE5300" size={14} />{" "}
                    {pkg.destination.state.charAt(0).toUpperCase() +
                      pkg.destination.state.slice(1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock color="#FE5300" size={14} />
                    {pkg.time?.startTime && pkg.time?.endTime ? (
                      (() => {
                        const [startH, startM] = pkg.time.startTime.split(":").map(Number);
                        const [endH, endM] = pkg.time.endTime.split(":").map(Number);
                        let diffMinutes = (endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0));
                        if (diffMinutes < 0) diffMinutes += 24 * 60;
                        const diffH = Math.floor(diffMinutes / 60);
                        const diffM = diffMinutes % 60;
                        return (
                          <span>
                            {diffH > 0 ? `${diffH} Hours ` : ""}{diffM > 0 ? `${diffM} Minutes` : ""}
                          </span>
                        );
                      })()
                    ) : (
                      <span>
                        {pkg.duration.nights > 0
                          ? `${pkg.duration.nights}N/${pkg.duration.days}D`
                          : `${pkg.duration.days} Days`}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Highlights and At a Glance */}
              <div className="flex flex-col gap-10 mt-8">
                
                {/* Highlights (Unique Presentation) */}
                {pkg.highlight && pkg.highlight.length > 0 && (
                  <div className="bg-gradient-to-br from-orange-50/80 to-orange-100/40 p-6 md:p-8 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-orange-200/50 relative overflow-hidden">
                    {/* Decorative background elements */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/60 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-200/30 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="flex flex-col gap-2 mb-6 relative z-10">
                      <h2 className="text-2xl md:text-3xl font-black font-heading text-gray-900 tracking-tight">Tour Highlights</h2>
                      <div className="w-16 h-1.5 bg-[#FE5300] rounded-full"></div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 relative z-10">
                      {pkg.highlight.map((h: Highlight, i: number) => (
                        <div className="flex items-start gap-3.5 group" key={i}>
                          <div className="w-7 h-7 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-orange-100 group-hover:scale-110 group-hover:bg-[#FE5300] group-hover:border-[#FE5300] group-hover:shadow-md transition-all duration-300 mt-0.5">
                            <Check className="w-4 h-4 text-[#FE5300] group-hover:text-white transition-colors" />
                          </div>
                          <span className="text-gray-700 font-medium text-[15px] leading-snug group-hover:text-gray-900 transition-colors">{h.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* At a Glance */}
                {hasContent(pkg.experienceAtAGlance) && (
                  <div className="w-full flex flex-col pt-2">
                    <div className="flex flex-col gap-2 mb-6">
                      <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">At a Glance</h2>
                      <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                    </div>
                    <div className="mt-4">
                      <VisaAtAGlance html={pkg.experienceAtAGlance} />
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Tabs Bar */}
              <div className="sticky top-0 z-30 w-full bg-gray-50 py-2 mt-6 mb-6">
                <div className="py-3 md:py-4">
                  <div className="flex flex-nowrap md:flex-wrap w-full gap-3 pb-1 overflow-x-auto no-scrollbar md:overflow-visible snap-x snap-mandatory md:snap-none">
                    {tabs.map((t) => (
                      <Button
                        key={t.key}
                        size="sm"
                        ref={(el) => {
                          tabButtonRefs.current[t.key] = el as HTMLButtonElement | null;
                        }}
                        type="button"
                        onClick={() => {
                          isClickScrollingRef.current = true;
                          setActiveTab(t.key);
                          const el = document.getElementById(t.key);
                          if (el) {
                            const y = el.getBoundingClientRect().top + window.scrollY - 150;
                            window.scrollTo({ top: y, behavior: "smooth" });
                            setTimeout(() => {
                              isClickScrollingRef.current = false;
                            }, 1000);
                          }
                        }}
                        className={`shrink-0 snap-start text-xs md:text-sm h-10 px-4 md:px-5 rounded-full transition-all duration-200 ${
                          activeTab === t.key
                            ? "bg-[#FE5300] hover:bg-[#FE5300] text-white shadow-md"
                            : "bg-white hover:bg-gray-50 text-black border border-[#FE5300]/50 hover:border-[#FE5300]"
                        }`}
                      >
                        {t.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* About This Experience */}
              <div className="w-full mt-8 flex flex-col gap-4">
                {hasContent(pkg.aboutThisExperience) && (
                  <div id="about-experience" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                    <div className="flex flex-col gap-2 mb-5">
                      <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">About This Experience</h2>
                      <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                    </div>
                    <div className="detail-content-headings prose prose-base max-w-none text-gray-600 leading-relaxed">
                      <BlogContent html={pkg.aboutThisExperience} />
                    </div>
                  </div>
                )}

              {/* Places Covered */}
              {hasContent(pkg.placesCovered) && (
                <div id="places" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">Places Covered</h2>
                    <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                  </div>
                  <div className="detail-content-headings prose prose-base max-w-none text-gray-600 leading-relaxed">
                    <BlogContent html={pkg.placesCovered} />
                  </div>
                </div>
              )}

              {/* Experience Flow (Itinerary) */}
              {pkg.itinerary && pkg.itinerary.length > 0 && (
                <div id="itineraries" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">Experience Flow</h2>
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
                                  <div className="bg-gray-50/60 rounded-lg p-3 md:p-4 text-gray-600 leading-relaxed text-left border border-gray-100/80 w-full prose prose-sm max-w-none">
                                    <BlogContent html={item.description} />
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
              )}

              {/* Who Is This Experience For */}
              {hasContent(pkg.whoIsThisExperienceFor) && (
                <div id="who-for" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">Who It's For</h2>
                    <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                  </div>
                  <div className="detail-content-headings prose prose-base max-w-none text-gray-600 leading-relaxed">
                    <BlogContent html={pkg.whoIsThisExperienceFor} />
                  </div>
                </div>
              )}

              {/* Inclusions & Exclusions */}
              {((pkg.inclusions && pkg.inclusions.length > 0) || (pkg.exclusions && pkg.exclusions.length > 0)) && (
                <div id="inclusions" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {pkg.inclusions && pkg.inclusions.length > 0 && (
                      <div>
                        <div className="flex flex-col gap-2 mb-5">
                          <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">Inclusions</h2>
                          <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                        </div>
                        <ul className="space-y-3">
                          {pkg.inclusions.map((inc, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-foreground text-gray-600">{inc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {pkg.exclusions && pkg.exclusions.length > 0 && (
                      <div>
                        <div className="flex flex-col gap-2 mb-5">
                          <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">Exclusions</h2>
                          <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                        </div>
                        <ul className="space-y-3">
                          {pkg.exclusions.map((exc, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <X className="w-5 h-5 text-red-600 text-muted-foreground flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-muted-foreground text-gray-600">
                                {exc}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FAQs */}
              {pkg.faqs && pkg.faqs.length > 0 && (
                <div id="faqs" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">Frequently Asked Questions</h2>
                    <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                  </div>
                  
                  <Accordion type="single" collapsible defaultValue="faq-0" className="w-full space-y-2">
                  {pkg.faqs.map((faq: any, index: number) => {
                    return (
                      <AccordionItem
                        key={index}
                        value={`faq-${index}`}
                        className="border-b border-gray-200 py-1 md:py-2"
                      >
                        <AccordionTrigger className="text-xs md:text-sm font-bold font-heading text-black hover:text-[#FE5300] transition-colors hover:no-underline text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-justify pt-3">
                          <section className="detail-content-headings prose prose-sm max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4">
                            <BlogContent html={faq.answer} />
                          </section>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                  </Accordion>
                </div>
              )}

              {/* Author Information */}
              <div id="author" className="scroll-mt-40 mb-8 mt-10">
                <div className="bg-orange-50/40 rounded-2xl p-6 md:p-8 border border-orange-100 flex flex-col gap-4 shadow-sm">
                  <h4 className="text-lg md:text-xl font-bold font-heading text-gray-900">Author Information</h4>
                  <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center">
                    {pkg.author?.avatar?.url ? (
                      <img src={pkg.author.avatar.url} alt={pkg.author.name} className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover shadow-sm border-2 border-white" />
                    ) : (
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold text-2xl shadow-sm border-2 border-white">
                        {pkg.author?.name ? pkg.author.name.charAt(0).toUpperCase() : "M"}
                      </div>
                    )}
                    <div className="flex flex-col gap-2 text-gray-600 text-sm md:text-base flex-1">
                      <p className="flex items-center gap-2 flex-wrap"><span className="font-semibold text-gray-800">Written By:</span> {pkg.author?.name || "MusafirBaba Travel Team"} {pkg.author?.role && <span className="text-gray-500 text-xs bg-white px-2 py-0.5 rounded-full border border-gray-100 shadow-sm">{pkg.author.role}</span>}</p>
                      {!pkg.author?.name && <p><span className="font-semibold text-gray-800">Reviewed By:</span> Destination Specialist</p>}
                      {pkg.author?.about && <p className="text-sm text-gray-600 leading-relaxed bg-white/50 p-3 rounded-lg border border-orange-50">{pkg.author.about}</p>}
                      <p><span className="font-semibold text-gray-800">Last Updated:</span> Regularly Updated Before Every Season</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Helpful Resources */}
              {pkg.helpfulResources && pkg.helpfulResources.length > 0 && (
                <div id="helpfulresources" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0 w-full">
                  <HelpfulResources data={pkg.helpfulResources} />
                </div>
              )}



                {/* Show related packages under this category */}
                <div className="w-full mb-8">
                  <div className="flex flex-col gap-2 mb-5">
                    <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">Nearby Tours</h2>
                    <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
                  </div>
                  {relatedPackages && relatedPackages.length > 0 && (
                    <>
                      <div className="hidden md:grid gap-6 sm:grid-cols-2 md:grid-cols-3 my-10">
                        {relatedPackages.slice(0, 3).map((pkg: Package) => (
                          <PackageCard
                            key={pkg._id}
                            pkg={{
                              id: pkg._id,
                              name: pkg.title,
                              slug: pkg.slug,
                              image: pkg.coverImages?.[0]?.url ?? pkg.coverImage?.url ?? "",
                              price: pkg?.plans ? pkg?.plans[0]?.price : 999,
                              duration: `${pkg.duration?.nights}N/${pkg.duration?.days}D`,
                              destination: pkg.destination?.name ?? "",
                              batch: [],
                            }}
                            url={`/holidays/customised-tour-packages/${pkg?.destination?.state}/${pkg.slug}`}
                          />
                        ))}
                      </div>
                      {/* Mobile related packages */}
                      <div className="md:hidden block my-10">
                        <Swiper
                          effect={"cards"}
                          grabCursor={true}
                          modules={[EffectCards]}
                          className="w-[260px] h-[360px] "
                        >
                          {relatedPackages.map((pkg: Package) => (
                            <SwiperSlide key={pkg._id} className="rounded-lg">
                              <PackageCard
                                key={pkg._id}
                                pkg={{
                                  id: pkg._id,
                                  name: pkg.title,
                                  slug: pkg.slug,
                                  image: pkg.coverImages?.[0]?.url ?? pkg.coverImage?.url ?? "",
                                  price: pkg?.plans ? pkg?.plans[0]?.price : 999,
                                  duration: `${pkg.duration?.nights}N/${pkg.duration?.days}D`,
                                  destination: pkg.destination?.name ?? "",
                                  batch: [],
                                }}
                                url={`/holidays/customised-tour-packages/${pkg?.destination?.state}/${pkg.slug}`}
                              />
                            </SwiperSlide>
                          ))}
                        </Swiper>
                      </div>
                    </>
                  )}
                </div>





              </div>
            </div>

            {/* RIGHT SIDE: Fixed Sidebar */}
            <div className="lg:col-span-3 relative">
              <div className="sticky top-24 flex flex-col gap-6">
                {/* Starting From Card */}
                <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-gray-100/90 p-4 md:p-5">
                  <div className="flex justify-between items-center pb-2 border-b border-dashed border-gray-200">
                    <span className="text-gray-500 font-bold text-xs uppercase tracking-wider leading-tight items-baseline">
                      STARTING FROM
                    </span>
                    <div className="flex items-baseline ">
                      <span className="text-2xl font-black text-[#FE5300] leading-none">₹{pkg.plans && pkg.plans.length > 0 ? pkg.plans[0].price.toLocaleString('en-IN') : 999}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">PP</span>
                    </div>
                  </div>
                </div>

                {/* Booking Card */}
                <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-gray-100/90 overflow-hidden relative z-0">
                  <div className="p-3 md:p-4 space-y-3 md:space-y-4">

                    {/* Date Input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
                        Travel Date
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleDateChange(e as any)}
                        className="w-full bg-gray-50/50 hover:bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FE5300] focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Package Variant Select */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
                        Choose Package Variant
                      </label>
                      <div className="relative">
                        <select
                          value={formData.plan}
                          onChange={(e) => {
                            const selected = pkg.plans.find((p: Plan) => p.title === e.target.value);
                            if (selected) handleSelectPlan(selected);
                          }}
                          className="w-full bg-gray-50/50 hover:bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FE5300] focus:border-transparent transition-all cursor-pointer appearance-none"
                        >
                          {pkg.plans.map((plan: Plan, i: number) => (
                            <option key={i} value={plan.title}>
                              {plan.title}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Variant Includes Text */}
                    {(() => {
                      const selectedPlan = pkg.plans.find((p: Plan) => p.title === formData.plan);
                      return selectedPlan && selectedPlan.include ? (
                        <div className="bg-orange-50/50 border border-orange-100 p-2.5 rounded-xl text-[11px] text-gray-600 mt-2">
                          <span className="font-bold text-gray-800">Includes:</span> {selectedPlan.include}
                        </div>
                      ) : null;
                    })()}

                    {/* Travellers */}
                    <div className="space-y-2">
                      <div className="bg-gray-50/60 px-2.5 py-1.5 rounded-xl border border-gray-100/80 flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-gray-700 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#FE5300] fill-current" /> Adults
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handlePeopleChange(-1)}
                            className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 font-bold transition-all text-xs shadow-sm cursor-pointer select-none"
                          >
                            -
                          </button>
                          <span className="text-xs font-black text-gray-800 w-4 text-center">{formData.noOfPeople}</span>
                          <button
                            type="button"
                            onClick={() => handlePeopleChange(1)}
                            className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 font-bold transition-all text-xs shadow-sm cursor-pointer select-none"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="bg-gray-50/60 px-2.5 py-1.5 rounded-xl border border-gray-100/80 flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-gray-700 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#FE5300] fill-current" /> Children (5-12 yrs)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleChildrenChange(-1)}
                            className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 font-bold transition-all text-xs shadow-sm cursor-pointer select-none"
                          >
                            -
                          </button>
                          <span className="text-xs font-black text-gray-800 w-4 text-center">{formData.noOfChildren}</span>
                          <button
                            type="button"
                            onClick={() => handleChildrenChange(1)}
                            className="w-5 h-5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 font-bold transition-all text-xs shadow-sm cursor-pointer select-none"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Pricing Breakdown */}
                    {(() => {
                      const selectedPlan = pkg.plans.find((p: Plan) => p.title === formData.plan);
                      const basePrice = selectedPlan ? selectedPlan.price : 0;
                      return (
                        <div className="space-y-2 md:space-y-3 pt-1 md:pt-2">
                          <div className="border-t border-dashed border-gray-200" />
                          <div className="space-y-1 md:space-y-2 text-xs md:text-[13px]">
                            <div className="flex justify-between items-center text-gray-500">
                              <span>Adult Cost {formData.noOfPeople > 1 ? `(x${formData.noOfPeople})` : ""}</span>
                              <span className="font-bold text-gray-800">₹{Number(basePrice * formData.noOfPeople).toLocaleString('en-IN')}</span>
                            </div>
                            {formData.noOfChildren > 0 && (
                              <div className="flex justify-between items-center text-gray-500 mt-1.5">
                                <span>Child Cost (60%) {formData.noOfChildren > 1 ? `(x${formData.noOfChildren})` : ""}</span>
                                <span className="font-bold text-gray-800">₹{Number(basePrice * 0.6 * formData.noOfChildren).toLocaleString('en-IN')}</span>
                              </div>
                            )}
                          </div>
                          <div className="pt-2 md:pt-3 border-t border-dashed border-gray-200 flex justify-between items-center text-xs md:text-sm">
                            <span className="font-extrabold text-gray-900">Total Fee {(formData.noOfPeople + formData.noOfChildren) > 1 ? `(${formData.noOfPeople + formData.noOfChildren} Pax)` : ""}</span>
                            <span className="text-xl md:text-2xl font-black text-[#FE5300]">₹{Number(formData.totalPrice).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Submit */}
                    <div className="pt-2">
                      <button 
                        type="submit"
                        className="w-full bg-[#FE5300] hover:bg-[#e44a00] text-white py-1 md:py-1 rounded-xl text-sm md:text-base font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        Book Now <ArrowRight className="w-5 h-5 animate-pulse" />
                      </button>

                      <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 mt-3">
                        <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                        <span>Secure & 100% encrypted booking</span>
                      </div>
                    </div>
                  </div>
                </div>
          </div>
            </div>
            
          </div>
        </div>
      </form>

      <div id="gallery" className="w-full border-t border-gray-200 pt-12 pb-8 mt-8">
        <ImageGallery title="Memories in Motion" data={pkg?.gallery ?? []} />
      </div>

      <div id="whychoosemusafirbaba" className="w-full border-t border-gray-200 pt-12 pb-16 mt-8">
        <WhyChoose />
      </div>

      <Testimonial data={pkg.reviews ?? []} />
    </section>
  );
}
