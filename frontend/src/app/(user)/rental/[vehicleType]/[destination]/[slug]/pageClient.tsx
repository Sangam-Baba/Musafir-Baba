"use client";
import Breadcrumb from "@/components/common/Breadcrumb";
import RentalCarousal from "@/components/common/RentalCarousal";
import { Button } from "@/components/ui/button";
import React, { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Check, ChevronDown, MapPin, Minus, Plus, X, ShieldCheck, CreditCard, Receipt } from "lucide-react";
import ReadMore from "@/components/common/ReadMore";
import { BlogContent } from "@/components/custom/BlogContent";
import { Accordion } from "@radix-ui/react-accordion";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import VehicleCard from "@/components/custom/VehicleCard";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { secureFetch } from "@/lib/secureFetch";
import { getUser } from "@/app/(user)/holidays/customised-tour-packages/[destination]/[pkgSlug]/[id]/page";
import HelpfulResources from "@/components/custom/HelpfulResources";
import Link from "next/link";
import WhyChooseUs from "@/components/custom/WhyChooseUS";
import VisaAtAGlance from "@/components/custom/VisaAtAGlance";
import { IVehicleUserData } from "./page";
type TabKey = "description" | "features" | "includeexclude" | "availablefor" | "rentaloptions" | "relatedvehicles" | "whychooseus" | "howbookingworks";

interface FormData {
  checkIn: string;
  checkOut: string;
  noOfVehicle: number;
  vehicleId: string;
  selectedSeats?: number;
  policyAccepted: boolean;
}

interface BookingResponse {
  checkIn: string;
  checkOut: string;
  noOfVehicle: number;
  vehicleId: string;
  userId: string;
  totalPrice: number;
  _id: string;
}

