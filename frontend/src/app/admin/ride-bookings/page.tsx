"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface RideBooking {
  _id: string;
  rider?: { fullName?: string; mobileNumber?: string } | null;
  assignedPartnerId?: { fullName?: string; mobileNumber?: string } | null;
  pickup: { address: string };
  drop: { address: string };
  rideDate: string;
  rideTime: string;
  vehicleCategory: string;
  distanceKm: number;
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface RidesApiResponse {
  success: boolean;
  total: number;
  data: RideBooking[];
}

const STATUS_OPTIONS = [
  "All",
  "PAYMENT_PENDING",
  "PAID",
  "AWAITING_ASSIGNMENT",
  "ACCEPTED",
  "DRIVER_EN_ROUTE",
  "ARRIVED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
] as const;

const getRideStatusColor = (status: string) => {
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-800";
  if (status === "CANCELLED") return "bg-red-100 text-red-800";
  if (status === "AWAITING_ASSIGNMENT" || status === "PAID") return "bg-amber-100 text-amber-800";
  if (["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED", "ONGOING"].includes(status)) return "bg-sky-100 text-sky-800";
  return "bg-slate-100 text-slate-800";
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const getRides = async (accessToken: string, status: string) => {
  const query = status && status !== "All" ? `?status=${status}` : "";
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/rides${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to load ride bookings");
  return res.json();
};

function RideBookingsPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore((state) => state.permissions) as string[];
  const role = useAdminAuthStore((state) => state.role);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<RidesApiResponse>({
    queryKey: ["adminRideBookings", statusFilter],
    queryFn: () => getRides(accessToken, statusFilter),
    staleTime: 1000 * 30,
  });

  const rides = data?.data ?? [];

  const stats = {
    total: data?.total ?? 0,
    awaitingAssignment: rides.filter((r) => r.status === "AWAITING_ASSIGNMENT" || r.status === "PAID").length,
    inProgress: rides.filter((r) => ["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED", "ONGOING"].includes(r.status)).length,
    completed: rides.filter((r) => r.status === "COMPLETED").length,
  };

  const callAction = async (
    rideId: string,
    path: string,
    method: string,
    body?: Record<string, unknown>,
    successMessage?: string
  ) => {
    setActingOnId(rideId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/rides/${rideId}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(successMessage || result.message || "Done");
        queryClient.invalidateQueries({ queryKey: ["adminRideBookings"] });
      } else {
        toast.error(result.message || "Action failed");
      }
    } catch {
      toast.error("Action failed, please try again");
    } finally {
      setActingOnId(null);
    }
  };

  const handleRelease = (id: string) => callAction(id, "/release", "POST", undefined, "Ride released to eligible partners");
  const handleReassign = (id: string) => callAction(id, "/reassign", "PATCH", undefined, "Ride moved back to the partner pool");
  const handleCancel = (id: string) => callAction(id, "/cancel", "PATCH", { reason: "Cancelled by admin" }, "Ride cancelled");

  if (!(role === "admin" || role === "superadmin" || permissions.includes("partner-verification"))) {
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Ride Bookings</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Manage MBGO ride bookings — release paid rides to partners, reassign, or cancel.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border px-3 py-2 bg-white"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "All" ? "All Statuses" : s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Shown</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{rides.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Awaiting Assignment</p>
            <p className="text-3xl font-bold text-amber-600">{stats.awaitingAssignment}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">In Progress</p>
            <p className="text-3xl font-bold text-sky-600">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Completed</p>
            <p className="text-3xl font-bold text-emerald-600">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Ride Bookings List</CardTitle>
          <CardDescription>View and manage ride bookings across their lifecycle</CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" message="Loading ride bookings..." />
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400">Error: {String((error as Error)?.message)}</p>
            </div>
          ) : rides.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">No ride bookings found for this filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="font-semibold">Booking</TableHead>
                    <TableHead className="font-semibold">Rider</TableHead>
                    <TableHead className="font-semibold">Route</TableHead>
                    <TableHead className="font-semibold">Vehicle</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Partner</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="text-right font-semibold">Fare</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rides.map((ride) => (
                    <TableRow
                      key={ride._id}
                      className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        MB-{ride._id.slice(-6).toUpperCase()}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col">
                          <p className="font-medium text-slate-900 dark:text-white">{ride.rider?.fullName || "-"}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{ride.rider?.mobileNumber || ""}</p>
                        </div>
                      </TableCell>

                      <TableCell className="text-slate-700 dark:text-slate-300 max-w-[220px]">
                        <p className="truncate">{ride.pickup?.address}</p>
                        <p className="truncate text-xs text-slate-400">→ {ride.drop?.address}</p>
                      </TableCell>

                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {ride.vehicleCategory}
                        <div className="text-xs text-slate-400">{ride.distanceKm} km</div>
                      </TableCell>

                      <TableCell>
                        <Badge className={`${getRideStatusColor(ride.status)} border-0`}>
                          {ride.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {ride.assignedPartnerId?.fullName || "-"}
                      </TableCell>

                      <TableCell className="text-slate-700 dark:text-slate-300">
                        {formatDate(ride.createdAt)}
                        <div className="text-xs text-slate-400">{ride.rideDate} • {ride.rideTime}</div>
                      </TableCell>

                      <TableCell className="text-right font-semibold text-slate-900 dark:text-white">
                        ₹{Number(ride.totalAmount ?? 0).toLocaleString("en-IN")}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          {(ride.status === "PAID" || ride.status === "AWAITING_ASSIGNMENT") && (
                            <Button
                              size="sm"
                              className="bg-[#FE5300] hover:bg-[#FE5300]"
                              disabled={actingOnId === ride._id}
                              onClick={() => handleRelease(ride._id)}
                            >
                              Release
                            </Button>
                          )}
                          {["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED", "ONGOING"].includes(ride.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actingOnId === ride._id}
                              onClick={() => handleReassign(ride._id)}
                            >
                              Reassign
                            </Button>
                          )}
                          {!["COMPLETED", "CANCELLED"].includes(ride.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              disabled={actingOnId === ride._id}
                              onClick={() => handleCancel(ride._id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default RideBookingsPage;
