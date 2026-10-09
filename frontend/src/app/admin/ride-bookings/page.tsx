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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CarFront, CheckCircle2, Hourglass, ListChecks, Navigation } from "lucide-react";
import { FleetEmptyState, FleetKpiStrip, FleetPage, FleetPageHeader, FleetPanel, FleetPill, fleetBtnSm, fleetSelectClass, fleetTh, fleetTone } from "@/components/admin/fleet/FleetUI";

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
  if (status === "COMPLETED") return fleetTone.emerald;
  if (status === "CANCELLED") return fleetTone.red;
  if (status === "AWAITING_ASSIGNMENT" || status === "PAID") return fleetTone.amber;
  if (["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED", "ONGOING"].includes(status)) return fleetTone.sky;
  return fleetTone.slate;
};

// "DRIVER_EN_ROUTE" -> "Driver en route"
const formatRideStatus = (status: string) => {
  const text = status.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
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

  const renderActions = (ride: RideBooking) => (
    <>
      {(ride.status === "PAID" || ride.status === "AWAITING_ASSIGNMENT") && (
        <Button
          size="sm"
          className={`${fleetBtnSm} bg-[#FE5300] hover:bg-[#e54b00]`}
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
          className={fleetBtnSm}
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
          className={`${fleetBtnSm} text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600`}
          disabled={actingOnId === ride._id}
          onClick={() => handleCancel(ride._id)}
        >
          Cancel
        </Button>
      )}
    </>
  );

  const renderStatus = (ride: RideBooking) => (
    <div className="flex flex-col gap-1 items-start">
      <FleetPill className={getRideStatusColor(ride.status)}>{formatRideStatus(ride.status)}</FleetPill>
      {ride.needsManualAssignment && <FleetPill className={fleetTone.red}>Needs attention</FleetPill>}
    </div>
  );

  return (
    <FleetPage>
      <FleetPageHeader
        icon={CarFront}
        title="Ride Bookings"
        description="Manage MBGO ride bookings — release paid rides to partners, reassign, or cancel."
        actions={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${fleetSelectClass} w-full sm:w-auto`}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All Statuses" : s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        }
      />

      <FleetKpiStrip
        items={[
          { label: "Shown", value: rides.length, icon: ListChecks, tone: "slate" },
          { label: "Awaiting assignment", value: stats.awaitingAssignment, icon: Hourglass, tone: "amber" },
          { label: "In progress", value: stats.inProgress, icon: Navigation, tone: "sky" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, tone: "emerald" },
        ]}
      />

      <FleetPanel title="Ride bookings" description="View and manage ride bookings across their lifecycle">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" message="Loading ride bookings..." />
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400">Error: {String((error as Error)?.message)}</p>
            </div>
          ) : rides.length === 0 ? (
            <FleetEmptyState icon={CarFront} title="No ride bookings found for this filter" />
          ) : (
            <>
              {/* Mobile: one card per ride */}
              <div className="divide-y divide-slate-100 md:hidden">
                {rides.map((ride) => (
                  <div key={ride._id} className="space-y-2.5 px-4 py-3 text-[13px]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[12px] font-medium text-slate-900">MB-{ride._id.slice(-6).toUpperCase()}</p>
                        <p className="text-[11px] text-slate-500">{formatDate(ride.createdAt)}</p>
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums text-slate-900">₹{Number(ride.totalAmount ?? 0).toLocaleString("en-IN")}</p>
                    </div>
                    {renderStatus(ride)}
                    <div className="space-y-1 text-[12px]">
                      <p className="break-words text-slate-700"><span className="text-slate-400">From </span>{ride.pickup?.address}</p>
                      <p className="break-words text-slate-700"><span className="text-slate-400">To </span>{ride.drop?.address}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <p className="text-slate-400">Rider</p>
                        <p className="font-medium text-slate-800 break-words">{ride.rider?.fullName || "-"}</p>
                        <p className="text-slate-500">{ride.rider?.mobileNumber || ""}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Partner</p>
                        <p className="font-medium text-slate-800 break-words">{ride.assignedPartnerId?.fullName || "-"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Vehicle</p>
                        <p className="font-medium text-slate-800">{ride.vehicleCategory} · {ride.distanceKm} km</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Ride</p>
                        <p className="font-medium text-slate-800">{ride.rideDate} • {ride.rideTime}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">{renderActions(ride)}</div>
                  </div>
                ))}
              </div>

              {/* Tablet / desktop: compact table that fits the content width */}
              <div className="hidden md:block">
                <Table className="table-fixed text-[13px]">
                  <TableHeader className="bg-slate-50/60">
                    <TableRow className="border-slate-200 hover:bg-transparent">
                      <TableHead className={`w-[130px] pl-4 ${fleetTh}`}>Booking</TableHead>
                      <TableHead className={`w-[160px] ${fleetTh}`}>Rider</TableHead>
                      <TableHead className={`${fleetTh}`}>Trip</TableHead>
                      <TableHead className={`hidden w-[140px] ${fleetTh} xl:table-cell`}>Partner</TableHead>
                      <TableHead className={`w-[150px] ${fleetTh}`}>Status</TableHead>
                      <TableHead className={`w-[100px] text-right ${fleetTh}`}>Fare</TableHead>
                      <TableHead className={`w-[120px] pr-4 text-right ${fleetTh} 2xl:w-[230px]`}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {rides.map((ride) => (
                      <TableRow
                        key={ride._id}
                        className="border-slate-100 hover:bg-slate-50/70 transition-colors"
                      >
                        <TableCell className="pl-4 align-top py-2.5 whitespace-normal">
                          <p className="font-mono text-[12px] font-medium text-slate-900">MB-{ride._id.slice(-6).toUpperCase()}</p>
                          <p className="text-[11px] text-slate-500">{formatDate(ride.createdAt)}</p>
                        </TableCell>

                        <TableCell className="align-top py-2.5 whitespace-normal">
                          <p className="font-medium text-slate-900 truncate">{ride.rider?.fullName || "-"}</p>
                          <p className="text-[11px] tabular-nums text-slate-500 truncate">{ride.rider?.mobileNumber || ""}</p>
                          <p className="text-[11px] text-slate-500 truncate xl:hidden">
                            <span className="text-slate-400">Partner: </span>
                            {ride.assignedPartnerId?.fullName || "-"}
                          </p>
                        </TableCell>

                        <TableCell className="align-top py-2.5 whitespace-normal">
                          <p className="truncate text-slate-800" title={ride.pickup?.address}>{ride.pickup?.address}</p>
                          <p className="truncate text-[12px] text-slate-500" title={ride.drop?.address}>→ {ride.drop?.address}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {ride.vehicleCategory} · {ride.distanceKm} km · {ride.rideDate} • {ride.rideTime}
                          </p>
                        </TableCell>

                        <TableCell className="hidden align-top py-2.5 whitespace-normal text-slate-700 xl:table-cell">
                          <p className="truncate">{ride.assignedPartnerId?.fullName || "-"}</p>
                        </TableCell>

                        <TableCell className="align-top py-2.5 whitespace-normal">{renderStatus(ride)}</TableCell>

                        <TableCell className="align-top py-2.5 text-right font-semibold tabular-nums text-slate-900">
                          ₹{Number(ride.totalAmount ?? 0).toLocaleString("en-IN")}
                        </TableCell>

                        <TableCell className="pr-4 align-top py-2.5 whitespace-normal">
                          <div className="flex flex-col items-end gap-1 2xl:flex-row 2xl:justify-end 2xl:flex-wrap">
                            {renderActions(ride)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
      </FleetPanel>

      <Sheet open={!!pickerRideId} onOpenChange={(open) => !open && setPickerRideId(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto bg-slate-50 p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-slate-200 bg-white px-5 py-4">
            <SheetTitle className="text-[15px] font-semibold">Assign partner</SheetTitle>
            <SheetDescription className="text-[12px]">
              {pickerRide
                ? `${pickerRide.pickup?.address} → ${pickerRide.drop?.address} • ${pickerRide.vehicleCategory} • ₹${Number(pickerRide.totalAmount ?? 0).toLocaleString("en-IN")}`
                : "Select partners to notify, or assign one directly."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={pickerFilters.category}
                onChange={(e) => setPickerFilters((f) => ({ ...f, category: e.target.value }))}
                className={`${fleetSelectClass} w-full`}
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
                className="h-8 bg-white text-[13px]"
              />
            </div>
            <label className="flex items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300">
              <Checkbox
                checked={pickerFilters.onlineOnly}
                onCheckedChange={(checked) => setPickerFilters((f) => ({ ...f, onlineOnly: checked === true }))}
              />
              Online partners only
            </label>

            <div className="max-h-[55vh] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              {isLoadingEligible ? (
                <div className="flex justify-center py-8">
                  <Loader size="sm" message="Loading partners..." />
                </div>
              ) : eligiblePartners.length === 0 ? (
                <p className="p-6 text-center text-[12px] text-slate-500">No partners match these filters.</p>
              ) : (
                eligiblePartners.map((partner) => {
                  const matchingVehicles = partner.vehicles.filter((v) => v.category === pickerRide?.vehicleCategory);
                  return (
                    <div key={partner.partnerId} className={`flex flex-col gap-2 px-3 py-2.5 transition-colors ${selectedPartnerIds.has(partner.partnerId) ? "bg-orange-50/40" : ""}`}>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedPartnerIds.has(partner.partnerId)}
                          onCheckedChange={() => togglePartnerSelected(partner.partnerId)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[13px] font-medium text-slate-900 dark:text-white">{partner.fullName}</p>
                            <FleetPill className={partner.isOnline ? fleetTone.emerald : fleetTone.slate}>
                              {partner.isOnline ? "Online" : "Offline"}
                            </FleetPill>
                            {partner.matchesCategory && <FleetPill dot={false} className={fleetTone.sky}>Category ✓</FleetPill>}
                            {partner.matchesLocation && <FleetPill dot={false} className={fleetTone.violet}>Location ✓</FleetPill>}
                          </div>
                          <p className="text-[11px] tabular-nums text-slate-500">{partner.mobileNumber}</p>
                          <p className="text-[11px] text-slate-400 truncate">
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
                              className="h-7 px-2.5 text-[11px]"
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
              className="h-9 w-full bg-[#FE5300] text-[13px] hover:bg-[#e54b00]"
              disabled={selectedPartnerIds.size === 0 || isPickerActing}
              onClick={handleBroadcastSelected}
            >
              {isPickerActing ? "Working..." : `Broadcast to Selected (${selectedPartnerIds.size})`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </FleetPage>
  );
}

export default RideBookingsPage;
