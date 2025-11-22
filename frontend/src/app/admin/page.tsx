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

const getVisaVsBooking = async (
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
    }/dashboard/visa-vs-booking?${params.toString()}`,
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

const getLatestActivity = async (accessToken: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/latest-activity`,
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
  return data?.data ?? {};
};
function AdminDashBoard() {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const permissions = useAuthStore((state) => state.permissions) as string[];
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
    queryKey: ["visaVsBooking", start, end],
    queryFn: () => getVisaVsBooking(accessToken, start, end),
    enabled: !!accessToken,
  });

  const dataForBarChart =
    visaVsBooking?.map(
      (booking: { month: string; visa: number; bookings: number }) => ({
        month: new Date(booking.month).toLocaleDateString("en-US", {
          month: "short",
        }),
        visa: booking.visa,
        bookings: booking.bookings,
      })
    ) || [];

  const {
    data: latestActivity,
    isLoading: isLatestActivityLoading,
    isError: isLatestActivityError,
    error: latestActivityError,
  } = useQuery({
    queryKey: ["latestActivity"],
    queryFn: () => getLatestActivity(accessToken),
    enabled: !!accessToken,
  });
  if (!permissions.includes("dashboard")) return <div>Access Denied</div>;

  return (
    <main className="min-h-screen  px-6 lg:px-12 py-10 max-w-7xl mx-auto ">
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
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5 mb-12">
          {[
            {
              label: "Total Bookings",
              value:
                allCounts?.bookingCount + allCounts?.customizedTourBookingCount,
              color: "text-blue-600",
              link: "/admin/bookings",
            },
            {
              label: "Total Enquiries",
              value: allCounts?.contactEnquiryCount,
              color: "text-emerald-600",
              link: "/admin/enquiry",
            },
            {
              label: "Blog / News",
              value: `${allCounts?.blogCount}/${allCounts?.newsCount}`,
              color: "text-amber-600",
              link: "/admin/blogs",
              link2: "/admin/news",
            },
            {
              label: "Verified Users",
              value: allCounts?.userCount,
              color: "text-indigo-600",
              link: "/admin/role",
            },
            {
              label: "Active Members",
              value: allCounts?.membershipBookingCount,
              color: "text-rose-600",
              link: "/admin/membership",
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
                <div className="flex items-center">
                  <Link href={card.link}>
                    <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 mt-3">
                      View Details
                      <ExternalLink size={15} />
                    </p>
                  </Link>
                  {card.link2 && (
                    <Link href={card.link2}>
                      <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 mt-3">
                        <ExternalLink size={15} />
                      </p>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
      {/* Graphs Data */}
      <div className="space-y-8">
        {/* Header and Filters */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Visualize Data
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              View insights and trends for bookings and visa enquiries.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 p-2 border rounded-md">
              <label className="text-xs font-medium text-slate-500 mb-1">
                Start
              </label>
              <Input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="border-none"
              />
            </div>

            <div className="flex items-center gap-2 p-2 border rounded-md">
              <label className="text-xs font-medium text-slate-500 mb-1">
                End
              </label>
              <Input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="border-none"
              />
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bookings Trend (Line Chart) */}
          {isBookingsError && (
            <h1 className="text-red-600 font-medium">
              Failed to fetch bookings trend: {bookingsError?.message}
            </h1>
          )}

          {isBookingsLoading ? (
            <Loader size="md" message="Loading Bookings..." />
          ) : (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition hover:shadow-md">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Bookings Trend
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Track booking growth over selected months.
                  </p>
                </div>
              </div>
              <SimpleLineChart
                chartData={dataForLineChart}
                xData="month"
                yData="bookings"
              />
            </section>
          )}
          {isVisaVsBookingError && (
            <h1 className="text-red-600 font-medium">
              Failed to fetch bookings trend: {visaVsBookingError?.message}
            </h1>
          )}
          {/* Visa vs Booking (Bar Chart) */}
          {isVisaVsBookingLoading ? (
            <Loader size="md" message="Loading Data..." />
          ) : (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition hover:shadow-md">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    Visa vs Booking Enquiries
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Compare enquiry types by month.
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={dataForBarChart}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#94a3b8"
                    allowDecimals={false}
                  />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar
                    dataKey="bookings"
                    fill="#FE5300"
                    name="Bookings"
                    radius={[6, 6, 0, 0]}
                    barSize={40}
                  />
                  <Bar
                    dataKey="visa"
                    fill="#10b981"
                    name="Visa Enquiries"
                    radius={[6, 6, 0, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}
        </div>
      </div>
      {/* Activity */}
      {isLatestActivityError && (
        <h1 className="text-red-600 font-medium">
          Failed to fetch activity: {latestActivityError?.message}
        </h1>
      )}
      {isLatestActivityLoading ? (
        <Loader size="md" message="Loading Activity..." />
      ) : (
        <div className="mt-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Latest Activity
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Stay updated with recent enquiries, bookings, and posts.
              </p>
            </div>
          </div>

          {/* Activity Card */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl">
            <CardContent className="p-6 space-y-6">
              {/* Enquiry */}
              <div className="flex items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <i className="ri-question-answer-line text-blue-600 dark:text-blue-400 text-lg"></i>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    New Enquiry
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-medium">
                      {latestActivity?.enquiry?.name}
                    </span>{" "}
                    ({latestActivity?.enquiry?.email})
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 italic">
                    “{latestActivity?.enquiry?.message}”
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {latestActivity?.enquiry?.createdAt?.split("T")[0]}
                  </p>
                </div>
              </div>

              {/* Booking */}
              <div className="flex items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <i className="ri-calendar-check-line text-green-600 dark:text-green-400 text-lg"></i>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    New Booking
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-medium">
                      {latestActivity?.booking?.user?.name}
                    </span>{" "}
                    booked{" "}
                    <span className="font-medium">
                      {latestActivity?.booking?.packageId?.title}
                    </span>
                    .
                  </p>
                  <p
                    className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      latestActivity?.booking?.bookingStatus === "confirmed"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}
                  >
                    {latestActivity?.booking?.bookingStatus}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {latestActivity?.booking?.createdAt?.split("T")[0]}
                  </p>
                </div>
              </div>

              {/* News */}
              <div className="flex items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <i className="ri-newspaper-line text-indigo-600 dark:text-indigo-400 text-lg"></i>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    New News Post
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-medium">
                      {latestActivity?.news?.title}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {latestActivity?.news?.createdAt?.split("T")[0]}
                  </p>
                </div>
              </div>

              {/* Blog */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                  <i className="ri-article-line text-purple-600 dark:text-purple-400 text-lg"></i>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    New Blog Published
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-medium">
                      {latestActivity?.blog?.title}
                    </span>
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {latestActivity?.blog?.createdAt?.split("T")[0]}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}

export default AdminDashBoard;
