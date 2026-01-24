"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader } from "@/components/custom/loader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Calendar, Check, MapPin, Users, Zap } from "lucide-react";
import { useCustomizedBookingStore } from "@/store/useCutomizedBookingStore";
import { useParams } from "next/navigation";
import { secureFetch } from "@/lib/secureFetch";

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
  useEffect(() => {
    if (booking) {
      setFinalAmount(booking.totalPrice);
    }
  }, [booking]);

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
  return (
    <section className="min-h-screen bg-gradient-to-br from-background via-background to-secondary py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto mb-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3 tracking-tight">
            Complete Your Booking
          </h1>
          <p className="text-lg text-muted-foreground">
            Review your travel details and secure your adventure
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Package Details Card - Featured on left */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300 p-0">
            <div className="relative h-80 md:h-96 overflow-hidden bg-muted">
              <Image
                src={pkg?.coverImage?.url ?? ""}
                alt={pkg?.coverImage?.alt ?? ""}
                fill
                className="object-cover hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-4 right-4 bg-accent text-accent-foreground px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Premium Package
              </div>
            </div>

            <CardContent className="p-8">
              <h2 className="text-3xl font-bold text-foreground mb-6">
                {pkg?.title}
              </h2>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 pb-4 border-b border-border">
                  <Users className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Number of Travelers
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {booking?.noOfPeople}{" "}
                      {booking?.noOfPeople === 1 ? "Person" : "People"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 pb-4 border-b border-border">
                  <Calendar className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Travel Date
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {booking?.date ?? "To be confirmed"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Plan Type
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      {booking?.plan ?? "Customized Package"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
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
                    <span className="text-muted-foreground">Package Price</span>
                    <span className="font-semibold text-foreground">
                      ₹{formData.totalPrice}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Travelers</span>
                    <span className="font-semibold text-foreground">
                      {booking?.noOfPeople}x
                    </span>
                  </div>
                </div>

                <div className="bg-primary/10 rounded-lg p-4 mb-6">
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Amount
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    ₹{finalAmount}
                  </p>
                </div>

                <div className="space-y-3 pb-6 border-b border-border/50">
                  <p className="text-sm font-semibold text-foreground">
                    Traveler Info
                  </p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium text-foreground">
                        {user?.name ?? "Guest"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium text-foreground text-sm break-all">
                        {user?.email ?? "abhi@example.com"}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-[#FE5300] hover:bg-[#FE5300]/90 text-primary-foreground font-semibold py-6 text-lg rounded-lg transition-all duration-200 hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Check className="w-5 h-5" />
                      Confirm & Pay
                    </span>
                  )}
                </Button>
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
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground text-center">
                    ✓ Secure payment powered by PayU
                  </p>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Your booking is protected
                  </p>
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
