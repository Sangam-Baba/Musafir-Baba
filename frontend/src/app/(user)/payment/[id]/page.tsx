"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { getGroupPackageById } from "../../holidays/[categorySlug]/[destination]/[packageSlug]/[id]/page";
import { useGroupBookingStore } from "@/store/useBookingStore";
import { validateCoupan } from "@/app/(user)/holidays/customised-tour-packages/[destination]/[pkgSlug]/[id]/page";
import { getAllOffers } from "@/app/(user)/holidays/customised-tour-packages/[destination]/[pkgSlug]/[id]/page";
import { getUser } from "@/app/(user)/holidays/customised-tour-packages/[destination]/[pkgSlug]/[id]/page";
import { Batch } from "@/app/sitemap";

interface BookingApiResponse {
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
}

interface GroupBookingInterface {
  packageId: string;
  batchId: string;
  travellers: {
    quad: number;
    triple: number;
    double: number;
    child: number;
  };
  totalPrice: number;
  coupanId?: string;
  addOns?: { title: string; price: number; noOfPeople: number }[];
}
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

async function createGroupBooking(
  values: GroupBookingInterface,
  accessToken: string
) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/booking`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error("Booking failed");
  return res.json();
}
export default function CheckoutPage() {
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
  const accessToken = useAuthStore((s) => s.accessToken) as string;
  const { id } = useParams(); // ✅ directly extract id
  const pkgId = String(id ?? ""); // safe conversion
  const booking = useGroupBookingStore((s) => s.formData);
  const [appliedCouponId, setAppliedCouponId] = useState<string | null>(null);
  const [baseAmount, setBaseAmount] = useState(0);
  const [addOnAmount, setAddOnAmount] = useState(0);
  const [finalAmount, setFinalAmount] = useState(0);
  const [batch, setBatch] = useState<Batch | null>(null);

  //Group Package
  const {
    data: pkg,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["group-pkg"],
    queryFn: () => getGroupPackageById(pkgId),
    enabled: Boolean(pkgId && accessToken),
    staleTime: 1000 * 60 * 2,
  });
  const Package = pkg?.data;

  //User
  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: () => getUser(accessToken),
    enabled: !!accessToken,
    staleTime: 1000 * 60,
  });

  //Offers
  const { data: offers } = useQuery({
    queryKey: ["offers"],
    queryFn: () => getAllOffers(accessToken),
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (booking && Package) {
      const selectedBatch = Package.batch.find(
        (batch: Batch) => batch._id === booking.batchId
      );
      setBatch(selectedBatch);
      const base =
        booking.travellers.quad * selectedBatch.quad +
        booking.travellers.triple * selectedBatch.triple +
        booking.travellers.double * selectedBatch.double +
        booking.travellers.child * selectedBatch.child;

      const addOnsTotal =
        booking.addOns?.reduce(
          (total, addOn) => total + addOn.price * addOn.noOfPeople,
          0
        ) ?? 0;
      setBaseAmount(base);
      setAddOnAmount(addOnsTotal);
      setFinalAmount(base + addOnsTotal);
    }
  }, [booking, Package]);

  const mutation = useMutation({
    mutationFn: (formData: GroupBookingInterface) =>
      createGroupBooking(formData, accessToken),
    onSuccess: (res) => {
      handlePayment(res?.data);
    },
    onError: (error) => {
      toast.error((error as Error)?.message ?? "Failed to book package");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...booking,
      totalPrice: finalAmount,
      coupanId: appliedCouponId ?? undefined,
      addOns: booking?.addOns ?? undefined,
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
          amount: bookingData?.totalPrice?.toFixed(2),
          productinfo: bookingData?.packageId?.title ?? "Travel Package",
          firstname: bookingData?.user?.name ?? "Guest",
          email: bookingData?.user?.email ?? "abhi@example.com",
          phone: "9876543210",
          udf1: bookingData?._id,
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

  const handleCoupanValidation = async ({
    id,
    amount,
    itemId,
    itemType,
  }: {
    id: string;
    amount: number;
    itemId: string;
    itemType: "GROUP_PACKAGE";
  }) => {
    try {
      const res = await validateCoupan(accessToken, {
        id,
        amount,
        itemId,
        itemType,
      });

      setAppliedCouponId(id);
      setFinalAmount(res.finalAmount);
      toast.success("Coupon applied successfully");
    } catch (err: any) {
      toast.error(err?.message || "Invalid coupon");
    }
  };

  const handleRemoveCoupon = () => {
    setFinalAmount(baseAmount + addOnAmount);
    setAppliedCouponId(null);
    toast.success("Coupon removed");
  };

  if (isLoading) return <Loader size="lg" message="Loading packages..." />;

  if (isError) {
    const msg = (error as Error)?.message ?? "Failed to load pkgs";
    toast.error(msg);
    return <h1 className="text-red-600">{msg}</h1>;
  }
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
                {Package?.coverImage?.url ? (
                  <Image
                    src={Package.coverImage.url || "/placeholder.svg"}
                    alt={Package.title}
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
                  {Package.title ?? "Travel Package"}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Travel Dates
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-1">
                        {batch?.startDate.split("T")[0]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        to {batch?.endDate.split("T")[0]}
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
                      {user?.name ?? "Guest"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm text-muted-foreground">Email</span>
                    <span className="font-semibold text-foreground">
                      {user?.email ?? "guest@gmail.com"}
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
                      {Package.title ?? "Travel Package"}
                    </span>
                    <span className="font-semibold text-foreground">
                      ₹{baseAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">Total</span>
                    <span className="text-2xl font-bold text-primary">
                      ₹{finalAmount.toFixed(2)}
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
                  size="lg"
                  className="w-full mb-4 bg-[#FE5300] hover:bg-[#FE5300]/90 text-primary-foreground font-semibold py-6"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    `Pay ₹${finalAmount.toFixed(2)}`
                  )}
                </Button>

                <div className="pt-4 border-t-2 space-y-4">
                  <div>
                    <p className="text-xl font-semibold ">Coupons & Offers</p>
                  </div>
                  <div className="space-y-2">
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
                                      amount: finalAmount,
                                      itemId: pkgId,
                                      itemType: "GROUP_PACKAGE",
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
                      }
                    )}
                  </div>
                </div>

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
