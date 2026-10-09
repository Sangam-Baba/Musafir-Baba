"use client";

import { useEffect, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AlertTriangle, BadgeCheck, CheckCircle, ChevronRight, FileClock, FileX, RotateCcw, Search, Trash2, UserRoundCheck, Users } from "lucide-react";
import { FleetEmptyState, FleetKpiStrip, FleetPage, FleetPageHeader, FleetPanel, FleetPill, fleetBtnSm, fleetTh, fleetTone } from "@/components/admin/fleet/FleetUI";

interface RiderListItem {
  _id: string;
  fullName: string;
  mobileNumber: string;
  profilePicture?: string;
  isVerified: boolean;
  isActive: boolean;
  email: string;
  isEmailVerified: boolean;
  document: { status: "Pending" | "Approved" | "Rejected"; hasFront: boolean; hasBack: boolean } | null;
  createdAt: string;
  status?: string;
  deletedAt?: string;
  deleteReason?: string;
}

interface RiderDeleteImpact {
  email?: string;
  openRides: number;
  totalRides: number;
  walletBalance: number;
}

interface BulkRiderImpactRow extends RiderDeleteImpact {
  riderId: string;
}

interface RiderDetail {
  profile: {
    _id: string;
    fullName: string;
    mobileNumber: string;
    profilePicture?: string;
    walletBalance: number;
    isVerified: boolean;
    isActive: boolean;
    createdAt: string;
  };
  auth: { email: string; isEmailVerified: boolean; status: string; deletedAt?: string; deleteReason?: string } | null;
  document: {
    _id: string;
    documentType: string;
    documentName?: string;
    documentIdNumber?: string;
    fileUrlFront?: string;
    fileUrlBack?: string;
    status: "Pending" | "Approved" | "Rejected";
    remarks?: string;
  } | null;
  bookings: Array<{
    _id: string;
    pickup?: string;
    drop?: string;
    rideDate: string;
    rideTime: string;
    vehicleCategory: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
}

const getRiders = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/riders`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to load riders");
  return res.json() as Promise<{ success: boolean; total: number; data: RiderListItem[] }>;
};

const getRiderDetail = async (accessToken: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/riders/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to load rider detail");
  const json = await res.json();
  return json.data as RiderDetail;
};

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

const getDocStatusColor = (status?: string) => {
  if (status === "Approved") return fleetTone.emerald;
  if (status === "Rejected") return fleetTone.red;
  if (status === "Pending") return fleetTone.amber;
  return fleetTone.slate;
};

function RiderVerificationPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore((state) => state.permissions) as string[];
  const role = useAdminAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // List view: tab (active / deleted) + client-side search (display only)
  const [riderTab, setRiderTab] = useState<"active" | "deleted">("active");
  const [riderSearch, setRiderSearch] = useState("");

  // Soft delete (admin / superadmin) and restore (superadmin) — same model as partners
  const canDeleteRider = role === "admin" || role === "superadmin";
  const canRestoreRider = role === "superadmin";
  const [deleteModal, setDeleteModal] = useState<{ loading: boolean; impact: RiderDeleteImpact | null } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<{ loading: boolean; rows: BulkRiderImpactRow[] } | null>(null);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkConfirmText, setBulkConfirmText] = useState("");
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Selection is always a subset of what is on screen
  useEffect(() => {
    setSelectedIds(new Set());
  }, [riderTab, riderSearch]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["adminRiders"],
    queryFn: () => getRiders(accessToken),
    staleTime: 1000 * 30,
  });

  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ["adminRiderDetail", selectedRiderId],
    queryFn: () => getRiderDetail(accessToken, selectedRiderId as string),
    enabled: !!selectedRiderId,
  });

  const allRiders = data?.data ?? [];
  const activeRiders = allRiders.filter((r) => r.status !== "Deleted");
  const deletedRiders = allRiders.filter((r) => r.status === "Deleted");
  const searchQuery = riderSearch.trim().toLowerCase();
  const riders = (riderTab === "deleted" ? deletedRiders : activeRiders).filter(
    (r) => !searchQuery || [r.fullName, r.email, r.mobileNumber].some((v) => (v || "").toLowerCase().includes(searchQuery))
  );
  const stats = {
    total: activeRiders.length,
    verified: activeRiders.filter((r) => r.isVerified).length,
    pendingDocs: activeRiders.filter((r) => r.document?.status === "Pending").length,
    noDocs: activeRiders.filter((r) => !r.document).length,
  };

  const refreshDetail = () => {
    queryClient.invalidateQueries({ queryKey: ["adminRiders"] });
    if (selectedRiderId) queryClient.invalidateQueries({ queryKey: ["adminRiderDetail", selectedRiderId] });
  };

  const handleReviewDocument = async (status: "Approved" | "Rejected") => {
    if (!selectedRiderId) return;
    let remarks: string | undefined;
    if (status === "Rejected") {
      remarks = window.prompt("Reason for rejecting this document?") || "";
      if (!remarks) {
        toast.error("A reason is required to reject a document");
        return;
      }
    }
    setIsActing(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/riders/${selectedRiderId}/document`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status, remarks }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(result.message || "Document updated");
        refreshDetail();
      } else {
        toast.error(result.message || "Action failed");
      }
    } catch {
      toast.error("Action failed, please try again");
    } finally {
      setIsActing(false);
    }
  };

  const handleSetVerified = async (isVerified: boolean) => {
    if (!selectedRiderId) return;
    setIsActing(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/riders/${selectedRiderId}/verify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ isVerified }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(result.message || "Updated");
        refreshDetail();
      } else {
        toast.error(result.message || "Could not update verification status");
      }
    } catch {
      toast.error("Action failed, please try again");
    } finally {
      setIsActing(false);
    }
  };

  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` };

  const openDeleteModal = async () => {
    if (!selectedRiderId) return;
    setDeleteReason("");
    setDeleteConfirmEmail("");
    setDeleteModal({ loading: true, impact: null });
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/riders/${selectedRiderId}/delete-impact`, { headers: authHeaders });
      const json = await res.json();
      if (res.ok && json.success) setDeleteModal({ loading: false, impact: json.data });
      else {
        toast.error(json.message || "Could not check this rider");
        setDeleteModal(null);
      }
    } catch {
      toast.error("Could not check this rider");
      setDeleteModal(null);
    }
  };

  const confirmDeleteRider = async () => {
    if (!selectedRiderId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/riders/${selectedRiderId}`, {
        method: "DELETE",
        headers: authHeaders,
        body: JSON.stringify({ reason: deleteReason.trim(), confirmEmail: deleteConfirmEmail.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Rider deleted. Their bookings and records are kept.");
        setDeleteModal(null);
        refreshDetail();
      } else {
        toast.error(json.message || "Failed to delete rider");
      }
    } catch {
      toast.error("Failed to delete rider");
    } finally {
      setIsDeleting(false);
    }
  };

  const restoreDeletedRider = async () => {
    if (!selectedRiderId) return;
    if (!window.confirm("Restore this rider account?")) return;
    setIsRestoring(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/riders/${selectedRiderId}/restore`, { method: "POST", headers: authHeaders });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Rider restored");
        refreshDetail();
      } else {
        toast.error(json.message || "Failed to restore rider");
      }
    } catch {
      toast.error("Failed to restore rider");
    } finally {
      setIsRestoring(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openBulkDeleteModal = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkReason("");
    setBulkConfirmText("");
    setBulkModal({ loading: true, rows: [] });
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/riders/bulk-delete-impact`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ riderIds: ids }),
      });
      const json = await res.json();
      if (res.ok && json.success) setBulkModal({ loading: false, rows: json.data || [] });
      else {
        toast.error(json.message || "Could not check the selected riders");
        setBulkModal(null);
      }
    } catch {
      toast.error("Could not check the selected riders");
      setBulkModal(null);
    }
  };

  const confirmBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/riders/bulk-delete`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ riderIds: ids, reason: bulkReason.trim(), confirmText: bulkConfirmText.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const { deleted = [], skipped = [], failed = [] } = json.data || {};
        if (failed.length) toast.error(json.message);
        else if (skipped.length) toast.warning(json.message);
        else toast.success(`${deleted.length} rider(s) deleted. Their records are kept.`);
        setBulkModal(null);
        setSelectedIds(new Set());
        queryClient.invalidateQueries({ queryKey: ["adminRiders"] });
      } else {
        toast.error(json.message || "Bulk delete failed");
      }
    } catch {
      toast.error("Bulk delete failed");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  if (!(role === "admin" || role === "superadmin" || permissions.includes("partner-verification"))) {
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;
  }

  // Only non-deleted rows on screen can be selected for bulk delete
  const selectableRiders = canDeleteRider ? riders.filter((r) => r.status !== "Deleted") : [];
  const allVisibleSelected = selectableRiders.length > 0 && selectableRiders.every((r) => selectedIds.has(r._id));
  const toggleSelectAllVisible = () => setSelectedIds(allVisibleSelected ? new Set() : new Set(selectableRiders.map((r) => r._id)));
  const bulkConfirmPhrase = `DELETE ${selectedIds.size}`;
  const riderName = (id: string) => allRiders.find((r) => r._id === id)?.fullName || id;

  const renderDocBadge = (rider: RiderListItem) =>
    rider.document ? (
      <FleetPill className={getDocStatusColor(rider.document.status)}>{rider.document.status}</FleetPill>
    ) : (
      <FleetPill className={fleetTone.slate}>Not submitted</FleetPill>
    );

  const renderVerifiedBadge = (rider: RiderListItem) =>
    rider.status === "Deleted" ? (
      <FleetPill className={fleetTone.slate}>Deleted</FleetPill>
    ) : rider.isVerified ? (
      <FleetPill className={fleetTone.emerald}>Verified</FleetPill>
    ) : (
      <FleetPill className={fleetTone.slate}>Not verified</FleetPill>
    );

  const renderAvatar = (rider: RiderListItem) =>
    rider.profilePicture ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={rider.profilePicture} alt={rider.fullName} className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
    ) : (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[11px] font-semibold text-orange-700 ring-1 ring-orange-200">
        {rider.fullName?.charAt(0)?.toUpperCase() || "?"}
      </div>
    );

  return (
    <FleetPage>
      <FleetPageHeader
        icon={UserRoundCheck}
        title="Rider Verification"
        description="Review rider ID documents and booking history, and mark riders verified once eligible."
      />

      <FleetKpiStrip
        items={[
          { label: "Total riders", value: stats.total, icon: Users, tone: "slate" },
          { label: "Verified", value: stats.verified, icon: BadgeCheck, tone: "emerald" },
          { label: "Documents pending review", value: stats.pendingDocs, icon: FileClock, tone: "amber" },
          { label: "No document submitted", value: stats.noDocs, icon: FileX, tone: "red" },
        ]}
      />

      <FleetPanel
        title="Riders"
        description="Open a rider to review their ID document and booking history"
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {deletedRiders.length > 0 && (
              <div className="inline-flex shrink-0 rounded-md bg-slate-100/80 p-0.5">
                {([
                  ["active", "Riders", activeRiders.length],
                  ["deleted", "Deleted", deletedRiders.length],
                ] as const).map(([key, label, count]) => (
                  <button
                    key={key}
                    onClick={() => setRiderTab(key)}
                    className={`inline-flex h-7 items-center gap-1.5 rounded px-2.5 text-[12px] font-medium transition-colors ${riderTab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                  >
                    {label}
                    <span className="text-[10px] tabular-nums text-slate-400">{count}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="relative w-full sm:w-60">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={riderSearch}
                onChange={(e) => setRiderSearch(e.target.value)}
                placeholder="Search name, email or phone"
                className="h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-2.5 text-[13px] outline-none transition focus:border-[#FE5300] focus:ring-2 focus:ring-orange-100"
              />
            </div>
          </div>
        }
      >
        {canDeleteRider && selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-100 bg-red-50/60 px-4 py-2">
            <span className="text-[12px] font-medium text-slate-800">
              {selectedIds.size} rider{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setSelectedIds(new Set())} className="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
                Clear
              </button>
              <button onClick={openBulkDeleteModal} className="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 bg-red-600 text-white hover:bg-red-700">
                <Trash2 size={12} /> Delete selected
              </button>
            </div>
          </div>
        )}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" message="Loading riders..." />
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-[13px] text-red-600 dark:text-red-400">Error: {String((error as Error)?.message)}</p>
            </div>
          ) : riders.length === 0 ? (
            <FleetEmptyState
              icon={Users}
              title={riderTab === "deleted" ? "No deleted riders" : "No riders found"}
              hint={searchQuery ? "Try a different search." : undefined}
            />
          ) : (
            <>
              {/* Mobile list */}
              <ul className="divide-y divide-slate-100 md:hidden">
                {riders.map((rider) => (
                  <li key={rider._id} className="flex items-center">
                    {canDeleteRider && (
                      <label className="flex shrink-0 items-center self-stretch pl-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ${rider.fullName}`}
                          disabled={rider.status === "Deleted"}
                          checked={selectedIds.has(rider._id)}
                          onChange={() => toggleSelected(rider._id)}
                          className="h-3.5 w-3.5 rounded border-slate-300 accent-[#FE5300] disabled:opacity-30"
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedRiderId(rider._id)}
                      className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                    >
                      {renderAvatar(rider)}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-slate-900">{rider.fullName}</p>
                        <p className="truncate text-[11px] text-slate-500">{rider.email}{rider.mobileNumber ? ` · ${rider.mobileNumber}` : ""}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {renderDocBadge(rider)}
                          {renderVerifiedBadge(rider)}
                        </div>
                      </div>
                      <ChevronRight size={14} className="shrink-0 text-slate-300" />
                    </button>
                  </li>
                ))}
              </ul>

              {/* Desktop table */}
              <div className="hidden md:block">
                <Table className="table-fixed text-[13px]">
                  <TableHeader className="bg-slate-50/60">
                    <TableRow className="border-slate-100 hover:bg-transparent">
                      {canDeleteRider && (
                        <TableHead className={`w-[40px] pl-4 ${fleetTh}`}>
                          <input
                            type="checkbox"
                            aria-label="Select all visible riders"
                            disabled={selectableRiders.length === 0}
                            checked={allVisibleSelected}
                            onChange={toggleSelectAllVisible}
                            className="h-3.5 w-3.5 rounded border-slate-300 accent-[#FE5300] disabled:opacity-30"
                          />
                        </TableHead>
                      )}
                      <TableHead className={`pl-4 ${fleetTh}`}>Rider</TableHead>
                      <TableHead className={`hidden w-[150px] lg:table-cell ${fleetTh}`}>Mobile</TableHead>
                      <TableHead className={`w-[140px] ${fleetTh}`}>Document</TableHead>
                      <TableHead className={`w-[130px] ${fleetTh}`}>Verification</TableHead>
                      <TableHead className={`w-[56px] pr-4 ${fleetTh}`} />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {riders.map((rider) => (
                      <TableRow
                        key={rider._id}
                        className={`group cursor-pointer border-slate-100 transition-colors hover:bg-slate-50/70 ${selectedIds.has(rider._id) ? "bg-orange-50/40" : ""}`}
                        onClick={() => setSelectedRiderId(rider._id)}
                      >
                        {canDeleteRider && (
                          <TableCell className="pl-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={`Select ${rider.fullName}`}
                              disabled={rider.status === "Deleted"}
                              checked={selectedIds.has(rider._id)}
                              onChange={() => toggleSelected(rider._id)}
                              className="h-3.5 w-3.5 rounded border-slate-300 accent-[#FE5300] disabled:opacity-30"
                            />
                          </TableCell>
                        )}
                        <TableCell className="pl-4 py-2.5 whitespace-normal">
                          <div className="flex min-w-0 items-center gap-3">
                            {renderAvatar(rider)}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900">{rider.fullName}</p>
                              <p className="truncate text-[11px] text-slate-500" title={rider.email}>{rider.email}</p>
                              <p className="text-[11px] tabular-nums text-slate-500 lg:hidden">{rider.mobileNumber || "—"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden py-2.5 tabular-nums text-slate-700 lg:table-cell">{rider.mobileNumber || <span className="text-slate-400">—</span>}</TableCell>
                        <TableCell className="py-2.5">{renderDocBadge(rider)}</TableCell>
                        <TableCell className="py-2.5">{renderVerifiedBadge(rider)}</TableCell>
                        <TableCell className="pr-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedRiderId(rider._id)}
                            title="View rider"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors group-hover:bg-white group-hover:text-slate-700 group-hover:shadow-sm group-hover:ring-1 group-hover:ring-slate-200"
                          >
                            <ChevronRight size={15} />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
      </FleetPanel>

      <Sheet open={!!selectedRiderId} onOpenChange={(open) => !open && setSelectedRiderId(null)}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto bg-slate-50 p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-slate-200 bg-white px-5 py-4">
            <SheetTitle className="text-[15px] font-semibold">{detail?.profile.fullName || "Rider detail"}</SheetTitle>
            <SheetDescription className="text-[12px]">{detail?.auth?.email}</SheetDescription>
          </SheetHeader>

          <div className="p-5">
          {isDetailLoading || !detail ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" message="Loading rider..." />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Profile + verify action */}
              <section className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {detail.profile.profilePicture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={detail.profile.profilePicture} alt={detail.profile.fullName} className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 text-sm font-semibold text-orange-700 ring-1 ring-orange-200">
                        {detail.profile.fullName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[14px] font-semibold text-slate-900">{detail.profile.fullName}</p>
                        {detail.profile.isVerified ? (
                          <FleetPill className={fleetTone.emerald}>Verified</FleetPill>
                        ) : (
                          <FleetPill className={fleetTone.slate}>Not verified</FleetPill>
                        )}
                      </div>
                      <p className="text-[12px] tabular-nums text-slate-500">{detail.profile.mobileNumber || "—"}</p>
                      <p className="text-[11px] text-slate-400">Wallet ₹{detail.profile.walletBalance.toLocaleString("en-IN")}</p>
                    </div>
                  </div>

                  {detail.profile.isVerified ? (
                    <Button size="sm" variant="outline" className={fleetBtnSm} disabled={isActing} onClick={() => handleSetVerified(false)}>
                      Revoke verification
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className={`${fleetBtnSm} bg-[#FE5300] hover:bg-[#e54b00]`}
                      disabled={isActing}
                      onClick={() => handleSetVerified(true)}
                    >
                      Mark verified
                    </Button>
                  )}
                </div>
              </section>

              {detail.auth?.status === "Deleted" ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <div className="flex min-w-0 items-start gap-2 text-[12px] text-slate-600">
                    <Trash2 size={13} className="mt-0.5 shrink-0 text-slate-400" />
                    <span className="min-w-0">
                      <span className="font-medium text-slate-800">Account deleted</span>
                      {detail.auth.deletedAt ? ` on ${new Date(detail.auth.deletedAt).toLocaleDateString()}` : ""}
                      {detail.auth.deleteReason ? <> · <span className="italic">{detail.auth.deleteReason}</span></> : null}
                      <span className="block text-[11px] text-slate-500">Login is disabled. Bookings, documents and wallet are kept.</span>
                    </span>
                  </div>
                  {canRestoreRider && (
                    <button onClick={restoreDeletedRider} disabled={isRestoring} className="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 h-8 border border-slate-200 bg-white px-3 text-[12px] text-slate-700 hover:bg-slate-100">
                      <RotateCcw size={13} /> {isRestoring ? "Restoring…" : "Restore"}
                    </button>
                  )}
                </div>
              ) : (
                canDeleteRider && (
                  <div className="flex justify-end">
                    <button onClick={openDeleteModal} className="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 h-8 px-3 text-[12px] text-red-600 hover:bg-red-50">
                      <Trash2 size={13} /> Delete rider
                    </button>
                  </div>
                )
              )}

              {/* Document */}
              <section className="rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
                  <h3 className="text-[12px] font-semibold text-slate-700">ID document</h3>
                  {detail.document && (
                    <FleetPill className={getDocStatusColor(detail.document.status)}>{detail.document.status}</FleetPill>
                  )}
                </header>
                <div className="p-4">
                {!detail.document ? (
                  <p className="py-2 text-center text-[12px] text-slate-400">No document submitted yet</p>
                ) : (
                  <>
                    <dl className="mb-3 grid grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <dt className="text-[11px] font-medium text-slate-500">Document name</dt>
                        <dd className="mt-0.5 break-words text-[13px] font-medium text-slate-900">{detail.document.documentName || "—"}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[11px] font-medium text-slate-500">Document ID</dt>
                        <dd className="mt-0.5 break-words font-mono text-[13px] text-slate-900">{detail.document.documentIdNumber || "—"}</dd>
                      </div>
                    </dl>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        ["Front", detail.document.fileUrlFront],
                        ["Back", detail.document.fileUrlBack],
                      ] as const).map(([label, url]) => (
                        <div key={label}>
                          <p className="mb-1 text-[11px] font-medium text-slate-500">{label}</p>
                          {url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={url}
                              alt={`Document ${label.toLowerCase()}`}
                              className="h-28 w-full cursor-zoom-in rounded-md object-cover ring-1 ring-slate-200 transition-opacity hover:opacity-80"
                              onClick={() => setLightboxImage(url)}
                            />
                          ) : (
                            <div className="flex h-28 w-full items-center justify-center rounded-md border border-dashed border-slate-200 text-[11px] text-slate-400">
                              Not uploaded
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {detail.document.status === "Rejected" && detail.document.remarks && (
                      <p className="mt-3 rounded-md bg-red-50 px-2.5 py-1.5 text-[12px] text-red-700">Reason: {detail.document.remarks}</p>
                    )}
                    {detail.document.status !== "Approved" && (
                      <div className="mt-3 flex justify-end gap-1.5 border-t border-slate-100 pt-3">
                        <Button size="sm" variant="outline" className={`${fleetBtnSm} text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600`} disabled={isActing} onClick={() => handleReviewDocument("Rejected")}>
                          Reject document
                        </Button>
                        <Button size="sm" className={`${fleetBtnSm} bg-emerald-600 hover:bg-emerald-700`} disabled={isActing} onClick={() => handleReviewDocument("Approved")}>
                          Approve document
                        </Button>
                      </div>
                    )}
                  </>
                )}
                </div>
              </section>

              {/* Booking history */}
              <section className="rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
                  <h3 className="text-[12px] font-semibold text-slate-700">Booking history</h3>
                  <span className="rounded bg-slate-100 px-1.5 text-[10px] tabular-nums text-slate-600">{detail.bookings.length}</span>
                </header>
                {detail.bookings.length === 0 ? (
                  <p className="py-6 text-center text-[12px] text-slate-400">No bookings yet</p>
                ) : (
                  <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                    {detail.bookings.map((b) => (
                      <li key={b._id} className="flex flex-col gap-1.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-slate-900 dark:text-white">
                            {b.pickup} → {b.drop}
                          </p>
                          <p className="text-[11px] text-slate-500">{b.rideDate} • {b.rideTime} • {b.vehicleCategory}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 sm:ml-2">
                          <FleetPill className={getRideStatusColor(b.status)}>{formatRideStatus(b.status)}</FleetPill>
                          <span className="text-[13px] font-semibold tabular-nums text-slate-900 dark:text-white">₹{b.totalAmount.toLocaleString("en-IN")}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
          </div>
        </SheetContent>
      </Sheet>

      {/* SINGLE DELETE (soft delete) — Radix Dialog so it works on top of the Sheet */}
      <Dialog open={!!deleteModal} onOpenChange={(open) => !open && !isDeleting && setDeleteModal(null)}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-md">
          <div className="flex items-start gap-3 px-5 pt-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Trash2 size={16} />
            </div>
            <div className="pr-6">
              <DialogTitle className="text-[14px] font-semibold text-slate-900">Delete rider account</DialogTitle>
              <DialogDescription className="mt-0.5 text-[12px] text-slate-500">
                {detail?.profile.fullName || "This rider"} will no longer be able to log in. Bookings, documents and wallet
                history are kept, and the email stays reserved.
              </DialogDescription>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
            {!deleteModal || deleteModal.loading || !deleteModal.impact ? (
              <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2.5 text-[12px] text-slate-500">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                Checking open rides and wallet…
              </div>
            ) : (
              (() => {
                const impact = deleteModal.impact;
                const warnings = [
                  impact.openRides > 0 && `${impact.openRides} booking${impact.openRides > 1 ? "s are" : " is"} still open (booked, paid or in progress).`,
                  impact.walletBalance > 0 && `₹${impact.walletBalance.toLocaleString("en-IN")} wallet balance remains.`,
                ].filter(Boolean) as string[];
                return warnings.length > 0 ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-amber-800"><AlertTriangle size={13} /> Open items — you can still delete</p>
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[12px] text-amber-800">
                      {warnings.map((w) => <li key={w}>{w}</li>)}
                    </ul>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
                    <CheckCircle size={13} /> No open bookings or wallet balance.
                    {impact.totalRides > 0 && <span>{impact.totalRides} past booking(s) stay in history.</span>}
                  </div>
                );
              })()
            )}
            <label className="mt-4 block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Reason (required)</span>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="h-16 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-[12px] outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                placeholder="e.g. Duplicate account, requested by rider, fraud…"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">
                Type <span className="font-mono text-slate-800">{detail?.auth?.email}</span> to confirm
              </span>
              <input
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                autoComplete="off"
                className="h-8 w-full rounded-md border border-slate-200 px-2.5 text-[12px] outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            <button onClick={() => setDeleteModal(null)} disabled={isDeleting} className="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 h-8 border border-slate-200 bg-white px-3 text-[12px] text-slate-700 hover:bg-slate-50">Cancel</button>
            <button
              onClick={confirmDeleteRider}
              disabled={
                isDeleting ||
                !deleteModal ||
                deleteModal.loading ||
                !deleteReason.trim() ||
                !detail?.auth?.email ||
                deleteConfirmEmail.trim().toLowerCase() !== detail.auth.email.toLowerCase()
              }
              className="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 h-8 bg-red-600 px-3 text-[12px] text-white shadow-sm hover:bg-red-700"
            >
              <Trash2 size={13} /> {isDeleting ? "Deleting…" : "Delete rider"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* BULK DELETE (soft delete) */}
      <Dialog open={!!bulkModal} onOpenChange={(open) => !open && !isBulkDeleting && setBulkModal(null)}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0 sm:max-w-lg">
          <div className="flex items-start gap-3 px-5 pt-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <Trash2 size={16} />
            </div>
            <div className="pr-6">
              <DialogTitle className="text-[14px] font-semibold text-slate-900">
                Delete {selectedIds.size} rider account{selectedIds.size > 1 ? "s" : ""}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-[12px] text-slate-500">
                They will no longer be able to log in. Bookings, documents and wallets are kept, emails stay reserved, and a
                superadmin can restore each account.
              </DialogDescription>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
            <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200">
              <ul className="divide-y divide-slate-100">
                {[...selectedIds].map((id) => (
                  <li key={id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-[12px]">
                    <span className="truncate text-slate-800">{riderName(id)}</span>
                    <span className="shrink-0 truncate text-[11px] text-slate-400">{allRiders.find((r) => r._id === id)?.email}</span>
                  </li>
                ))}
              </ul>
            </div>
            {!bulkModal || bulkModal.loading ? (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2.5 text-[12px] text-slate-500">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                Checking open bookings and wallets…
              </div>
            ) : (
              (() => {
                const withOpenItems = bulkModal.rows.filter((r) => r.openRides > 0 || r.walletBalance > 0);
                return withOpenItems.length > 0 ? (
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-amber-800">
                      <AlertTriangle size={13} /> {withOpenItems.length} rider{withOpenItems.length > 1 ? "s have" : " has"} open items — you can still delete
                    </p>
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[12px] text-amber-800">
                      {withOpenItems.map((r) => (
                        <li key={String(r.riderId)}>
                          <span className="font-medium">{riderName(String(r.riderId))}</span>:{" "}
                          {[
                            r.openRides > 0 && `${r.openRides} open booking(s)`,
                            r.walletBalance > 0 && `₹${r.walletBalance.toLocaleString("en-IN")} wallet`,
                          ].filter(Boolean).join(", ")}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
                    <CheckCircle size={13} /> None of these riders has an open booking or wallet balance.
                  </div>
                );
              })()
            )}
            <label className="mt-4 block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">Reason (required)</span>
              <textarea
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                className="h-16 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-[12px] outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                placeholder="e.g. Test / duplicate signups cleanup"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-medium text-slate-500">
                Type <span className="font-mono text-slate-800">{bulkConfirmPhrase}</span> to confirm
              </span>
              <input
                value={bulkConfirmText}
                onChange={(e) => setBulkConfirmText(e.target.value)}
                autoComplete="off"
                className="h-8 w-full rounded-md border border-slate-200 px-2.5 font-mono text-[12px] outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            <button onClick={() => setBulkModal(null)} disabled={isBulkDeleting} className="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 h-8 border border-slate-200 bg-white px-3 text-[12px] text-slate-700 hover:bg-slate-50">Cancel</button>
            <button
              onClick={confirmBulkDelete}
              disabled={isBulkDeleting || !bulkModal || bulkModal.loading || !bulkReason.trim() || bulkConfirmText.trim() !== bulkConfirmPhrase}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 h-8 bg-red-600 px-3 text-[12px] text-white shadow-sm hover:bg-red-700"
            >
              <Trash2 size={13} /> {isBulkDeleting ? "Deleting…" : `Delete ${selectedIds.size} rider${selectedIds.size > 1 ? "s" : ""}`}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="max-w-3xl p-2 bg-transparent border-0 shadow-none">
          <DialogTitle className="sr-only">Document preview</DialogTitle>
          <DialogDescription className="sr-only">Enlarged view of the uploaded document image</DialogDescription>
          {lightboxImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lightboxImage} alt="Document preview" className="w-full max-h-[85vh] object-contain rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </FleetPage>
  );
}

export default RiderVerificationPage;
