"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader } from "@/components/custom/loader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Check,
  Lock,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import Image from "next/image";

type BookingApiResponse = {
  data: {
    _id: string;
    totalPrice: number;

    travellers: {
      quad: number;
      triple: number;
      double: number;
      child: number;
    };
    packageId: {
      _id: string;
      title: string;
      coverImage: {
        url: string;
      };
    };
    user: {
      _id: string;
      name: string;
      email: string;
    };
    batchId: {
      _id: string;
      startDate: string;
      endDate: string;
    };
  };
};

async function getBooking(bookingId: string, accessToken: string | null) {
  if (!bookingId) throw new Error("Missing booking id");

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/booking/${bookingId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: accessToken ? `Bearer ${accessToken}` : "",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch booking (${res.status})`);
  }

  return (await res.json()) as BookingApiResponse;
}

export default function CheckoutButton() {
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
    surl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
    furl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failure`,
    hash: "",
    udf1: "",
    service_provider: "",
  });
  const accessToken = useAuthStore((s) => s.accessToken ?? null);
  const { id } = useParams(); // ✅ directly extract id
  const bookingId = String(id ?? ""); // safe conversion

  const {
    data: bookingResp,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => getBooking(bookingId, accessToken),
    enabled: Boolean(bookingId && accessToken),
    staleTime: 1000 * 60,
  });

  if (isLoading) return <Loader size="lg" message="Loading booking..." />;

  if (isError) {
    const msg = (error as Error)?.message ?? "Failed to load booking";
    toast.error(msg);
    return <h1 className="text-red-600">{msg}</h1>;
  }

  const booking = bookingResp?.data;
  const price = booking?.totalPrice ?? 0;
  const amountInPaise = Math.round(price * 100);

  const handlePayment = async () => {
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
          amount: price.toFixed(2),
          productinfo: booking?.packageId?.title ?? "Travel Package",
          firstname: booking?.user?.name ?? "Guest",
          email: booking?.user?.email ?? "abhi@example.com",
          phone: "9876543210",
          udf1: booking?._id,
          surl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success`,
          furl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failure`,
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-muted/30 to-background py-8 md:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              Booking Details
            </p>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Complete Your Booking
          </h1>
          <p className="text-muted-foreground mt-2">
            Review your travel details and secure your reservation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Package Details Card */}
            <Card className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow pt-0">
              <div className="h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                {booking?.packageId?.coverImage?.url ? (
                  <Image
                    src={booking.packageId.coverImage.url || "/placeholder.svg"}
                    alt={booking.packageId.title}
                    width={500}
                    height={500}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <MapPin className="w-16 h-16 text-muted-foreground/30" />
                )}
              </div>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {booking?.packageId?.title ?? "Travel Package"}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Travel Dates
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-1">
                        {booking?.batchId?.startDate.split("T")[0]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        to {booking?.batchId?.endDate.split("T")[0]}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Travellers
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-1">
                        {booking?.travellers?.quad} Quad +{" "}
                        {booking?.travellers?.triple} Triple +{" "}
                        {booking?.travellers?.double} Double +{" "}
                        {booking?.travellers?.child} Child
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking?.travellers?.quad
                          ? `${booking.travellers.quad}Q `
                          : ""}
                        {booking?.travellers?.triple
                          ? `${booking.travellers.triple}T `
                          : ""}
                        {booking?.travellers?.double
                          ? `${booking.travellers.double}D `
                          : ""}
                        {booking?.travellers?.child
                          ? `${booking.travellers.child}C`
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Traveller Information Card */}
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Traveller Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Name</span>
                    <span className="font-semibold text-foreground">
                      {booking?.user?.name ?? "Guest"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="font-semibold text-foreground">
                      {booking?.user?.email ?? "abhi@example.com"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            {/* Summary Card */}
            <Card className="border-border/50 shadow-sm sticky top-6 lg:top-8">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  Order Summary
                </h3>

                {/* Breakdown */}
                <div className="space-y-3 mb-6 pb-6 border-b border-border/50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {booking?.packageId?.title ?? "Travel Package"}
                    </span>
                    <span className="font-semibold text-foreground">
                      ₹{price.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">Total</span>
                    <span className="text-2xl font-bold text-primary">
                      ₹{(amountInPaise / 100).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Prices include all fees
                  </p>
                </div>

                {/* CTA Button */}
                <Button
                  onClick={handlePayment}
                  disabled={loading}
                  size="lg"
                  className="w-full mb-4 bg-[#FE5300] hover:bg-[#FE5300]/90 text-primary-foreground font-semibold py-6"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    `Pay ₹${(amountInPaise / 100).toFixed(2)}`
                  )}
                </Button>

                {/* Trust Indicators */}
                <div className="space-y-2 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="w-4 h-4 text-primary" />
                    <span>Secure SSL encrypted payment</span>
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

      {/* Hidden Payment Form */}
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
    </main>
  );
}
