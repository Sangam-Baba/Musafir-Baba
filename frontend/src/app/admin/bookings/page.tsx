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
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Plus,
  Search,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import Pagination from "@/components/common/Pagination";
import ManualBooking from "@/components/admin/ManualBooking";
import {
  FleetEmptyState,
  FleetKpiStrip,
  FleetPage,
  FleetPanel,
  FleetPill,
  fleetSelectClass,
  fleetTh,
  fleetTone,
} from "@/components/admin/fleet/FleetUI";
import { AdminPageHeader } from "@/components/admin/AdminFormUI";
import { cn } from "@/lib/utils";

// ---- Page-local display helpers (presentation only) ----
// Same status buckets as getStatusColor below, rendered with the admin pill style.
function pillTone(status?: string) {
  const s = String(status ?? "").toLowerCase();
  if (s === "confirmed" || s === "completed" || s === "paid") return fleetTone.emerald;
  if (s === "pending" || s === "processing") return fleetTone.amber;
  if (s === "cancelled" || s === "failed" || s === "refunded") return fleetTone.red;
  if (s === "upcoming" || s === "ongoing" || s === "active") return fleetTone.sky;
  return fleetTone.slate;
}

function StatusPill({ value, prefix }: { value?: string; prefix?: string }) {
  if (!value) return <span className="text-[12px] text-slate-300">-</span>;
  return (
    <FleetPill className={cn(pillTone(value), "capitalize")}>
      {prefix ? `${prefix}: ${value}` : value}
    </FleetPill>
  );
}

function TypePill({ type }: { type: "group" | "customized" }) {
  return type === "group" ? (
    <FleetPill className={fleetTone.orange} dot={false}>
      <span className="inline-flex items-center gap-1"><Users size={11} /> Group</span>
    </FleetPill>
  ) : (
    <FleetPill className={fleetTone.violet} dot={false}>
      <span className="inline-flex items-center gap-1"><Sparkles size={11} /> Customized</span>
    </FleetPill>
  );
}

