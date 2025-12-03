"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
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
import { Search, Filter } from "lucide-react";
import Pagination from "@/components/common/Pagination";
import ManualBooking from "@/components/admin/ManualBooking";

interface BookingBase {
  _id: string;
  packageId?: {
    _id: string;
    title?: string;
  } | null;
  totalPrice: number;
  paymentMethod?: string;
  paymentInfo: {
    orderId?: string;
    paymentId?: string;
    signature?: string;
    status: string;
  };
  bookingStatus: string;
  bookingDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface GroupBooking extends BookingBase {
  batchId: {
    _id: string;
    startDate: string;
    status?: string;
  };
  travellers: {
    quad: number;
    triple: number;
    double: number;
    child: number;
  };
  user: {
    _id: string;
    name: string;
    email: string;
  };
}
interface CustomizedBooking extends BookingBase {
  date?: string;
  noOfPeople?: number;
  plan?: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
}

interface GroupApiresponse {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
  data: GroupBooking[];
}
interface CustomizedApiresponse {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
  data: CustomizedBooking[];
}

const getGroupBookings = async (
  accessToken: string,
  page: number,
  limit: number
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/booking/admin?page=${page}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to get group bookings");
  return res.json();
};

const getCustomizedBookings = async (
  accessToken: string,
  page: number,
  limit: number
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourbooking/admin?page=${page}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to get customized tour bookings");
  return res.json();
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const getStatusColor = (status?: string) => {
  const statusLower = String(status ?? "").toLowerCase();
  if (
    statusLower === "confirmed" ||
    statusLower === "completed" ||
    statusLower === "paid"
  )
    return "bg-emerald-100 text-emerald-800";
  if (statusLower === "pending" || statusLower === "processing")
    return "bg-amber-100 text-amber-800";
  if (
    statusLower === "cancelled" ||
    statusLower === "failed" ||
    statusLower === "refunded"
  )
    return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-800";
};

function BookingPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions
  ) as string[];
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "group" | "customized">(
    "all"
  );

  const {
    data: groupData,
    isLoading: isGroupLoading,
    isError: isGroupError,
    error: groupError,
  } = useQuery<GroupApiresponse>({
    queryKey: ["groupBookings", page, limit],
    queryFn: () => getGroupBookings(accessToken, page, limit),
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: customizedData,
    isLoading: isCustomizedLoading,
    isError: isCustomizedError,
    error: customizedError,
  } = useQuery<CustomizedApiresponse>({
    queryKey: ["customizedBookings", page, limit],
    queryFn: () => getCustomizedBookings(accessToken, page, limit),
    staleTime: 1000 * 60 * 5,
  });

  const groupBookings = groupData?.data ?? [];
  const customizedBookings = customizedData?.data ?? [];

  const mappedGroup = groupBookings.map((b) => ({
    ...b,
    date: b.batchId?.startDate ?? b.createdAt ?? b.bookingDate,
    type: "group" as const,
  }));

  const mappedCustom = customizedBookings.map((b) => ({
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

  // filter by search + type
  const filteredData = bookings.filter((booking) => {
    if (filterType !== "all" && booking.type !== filterType) return false;

    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    const name = booking.user?.name ?? "";
    const email = booking.user?.email ?? "";
    const title = booking.packageId?.title ?? "";
    return (
      name.toLowerCase().includes(s) ||
      email.toLowerCase().includes(s) ||
      title.toLowerCase().includes(s)
    );
  });

  const bookingStats = {
    total:
      filterType === "group"
        ? groupData?.meta?.total ?? 0
        : filterType === "customized"
        ? customizedData?.meta?.total ?? 0
        : (groupData?.meta?.total ?? 0) + (customizedData?.meta?.total ?? 0),

    confirmed:
      filterType === "group"
        ? groupBookings.filter(
            (b) => (b.bookingStatus ?? "").toLowerCase() === "confirmed"
          ).length
        : filterType === "customized"
        ? customizedBookings.filter(
            (b) => (b.bookingStatus ?? "").toLowerCase() === "confirmed"
          ).length
        : bookings.filter(
            (b) => (b.bookingStatus ?? "").toLowerCase() === "confirmed"
          ).length,

    pending:
      filterType === "group"
        ? groupBookings.filter(
            (b) => (b.bookingStatus ?? "").toLowerCase() === "pending"
          ).length
        : filterType === "customized"
        ? customizedBookings.filter(
            (b) => (b.bookingStatus ?? "").toLowerCase() === "pending"
          ).length
        : bookings.filter(
            (b) => (b.bookingStatus ?? "").toLowerCase() === "pending"
          ).length,

    cancelled:
      filterType === "group"
        ? groupBookings.filter(
            (b) => (b.bookingStatus ?? "").toLowerCase() === "cancelled"
          ).length
        : filterType === "customized"
        ? customizedBookings.filter(
            (b) => (b.bookingStatus ?? "").toLowerCase() === "cancelled"
          ).length
        : bookings.filter(
            (b) => (b.bookingStatus ?? "").toLowerCase() === "cancelled"
          ).length,
  };

  const handlePageChange = (p: number) => setPage(p);
  if (!permissions.includes("bookings"))
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;
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

        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) =>
              setFilterType(e.target.value as "all" | "group" | "customized")
            }
            className="rounded-md border px-3 py-2 bg-white"
          >
            <option value="all">All</option>
            <option value="group">Group</option>
            <option value="customized">Customized</option>
          </select>

          <Button
            className="bg-[#FE5300] hover:bg-[#FE5300]"
            onClick={() => setIsModalOpen(true)}
          >
            + Add Booking
          </Button>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <ManualBooking onClose={() => setIsModalOpen(false)} />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Total Bookings (Shown / All)
            </p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {filteredData.length} / {bookingStats.total}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Confirmed
            </p>
            <p className="text-3xl font-bold text-emerald-600">
              {bookingStats.confirmed}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pending
            </p>
            <p className="text-3xl font-bold text-amber-600">
              {bookingStats.pending}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Cancelled
            </p>
            <p className="text-3xl font-bold text-red-600">
              {bookingStats.cancelled}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="mb-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Bookings List</CardTitle>
          <CardDescription>View and manage all tour bookings</CardDescription>
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
          ) : filteredData.length === 0 ? (
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
                      Guest
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
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredData.map((booking, index) => (
                    <TableRow
                      key={booking._id}
                      className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <TableCell className="text-slate-700 dark:text-slate-300 font-medium">
                        {index + 1}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <p className="font-medium text-slate-900 dark:text-white">
                            {booking.user?.name}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {booking.user?.email}
                          </p>
                        </div>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        {isCustomizedLoading || isGroupLoading ? (
          <Loader />
        ) : (
          <Pagination
            currentPage={page}
            totalPages={Math.max(
              1,
              Math.ceil((bookingStats.total || 0) / limit)
            )}
            onPageChange={handlePageChange}
            pageSize={limit}
          />
        )}
      </div>
    </main>
  );
}

export default BookingPage;
