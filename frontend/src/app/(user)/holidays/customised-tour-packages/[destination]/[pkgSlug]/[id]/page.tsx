"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader } from "@/components/custom/loader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Image from "next/image";
import {
  Calendar,
  Check,
  Lock,
  MapPin,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { useCustomizedBookingStore } from "@/store/useCutomizedBookingStore";
import { useParams } from "next/navigation";
import { secureFetch } from "@/lib/secureFetch";
import { parseISO } from "date-fns";

interface Image {
  url: string;
  public_id: string;
  alt: string;
  width?: number;
  height?: number;
}
type BookingApiResponse = {
  _id: string;
  totalPrice: number;
  date: string;
  noOfPeople: number;
  packageId: {
    _id: string;
    title: string;
    coverImage: Image;
  };
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  plan: string;
};
interface Plan {
  title: string;
  price: number;
}

interface FormData {
  date: string;
  noOfPeople: number;
  totalPrice: number;
  plan: string;
  packageId: string;
  coupanId?: string;
}
const createBooking = async (accessToken: string, formData: FormData) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourbooking`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(formData),
    },
  );
  if (!res.ok) throw new Error("Failed to book package");
  const data = await res.json();
  return data?.data;
};

const getPackage = async (id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/${id}`,
  );
  if (!res.ok) throw new Error("Failed to fetch package");
  const data = await res.json();
  return data?.data;
};

export const getUser = async (accessToken: string) => {
  const res = await secureFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message);
  }
  const data = await res.json();
  return data?.data;
};

