"use client";
import React, { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircleArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Loader } from "@/components/custom/loader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Item {
  item: string;
}
const getBooking = async (id: string, accessToken: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/membershipbooking/${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  return res.json();
};
function BookingPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const id = useParams().id as string;
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [paymentData, setPaymentData] = useState({
    key: "",
    txnid: "",
    amount: "",
    productinfo: "",
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    surl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success-membership`,
    furl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failure-membership`,
    hash: "",
    udf1: "",
    service_provider: "",
  });
  // const [booking, setBooking] = React.useState(bookings);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => getBooking(id, accessToken as string),
    enabled: !!accessToken,
  });
  if (isLoading) return <Loader size="lg" message="Loading booking..." />;
  const bookings = data?.data;

  const gst = Math.floor(0.05 * bookings.amount);
  const finalAmount = gst + bookings.amount;

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
          amount: finalAmount.toFixed(2),
          productinfo: bookings?.membershipId?.name ?? "Membership Package",
          firstname: bookings.userId.name ?? "Guest",
          email: bookings.userId.name ?? "abhi@example.com",
          phone: "9876543210",
          udf1: bookings?._id,
          surl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success-membership`,
          furl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failure-membership`,
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
    <div className="flex flex-col md:flex-row items-center justify-center w-full px-4 md:px-8 lg:px-20 py-16 gap-4">
      <Card className="flex-1 border border-gray-300 h-full hidden md:block">
        <CardHeader>
          <CardTitle className="flex text-2xl items-center justify-center gap-2">
            Membership Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Loading...</p>}
          {isError && <p>Error</p>}
          {data && (
            <div className="p-6 ">
              <h1 className="text-xl">Name: {bookings.userId.name}</h1>
              <p className="mb-4 text-gray-600">
                Email: {bookings.userId.email}
              </p>
              <p className="mb-4">Your Membership Includes: </p>
              <ul className="list-disc list-inside space-y-2">
                {bookings.membershipId.include?.map(
                  (item: Item, idx: number) => (
                    <li key={idx} className="flex ">
                      <CircleArrowRight
                        color="#FE5300"
                        className="mr-2 w-[10%]"
                      />
                      <p className="w-[90%]">{item.item}</p>
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
      <Accordion type="single" collapsible className="w-full md:hidden">
        <AccordionItem
          value={"item-1"}
          key={1}
          className="rounded-2xl shadow-lg p-4"
        >
          <AccordionTrigger className="text-2xl text-center">
            Membership Details
          </AccordionTrigger>
          <AccordionContent className="text-justify">
            <Card className="flex-1 border border-gray-300 h-full ">
              <CardContent>
                {isLoading && <p> Loading... </p>}
                {isError && <p>Error</p>}
                {data && (
                  <div className="p-6 ">
                    <h1 className="text-xl">Name: {bookings.userId.name}</h1>
                    <p className="mb-4 text-gray-600">
                      Email: {bookings.userId.email}
                    </p>
                    <p className="mb-4">Your Membership Includes: </p>
                    <ul className="list-disc list-inside space-y-2">
                      {bookings.membershipId.include?.map(
                        (item: Item, idx: number) => (
                          <li key={idx} className="flex ">
                            <CircleArrowRight
                              color="#FE5300"
                              className="mr-2 w-[10%]"
                            />
                            <p className="w-[90%]">{item.item}</p>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Card className="h-full flex-1">
        <CardHeader>
          <CardTitle className="flex text-2xl items-center justify-center gap-2">
            Amount Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Loading...</p>}
          {isError && <p>Error</p>}
          {data && (
            <div className="p-6 space-y-2">
              <h1 className="text-xl">
                Membership: {bookings.membershipId.name}
              </h1>
              <p>Start Date: {bookings.startDate.split("T")[0]}</p>
              <p>End Date: {bookings.endDate.split("T")[0]}</p>
              <p className="">
                Amout:{" "}
                <span className="text-[#FE5300]">₹{bookings.amount}</span>
              </p>
              <p>
                @GST:<span className="text-[#FE5300]">₹{gst}</span>
              </p>
              <p>
                Final Amount:
                <span className="text-[#FE5300]">₹{finalAmount}</span>
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="bg-[#FE5300]"
            onClick={handlePayment}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : `Confirm Booking for ₹${finalAmount.toFixed(2)}`}
          </Button>
          <div className="mt-4 p-4 ">
            <form
              ref={formRef}
              action="https://secure.payu.in/_payment"
              method="post"
              className="flex flex-col"
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
              <input
                type="hidden"
                name="lastname"
                value={paymentData.lastname}
              />
              <input type="hidden" name="surl" value={paymentData.surl} />
              <input type="hidden" name="furl" value={paymentData.furl} />
              <input type="hidden" name="phone" value={paymentData.phone} />
              <input type="hidden" name="hash" value={paymentData.hash} />
              <input type="hidden" name="udf1" value={paymentData.udf1} />
            </form>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default BookingPage;
