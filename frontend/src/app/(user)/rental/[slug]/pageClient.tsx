"use client";
import Breadcrumb from "@/components/common/Breadcrumb";
import RentalCarousal from "@/components/common/RentalCarousal";
import { Button } from "@/components/ui/button";
import React, { useRef, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Check, ChevronDown, MapPin, X } from "lucide-react";
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
import { getUser } from "../../holidays/customised-tour-packages/[destination]/[pkgSlug]/[id]/page";

type TabKey = "description" | "features" | "includeexclude" | "faqs";

interface FormData {
  checkIn: string;
  checkOut: string;
  noOfVehicle: number;
  vehicleId: string;
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
  vehicle: any;
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
  });

  const formRef = useRef<HTMLFormElement | null>(null);
  const [loading, setLoading] = useState(false);
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
        .openDialog("login", undefined, `/rental/${vehicle.slug}`);
      return;
    }
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

  const tabs: { key: TabKey; label: string }[] = [
    { key: "description", label: "Description" },
    { key: "features", label: "Features" },
    { key: "includeexclude", label: "Includes & Excludes" },
    { key: "faqs", label: "FAQs" },
  ];

  return (
    <div className="space-y-5">
      <div className=" ">
        <div className="max-w-7xl mx-auto px-4 my-4">
          <Breadcrumb />
        </div>
        {/* Title  */}
        <div className="flex items-center px-4 gap-2 max-w-7xl mx-auto">
          <h1 className="text-3xl  font-bold baseline capitalize">
            {vehicle?.title}
          </h1>
          <span className="flex capitalize md:text-xl items-center gap-1 px-3 py-3 rounded-md">
            <MapPin color="#FE5300" size={24} /> {vehicle?.vehicleBrand} |{" "}
            {vehicle?.vehicleYear}
          </span>
        </div>
      </div>

      <div className=" max-w-7xl mx-auto flex flex-col md:flex-row space-y-5">
        <div className="w-full md:w-5/7 px-4">
          <RentalCarousal gallery={vehicle?.gallery} />
        </div>
        {/* Payemtn */}
        <div className="w-full md:w-2/7 px-4 ">
          <Card className="p-0 mb-4 shadow-lg border-2 border-[#FE5300] hover:shadow-2xl">
            <div>
              <form
                //   onSubmit={handleSubmit}
                className="w-full max-w-4xl mx-auto"
              >
                <div className="bg-white shadow-xl rounded-2xl p-6 md:p-8 border border-gray-100">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">
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
                          onChange={(e) =>
                            setData({ ...data, checkIn: e.target.value })
                          }
                          type="date"
                          className="h-11 rounded-lg focus-visible:ring-2 focus-visible:ring-[#FE5300]"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label className="text-[#FE5300] font-semibold text-sm">
                          Check Out
                        </Label>
                        <Input
                          value={data.checkOut}
                          onChange={(e) =>
                            setData({ ...data, checkOut: e.target.value })
                          }
                          type="date"
                          className="h-11 rounded-lg focus-visible:ring-2 focus-visible:ring-[#FE5300]"
                        />
                      </div>
                    </div>

                    <div className="">
                      <div className="grid grid-cols-2 gap-5">
                        <Label className="text-[#FE5300] font-semibold text-sm">
                          Number of Vehicles
                        </Label>
                        <Input
                          value={data.noOfVehicle}
                          onChange={(e) =>
                            setData({
                              ...data,
                              noOfVehicle: Number(e.target.value),
                            })
                          }
                          type="number"
                          min={1}
                          className="h-11 rounded-lg focus-visible:ring-2 focus-visible:ring-[#FE5300]"
                        />
                      </div>
                    </div>
                    <Button
                      // disabled={!accessToken}
                      type="button"
                      onClick={handleSubmit}
                      className="text-xl w-full md:w-auto bg-[#FE5300] hover:bg-[#e14a00] transition-all duration-300 rounded-lg text-white font-semibold"
                    >
                      Pay ₹
                      {Math.ceil(
                        ((new Date(data.checkOut).getTime() -
                          new Date(data.checkIn).getTime()) /
                          (1000 * 60 * 60 * 24)) *
                          data.noOfVehicle *
                          (vehicle?.price?.daily || 0) *
                          1.05,
                      ).toLocaleString()}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400">
                    *All prices are inclusive of GST @ 5%
                  </p>
                </div>
              </form>
              <div>
                <p></p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 my-4">
        <div className="w-full max-w-7xl mx-auto px-4 my-4 flex flex-col">
          <section className="w-full max-w-7xl mx-auto px-4 md:py-10 py-4">
            <div className="flex flex-col gap-2 max-w-7xl mx-auto">
              <div className="flex md:flex-wrap w-full gap-2 mt-4 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                  <Button
                    key={tab.key}
                    size="lg"
                    onClick={() => setActive(tab.key)}
                    className={`mt-4 ${
                      active === tab.key
                        ? "bg-[#FE5300] text-white"
                        : "bg-white text-black border border-[#FE5300]"
                    }`}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

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
                    {vehicle?.features && vehicle.features.length > 0 ? (
                      vehicle.features.map((feature: string, i: number) => (
                        <li className="mb-2 text-lg" key={i}>
                          {feature}
                        </li>
                      ))
                    ) : (
                      <li className="mb-2 text-lg">No features available</li>
                    )}
                  </ul>
                )}

                {active === "includeexclude" && (
                  <div className="space-y-8">
                    <div className="rounded-xl bg-[#87E87F]/20 px-4 py-6 shadow">
                      <h3 className="text-lg font-semibold text-foreground mb-4">
                        What's Included
                      </h3>
                      <ul className="space-y-3">
                        {vehicle?.inclusions &&
                        vehicle.inclusions.length > 0 ? (
                          vehicle.inclusions.map((inc: string, i: number) => (
                            <li key={i} className="flex items-start gap-3">
                              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-foreground">
                                {inc}
                              </span>
                            </li>
                          ))
                        ) : (
                          <li className="flex items-start gap-3">
                            <span>No inclusions available</span>
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="rounded-xl bg-red-50 px-4 py-6 shadow">
                      <h3 className="text-lg font-semibold text-foreground mb-4">
                        What's Not Included
                      </h3>
                      <ul className="space-y-3">
                        {vehicle?.exclusions &&
                        vehicle.exclusions.length > 0 ? (
                          vehicle.exclusions.map((exc: string, i: number) => (
                            <li key={i} className="flex items-start gap-3">
                              <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-muted-foreground">
                                {exc}
                              </span>
                            </li>
                          ))
                        ) : (
                          <li className="flex items-start gap-3">
                            <span>No exclusions available</span>
                          </li>
                        )}
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
                    {vehicle?.faqs?.map(
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

          {relatedVehicles && relatedVehicles.length > 0 && (
            <div>
              <div className="flex flex-col gap-2 items-center">
                <h2 className="text-lg md:text-3xl font-bold text-center">
                  Similer Vehicles
                </h2>
                <p className="w-20 h-1 bg-[#FE5300] text-center"></p>
                <p className=" text-center">
                  You may also like ({relatedVehicles.length})
                </p>
              </div>
              <div className="max-w-7xl mx-auto w-full px-4 md:px-6 lg:px-8 flex gap-4 overflow-x-auto no-scrollbar md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6 md:overflow-visible">
                {relatedVehicles.map((veh: any) => (
                  <VehicleCard
                    key={veh._id}
                    vehicle={{
                      coverImage: veh.gallery[0],
                      vehicleName: veh.vehicleName,
                      fuelType: veh.fuelType,
                      availableSeats: veh.seats,
                      price: veh.price,
                      vehicleBrand: veh.vehicleBrand,
                      vehicleYear: veh.vehicleYear,
                      url: `/rental/${veh.slug}`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
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
