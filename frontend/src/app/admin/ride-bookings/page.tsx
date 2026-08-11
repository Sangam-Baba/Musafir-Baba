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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

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
  needsManualAssignment?: boolean;
}

interface EligibleVehicle {
  vehicleId: string;
  category: string;
  vehicleName: string;
  registrationNumber: string;
}

interface EligiblePartner {
  partnerId: string;
  fullName: string;
  mobileNumber: string;
  isOnline: boolean;
  vehicles: EligibleVehicle[];
  workingCities: string[];
  matchesCategory: boolean;
  matchesLocation: boolean;
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

interface PartnerPickerFilters {
  category: string;
  city: string;
  onlineOnly: boolean;
}

const getEligiblePartners = async (accessToken: string, rideId: string, filters: PartnerPickerFilters) => {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.city) params.set("city", filters.city);
  if (filters.onlineOnly) params.set("onlineOnly", "true");
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/rides/${rideId}/eligible-partners${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to load eligible partners");
  return res.json() as Promise<{ success: boolean; total: number; data: EligiblePartner[] }>;
};

function RideBookingsPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore((state) => state.permissions) as string[];
  const role = useAdminAuthStore((state) => state.role);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  // Manual partner picker (Release / Reassign now open this instead of
  // blindly broadcasting) -- see docs discussion: admin picks who gets
  // notified/assigned rather than the pool auto-selecting.
  const [pickerRideId, setPickerRideId] = useState<string | null>(null);
  const [pickerFilters, setPickerFilters] = useState<PartnerPickerFilters>({ category: "", city: "", onlineOnly: false });
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<Set<string>>(new Set());
  const [isPickerActing, setIsPickerActing] = useState(false);

  const { data, isLoading, isError, error } = useQuery<RidesApiResponse>({
    queryKey: ["adminRideBookings", statusFilter],
    queryFn: () => getRides(accessToken, statusFilter),
    staleTime: 1000 * 30,
  });

  const rides = data?.data ?? [];
  const pickerRide = rides.find((r) => r._id === pickerRideId) || null;

  const { data: eligibleData, isLoading: isLoadingEligible } = useQuery({
    queryKey: ["eligiblePartners", pickerRideId, pickerFilters],
    queryFn: () => getEligiblePartners(accessToken, pickerRideId as string, pickerFilters),
    enabled: !!pickerRideId,
  });
  const eligiblePartners = eligibleData?.data ?? [];

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

  const openPicker = (id: string) => {
    setPickerFilters({ category: "", city: "", onlineOnly: false });
    setSelectedPartnerIds(new Set());
    setPickerRideId(id);
  };

  // Release: ride is already PAID/AWAITING_ASSIGNMENT, so the picker can
  // open directly -- no auto-broadcast happens anymore, admin chooses.
  const handleRelease = (id: string) => openPicker(id);

