"use client";
import Breadcrumb from "@/components/common/Breadcrumb";
import RentalCarousal from "@/components/common/RentalCarousal";
import { Button } from "@/components/ui/button";
import React, { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Check, ChevronDown, MapPin, Minus, Plus, X } from "lucide-react";
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
import Link from "next/link";
import { IVehicleUserData } from "./page";
type TabKey = "description" | "features" | "includeexclude" | "faqs";

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
        .openDialog("login", undefined, `/rental/${vehicle.slug}`);
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

  const tabs: { key: TabKey; label: string }[] = [
    { key: "description", label: "Description" },
    { key: "features", label: "Features" },
    { key: "includeexclude", label: "Includes & Excludes" },
    { key: "faqs", label: "FAQs" },
  ];

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-0">
      {/* Banner Carousel */}
      <div className="relative">
        <RentalCarousal
          gallery={vehicle?.gallery}
          fullWidth={true}
          title={vehicle?.title}
        />
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 mt-8">
        <Breadcrumb title={vehicle?.title} />
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 my-8 md:flex gap-8">
        {/* Main Content (Left) */}
        <section className="w-full md:w-2/3">
            {/* Title Section (Original Style) */}
            <div className="flex flex-col gap-1 mb-6">
              <h1 className="text-3xl font-bold capitalize text-gray-900">
                {vehicle?.title}
              </h1>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="flex items-center gap-1 font-semibold">
                  <MapPin color="#FE5300" size={18} /> {vehicle?.vehicleBrand} | {vehicle?.vehicleYear}
                </span>
                <span className="text-gray-400">|</span>
                <span>{vehicle?.location?.name}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex md:flex-wrap w-full gap-2 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <Button
                  key={tab.key}
                  size="lg"
                  onClick={() => setActive(tab.key)}
                  className={`mt-4 ${
                    active === tab.key
                      ? "bg-[#FE5300] text-white"
                      : "bg-white text-black border border-[#FE5300] hover:bg-[#FE5300]/5"
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="mt-10 w-full">
              {active === "description" && (
                <div className="rounded-xl bg-[#87E87F]/10 px-8 py-8 shadow-sm border border-[#87E87F]/30">
                  <h2 className="font-bold text-2xl mb-4 text-gray-800">
                    About This Vehicle
                  </h2>
                  <div className="md:hidden">
                    <ReadMore content={vehicle?.content} />
                  </div>
                  <section className="hidden md:block prose prose-lg max-w-none">
                    <BlogContent html={vehicle?.content} />
                  </section>
                </div>
              )}

              {active === "features" && (
                <div className="rounded-xl bg-[#87E87F]/10 px-8 py-8 shadow-sm border border-[#87E87F]/30">
                  <h2 className="font-bold text-2xl mb-6 text-gray-800">Key Features</h2>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vehicle?.features && vehicle.features.length > 0 ? (
                      vehicle.features.map((feature: string, i: number) => (
                        <li className="flex items-center gap-3 text-lg text-gray-700" key={i}>
                          <div className="w-2 h-2 rounded-full bg-[#FE5300]" />
                          {feature}
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-500">No specific features listed.</li>
                    )}
                  </ul>
                </div>
              )}

              {active === "includeexclude" && (
                <div className="space-y-8">
                  <div className="rounded-xl bg-[#87E87F]/10 px-8 py-8 shadow-sm border border-[#87E87F]/30">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <div className="w-1 h-6 bg-[#87E87F]" /> What&apos;s Included
                    </h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {vehicle?.inclusions && vehicle.inclusions.length > 0 ? (
                        vehicle.inclusions.map((inc: string, i: number) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className="bg-green-100 rounded-full p-1 mt-0.5">
                              <Check className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-gray-700">{inc}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500 italic">Information pending.</li>
                      )}
                    </ul>
                  </div>

                  <div className="rounded-xl bg-red-50 px-8 py-8 shadow-sm border border-red-100">
                    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                      <div className="w-1 h-6 bg-red-400" /> What&apos;s Not Included
                    </h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {vehicle?.exclusions && vehicle.exclusions.length > 0 ? (
                        vehicle.exclusions.map((exc: string, i: number) => (
                          <li key={i} className="flex items-start gap-3">
                            <div className="bg-red-100 rounded-full p-1 mt-0.5">
                              <X className="w-4 h-4 text-red-600" />
                            </div>
                            <span className="text-gray-700">{exc}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-500 italic">Information pending.</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}

              {active === "faqs" && (
                <div className="rounded-xl bg-[#87E87F]/10 px-8 py-8 shadow-sm border border-[#87E87F]/30">
                  <h2 className="font-bold text-2xl mb-6 text-gray-800">Frequently Asked Questions</h2>
                  <Accordion
                    type="single"
                    collapsible
                    className="w-full space-y-4"
                  >
                    {vehicle?.faqs?.map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`faq-${index}`}
                        className="border rounded-xl bg-white px-4 transition-all duration-200 hover:border-[#FE5300]"
                      >
                        <AccordionTrigger className="text-lg font-semibold text-left hover:no-underline py-4">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="pb-6 pt-2 text-gray-600 border-t">
                          <BlogContent html={faq.answer} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}
            </div>
          </section>

        {/* Sidebar (Right) */}
        <aside className="w-full md:w-1/3 flex flex-col gap-6">
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
                        Number of Vehicles
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
                    <div className="border-t border-gray-400 p-3 bg-gray-50/30 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <p>Daily Rate</p>
                        <p className="font-bold">₹ {(vehicle?.pricingType === "multiple" && vehicle?.seatingOptions?.length 
                          ? vehicle.seatingOptions.find(o => o.seats === data.selectedSeats)?.dailyPrice 
                          : vehicle?.price?.daily)?.toLocaleString()}</p>
                      </div>
                      <div className="flex justify-between text-gray-400 text-[10px] mt-0.5">
                        <p>Trip Protection Fee</p>
                        <p>₹ {vehicle?.tripProtectionFee}</p>
                      </div>
                      <div className="flex justify-between text-gray-400 text-[10px]">
                        <p>Convenience Fee</p>
                        <p>₹ {vehicle?.convenienceFee}</p>
                      </div>
                      <div className="flex justify-between text-gray-400 text-[10px]">
                        <p>GST @5%</p>
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

      <div className="max-w-7xl mx-auto px-4 my-16">
        {relatedVehicles && relatedVehicles.length > 0 && (
          <div className="space-y-10">
            <div className="flex flex-col gap-2 items-center">
              <h2 className="text-3xl md:text-4xl font-extrabold text-center text-gray-900">
                Similar Vehicles
              </h2>
              <div className="w-24 h-1.5 bg-[#FE5300] rounded-full"></div>
              <p className="text-gray-500 mt-2 text-lg">
                Hand-picked alternatives you might like
              </p>
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
                    url: `/rental/${veh.slug}`,
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