const initials = (name?: string) =>
  (name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("") || "?";

const AVATAR_TONES = [
  "bg-orange-50 text-orange-600 ring-orange-100",
  "bg-sky-50 text-sky-600 ring-sky-100",
  "bg-violet-50 text-violet-600 ring-violet-100",
  "bg-emerald-50 text-emerald-600 ring-emerald-100",
  "bg-amber-50 text-amber-600 ring-amber-100",
  "bg-rose-50 text-rose-600 ring-rose-100",
];
const avatarTone = (seed: string) =>
  AVATAR_TONES[[...(seed ?? "")].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];

const formatAmount = (value?: number) =>
  `₹${Number(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

export interface GroupBooking extends BookingBase {
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
export interface CustomizedBooking extends BookingBase {
  date?: string;
  noOfPeople?: number;
  plan?: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface GroupApiresponse {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
  data: GroupBooking[];
}
export interface CustomizedApiresponse {
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

export const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const getStatusColor = (status?: string) => {
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
    <FleetPage className="pb-8">
      <AdminPageHeader
        section="Main"
        icon={CalendarCheck}
        title="Bookings"
        description="Manage and track all tour bookings: group departures and customized tours."
        actions={
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-[#FE5300] px-3 text-[12px] font-semibold hover:bg-[#e44a00]"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Add booking
          </Button>
        }
      />

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <ManualBooking onClose={() => setIsModalOpen(false)} />
        </div>
      )}

      <FleetKpiStrip
        items={[
          {
            label: "Total bookings (shown / all)",
            value: `${filteredData.length} / ${bookingStats.total}`,
            icon: CalendarCheck,
            tone: "orange",
          },
          { label: "Confirmed", value: bookingStats.confirmed, icon: CheckCircle2, tone: "emerald" },
          { label: "Pending", value: bookingStats.pending, icon: Clock3, tone: "amber" },
          { label: "Cancelled", value: bookingStats.cancelled, icon: XCircle, tone: "red" },
        ]}
      />

      <FleetPanel
        title="Bookings list"
        description="View and manage all tour bookings"
        actions={
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-72">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name, email, or package..."
                className="h-8 w-full pl-8 text-[13px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as "all" | "group" | "customized")
              }
              className={cn(fleetSelectClass, "w-full md:w-[150px]")}
              aria-label="Booking type"
            >
              <option value="all">All types</option>
              <option value="group">Group</option>
              <option value="customized">Customized</option>
            </select>
          </div>
        }
      >
        {isGroupLoading || isCustomizedLoading ? (
          <div className="flex justify-center py-12">
            <Loader size="lg" message="Loading bookings..." />
          </div>
        ) : isGroupError || isCustomizedError ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            <p className="text-[13px] text-red-600">
              Error: {String(groupError?.message ?? customizedError?.message)}
            </p>
          </div>
        ) : filteredData.length === 0 ? (
          <FleetEmptyState
            icon={CalendarCheck}
            title="No bookings found"
            hint={searchTerm || filterType !== "all" ? "Try a different search or booking type." : undefined}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
                    <TableHead className={cn(fleetTh, "w-10 pl-4")}>#</TableHead>
                    <TableHead className={fleetTh}>Guest</TableHead>
                    <TableHead className={fleetTh}>Package</TableHead>
                    <TableHead className={fleetTh}>Status</TableHead>
                    <TableHead className={fleetTh}>Payment</TableHead>
                    <TableHead className={fleetTh}>Trip</TableHead>
                    <TableHead className={fleetTh}>Travel date</TableHead>
                    <TableHead className={fleetTh}>Booked on</TableHead>
                    <TableHead className={cn(fleetTh, "pr-4 text-right")}>Amount</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredData.map((booking, index) => (
                    <TableRow
                      key={booking._id}
                      className="border-b border-slate-50 transition-colors last:border-0 hover:bg-orange-50/30"
                    >
                      <TableCell className="py-3 pl-4 text-[12px] tabular-nums text-slate-400">
                        {index + 1}
                      </TableCell>

                      <TableCell className="max-w-[220px] py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-inset",
                              avatarTone(booking._id)
                            )}
                          >
                            {initials(booking.user?.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium capitalize text-slate-900" title={booking.user?.name}>
                              {booking.user?.name || "-"}
                            </p>
                            <p className="truncate text-[11px] text-slate-500" title={booking.user?.email}>
                              {booking.user?.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="max-w-[300px] py-3">
                        <p
                          className="line-clamp-2 whitespace-normal text-[13px] leading-snug text-slate-700"
                          title={booking.packageId?.title}
                        >
                          {booking.packageId?.title ?? "-"}
                        </p>
                        <div className="mt-1">
                          <TypePill type={booking.type} />
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <StatusPill value={booking.bookingStatus} />
                      </TableCell>

                      <TableCell className="py-3">
                        <StatusPill value={booking.paymentInfo?.status} />
                        {booking.paymentMethod && (
                          <p className="mt-1 text-[11px] text-slate-400">{booking.paymentMethod}</p>
                        )}
                      </TableCell>

                      <TableCell className="py-3">
                        <StatusPill value={(booking as GroupBooking).batchId?.status} />
                      </TableCell>

                      <TableCell className="whitespace-nowrap py-3 text-[12px] tabular-nums text-slate-600">
                        {formatDate(booking.date)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap py-3 text-[12px] tabular-nums text-slate-500">
                        {formatDate(booking.createdAt ?? booking.bookingDate)}
                      </TableCell>

                      <TableCell className="whitespace-nowrap py-3 pr-4 text-right text-[13px] font-semibold tabular-nums text-slate-900">
                        {formatAmount(booking.totalPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile list */}
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredData.map((booking) => (
                <div key={booking._id} className="flex items-start gap-3 px-4 py-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-inset",
                      avatarTone(booking._id)
                    )}
                  >
                    {initials(booking.user?.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-[13px] font-medium capitalize text-slate-900">
                        {booking.user?.name || "-"}
                      </p>
                      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-slate-900">
                        {formatAmount(booking.totalPrice)}
                      </span>
                    </div>
                    <p className="truncate text-[11px] text-slate-500">{booking.user?.email}</p>
                    <p className="mt-1 line-clamp-2 text-[12px] text-slate-700">{booking.packageId?.title ?? "-"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <TypePill type={booking.type} />
                      <StatusPill value={booking.bookingStatus} />
                      <StatusPill value={booking.paymentInfo?.status} prefix="Payment" />
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      Travel {formatDate(booking.date)} · Booked {formatDate(booking.createdAt ?? booking.bookingDate)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!(isCustomizedLoading || isGroupLoading) && (
          <div className="border-t border-slate-100 px-4 py-3">
            <Pagination
              currentPage={page}
              totalPages={Math.max(
                1,
                Math.ceil((bookingStats.total || 0) / limit)
              )}
              onPageChange={handlePageChange}
              pageSize={limit}
            />
          </div>
        )}
      </FleetPanel>
    </FleetPage>
  );
}

export default BookingPage;
