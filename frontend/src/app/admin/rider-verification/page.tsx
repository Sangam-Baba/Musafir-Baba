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
  auth: { email: string; isEmailVerified: boolean; status: string } | null;
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
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-800";
  if (status === "CANCELLED") return "bg-red-100 text-red-800";
  if (status === "AWAITING_ASSIGNMENT" || status === "PAID") return "bg-amber-100 text-amber-800";
  if (["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED", "ONGOING"].includes(status)) return "bg-sky-100 text-sky-800";
  return "bg-slate-100 text-slate-800";
};

const getDocStatusColor = (status?: string) => {
  if (status === "Approved") return "bg-emerald-100 text-emerald-800";
  if (status === "Rejected") return "bg-red-100 text-red-800";
  if (status === "Pending") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-800";
};

function RiderVerificationPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore((state) => state.permissions) as string[];
  const role = useAdminAuthStore((state) => state.role);
  const queryClient = useQueryClient();

  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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

  const riders = data?.data ?? [];
  const stats = {
    total: data?.total ?? 0,
    verified: riders.filter((r) => r.isVerified).length,
    pendingDocs: riders.filter((r) => r.document?.status === "Pending").length,
    noDocs: riders.filter((r) => !r.document).length,
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

  if (!(role === "admin" || role === "superadmin" || permissions.includes("partner-verification"))) {
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Rider Verification</h1>
        <p className="text-slate-500 dark:text-slate-400">
          Review rider ID documents and booking history, and mark riders verified once eligible.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Riders</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Verified</p>
            <p className="text-3xl font-bold text-emerald-600">{stats.verified}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">Documents Pending Review</p>
            <p className="text-3xl font-bold text-amber-600">{stats.pendingDocs}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">No Document Submitted</p>
            <p className="text-3xl font-bold text-slate-600">{stats.noDocs}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle>Riders</CardTitle>
          <CardDescription>Click a rider to view their document and booking history</CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" message="Loading riders..." />
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-red-600 dark:text-red-400">Error: {String((error as Error)?.message)}</p>
            </div>
          ) : riders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400">No riders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-200 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="font-semibold">Rider</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Mobile</TableHead>
                    <TableHead className="font-semibold">Document</TableHead>
                    <TableHead className="font-semibold">Verified</TableHead>
                    <TableHead className="text-right font-semibold">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {riders.map((rider) => (
                    <TableRow
                      key={rider._id}
                      className="border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedRiderId(rider._id)}
                    >
                      <TableCell className="font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          {rider.profilePicture ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={rider.profilePicture} alt={rider.fullName} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                          )}
                          {rider.fullName}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{rider.email}</TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{rider.mobileNumber || "-"}</TableCell>
                      <TableCell>
                        {rider.document ? (
                          <Badge className={`${getDocStatusColor(rider.document.status)} border-0`}>
                            {rider.document.status}
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border-0">Not submitted</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {rider.isVerified ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-0">Verified</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-500 border-0">Not Verified</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedRiderId(rider._id)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedRiderId} onOpenChange={(open) => !open && setSelectedRiderId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detail?.profile.fullName || "Rider Detail"}</SheetTitle>
            <SheetDescription>{detail?.auth?.email}</SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-6">
          {isDetailLoading || !detail ? (
            <div className="flex justify-center py-12">
              <Loader size="lg" message="Loading rider..." />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Picture + Verify Action */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  {detail.profile.profilePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={detail.profile.profilePicture} alt={detail.profile.fullName} className="w-16 h-16 rounded-full object-cover border" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500">
                      No photo
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{detail.profile.fullName}</p>
                    <p className="text-sm text-slate-500">{detail.profile.mobileNumber || "-"}</p>
                    <p className="text-xs text-slate-400">Wallet: ₹{detail.profile.walletBalance.toLocaleString("en-IN")}</p>
                  </div>
                </div>

                {detail.profile.isVerified ? (
                  <Button size="sm" variant="outline" disabled={isActing} onClick={() => handleSetVerified(false)}>
                    Revoke Verification
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-[#FE5300] hover:bg-[#FE5300]"
                    disabled={isActing}
                    onClick={() => handleSetVerified(true)}
                  >
                    Mark Verified
                  </Button>
                )}
              </div>

              {/* Document */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-900 dark:text-white">ID Document</h3>
                  {detail.document && (
                    <Badge className={`${getDocStatusColor(detail.document.status)} border-0`}>{detail.document.status}</Badge>
                  )}
                </div>

                {!detail.document ? (
                  <p className="text-sm text-slate-500">No document submitted yet.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-400">Document Name</p>
                        <p className="text-slate-900 dark:text-white font-medium">{detail.document.documentName || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Document ID</p>
                        <p className="text-slate-900 dark:text-white font-medium">{detail.document.documentIdNumber || "-"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 max-w-xs">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Front</p>
                        {detail.document.fileUrlFront ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={detail.document.fileUrlFront}
                            alt="Document front"
                            className="w-full h-20 object-cover rounded-lg border cursor-zoom-in hover:opacity-80 transition-opacity"
                            onClick={() => setLightboxImage(detail.document!.fileUrlFront!)}
                          />
                        ) : (
                          <div className="w-full h-20 rounded-lg border border-dashed flex items-center justify-center text-xs text-slate-400">
                            Not uploaded
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Back</p>
                        {detail.document.fileUrlBack ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={detail.document.fileUrlBack}
                            alt="Document back"
                            className="w-full h-20 object-cover rounded-lg border cursor-zoom-in hover:opacity-80 transition-opacity"
                            onClick={() => setLightboxImage(detail.document!.fileUrlBack!)}
                          />
                        ) : (
                          <div className="w-full h-20 rounded-lg border border-dashed flex items-center justify-center text-xs text-slate-400">
                            Not uploaded
                          </div>
                        )}
                      </div>
                    </div>
                    {detail.document.status === "Rejected" && detail.document.remarks && (
                      <p className="text-xs text-red-600 mt-2">Reason: {detail.document.remarks}</p>
                    )}
                    {detail.document.status !== "Approved" && (
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-600" disabled={isActing} onClick={() => handleReviewDocument("Approved")}>
                          Approve Document
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" disabled={isActing} onClick={() => handleReviewDocument("Rejected")}>
                          Reject Document
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Booking History */}
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Booking History ({detail.bookings.length})</h3>
                {detail.bookings.length === 0 ? (
                  <p className="text-sm text-slate-500">No bookings yet.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {detail.bookings.map((b) => (
                      <div key={b._id} className="flex items-center justify-between border rounded-lg p-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">
                            {b.pickup} → {b.drop}
                          </p>
                          <p className="text-xs text-slate-400">{b.rideDate} • {b.rideTime} • {b.vehicleCategory}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <Badge className={`${getRideStatusColor(b.status)} border-0`}>{b.status.replace(/_/g, " ")}</Badge>
                          <span className="font-semibold text-slate-900 dark:text-white">₹{b.totalAmount.toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </SheetContent>
      </Sheet>

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
    </main>
  );
}

export default RiderVerificationPage;
