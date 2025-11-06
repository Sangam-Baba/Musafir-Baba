"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent } from "@/components/ui/card";
import { Loader } from "@/components/custom/loader";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import SimpleLineChart from "@/components/charts/SimpleLineChart";
import { Input } from "@/components/ui/input";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Tooltip,
  YAxis,
  XAxis,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { is } from "zod/v4/locales";
import { Button } from "@/components/ui/button";

interface AllCount {
  packageCount: number;
  bookingCount: number;
  customizedPackageCount: number;
  customizedBookingCount: number;
  customizedTourPackageCount: number;
  customizedTourBookingCount: number;
  userCount: number;
  membershipBookingCount: number;
  newsCount: number;
  blogCount: number;
  contactEnquiryCount: number;
}

const getDashBoardSummary = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch dashboard summary");
  return res.json();
};
const getMonthlyBookings = async (
  accessToken: string,
  start?: string,
  end?: string
) => {
  const params = new URLSearchParams();
  if (start) params.append("start", start.toString());
  if (end) params.append("end", end.toString());
  const res = await fetch(
    `${
      process.env.NEXT_PUBLIC_BASE_URL
    }/dashboard/monthly-bookings?${params.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch dashboard summary");
  const data = await res.json();
  return data?.data;
};

const getVisaVsBooking = async (accessToken: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/visa-vs-booking`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch dashboard summary");
  return res
    .json()
    .then((data) => {
      return data?.data;
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      return [];
    });
};
function AdminDashBoard() {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const [start, setStart] = React.useState<string>("");
  const [end, setEnd] = React.useState<string>("");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashBoardSummary(accessToken),
  });

  const {
    data: bookings,
    isLoading: isBookingsLoading,
    isError: isBookingsError,
    error: bookingsError,
    refetch,
  } = useQuery({
    queryKey: ["bookings", start, end],
    queryFn: () => getMonthlyBookings(accessToken, start, end),
    enabled: !!accessToken,
  });
  const allCounts: AllCount = data?.data;

  const dataForLineChart =
    bookings?.map((booking: { month: string; count: number }) => ({
      month: new Date(booking.month).toLocaleDateString("en-US", {
        month: "short",
      }),
      bookings: booking.count,
    })) || [];

  const {
    data: visaVsBooking,
    isLoading: isVisaVsBookingLoading,
    isError: isVisaVsBookingError,
    error: visaVsBookingError,
  } = useQuery({
    queryKey: ["visaVsBooking"],
    queryFn: () => getVisaVsBooking(accessToken),
    enabled: !!accessToken,
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 px-6 lg:px-12 py-10 max-w-7xl mx-auto transition-colors duration-300">
      {/* Header */}
      <header className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Monitor and manage platform performance.
          </p>
        </div>
      </header>

      {/* Error / Loading States */}
      {isError && (
        <h1 className="text-red-600 font-medium">
          Failed to fetch dashboard summary: {error?.message}
        </h1>
      )}
      {isLoading ? (
        <Loader size="md" message="Loading Summary..." />
      ) : (
        <>
          {/* KPI Summary Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5 mb-12">
            {[
              {
                label: "Total Bookings",
                value: allCounts?.bookingCount,
                color: "text-blue-600",
                link: "/admin/bookings",
              },
              {
                label: "Total Enquiries",
                value: allCounts?.contactEnquiryCount,
                color: "text-emerald-600",
                link: "/admin/enquiries",
              },
              {
                label: "Blog / News",
                value: `${allCounts?.blogCount}/${allCounts?.newsCount}`,
                color: "text-amber-600",
                link: "/admin/blogs",
              },
              {
                label: "Verified Users",
                value: allCounts?.userCount,
                color: "text-indigo-600",
                link: "/admin/users",
              },
              {
                label: "Active Members",
                value: allCounts?.membershipBookingCount,
                color: "text-rose-600",
                link: "/admin/members",
              },
            ].map((card) => (
              <Card
                key={card.label}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
              >
                <CardContent className="pt-6">
                  <p className="text-base text-slate-500 dark:text-slate-400">
                    {card.label}
                  </p>
                  <p className={`text-3xl font-bold mt-2 ${card.color}`}>
                    {card.value ?? "--"}
                  </p>
                  <Link href={card.link}>
                    <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 mt-3">
                      View Details
                      <ExternalLink size={15} />
                    </p>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </section>

          {/* Bookings Trend (Line Chart) */}
          <section className="mb-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white">
                  Bookings Trends
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Analyze monthly booking growth.
                </p>
              </div>
              <div className="flex gap-3">
                <Input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="max-w-[180px]"
                />
                <Input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="max-w-[180px]"
                />
                <Button
                  onClick={() => refetch()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Filter
                </Button>
              </div>
            </div>
            <SimpleLineChart
              chartData={dataForLineChart}
              xData="month"
              yData="bookings"
            />
          </section>

          {/* Visa vs Bookings (Bar Chart) */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-white">
                  Visa vs Booking Enquiries
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Compare enquiry types across months.
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={visaVsBooking}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "none",
                    color: "#fff",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="bookings"
                  fill="#3b82f6"
                  name="Bookings"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="visa"
                  fill="#10b981"
                  name="Visa Enquiries"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </section>
        </>
      )}
    </main>
  );
}

export default AdminDashBoard;