  // Reassign: clears the current partner/vehicle assignment and puts the
  // ride back in the pool (no auto-broadcast -- see reassignRide backend),
  // then opens the same picker so the admin chooses who's next.
  const handleReassign = async (id: string) => {
    setActingOnId(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/rides/${id}/reassign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      });
      const result = await res.json();
      if (res.ok && result.success) {
        queryClient.invalidateQueries({ queryKey: ["adminRideBookings"] });
        openPicker(id);
      } else {
        toast.error(result.message || "Could not clear assignment");
      }
    } catch {
      toast.error("Action failed, please try again");
    } finally {
      setActingOnId(null);
    }
  };

  const handleCancel = (id: string) => callAction(id, "/cancel", "PATCH", { reason: "Cancelled by admin" }, "Ride cancelled");

  const togglePartnerSelected = (partnerId: string) => {
    setSelectedPartnerIds((prev) => {
      const next = new Set(prev);
      if (next.has(partnerId)) next.delete(partnerId);
      else next.add(partnerId);
      return next;
    });
  };

  const handleBroadcastSelected = async () => {
    if (!pickerRideId || selectedPartnerIds.size === 0) return;
    setIsPickerActing(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/rides/${pickerRideId}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ partnerIds: [...selectedPartnerIds] }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(result.message || "Broadcast sent");
        queryClient.invalidateQueries({ queryKey: ["adminRideBookings"] });
        setPickerRideId(null);
      } else {
        toast.error(result.message || "Broadcast failed");
      }
    } catch {
      toast.error("Broadcast failed, please try again");
    } finally {
      setIsPickerActing(false);
    }
  };

  const handleAssignDirect = async (partnerId: string, vehicleId: string) => {
    if (!pickerRideId) return;
    setIsPickerActing(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/rides/${pickerRideId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ partnerId, vehicleId }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(result.message || "Ride assigned");
        queryClient.invalidateQueries({ queryKey: ["adminRideBookings"] });
        setPickerRideId(null);
      } else {
        toast.error(result.message || "Assignment failed");
      }
    } catch {
      toast.error("Assignment failed, please try again");
    } finally {
      setIsPickerActing(false);
    }
  };

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
                        <div className="flex flex-col gap-1 items-start">
                          <Badge className={`${getRideStatusColor(ride.status)} border-0`}>
                            {ride.status.replace(/_/g, " ")}
                          </Badge>
                          {ride.needsManualAssignment && (
                            <Badge className="bg-red-100 text-red-800 border-0">Needs Attention</Badge>
                          )}
                        </div>
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

      <Sheet open={!!pickerRideId} onOpenChange={(open) => !open && setPickerRideId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Assign Partner</SheetTitle>
            <SheetDescription>
              {pickerRide
                ? `${pickerRide.pickup?.address} → ${pickerRide.drop?.address} • ${pickerRide.vehicleCategory} • ₹${Number(pickerRide.totalAmount ?? 0).toLocaleString("en-IN")}`
                : "Select partners to notify, or assign one directly."}
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-6 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={pickerFilters.category}
                onChange={(e) => setPickerFilters((f) => ({ ...f, category: e.target.value }))}
                className="rounded-md border px-3 py-2 bg-white text-sm"
              >
                <option value="">Any Category</option>
                <option value="Hatchback">Hatchback</option>
                <option value="Sedan">Sedan</option>
                <option value="SUV">SUV</option>
                <option value="Tempo Traveller">Tempo Traveller</option>
              </select>
              <Input
                placeholder="Filter by city..."
                value={pickerFilters.city}
                onChange={(e) => setPickerFilters((f) => ({ ...f, city: e.target.value }))}
                className="text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Checkbox
                checked={pickerFilters.onlineOnly}
                onCheckedChange={(checked) => setPickerFilters((f) => ({ ...f, onlineOnly: checked === true }))}
              />
              Online partners only
            </label>

            <div className="border rounded-lg divide-y max-h-[50vh] overflow-y-auto">
              {isLoadingEligible ? (
                <div className="flex justify-center py-8">
                  <Loader size="sm" message="Loading partners..." />
                </div>
              ) : eligiblePartners.length === 0 ? (
                <p className="text-sm text-slate-500 p-4">No partners match these filters.</p>
              ) : (
                eligiblePartners.map((partner) => {
                  const matchingVehicles = partner.vehicles.filter((v) => v.category === pickerRide?.vehicleCategory);
                  return (
                    <div key={partner.partnerId} className="p-3 flex flex-col gap-2">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedPartnerIds.has(partner.partnerId)}
                          onCheckedChange={() => togglePartnerSelected(partner.partnerId)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-slate-900 dark:text-white">{partner.fullName}</p>
                            <Badge className={`${partner.isOnline ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"} border-0`}>
                              {partner.isOnline ? "Online" : "Offline"}
                            </Badge>
                            {partner.matchesCategory && <Badge className="bg-sky-100 text-sky-800 border-0">Category ✓</Badge>}
                            {partner.matchesLocation && <Badge className="bg-violet-100 text-violet-800 border-0">Location ✓</Badge>}
                          </div>
                          <p className="text-xs text-slate-500">{partner.mobileNumber}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {partner.vehicles.map((v) => `${v.category} (${v.registrationNumber})`).join(", ")}
                          </p>
                        </div>
                      </div>
                      {matchingVehicles.length > 0 && (
                        <div className="flex gap-2 flex-wrap pl-7">
                          {matchingVehicles.map((v) => (
                            <Button
                              key={v.vehicleId}
                              size="sm"
                              variant="outline"
                              disabled={isPickerActing}
                              onClick={() => handleAssignDirect(partner.partnerId, v.vehicleId)}
                              className="text-xs h-7"
                            >
                              Assign {v.vehicleName} ({v.registrationNumber})
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <Button
              className="w-full bg-[#FE5300] hover:bg-[#FE5300]"
              disabled={selectedPartnerIds.size === 0 || isPickerActing}
              onClick={handleBroadcastSelected}
            >
              {isPickerActing ? "Working..." : `Broadcast to Selected (${selectedPartnerIds.size})`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}

export default RideBookingsPage;
