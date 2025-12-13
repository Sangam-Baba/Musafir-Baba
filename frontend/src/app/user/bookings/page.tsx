"use client";
import React, { useMemo, useState } from "react";
import { Loader } from "@/components/custom/loader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Search, Filter, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { getStatusColor } from "@/app/admin/bookings/page";
import { formatDate } from "@/app/admin/bookings/page";
import { GroupBooking } from "@/app/admin/bookings/page";
import { CustomizedBooking } from "@/app/admin/bookings/page";
import GroupBookingDetails from "@/components/User/GroupBookingDetails";
import CustomizedBookingDetails from "@/components/User/CustomizedBookingDetails";

const getMyBookings = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/booking`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch bookings");
  }

  return res.json();
};
const getMyCustomizedBookings = async (token: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourbooking/my`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) {
    throw new Error("Failed to fetch bookings");
  }

  return res.json();
};

function page() {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [openGroupModal, setOpenGroupModal] = useState(false);
  const [openCustomizedModal, setOpenCustomizedModal] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  const {
    data: groupData,
    isLoading: isGroupLoading,
    isError: isGroupError,
    error: groupError,
  } = useQuery({
    queryKey: ["group-bookings"],
    queryFn: () => getMyBookings(accessToken),
  });
  console.log("groupBooking", groupData);

  const {
    data: customizedData,
    isLoading: isCustomizedLoading,
    isError: isCustomizedError,
    error: customizedError,
  } = useQuery({
    queryKey: ["customized-bookings"],
    queryFn: () => getMyCustomizedBookings(accessToken),
  });
  console.log("customizedBooking", customizedData);

  const groupBookings = groupData?.data ?? [];
  const customizedBookings = customizedData?.data ?? [];

  const mappedGroup = groupBookings.map((b: GroupBooking) => ({
    ...b,
    date: b.batchId?.startDate ?? b.createdAt ?? b.bookingDate,
    type: "group" as const,
  }));

  const mappedCustom = customizedBookings.map((b: CustomizedBooking) => ({
    ...b,
    date: b.date ?? b.createdAt ?? b.bookingDate,
    type: "customized" as const,
    user: {
      _id: b.userId?._id,
      name: b.userId?.name,
      email: b.userId?.name,
    },
  }));

  const bookings = useMemo(
    () => [...mappedGroup, ...mappedCustom],
    [mappedGroup, mappedCustom]
  );
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Bookings
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage and track all tour bookings
          </p>
        </div>
      </div>

      <Card className="mb-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Bookings List</CardTitle>
          <CardDescription>View and manage all bookings</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex gap-2 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Search by name, email, or package..."
                className="pl-10 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Button variant="outline" className="gap-2 bg-transparent">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>

          {isGroupLoading || isCustomizedLoading ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" message="Loading bookings..." />
            </div>
          ) : isGroupError || isCustomizedError ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400">
                Error: {String(groupError?.message ?? customizedError?.message)}
              </p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">
                No bookings found
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">
                      S/N
                    </TableHead>

                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">
                      Package
                    </TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">
                      Status
                    </TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">
                      Payment
                    </TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">
                      Trip Status
                    </TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">
                      Travel Date
                    </TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">
                      Booking Date
                    </TableHead>
                    <TableHead className="text-slate-700 dark:text-slate-300 font-semibold">
                      Booking Type
                    </TableHead>
                    <TableHead className="text-right text-slate-700 dark:text-slate-300 font-semibold">
                      Amount
                    </TableHead>
                    <TableHead className="text-right text-slate-700 dark:text-slate-300 font-semibold">
                      Details
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {bookings.map((booking, index) => (
                    <TableRow
                      key={booking._id}
                      className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <TableCell className="text-slate-700 dark:text-slate-300 font-medium">
                        {index + 1}
                      </TableCell>

                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {booking.packageId?.title ?? "-"}
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={`${getStatusColor(
                            booking.bookingStatus
                          )} border-0`}
                        >
                          {booking.bookingStatus}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={`${getStatusColor(
                            booking.paymentInfo?.status
                          )} border-0`}
                        >
                          {booking.paymentInfo?.status}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          className={`${getStatusColor(
                            (booking as GroupBooking).batchId?.status
                          )} border-0`}
                        >
                          {(booking as GroupBooking).batchId?.status ?? "-"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {formatDate(booking.date)}
                      </TableCell>

                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {formatDate(booking.createdAt ?? booking.bookingDate)}
                      </TableCell>

                      <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
                        <span className="capitalize">{booking.type}</span>
                      </TableCell>

                      <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
                        Rs.{Number(booking.totalPrice ?? 0).toFixed(2)}
                      </TableCell>

                      <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
                        <ExternalLink
                          onClick={() => {
                            if (booking.type === "group")
                              setOpenGroupModal(true);
                            else setOpenCustomizedModal(true);
                            setSelectedId(booking._id);
                          }}
                          color="#3333f3ff"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {openGroupModal && (
        <div className="fixed inset-0 bg-black/50 z-50 mx-auto flex items-center justify-center">
          <GroupBookingDetails
            group={
              groupBookings.filter(
                (item: GroupBooking) => item._id == selectedId
              )[0]
            }
            onClose={() => setOpenGroupModal(false)}
          />
        </div>
      )}
      {openCustomizedModal && (
        <div className="fixed inset-0 bg-black/50 z-50 mx-auto flex items-center justify-center">
          <CustomizedBookingDetails
            customized={
              customizedBookings.filter(
                (item: CustomizedBooking) => item._id == selectedId
              )[0]
            }
            onClose={() => setOpenCustomizedModal(false)}
          />
        </div>
      )}
    </main>
  );
}

export default page;
