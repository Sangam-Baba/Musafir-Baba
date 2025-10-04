"use client";
import React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  const { data, isLoading, isError } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => getBooking(id, accessToken as string),
    enabled: !!accessToken,
  });

  const bookings = data?.data;
  return (
    <div className="flex items-center justify-center w-full px-4 md:px-8 lg:px-20 py-16">
      <Card className="w-2xl border border-gray-300 ">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            Membership Booking
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Loading...</p>}
          {isError && <p>Error</p>}
          {data && (
            <div className="p-6 ">
              <h1 className="text-2xl">
                Membership: {bookings.membershipId.name}
              </h1>
              <p>Amout:{bookings.amount}</p>
              <p>User Name:{bookings.userId.name}</p>
              <p>User Email: {bookings.userId.email}</p>
              <p>Start Membership Date: {bookings.startDate.split("T")[0]}</p>
              <p>End Membership Date: {bookings.endDate.split("T")[0]}</p>
              <Button>Pay Now</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default BookingPage;
