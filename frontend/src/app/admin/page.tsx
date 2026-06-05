"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
// import { useAuthStore } from "@/store/useAuthStore";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
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
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions
  ) as string[];
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
  if (!permissions.includes("dashboard"))
    return <div>You are not authorized for Dashboard</div>;

  return (
    <main className="min-h-screen  px-6 lg:px-12 py-10 max-w-7xl mx-auto ">
      {/* Header */}
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-bold text-slate-800 dark:text-white tracking-normal">
            Admin Dashboard
          </h1>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
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
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-none hover:shadow-sm hover:border-slate-200 transition-all duration-300 group/card"
            >
              <CardContent className="p-4">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 capitalize">
                  {card.label}
                </p>
                <p className={`text-[18px] font-bold mt-1 ${card.color} group-hover/card:translate-x-[1px] transition-transform duration-300`}>
                  {card.value ?? "--"}
                </p>
                <div className="flex items-center gap-3">
                  <Link href={card.link} className="group/link">
                    <p className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-400 hover:text-[#FE5300] lowercase font-mono mt-2 transition-colors duration-300">
                      view details
                      <ExternalLink size={12} className="opacity-40 group-hover/link:opacity-100 group-hover/link:scale-110 transition-all duration-300" />
                    </p>
                  </Link>
                  {card.link2 && (
                    <Link href={card.link2} className="group/link">
                      <p className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-400 hover:text-[#FE5300] lowercase font-mono mt-2 transition-colors duration-300">
                        view more
                        <ExternalLink size={12} className="opacity-40 group-hover/link:opacity-100 group-hover/link:scale-110 transition-all duration-300" />
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
            <h2 className="text-[18px] font-bold text-slate-800 dark:text-white tracking-normal">
              Visualize Data
            </h2>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              View insights and trends for bookings and visa enquiries.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Start
              </label>
              <Input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="h-8 bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-[#FE5300] text-[13px] font-semibold text-slate-700 shadow-none w-auto"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                End
              </label>
              <Input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="h-8 bg-slate-50 border-none ring-0 focus-visible:ring-1 focus-visible:ring-[#FE5300] text-[13px] font-semibold text-slate-700 shadow-none w-auto"
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
            <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-none hover:shadow-sm hover:border-slate-200 transition-all duration-300">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-5 gap-3">
                <div>
                  <h3 className="text-[13px] font-semibold text-slate-700 dark:text-white tracking-tight">
                    Bookings Trend
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
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
            <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-none hover:shadow-sm hover:border-slate-200 transition-all duration-300">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-5 gap-3">
                <div>
                  <h3 className="text-[13px] font-semibold text-slate-700 dark:text-white tracking-tight">
                    Visa vs Booking Enquiries
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    Compare enquiry types by month.
                  </p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={dataForBarChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }} iconType="circle" />
                  <Bar
                    dataKey="bookings"
                    fill="#FE5300"
                    name="Bookings"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
                  />
                  <Bar
                    dataKey="visa"
                    fill="#6366f1"
                    name="Visa Enquiries"
                    radius={[4, 4, 0, 0]}
                    barSize={16}
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
              <h2 className="text-[18px] font-bold text-slate-800 dark:text-white tracking-normal">
                Latest Activity
              </h2>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Stay updated with recent enquiries, bookings, and posts.
              </p>
            </div>
          </div>

          {/* Activity Card */}
          <Card className="border border-slate-100 dark:border-slate-800 shadow-none rounded-xl">
            <CardContent className="p-5 space-y-4">
              {/* Enquiry */}
              <div className="flex items-start gap-4 pb-4 border-b border-slate-50 dark:border-slate-800 group hover:bg-slate-50/50 transition-colors duration-300 rounded-lg p-2 -mx-2">
                <div className="flex-shrink-0 w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center">
                  <i className="ri-question-answer-line text-blue-500 dark:text-blue-400 text-sm"></i>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-100 tracking-tight group-hover:translate-x-[1px] transition-transform duration-300">
                    New Enquiry
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {latestActivity?.enquiry?.name}
                    </span>{" "}
                    <span className="lowercase font-mono text-[10px] text-slate-400">({latestActivity?.enquiry?.email})</span>
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 italic border-l-2 border-slate-200 pl-2">
                    “{latestActivity?.enquiry?.message}”
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                    {latestActivity?.enquiry?.createdAt?.split("T")[0]}
                  </p>
                </div>
              </div>

              {/* Booking */}
              <div className="flex items-start gap-4 pb-4 border-b border-slate-50 dark:border-slate-800 group hover:bg-slate-50/50 transition-colors duration-300 rounded-lg p-2 -mx-2">
                <div className="flex-shrink-0 w-8 h-8 rounded bg-green-50 dark:bg-green-900/40 flex items-center justify-center">
                  <i className="ri-calendar-check-line text-green-500 dark:text-green-400 text-sm"></i>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-100 tracking-tight group-hover:translate-x-[1px] transition-transform duration-300">
                    New Booking
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {latestActivity?.booking?.user?.name}
                    </span>{" "}
                    booked{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {latestActivity?.booking?.packageId?.title}
                    </span>
                  </p>
                  <p
                    className={`inline-block mt-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                      latestActivity?.booking?.bookingStatus === "confirmed"
                        ? "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-amber-50 text-amber-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}
                  >
                    {latestActivity?.booking?.bookingStatus}
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                    {latestActivity?.booking?.createdAt?.split("T")[0]}
                  </p>
                </div>
              </div>

              {/* News */}
              <div className="flex items-start gap-4 pb-4 border-b border-slate-50 dark:border-slate-800 group hover:bg-slate-50/50 transition-colors duration-300 rounded-lg p-2 -mx-2">
                <div className="flex-shrink-0 w-8 h-8 rounded bg-red-50 dark:bg-red-900/40 flex items-center justify-center">
                  <i className="ri-newspaper-line text-red-500 dark:text-red-400 text-sm"></i>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-100 tracking-tight group-hover:translate-x-[1px] transition-transform duration-300">
                    New News Post
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {latestActivity?.news?.title}
                    </span>
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
                    {latestActivity?.news?.createdAt?.split("T")[0]}
                  </p>
                </div>
              </div>

              {/* Blog */}
              <div className="flex items-start gap-4 group hover:bg-slate-50/50 transition-colors duration-300 rounded-lg p-2 -mx-2">
                <div className="flex-shrink-0 w-8 h-8 rounded bg-pink-50 dark:bg-pink-900/40 flex items-center justify-center">
                  <i className="ri-article-line text-pink-500 dark:text-pink-400 text-sm"></i>
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-slate-700 dark:text-slate-100 tracking-tight group-hover:translate-x-[1px] transition-transform duration-300">
                    New Blog Published
                  </p>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {latestActivity?.blog?.title}
                    </span>
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">
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
