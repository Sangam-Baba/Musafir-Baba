"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader } from "@/components/custom/loader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type BookingApiResponse = {
  data: {
    _id: string;
    totalPrice: number;
    travelDate: string;
    travellers: {
      quad: number;
      triple: number;
      double: number;
      child: number;
    };
    packageId: {
      _id: string;
      title: string;
    };
    user: {
      _id: string;
      name: string;
      email: string;
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
    <section className="max-w-5xl mx-auto px-4 md:px-8 lg:px-20 py-16">
      <Card className="p-4 shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Preview Booking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-2 font-bold text-lg">
            Name:{" "}
            <span className="font-normal">
              {booking?.user?.name ?? "Guest"}
            </span>
          </p>
          <p className="mb-2 font-bold text-lg">
            Email:{" "}
            <span className="font-normal">
              {booking?.user?.email ?? "abhi@example.com"}
            </span>
          </p>
          <p className="mb-2 font-bold text-lg">
            Package Name:{" "}
            <span className="font-normal">
              {booking?.packageId?.title ?? "Travel Package"}
            </span>
          </p>
          <p className="mb-2 font-bold text-lg">
            Travellers:{" "}
            <span className="font-normal">
              {booking?.travellers?.quad} Quad + {booking?.travellers?.triple}{" "}
              Triple + {booking?.travellers?.double} Double +{" "}
              {booking?.travellers?.child} Child
            </span>
          </p>
          <p className="mb-2 font-bold text-lg">
            Travel Date:{" "}
            <span className="font-normal">
              {booking?.travelDate.split("T")[0] ?? "Unknown"}
            </span>
          </p>

          <p className="mb-2 font-bold text-lg">
            Total Amount:{" "}
            <span className="font-normal">
              ₹{(amountInPaise / 100).toFixed(2)} to complete your booking
            </span>
          </p>
        </CardContent>
        <Button
          className="bg-[#FE5300]"
          onClick={handlePayment}
          disabled={loading}
        >
          {loading
            ? "Processing..."
            : `Confirm Booking for ₹${(amountInPaise / 100).toFixed(2)}`}
        </Button>
        <div className="mt-4 p-4 ">
          <form
            action="https://secure.payu.in/_payment"
            method="post"
            className="flex flex-col"
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
            <input
              type="hidden"
              name="firstname"
              value={paymentData.firstname}
            />
            <input type="hidden" name="lastname" value={paymentData.lastname} />
            <input type="hidden" name="surl" value={paymentData.surl} />
            <input type="hidden" name="furl" value={paymentData.furl} />
            <input type="hidden" name="phone" value={paymentData.phone} />
            <input type="hidden" name="hash" value={paymentData.hash} />
            <input type="hidden" name="udf1" value={paymentData.udf1} />
          </form>
        </div>
      </Card>
    </section>
  );
}