const createBookings = async (accessToken: string, data: FormData) => {
  const res = await secureFetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/vehicle-booking`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    },
  );
  if (!res.ok) throw new Error("Failed to book vehicle");
  const d = await res.json();
  return d.data;
};

export default function RentalPageClient({
  vehicle,
  relatedVehicles,
}: {
  vehicle: IVehicleUserData;
  relatedVehicles: any;
}) {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);
  const [active, setActive] = useState<TabKey>("description");
  const [data, setData] = useState<FormData>({
    checkIn: new Date(Date.now()).toISOString().split("T")[0],
    checkOut: new Date(new Date().setDate(new Date().getDate() + 1))
      .toISOString()
      .split("T")[0],
    noOfVehicle: 1,
    vehicleId: vehicle?._id || "",
    selectedSeats: vehicle?.pricingType === "multiple" && vehicle?.seatingOptions?.length 
      ? vehicle.seatingOptions[0].seats 
      : vehicle?.seats,
    policyAccepted: true,
  });
  const [vehiclePrice, setVehiclePrice] = useState(
    vehicle?.pricingType === "multiple" && vehicle?.seatingOptions?.length 
      ? vehicle.seatingOptions[0].dailyPrice 
      : vehicle?.price?.daily
  );
  const [finalPrice, setFinalPrice] = useState(
    Math.ceil(
      vehiclePrice * 1.05 +
        vehicle?.convenienceFee +
        vehicle?.tripProtectionFee,
    ),
  );

  const formRef = useRef<HTMLFormElement | null>(null);
  const [loading, setLoading] = useState(false);
  const isClickScrollingRef = useRef(false);
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const btn = tabButtonRefs.current[active];
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [active]);
  const [paymentData, setPaymentData] = useState({
    key: "",
    txnid: "",
    amount: "",
    productinfo: "",
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    surl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success-vehicle`,
    furl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failure-vehicle`,
    hash: "",
    udf1: "",
    service_provider: "",
  });

  useEffect(() => {
    const totalDay =
      (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) /
        (1000 * 60 * 60 * 24) ===
      0
        ? 1
        : (new Date(data.checkOut).getTime() -
            new Date(data.checkIn).getTime()) /
          (1000 * 60 * 60 * 24);

    const basePrice = vehicle?.pricingType === "multiple" && vehicle?.seatingOptions?.length
      ? (vehicle.seatingOptions.find(o => o.seats === data.selectedSeats)?.dailyPrice || vehicle?.price?.daily || 0)
      : (vehicle?.price?.daily || 0);

    setVehiclePrice(basePrice * data.noOfVehicle * totalDay);
    setFinalPrice(
      Math.ceil(
        vehiclePrice * 1.05 +
          vehicle?.convenienceFee +
          vehicle?.tripProtectionFee,
      ),
    );
  }, [data, vehiclePrice, finalPrice]);

  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
  } = useQuery({
    queryKey: ["user"],
    queryFn: () => getUser(accessToken),
    enabled: !!accessToken,
    staleTime: 1000 * 60,
  });

  const mutation = useMutation({
    mutationFn: (formData: FormData) => createBookings(accessToken, formData),
    onSuccess: (resData: BookingResponse) => {
      toast.success("Vehicle Booked Successfully");
      setData({
        checkIn: "",
        checkOut: "",
        noOfVehicle: 1,
        vehicleId: vehicle?._id || "",
        policyAccepted: true,
      });
      handlePayment(resData);
    },
    onError: () => {
      toast.error("Failed to book vehicle");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    // e.preventDefault();
    if (!accessToken) {
      useAuthDialogStore
        .getState()
        .openDialog("login", undefined, `/rental/${vehicle.vehicleType?.toLowerCase() || 'other'}/${vehicle.location?.name?.toLowerCase().replace(/\s+/g, '-') || 'any'}/${vehicle.slug}`);
      return;
    }
    if (data.policyAccepted === false)
      return toast.error("Please accept terms and conditions");
    mutation.mutate({
      ...data,
    });
  };

  const handlePayment = async (bookingData: BookingResponse) => {
    setLoading(true);

    try {
      const txnid = "txn" + Date.now();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          txnid,
          amount: bookingData.totalPrice.toFixed(2),
          productinfo: bookingData.vehicleId || "Travel Package",
          firstname: user?.name || "Guest",
          email: user?.email || "abhi@example.com",
          phone: user?.phone || "9876543210",
          udf1: bookingData._id,
          surl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success-vehicle`,
          furl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failure-vehicle`,
        }),
      });

      if (!res.ok) {
        throw new Error(`Payment init failed: ${res.status}`);
      }

      const { paymentData } = await res.json();
      setPaymentData(paymentData);
      setTimeout(() => {
        formRef.current?.submit();
      }, 1000);
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  };

  const tabs: { key: TabKey; label: string }[] = [];

  const hasContent = (content: any) => {
    if (!content) return false;
    if (Array.isArray(content)) return content.length > 0;
    if (typeof content !== 'string') return true;
    if (/<img|<iframe|<video/i.test(content)) return true;
    const stripped = content.replace(/<[^>]*>?/gm, '').trim();
    return stripped.length > 0;
  };

  if (hasContent(vehicle?.content)) tabs.push({ key: "description", label: "Overview" });
  if (hasContent(vehicle?.features)) tabs.push({ key: "features", label: "Features" });
  if (hasContent(vehicle?.inclusions) || hasContent(vehicle?.exclusions)) tabs.push({ key: "includeexclude", label: "Includes & Excludes" });
  if (hasContent(vehicle?.availableFor)) tabs.push({ key: "availablefor", label: "Available For" });
  if (hasContent(vehicle?.rentalOptions)) tabs.push({ key: "rentaloptions", label: "Rental Options" });
  if (hasContent(vehicle?.howBookingWorks)) tabs.push({ key: "howbookingworks", label: "How Booking Works" });

  const today = new Date().toISOString().split("T")[0];

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
        { rootMargin: "-120px 0px -60% 0px", threshold: 0 }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKeys.join(',')]);

  return (
    <div className="w-full bg-slate-50/60 min-h-screen pb-10">
      {/* Banner Carousel & Title */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="relative flex flex-col gap-4">
          <div className="relative rounded-2xl overflow-hidden shadow-sm">
            <RentalCarousal gallery={vehicle?.gallery} />
            <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 pointer-events-none">
              <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm md:text-base font-bold text-gray-700 border border-gray-100">
                <MapPin color="#FE5300" size={18} strokeWidth={2.5} />
                <span>{vehicle?.vehicleBrand} | {vehicle?.vehicleYear}</span>
                <span className="text-gray-300">|</span>
                <span>{vehicle?.location?.name}</span>
              </div>
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold capitalize text-gray-900 px-1">
            {vehicle?.title}
          </h1>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2 mb-6">
        <Breadcrumb title={vehicle?.title} />
      </div>

      {/* At A Glance & Quick Answers Above Tabs */}
      {(hasContent(vehicle?.vehicleAtAGlance) || hasContent(vehicle?.quickAnswers)) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
            {hasContent(vehicle?.vehicleAtAGlance) && (
              <div>
                <div className="flex flex-col gap-2 mb-3">
                  <h3 className="text-xl font-bold font-heading text-black">Vehicle at a Glance</h3>
                  <div className="w-12 h-1 bg-[#FE5300]"></div>
                </div>
                <VisaAtAGlance html={vehicle.vehicleAtAGlance as string} />
              </div>
            )}
            {hasContent(vehicle?.quickAnswers) && (
              <div>
                <div className="flex flex-col gap-2 mb-3">
                  <h3 className="text-xl font-bold font-heading text-black">Quick Answers</h3>
                  <div className="w-12 h-1 bg-[#FE5300]"></div>
                </div>
                <section className="max-w-none text-black leading-relaxed [&_.prose]:!m-0 [&_.prose>ul]:!m-0 [&_p:empty]:hidden [&_ul]:!m-0 [&_ul]:list-none [&_ul]:pl-0 [&_ul]:flex [&_ul]:overflow-x-auto [&_ul]:no-scrollbar [&_ul]:snap-x [&_ul]:snap-mandatory md:[&_ul]:grid md:[&_ul]:grid-cols-2 lg:[&_ul]:grid-cols-2 [&_ul]:gap-3 md:[&_ul]:gap-4 [&_ul]:pb-4 md:[&_ul]:pb-0 [&_li]:relative [&_li]:p-3.5 md:[&_li]:p-4 [&_li]:pl-11 md:[&_li]:pl-12 [&_li]:!m-0 [&_li]:shrink-0 [&_li]:snap-start [&_li]:w-[85vw] md:[&_li]:w-auto md:[&_li]:shrink [&_li::marker]:hidden [&_li::before]:content-[''] [&_li::before]:absolute [&_li::before]:left-3 md:[&_li::before]:left-4 [&_li::before]:top-3.5 md:[&_li::before]:top-4 [&_li::before]:w-6 [&_li::before]:h-6 [&_li::before]:bg-orange-50 [&_li::before]:rounded-full [&_li::before]:transition-all [&_li::before]:duration-300 [&_li::before]:shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] [&_li::before]:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRTUzMDAiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWxpbmUgcG9pbnRzPSI5IDE4IDE1IDEyIDkgNiIvPjwvc3ZnPg==')] [&_li::before]:bg-no-repeat [&_li::before]:bg-center [&_li::before]:bg-[length:12px_12px] [&_li:hover::before]:bg-[#FE5300] [&_li:hover::before]:scale-110 [&_li:hover::before]:shadow-[0_4px_12px_rgba(254,83,0,0.3)] [&_li:hover::before]:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBvbHlsaW5lIHBvaW50cz0iOSAxOCAxNSAxMiA5IDYiLz48L3N2Zz4=')] [&_li]:bg-white [&_li]:border [&_li]:border-gray-100/80 [&_li]:rounded-2xl [&_li]:shadow-[0_4px_20px_rgba(0,0,0,0.03)] [&_li]:transition-all [&_li]:duration-400 [&_li:hover]:-translate-y-0.5 [&_li:hover]:shadow-[0_8px_30px_rgba(254,83,0,0.08)] [&_li:hover]:border-orange-200/60 [&_li_*]:!m-0 [&_li_*]:!leading-relaxed [&_li_strong]:block [&_li_strong]:mb-1 [&_li_strong]:text-[13px] md:[&_li_strong]:text-[14px] [&_li_strong]:text-gray-900 [&_li_strong]:transition-colors [&_li_strong]:leading-snug [&_li_b]:block [&_li_b]:mb-1 [&_li_b]:text-[13px] md:[&_li_b]:text-[14px] [&_li_b]:text-gray-900 [&_li_b]:transition-colors [&_li_b]:leading-snug [&_li:hover_strong]:text-[#FE5300] [&_li:hover_b]:text-[#FE5300] [&_li]:text-gray-500 [&_li]:text-[12px] md:[&_li]:text-[13px] [&_li_p]:text-gray-500 [&_li_p]:text-[12px] md:[&_li_p]:text-[13px] [&_li_p]:leading-relaxed">
                  <BlogContent html={(vehicle.quickAnswers as string)?.replace(/<\/strong>\s*:\s*/gi, '</strong>').replace(/<\/b>\s*:\s*/gi, '</b>').replace(/:\s*<\/strong>/gi, '</strong>').replace(/:\s*<\/b>/gi, '</b>')} />
                </section>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 100% width Sticky Tab Bar Background */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] w-full mb-6">
        <div className="max-w-7xl mx-auto px-4 py-2 md:py-4">
          <div className="flex flex-nowrap md:flex-wrap w-full gap-2 pb-1 overflow-x-auto no-scrollbar md:overflow-visible snap-x snap-mandatory md:snap-none">
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
                className={`shrink-0 snap-start text-xs md:text-sm h-8 md:h-9 px-3 md:px-4 rounded-full ${
                  active === tab.key
                    ? "bg-[#FE5300] text-white hover:bg-[#e14a00]"
                    : "bg-white hover:bg-gray-50 text-black border border-[#FE5300]"
                }`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16 md:flex gap-12 lg:gap-16">
        {/* Main Content (Left) */}
        <section className="w-full md:w-[68%] lg:w-[72%]">
            {/* Tab Content */}
            <div className="w-full">

              <div id="description" className="scroll-mt-40 mb-8 pb-8 md:mb-12 md:pb-12 lg:mb-16 lg:pb-16 border-b border-gray-200 last:border-0">
                <div className="flex flex-col gap-2 mb-5">
                  <h3 className="text-xl font-bold font-heading text-black">Overview</h3>
                  <div className="w-12 h-1 bg-[#FE5300]"></div>
                </div>
                <div className="md:hidden">
                  <ReadMore content={vehicle?.content} />
                </div>
                <section className="hidden md:block visa-prose prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4">
                  <BlogContent html={vehicle?.content} />
                </section>
              </div>

              <div id="features" className="scroll-mt-40 mb-8 pb-8 md:mb-12 md:pb-12 lg:mb-16 lg:pb-16 border-b border-gray-200 last:border-0">
                <div className="flex flex-col gap-2 mb-5">
                  <h3 className="text-xl font-bold font-heading text-black">Key Features</h3>
                  <div className="w-12 h-1 bg-[#FE5300]"></div>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vehicle?.features && vehicle.features.length > 0 ? (
                    vehicle.features.map((feature: string, i: number) => (
                      <li className="flex items-start gap-3 text-base text-black leading-relaxed" key={i}>
                        <Check className="w-5 h-5 text-[#FE5300] shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-500">No specific features listed.</li>
                  )}
                </ul>
              </div>

              <div id="includeexclude" className="scroll-mt-40 mb-8 pb-8 md:mb-12 md:pb-12 lg:mb-16 lg:pb-16 border-b border-gray-200 last:border-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                  {/* Inclusions */}
                  <div>
                    <div className="flex flex-col gap-2 mb-6">
                      <h3 className="text-2xl md:text-3xl font-bold font-heading text-black">Inclusions</h3>
                      <div className="w-12 h-1.5 bg-[#FE5300]"></div>
                    </div>
                    <ul className="flex flex-col gap-4">
                      {vehicle?.inclusions && vehicle.inclusions.length > 0 ? (
                        vehicle.inclusions.map((inc: string, i: number) => (
                          <li key={i} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-[#00a651] shrink-0 mt-0.5" strokeWidth={2} />
                            <span className="text-base font-medium text-black leading-relaxed">{inc}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500 italic">Information pending.</li>
                      )}
                    </ul>
                  </div>

                  {/* Exclusions */}
                  <div>
                    <div className="flex flex-col gap-2 mb-6">
                      <h3 className="text-2xl md:text-3xl font-bold font-heading text-black">Exclusions</h3>
                      <div className="w-12 h-1.5 bg-[#FE5300]"></div>
                    </div>
                    <ul className="flex flex-col gap-4">
                      {vehicle?.exclusions && vehicle.exclusions.length > 0 ? (
                        vehicle.exclusions.map((exc: string, i: number) => (
                          <li key={i} className="flex items-start gap-3">
                            <X className="w-5 h-5 text-red-500 shrink-0 mt-0.5" strokeWidth={2} />
                            <span className="text-base font-medium text-[#64748b] leading-relaxed">{exc}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500 italic">Information pending.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {hasContent(vehicle?.availableFor) && (
                <div id="availablefor" className="scroll-mt-40 mb-8 pb-8 md:mb-12 md:pb-12 lg:mb-16 lg:pb-16 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h3 className="text-xl font-bold font-heading text-black">Available For</h3>
                    <div className="w-12 h-1 bg-[#FE5300]"></div>
                  </div>
                  <section className="visa-prose prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4">
                    <BlogContent html={vehicle?.availableFor} />
                  </section>
                </div>
              )}

              {hasContent(vehicle?.rentalOptions) && (
                <div id="rentaloptions" className="scroll-mt-40 mb-8 pb-8 md:mb-12 md:pb-12 lg:mb-16 lg:pb-16 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h3 className="text-xl font-bold font-heading text-black">Rental Options</h3>
                    <div className="w-12 h-1 bg-[#FE5300]"></div>
                  </div>
                  <section className="visa-prose prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4">
                    <BlogContent html={vehicle?.rentalOptions} />
                  </section>
                </div>
              )}





              {hasContent(vehicle?.howBookingWorks) && (
                <div id="howbookingworks" className="scroll-mt-40 mb-8 pb-8 md:mb-12 md:pb-12 lg:mb-16 lg:pb-16 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h3 className="text-xl font-bold font-heading text-black">How Booking Works</h3>
                    <div className="w-12 h-1 bg-[#FE5300]"></div>
                  </div>
                  <section className="visa-prose prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4">
                    <BlogContent html={vehicle?.howBookingWorks} />
                  </section>
                </div>
              )}

              <div id="faqs" className="scroll-mt-40 mb-8 pb-8 md:mb-12 md:pb-12 lg:mb-16 lg:pb-16 border-b border-gray-200 last:border-0">
                <div className="flex flex-col gap-2 mb-8 items-center">
                  <h3 className="text-xl md:text-2xl font-bold font-heading text-center text-black">
                    Frequently Asked Questions
                  </h3>
                  <div className="w-12 h-1 bg-[#FE5300]"></div>
                </div>
                  <Accordion
                    type="single"
                    collapsible
                    defaultValue="faq-0"
                    className="w-full space-y-2"
                  >
                  {vehicle?.faqs?.map((faq, index) => (
                    <AccordionItem
                      key={index}
                      value={`faq-${index}`}
                      className="border-b border-gray-200 py-1 md:py-2"
                    >
                      <AccordionTrigger className="text-xs md:text-sm font-bold font-heading text-black hover:text-[#FE5300] transition-colors hover:no-underline text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-justify pt-3">
                        <section className="prose prose-sm max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4">
                          <BlogContent html={faq.answer} />
                        </section>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                  </Accordion>
              </div>

              <div id="author" className="scroll-mt-40 mb-8">
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-16 h-16 rounded-full bg-[#FE5300]/10 flex items-center justify-center shrink-0 border border-[#FE5300]/20">
                  <span className="text-[#FE5300] font-black text-2xl tracking-tighter">MB</span>
                </div>
                <div className="flex-1 space-y-2.5">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">About the Author</h4>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">MusafirBaba Vehicle Rental Team</h3>
                  <p className="text-[13px] text-slate-600 leading-relaxed">
                    Our vehicle rental specialists regularly assist travelers with choosing the best vehicles, travel planning, and rental consultation for a wide range of destinations.
                  </p>
                  <div className="pt-3 mt-3 border-t border-slate-200/60 flex flex-col sm:flex-row gap-2 sm:gap-6 text-[11px] text-slate-500 font-medium">
                    <span>Last Updated: <strong className="text-slate-700">June 2026</strong></span>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <span>Reviewed By: <strong className="text-slate-700">Senior Rental Consultants, MusafirBaba</strong></span>
                  </div>
                </div>
              </div>
              </div>

              {hasContent(vehicle?.helpfulResources) && (
                <div id="resources" className="scroll-mt-40 mb-8 pb-8 md:mb-12 md:pb-12 lg:mb-16 lg:pb-16 border-b border-gray-200 last:border-0 w-full">
                  <HelpfulResources data={vehicle.helpfulResources} />
                </div>
              )}
            </div>
          </section>

        {/* Sidebar (Right) */}
        <aside className="w-full md:w-[32%] lg:w-[28%] flex flex-col gap-6">
          <Card className="p-0 mb-4 shadow-lg border-2 border-[#FE5300] hover:shadow-2xl overflow-hidden md:sticky md:top-24 self-start">
            <div>
              <form
                className="w-full max-w-4xl mx-auto"
              >
                <div className="bg-white shadow-xl rounded-2xl p-5 md:p-6 border border-gray-100">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    Book Your Vehicle
                  </h2>

                  <div className="flex flex-col gap-6">
                    <div className="grid md:grid-cols-2 grid-cols-1 gap-5">
                      <div className="flex flex-col gap-2">
                        <Label className="text-[#FE5300] font-semibold text-sm">
                          Check In
                        </Label>
                          <Input
                            value={data.checkIn}
                            min={today}
                            onChange={(e) =>
                              setData({ ...data, checkIn: e.target.value })
                            }
                            type="date"
                            className="h-9 rounded-lg focus-visible:ring-2 focus-visible:ring-[#FE5300] text-sm"
                          />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label className="text-[#FE5300] font-semibold text-sm">
                          Check Out
                        </Label>
                          <Input
                            value={data.checkOut}
                            min={today}
                            onChange={(e) =>
                              setData({ ...data, checkOut: e.target.value })
                            }
                            type="date"
                            className="h-9 rounded-lg focus-visible:ring-2 focus-visible:ring-[#FE5300] text-sm"
                          />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-5 items-center">
                      <Label className="text-[#FE5300] font-semibold text-sm">
                        No. of Vehicles
                      </Label>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 border border-gray-200 rounded-lg h-9 px-2 overflow-hidden bg-white">
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0 bg-gray-100 hover:bg-[#FE5300]/10 text-gray-700 hover:text-[#FE5300] border-none"
                            onClick={() =>
                              setData({
                                ...data,
                                noOfVehicle: Math.max(1, data.noOfVehicle - 1),
                              })
                            }
                          >
                            <Minus size={16} strokeWidth={3} />
                          </Button>
                          <Input
                            value={data.noOfVehicle}
                            readOnly
                            className="h-9 w-full border-none text-center font-bold text-lg focus-visible:ring-0 p-0 pointer-events-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon"
                              disabled={data.noOfVehicle >= (
                                vehicle?.seatingOptions && vehicle.seatingOptions.length > 0 
                                  ? (vehicle.seatingOptions.find(o => o.seats === data.selectedSeats)?.stock || 1)
                                  : (vehicle?.availableStock || 1)
                              )}
                              className={`h-6 w-6 flex-shrink-0 border-none ${
                                  data.noOfVehicle >= (
                                    vehicle?.seatingOptions && vehicle.seatingOptions.length > 0 
                                      ? (vehicle.seatingOptions.find(o => o.seats === data.selectedSeats)?.stock || 1)
                                      : (vehicle?.availableStock || 1)
                                  )
                                  ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                                  : "bg-gray-100 hover:bg-[#FE5300]/10 text-gray-700 hover:text-[#FE5300]"
                              }`}
                              onClick={() =>
                                setData({
                                  ...data,
                                  noOfVehicle: data.noOfVehicle + 1,
                                })
                              }
                            >
                              <Plus size={14} strokeWidth={3} />
                            </Button>
                        </div>
                        <p className={`text-[10px] font-bold text-right uppercase tracking-wider ${
                          data.noOfVehicle >= (
                            vehicle?.pricingType === "multiple" && vehicle?.seatingOptions?.length 
                              ? (vehicle.seatingOptions.find(o => o.seats === data.selectedSeats)?.stock || 1)
                              : (vehicle?.availableStock || 1)
                          ) ? 'text-red-500' : 'text-gray-400'}`}>
                          {vehicle?.pricingType === "multiple" && vehicle?.seatingOptions?.length 
                            ? (vehicle.seatingOptions.find(o => o.seats === data.selectedSeats)?.stock || 0)
                            : (vehicle?.availableStock || 0)} Units Available
                        </p>
                      </div>
                    </div>

                    {/* Seating Selector */}
                    {vehicle?.pricingType === "multiple" && vehicle?.seatingOptions?.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <Label className="text-[#FE5300] font-semibold text-xs">
                          Choose Seating Capacity
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {vehicle.seatingOptions.map((option) => (
                            <button
                              key={option.seats}
                              type="button"
                              onClick={() => setData({ ...data, selectedSeats: option.seats })}
                              className={`h-7 w-7 flex items-center justify-center rounded-full border transition-all duration-200 text-xs font-normal ${
                                data.selectedSeats === option.seats
                                  ? "border-[#FE5300] bg-[#FE5300] text-white shadow-sm"
                                  : "border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {option.seats}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Price Details - Reverted to original compact style */}
                    <div className="border-t border-gray-200 pt-5 mt-2">
                      <div className="flex justify-between text-sm">
                        <p>Daily Rate</p>
                        <p className="font-bold">₹ {(vehicle?.pricingType === "multiple" && vehicle?.seatingOptions?.length 
                          ? vehicle.seatingOptions.find(o => o.seats === data.selectedSeats)?.dailyPrice 
                          : vehicle?.price?.daily)?.toLocaleString()}</p>
                      </div>
                      <div className="flex justify-between text-gray-400 text-[10px] mt-1.5">
                        <p className="flex items-center gap-1.5"><ShieldCheck size={12} className="opacity-70" /> Trip Protection Fee</p>
                        <p>₹ {vehicle?.tripProtectionFee}</p>
                      </div>
                      <div className="flex justify-between text-gray-400 text-[10px] mt-1">
                        <p className="flex items-center gap-1.5"><CreditCard size={12} className="opacity-70" /> Convenience Fee</p>
                        <p>₹ {vehicle?.convenienceFee}</p>
                      </div>
                      <div className="flex justify-between text-gray-400 text-[10px] mt-1">
                        <p className="flex items-center gap-1.5"><Receipt size={12} className="opacity-70" /> GST @5%</p>
                        <p>₹ {Math.ceil(vehiclePrice * 0.05)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ">
                      <input
                        defaultChecked
                        className="h-10"
                        type="checkbox"
                        onChange={(e) =>
                          setData({
                            ...data,
                            policyAccepted: e.target.checked,
                          })
                        }
                      />
                      <Label className="text-sm text-gray-700 flex flex-wrap gap-1">
                        I agree to
                        <Link
                          href="/terms-and-conditions"
                          className="text-blue-600 hover:underline"
                        >
                          T&C
                        </Link>
                        and
                        <Link
                          href="/privacy-policy"
                          className="text-blue-600 hover:underline"
                        >
                          Privacy Policy
                        </Link>
                      </Label>
                    </div>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      className="h-10 text-lg w-full md:w-auto bg-[#FE5300] hover:bg-[#e14a00] transition-all duration-300 rounded-lg text-white font-semibold"
                    >
                      Pay ₹{finalPrice.toLocaleString()}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    *All prices are inclusive of GST @ 5%
                  </p>
                </div>
              </form>
            </div>
          </Card>
        </aside>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 mb-16 mt-8">
        <div id="whychooseus" className="scroll-mt-40 mb-8 pb-8 md:mb-12 md:pb-12 lg:mb-16 lg:pb-16 border-b border-gray-200 last:border-0">
          <div className="flex flex-col gap-2 mb-8 items-center">
            <h3 className="text-2xl md:text-3xl font-bold font-heading text-black text-center">Why Choose MusafirBaba</h3>
            <div className="w-12 h-1 bg-[#FE5300]"></div>
          </div>
          <WhyChooseUs />
        </div>
        {relatedVehicles && relatedVehicles.length > 0 && (
          <div id="relatedvehicles" className="scroll-mt-40 mb-8 pb-8 md:mb-12 md:pb-12 lg:mb-16 lg:pb-16 border-b border-gray-200 last:border-0">
            <div className="flex flex-col gap-2 mb-8 items-center">
              <h3 className="text-2xl md:text-3xl font-bold font-heading text-black text-center">Related Vehicles</h3>
              <div className="w-12 h-1 bg-[#FE5300]"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {relatedVehicles.map((veh: any) => (
                <VehicleCard
                  key={veh._id}
                  vehicle={{
                    coverImage: veh.gallery[0],
                    vehicleName: veh.vehicleName,
                    vehicleTransmission: veh.vehicleTransmission,
                    fuelType: veh.fuelType,
                    availableSeats: veh.seats,
                    price: veh.price,
                    vehicleBrand: veh.vehicleBrand,
                    vehicleYear: veh.vehicleYear,
                    url: `/rental/${veh.vehicleType?.toLowerCase() || 'other'}/${veh.location?.name?.toLowerCase().replace(/\s+/g, '-') || 'any'}/${veh.slug}`,
                    pricingType: veh.pricingType,
                    seatingOptions: veh.seatingOptions,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <form
        action="https://secure.payu.in/_payment"
        method="post"
        className="hidden"
        ref={formRef}
      >
        <input type="hidden" name="key" value={paymentData.key} />
        <input type="hidden" name="txnid" value={paymentData.txnid} />
        <input
          type="hidden"
          name="productinfo"
          value={paymentData.productinfo}
        />
        <input type="hidden" name="amount" value={paymentData.amount} />
        <input type="hidden" name="email" value={paymentData.email} />
        <input type="hidden" name="firstname" value={paymentData.firstname} />
        <input type="hidden" name="lastname" value={paymentData.lastname} />
        <input type="hidden" name="surl" value={paymentData.surl} />
        <input type="hidden" name="furl" value={paymentData.furl} />
        <input type="hidden" name="phone" value={paymentData.phone} />
        <input type="hidden" name="hash" value={paymentData.hash} />
        <input type="hidden" name="udf1" value={paymentData.udf1} />
        <input
          type="hidden"
          name="service_provider"
          value={paymentData.service_provider}
        />
      </form>
    </div>
  );
}
