"use client";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import MembershipBookingList from "@/components/User/MembershipBookingList";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  IndianRupee,
} from "lucide-react";
import MembershipCard from "@/components/custom/MembershipCard";

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

  const { data: bookings = [] } = useQuery({
    queryKey: ["membership-bookings"],
    queryFn: () => myBookings(accessToken),
  });

  const activeMembership = bookings?.find(
    (item: MembershipBookingsInterface) => item.membershipStatus === "Active"
  );

  const daysRemaining = activeMembership
    ? Math.ceil(
        (new Date(activeMembership.endDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-balance">
            Membership Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            {"Manage your membership and view transaction history"}
          </p>
        </div>

        {/* Active Membership Card */}
        {activeMembership ? (
          <Card className="border-2 overflow-hidden pt-0">
            <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
              <div className="flex items-center gap-3 mb-2">
                <Crown className="h-8 w-8" />
                <h2 className="text-2xl font-bold">Active Membership</h2>
              </div>
              <p className="text-primary-foreground/90">
                {"You are currently enjoying premium benefits"}
              </p>
            </div>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Crown className="h-4 w-4" />
                    <span>Plan Details</span>
                  </div>
                  <p className="text-xl font-bold">
                    {activeMembership.membershipId.name}
                  </p>
                  <Badge variant="secondary" className="font-medium">
                    {activeMembership.membershipId.duration}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Start Date</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {new Date(activeMembership.startDate).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>End Date</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {new Date(activeMembership.endDate).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle2 className="h-4 w-4 text-chart-3" />
                    <span className="text-sm text-chart-3 font-medium">
                      {daysRemaining} days remaining
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Crown className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                No Active Membership
              </h3>
              <p className="text-muted-foreground max-w-md">
                {
                  "Start your membership journey today and unlock premium benefits"
                }
              </p>
            </CardContent>
          </Card>
        )}

        {/* Transaction History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Transaction History</h2>
              <p className="text-muted-foreground">
                {"View all your membership bookings and transactions"}
              </p>
            </div>
          </div>

          {bookings?.length > 0 ? (
            <MembershipBookingList
              bookings={bookings.map((item: MembershipBookingsInterface) => ({
                _id: item._id,
                name: item.membershipId.name,
                duration: item.membershipId.duration,
                amount: item.amount,
                startDate: item.startDate,
                endDate: item.endDate,
                membershipStatus: item.membershipStatus,
                transactionStatus: item.paymentInfo.status,
                transactionId: item.paymentInfo.orderId,
              }))}
            />
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transactions found</p>
              </CardContent>
            </Card>
          )}
        </div>
        <div>
          <MembershipCard />
        </div>
      </div>
    </div>
  );
}

export default MembershipPage;
