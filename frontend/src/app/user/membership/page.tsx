"use client";
import MembershipCard from "@/components/custom/MembershipCard";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import MembershipBookingList from "@/components/User/MembershipBookingList";
interface MembershipBookingsInterface {
  _id: string;
  membershipId: {
    name: string;
    duration: string;
  };
  amount: number;
  startDate: string;
  endDate: string;

  membershipStatus: string;
  paymentInfo: {
    status: string;
    orderId: string;
  };
}
const myBookings = async (accessToken: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/membershipbooking/my`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch membership");
  const data = await res.json();
  return data?.data;
};
function MembershipPage() {
  const accessToken = useAuthStore((state) => state.accessToken) as string;

  const { data: bookings } = useQuery({
    queryKey: ["membership-bookings"],
    queryFn: () => myBookings(accessToken),
  });
  console.log("bookings", bookings);
  return (
    <div>
      {/* List */}
      <div className="my-10">
        <h2 className="text-xl font-semibold">Transaction History</h2>
        <MembershipBookingList
          bookings={bookings.map(
            (item: MembershipBookingsInterface, i: number) => ({
              _id: item._id,
              name: item.membershipId.name,
              duration: item.membershipId.duration,
              amount: item.amount,
              startDate: new Date(item.startDate).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
              }),
              endDate: new Date(item.endDate).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
              }),
              membershipStatus: item.membershipStatus,
              transactionStatus: item.paymentInfo.status,
              transactionId: item.paymentInfo.orderId,
            })
          )}
        />
      </div>

      <MembershipCard />
    </div>
  );
}

export default MembershipPage;