export const getAllOffers = async (accessToken: string) => {
  const res = await secureFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/coupan`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch offers");
  const data = await res.json();
  return data?.data;
};

export const validateCoupan = async (
  accessToken: string,
  value: {
    id: string;
    amount: number;
    itemId: string;
    itemType: string;
  },
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/coupan/validate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(value),
    },
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || "Failed to validate coupan");
  }
  const data = await res.json();
  return data;
};
export default function CheckoutButton() {
  const params = useParams();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [finalAmount, setFinalAmount] = useState(0);
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState({
    key: "",
    txnid: "",
    amount: "",
    productinfo: "",
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    surl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success-customized-tour`,
    furl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failure-customized-tour`,
    hash: "",
    udf1: "",
    service_provider: "",
  });
  const accessToken = useAuthStore((s) => s.accessToken) as string;
  // const refreshAccessToken = useAuthStore((s) => s.refreshAccessToken);
  const pkgId = params.id as string;
  const formData = useCustomizedBookingStore((s) => s.formData);
  const [plan, setPlan] = useState<Plan>({ title: "", price: 0 });
  const {
    data: pkg,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["packages"],
    queryFn: () => getPackage(pkgId),
    enabled: !!accessToken,
    staleTime: 1000 * 60,
  });
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => getUser(accessToken),
    enabled: !!accessToken,
    staleTime: 1000 * 60,
  });

  const { data: offers } = useQuery({
    queryKey: ["offers"],
    queryFn: () => getAllOffers(accessToken),
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5,
  });

  const mutation = useMutation({
    mutationFn: (formData: FormData) => createBooking(accessToken, formData),
    onSuccess: (res) => {
      handlePayment(res);
    },
    onError: (error) => {
      toast.error((error as Error)?.message ?? "Failed to book package");
    },
  });

  const booking = formData;
  let totalPrice = booking.totalPrice;
  useEffect(() => {
    // console.log("pkg data:", pkg);
    if (booking && pkg) {
      const plans = pkg.plans.find((item: any) => item.title === booking.plan);
      setPlan({ title: plans.title, price: plans.price });
      totalPrice = booking.noOfPeople * plans.price;
      setFinalAmount(Math.ceil(totalPrice * 1.05));
    }
  }, [booking, pkg]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      totalPrice: finalAmount,
      coupanId: appliedCouponId ?? undefined,
    });
  };
  const handlePayment = async (bookingData: BookingApiResponse) => {
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
          amount: finalAmount ?? bookingData?.totalPrice?.toFixed(2),
          productinfo:
            bookingData?.packageId?.title ?? "Customized Travel Package",
          firstname: bookingData?.userId?.name ?? "Guest",
          email: bookingData?.userId?.email ?? "user@gamil.com",
          phone: "9876543210",
          udf1: bookingData?._id,
          surl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success-customized-tour`,
          furl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failure-customized-tour`,
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

  const handleCoupanValidation = async (values: {
    id: string;
    amount: number;
    itemId: string;
    itemType: "CUSTOM_PACKAGE";
  }) => {
    try {
      const res = await validateCoupan(accessToken, values);

      toast.success(res.message);

      setFinalAmount(res.data.finalAmount);
      setAppliedCouponId(res.data._id);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleRemoveCoupon = () => {
    setFinalAmount(booking.totalPrice);
    setAppliedCouponId(null);
    toast.success("Coupon removed");
  };

  if (isLoading) return <Loader size="lg" message="Loading booking..." />;
  if (isError) {
    const msg = (error as Error)?.message ?? "Failed to load booking";
    toast.error(msg);
    return <h1 className="text-red-600">{msg}</h1>;
  }
  const steps = ["Choose Date", "Select Plan", "Payment"];
  const currentStep = 2;
  return (
    <section className="max-w-6xl mx-auto min-h-screen py-12 px-4 md:px-8">
      {/* Stepper Header */}
      <div className="flex items-center justify-between mb-8 sticky top-3 bg-white z-10">
        {steps.map((step, index) => (
          <div key={index} className="flex-1 text-center relative">
            <div
              className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                index === currentStep
                  ? "bg-[#FF5300] text-white"
                  : index < currentStep
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-700"
              }`}
            >
              {index + 1}
            </div>
            <p className="text-xs mt-2 text-gray-600">{step}</p>

            {/* Progress line */}
            {index < steps.length - 1 && (
              <div
                className={`absolute top-4 left-[50%] h-[2px] w-[100%] z-[-1] ${
                  index < currentStep ? "bg-green-500" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className=" mb-12">
        <div className="mb-8">
          <h1 className=" text-xl md:text-4xl font-bold text-foreground">
            Complete Your Booking
          </h1>
          <p className="text-muted-foreground mt-2">
            Review your travel details and secure your reservation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Package Details Card - Featured on left */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300 p-0">
            <div className="md:grid md:grid-cols-5 overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
              <div className="md:col-span-2 grid grid-cols-5 gap-4 md:gap-0">
                {/* Image Section */}
                <div className="col-span-2 md:col-span-5 relative h-full">
                  {pkg?.coverImage?.url ? (
                    <Image
                      src={pkg.coverImage.url}
                      alt={pkg.title}
                      fill
                      className="object-cover  "
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-muted">
                      <MapPin className="h-14 w-14 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="md:hidden grid col-span-3 gap-3">
                  <h2 className="text-lg font-semibold text-foreground leading-tight">
                    {pkg?.title ?? "Travel Package"}
                  </h2>
                  <div className="h-px bg-border" />
                  <div className="flex items-start gap-2">
                    <div className="mt-1 rounded-md bg-primary/10 p-2">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground tracking-wide">
                        Travel Dates
                      </p>
                      <p className="text-xs font-medium text-foreground mt-1">
                        {parseISO(booking?.date || "").toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:col-span-3 p-2 lg:p-8">
                {/* Title */}
                <div className="mb-6">
                  <h2 className="hidden md:block text-2xl font-semibold text-foreground leading-tight">
                    {pkg?.title ?? "Travel Package"}
                  </h2>

                  {/* <p className="text-sm text-muted-foreground mt-1">
                                Booking summary
                              </p> */}
                </div>

                {/* Key Info */}
                <div className="space-y-5">
                  {/* Dates */}
                  <div className="hidden md:flex items-start gap-2">
                    <div className="mt-1 rounded-md bg-primary/10 p-2">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground tracking-wide">
                        Travel Dates
                      </p>
                      <p className="text-sm font-medium text-foreground mt-1">
                        {parseISO(booking?.date || "").toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="hidden md:blockh-px bg-border" />

                  {/* Traveller Info */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">
                      Traveller Information
                    </h3>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          Name
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {user?.name ?? "Guest"}
                          {booking?.noOfPeople > 1 &&
                            " +" + (booking?.noOfPeople! - 1)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          Email
                        </span>
                        <span className="text-sm font-medium text-foreground">
                          {user?.email ?? "guest@gmail.com"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Booking Summary Card - Sticky on right */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card to-secondary">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl text-foreground">
                  Order Summary
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-3 pb-6 border-b border-border/50">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Plan Type</span>
                    <span className="font-semibold text-foreground">
                      {booking?.plan ?? "Customized Package"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Package Price</span>
                    <span className="font-semibold text-foreground">
                      ₹{plan.price} X{booking?.noOfPeople}
                    </span>
                  </div>

                  {/* GST */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      @GST 5%
                    </span>
                    <span className="font-semibold text-foreground">
                      ₹{Math.ceil(totalPrice * 0.05).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">Total</span>
                    <span className="text-2xl font-bold text-primary">
                      ₹{parseInt(finalAmount.toFixed(2)).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Prices include all fees
                  </p>
                </div>
                {/* CTA Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  size="sm"
                  className="w-full bg-[#FE5300] hover:bg-[#FE5300]/90 text-primary-foreground font-semibold py-6 text-xl rounded-lg transition-all duration-200 hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {/* <Check className="w-5 h-5" /> */}
                      Pay ₹{parseInt(finalAmount.toFixed(2)).toLocaleString()}
                    </span>
                  )}
                </Button>
                {/* Coupon */}
                {offers?.length > 0 && (
                  <div className="pt-4 border-t-2 space-y-4">
                    <div>
                      <p className="text-xl font-semibold ">Coupons & Offers</p>
                    </div>
                    <div>
                      {offers?.map(
                        (offer: {
                          _id: string;
                          code: string;
                          description: string;
                          value: number;
                          type: string;
                        }) => {
                          const isApplied = appliedCouponId === offer._id;

                          return (
                            <div
                              key={offer._id}
                              className={`flex justify-between gap-5 border-2 rounded-lg p-4 ${
                                isApplied
                                  ? "border-green-500 bg-green-50"
                                  : "border-[#FE5300]"
                              }`}
                            >
                              <div>
                                <p className="font-semibold">{offer.code}</p>
                                <p className="text-muted-foreground text-sm">
                                  {offer.description}
                                </p>
                              </div>

                              <div className="text-right">
                                <p className="text-muted-foreground">
                                  ₹{offer.value}
                                </p>

                                {isApplied ? (
                                  <p
                                    onClick={handleRemoveCoupon}
                                    className="text-red-600 cursor-pointer font-semibold"
                                  >
                                    Remove
                                  </p>
                                ) : (
                                  <p
                                    onClick={() =>
                                      handleCoupanValidation({
                                        id: offer._id,
                                        amount: booking.totalPrice,
                                        itemId: pkgId,
                                        itemType: "CUSTOM_PACKAGE",
                                      })
                                    }
                                    className="text-green-600 cursor-pointer font-semibold"
                                  >
                                    Apply
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                )}
                {/* Trust Indicators */}
                <div className="space-y-2 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="w-4 h-4 text-primary" />
                    <span>Secure payment powered by PayU</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Your data is protected</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
      </form>
    </section>
  );
}
