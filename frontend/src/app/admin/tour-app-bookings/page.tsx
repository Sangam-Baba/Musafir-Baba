"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "@/components/custom/loader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Holiday-package bookings made from the MBGo rider app (separate from the
// website's group bookings in Admin -> Bookings).

interface TourAppBooking {
  _id: string;
  rider?: { fullName?: string; mobileNumber?: string } | null;
  packageTitle: string;
  destinationName?: string;
  startDate: string;
  endDate?: string;
  travellers: { quad: number; triple: number; double: number; child: number };
  totalAmount: number;
  payNowAmount: number;
  balanceAmount: number;
  balanceDueDate?: string;
  paymentOption: "FULL" | "ADVANCE";
  paymentInfo?: { status?: string; txnid?: string; mihpayid?: string };
  bookingStatus: "PaymentPending" | "Confirmed" | "Cancelled";
  createdAt: string;
}

const STATUS_OPTIONS = ["All", "Confirmed", "PaymentPending", "Cancelled"] as const;

const inr = (n?: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-");

const statusColor = (s: string) =>
  s === "Confirmed" ? "bg-emerald-100 text-emerald-800" : s === "Cancelled" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800";

export default function TourAppBookingsPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("Confirmed");

  const { data, isLoading, isError, error } = useQuery<{ success: boolean; data: TourAppBooking[] }>({
    queryKey: ["adminTourAppBookings", status],
    queryFn: async () => {
      const query = status === "All" ? "" : `?status=${status}`;
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/tour-app-bookings${query}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to load app holiday bookings");
      return res.json();
    },
    enabled: !!accessToken,
  });

  const bookings = data?.data || [];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>App Holiday Bookings</CardTitle>
            <CardDescription>Holiday packages booked from the MBGo app</CardDescription>
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as (typeof STATUS_OPTIONS)[number])}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "PaymentPending" ? "Payment pending" : s}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" message="Loading bookings..." />
            </div>
          ) : isError ? (
            <p className="py-12 text-center text-red-600">Error: {String((error as Error)?.message)}</p>
          ) : bookings.length === 0 ? (
            <p className="py-12 text-center text-slate-500">No bookings for this filter</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking</TableHead>
                    <TableHead>Rider</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Travel dates</TableHead>
                    <TableHead>Travellers</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid / Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((b) => {
                    const t = b.travellers || { quad: 0, triple: 0, double: 0, child: 0 };
                    const isPaid = b.paymentInfo?.status === "Paid";
                    return (
                      <TableRow key={b._id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="font-medium">MBGT-{b._id.slice(-6).toUpperCase()}</div>
                          <div className="text-xs text-slate-500">{fmt(b.createdAt)}</div>
                        </TableCell>
                        <TableCell>
                          <div>{b.rider?.fullName || "-"}</div>
                          <div className="text-xs text-slate-500">{b.rider?.mobileNumber || ""}</div>
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <div className="font-medium">{b.packageTitle}</div>
                          <div className="text-xs text-slate-500">{b.destinationName || ""}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {fmt(b.startDate)} – {fmt(b.endDate)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {[t.quad && `${t.quad} quad`, t.triple && `${t.triple} triple`, t.double && `${t.double} double`, t.child && `${t.child} child`]
                            .filter(Boolean)
                            .join(", ")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{inr(b.totalAmount)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          <div>{isPaid ? inr(b.payNowAmount) : "₹0"} paid</div>
                          {b.paymentOption === "ADVANCE" && (
                            <div className="text-xs text-amber-700">
                              {inr(b.balanceAmount)} due {fmt(b.balanceDueDate)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColor(b.bookingStatus)}>
                            {b.bookingStatus === "PaymentPending" ? "Payment pending" : b.bookingStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
