"use client";
import Breadcrumb from "@/components/common/Breadcrumb";
import RentalCarousal from "@/components/common/RentalCarousal";
import { Faqs } from "@/components/custom/Faqs";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Check, ChevronDown, Clock, MapPin, X } from "lucide-react";
import ReadMore from "@/components/common/ReadMore";
import { BlogContent } from "@/components/custom/BlogContent";
import { Accordion } from "@radix-ui/react-accordion";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TabKey = "description" | "features" | "includeexclude" | "faqs";
interface FormData {
  checkIn: string;
  checkOut: string;
  noOfVehicle: number;
  vehicleId: string;
}

export default function RentalPageClient({ vehicle }: { vehicle: any }) {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);
  const [active, setActive] = useState<TabKey>("description");
  const [data, setData] = useState<FormData>({
    checkIn: "",
    checkOut: "",
    noOfVehicle: 1,
    vehicleId: vehicle?._id,
  });

  const tabs: { key: TabKey; label: string }[] = [
    { key: "description", label: "Description" },
    { key: "features", label: "Features" },
    { key: "includeexclude", label: "Includes & Excludes" },
    { key: "faqs", label: "FAQs" },
  ];

  return (
    <div>
      <div>
        <RentalCarousal gallery={vehicle?.gallery} />
        <div className="max-w-7xl mx-auto">
          <Breadcrumb />
        </div>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold">{vehicle?.vehicleName}</h1>

          <div className="w-full max-w-7xl mx-auto px-4  my-4 md:flex">
            <section className="w-full md:w-2/3 px-4 md:py-10 py-4">
              <div className="flex flex-col gap-2  max-w-7xl mx-auto">
                {/* Tabs */}
                <div>
                  {/* <h1 className="text-3xl font-bold mb-4">{pkg.title}</h1> */}
                  <div className="flex gap-2">
                    <span className="flex md:text-xl items-center gap-1 px-3 py-3 rounded-md">
                      <MapPin color="#FE5300" size={24} />{" "}
                      {vehicle?.vehicleBrand} | {vehicle?.vehicleYear}
                    </span>
                    {/* <span className="flex md:text-xl items-center gap-1 px-3 py-3 rounded-md">
                  <Clock color="#FE5300" size={24} /> {vehicle?.}
                </span> */}
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
                      <h2 className="font-bold text-lg mb-2">
                        About This Vehicle
                      </h2>
                      <div className="md:hidden">
                        <ReadMore content={vehicle?.content} />
                      </div>
                      <section className="hidden md:block prose prose-lg max-w-none mt-6">
                        <BlogContent html={vehicle?.content} />
                      </section>
                    </div>
                  )}

                  {active === "features" && (
                    <ul className="list-disc list-inside rounded-xl bg-[#87E87F]/20 px-8 py-6 shadow">
                      {vehicle?.features.map((h: string, i: number) => (
                        <li className="mb-2 text-lg" key={i}>
                          {h}
                        </li>
                      ))}
                    </ul>
                  )}

                  {active === "includeexclude" && (
                    <div className="space-y-8">
                      {/* Includes Section */}
                      <div className="rounded-xl bg-[#87E87F]/20 px-4 py-6 shadow">
                        <h3 className="text-lg font-semibold text-foreground mb-4">{`What's Included`}</h3>
                        <ul className="space-y-3">
                          {vehicle?.inclusions.map((inc: string, i: number) => (
                            <li key={i} className="flex items-start gap-3">
                              <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-foreground">
                                {inc}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Excludes Section */}
                      <div className="rounded-xl bg-red-50 px-4 py-6 shadow">
                        <h3 className="text-lg font-semibold text-foreground mb-4">{`What's Not Included`}</h3>
                        <ul className="space-y-3">
                          {vehicle?.exclusions.map((exc: string, i: number) => (
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
                      {vehicle?.faqs.map(
                        (
                          faq: { question: string; answer: string },
                          index: number,
                        ) => {
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
                        },
                      )}
                    </Accordion>
                  )}
                </div>
              </div>
            </section>
            <div className="w-full md:w-1/3 px-4 py-16 ">
              <Card className="p-0 mb-4 shadow-lg border-2 border-[#FE5300] hover:shadow-2xl">
                {!accessToken ? (
                  <div>
                    <Button
                      onClick={() =>
                        useAuthDialogStore
                          .getState()
                          .openDialog("login", undefined)
                      }
                      size={"lg"}
                      className="m-4 bg-[#FE5300] hover:bg-[#FE5300] font-semibold text-xl"
                    >
                      {" "}
                      Login to Book
                    </Button>
                  </div>
                ) : (
                  <form className="w-full max-w-4xl mx-auto">
                    <div className="bg-white shadow-xl rounded-2xl p-6 md:p-8 border border-gray-100">
                      <h2 className="text-2xl font-bold text-gray-800 mb-6">
                        Book Your Parking Slot
                      </h2>

                      <div className="flex flex-col gap-6">
                        {/* Dates Section */}
                        <div className="grid md:grid-cols-2 grid-cols-1 gap-5">
                          <div className="flex flex-col gap-2">
                            <Label className="text-[#FE5300] font-semibold text-sm">
                              Check In
                            </Label>
                            <Input
                              type="date"
                              className="h-11 rounded-lg focus-visible:ring-2 focus-visible:ring-[#FE5300]"
                            />
                          </div>

                          <div className="flex flex-col gap-2">
                            <Label className="text-[#FE5300] font-semibold text-sm">
                              Check Out
                            </Label>
                            <Input
                              type="date"
                              className="h-11 rounded-lg focus-visible:ring-2 focus-visible:ring-[#FE5300]"
                            />
                          </div>
                        </div>

                        {/* Vehicle + Button Section */}
                        <div className="grid md:grid-cols-2 grid-cols-1 gap-5 items-end">
                          <div className="flex flex-col gap-2">
                            <Label className="text-[#FE5300] font-semibold text-sm">
                              Number of Vehicles
                            </Label>
                            <Input
                              type="number"
                              defaultValue={1}
                              min={1}
                              className="h-11 rounded-lg focus-visible:ring-2 focus-visible:ring-[#FE5300]"
                            />
                          </div>

                          <Button className="h-11 w-full md:w-auto bg-[#FE5300] hover:bg-[#e14a00] transition-all duration-300 rounded-lg text-white font-semibold">
                            Book Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
