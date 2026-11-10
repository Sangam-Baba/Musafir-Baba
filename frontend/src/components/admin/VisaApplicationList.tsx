"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, X, User, Mail, FileText, ChevronLeft, ChevronRight, Smartphone, RotateCcw, ExternalLink, Globe, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { FleetEmptyState, FleetPill, fleetTh, fleetTone } from "@/components/admin/fleet/FleetUI";
import { cn } from "@/lib/utils";

interface VisaApplication {
  _id: string;
  applicationId?: string;
  visaId: {
    _id: string;
    title: string;
    country: string;
    visas?: Array<{
      _id: string;
      visaType?: string;
      visaPurpose?: string;
      visaValidity?: string;
      visaDuration?: string;
      entryType?: string;
      validityEntries?: Array<{ visaValidity?: string; visaDuration?: string; entryType?: string }>;
    }>;
  };
  userId: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  email: string;
  phone: string;
  travellers: Array<{
    firstName: string;
    lastName: string;
    dob: string;
    gender: string;
  }>;
  applicationStatus: string;
  returnReason?: string;
  paymentInfo?: {
    status: string;
    amount: number;
    txnid: string;
  };
  documents: Array<{
    name: string;
    media: { url: string };
    travellerId?: string;
  }>;
  createdAt: string;
  // Set only on applications made from the MBGo rider app.
  riderId?: { _id: string; fullName?: string; mobileNumber?: string } | null;
  selectedVisaId?: string;
  selectedValidityIndex?: number;
  isExpress?: boolean;
  totalCost?: number;
  eligibility?: { purpose?: string; travelDate?: string; stayDuration?: string; travellerCount?: number };
  resubmittedAt?: string;
}

// Chosen visa type + validity, e.g. "Tourist · 60 Days · Single Entry".
const getChosenVisaLabel = (app: VisaApplication) => {
  const card = app.visaId?.visas?.find((v) => v._id === app.selectedVisaId);
  if (!card) return "";
  const entry = card.validityEntries?.[app.selectedValidityIndex ?? 0] || card;
  return [card.visaType || card.visaPurpose, entry.visaValidity || entry.visaDuration, entry.entryType].filter(Boolean).join(" · ");
};

interface VisaApplicationListProps {
  applications: VisaApplication[];
  onStatusUpdate: () => void;
}

// ---- Display-only helpers ----
const statusTone = (status: string) => {
  switch (status) {
    case "Approved": return fleetTone.emerald;
    case "Returned":
    case "Rejected": return fleetTone.red;
    case "Applied":
    case "Submitted": return fleetTone.sky;
    case "Under Review":
    case "Pending": return fleetTone.amber;
    case "Reviewed":
    case "Processing": return fleetTone.violet;
    default: return fleetTone.slate;
  }
};

function StatusPill({ status }: { status: string }) {
  return <FleetPill className={statusTone(status)}>{status || "-"}</FleetPill>;
}

const applicantName = (app: VisaApplication) =>
  app.userId?.name || (app.riderId ? app.riderId.fullName || app.riderId.mobileNumber || "MBGo Rider" : "Guest User");

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

const formatDay = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "-";

const SectionTitle = ({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) => (
  <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
    <Icon size={12} className="text-[#FE5300]" /> {children}
  </h4>
);

const Field = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={cn("flex min-w-0 flex-col", className)}>
    <span className="text-[11px] text-slate-500">{label}</span>
    <span className="min-w-0 text-[13px] font-medium text-slate-800">{children}</span>
  </div>
);

export default function VisaApplicationList({ applications, onStatusUpdate }: VisaApplicationListProps) {
  const [selectedApp, setSelectedApp] = useState<VisaApplication | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const accessToken = useAdminAuthStore((state) => state.accessToken);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalItems = applications.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedData = applications.slice(startIndex, startIndex + itemsPerPage);

  const handleUpdateStatus = async (id: string, status: string, reason?: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa-application/status/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status, returnReason: reason }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success(`Application ${status} successfully`);
      onStatusUpdate();
      setSelectedApp(null);
      setReturnReason("");
    } catch (error) {
      toast.error("Error updating status");
    } finally {
      setIsUpdating(false);
    }
  };

  if (totalItems === 0) {
    return <FleetEmptyState icon={Globe} title="No visa applications found" hint="Try a different search or status filter." />;
  }

  return (
    <div className="w-full">
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
              <TableHead className={cn(fleetTh, "w-[130px] pl-4")}>Application</TableHead>
              <TableHead className={fleetTh}>Applicant</TableHead>
              <TableHead className={fleetTh}>Visa</TableHead>
              <TableHead className={fleetTh}>Travellers</TableHead>
              <TableHead className={fleetTh}>Status</TableHead>
              <TableHead className={fleetTh}>Submitted</TableHead>
              <TableHead className={cn(fleetTh, "pr-4 text-right")}>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((app) => (
              <TableRow
                key={app._id}
                onClick={() => setSelectedApp(app)}
                className="group cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-orange-50/30"
              >
                <TableCell className="py-3 pl-4">
                  <span className="font-mono text-[12px] font-semibold text-[#FE5300]">{app.applicationId || "DRAFT"}</span>
                </TableCell>
                <TableCell className="max-w-[230px] py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-inset", avatarTone(app._id))}>
                      {initials(applicantName(app))}
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-[13px] font-medium capitalize text-slate-900" title={app.userId?.name || app.riderId?.fullName || "Guest User"}>
                          {applicantName(app)}
                        </p>
                        {app.riderId && !app.userId && (
                          <FleetPill className={fleetTone.orange} dot={false}>
                            <span className="inline-flex items-center gap-1"><Smartphone size={10} /> MBGo</span>
                          </FleetPill>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-slate-500" title={app.userId?.email || app.email}>
                        {app.userId?.email || app.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="max-w-[300px] py-3">
                  <p className="truncate text-[13px] text-slate-800" title={app.visaId?.title}>
                    {app.visaId?.title || <span className="text-slate-300">-</span>}
                  </p>
                  {app.visaId?.country && (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] capitalize text-slate-500">
                      <Globe size={11} className="text-slate-400" /> {app.visaId.country.replace(/-/g, " ")}
                    </p>
                  )}
                </TableCell>
                <TableCell className="py-3">
                  <span className="inline-flex items-center gap-1 text-[12px] tabular-nums text-slate-600">
                    <Users size={12} className="text-slate-400" /> {app.travellers?.length || 0} pax
                  </span>
                </TableCell>
                <TableCell className="py-3">
                  <StatusPill status={app.applicationStatus} />
                </TableCell>
                <TableCell className="whitespace-nowrap py-3 text-[12px] tabular-nums text-slate-600">
                  {formatDay(app.createdAt)}
                </TableCell>
                <TableCell className="py-3 pr-4 text-right">
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedApp(app);
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md p-0 text-slate-400 transition-colors hover:bg-orange-50 hover:text-[#FE5300]"
                    aria-label={`View application ${app.applicationId || ""}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile list */}
      <div className="divide-y divide-slate-100 md:hidden">
        {paginatedData.map((app) => (
          <button
            key={app._id}
            type="button"
            onClick={() => setSelectedApp(app)}
            className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-orange-50/30"
          >
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-inset", avatarTone(app._id))}>
              {initials(applicantName(app))}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[13px] font-medium capitalize text-slate-900">{applicantName(app)}</p>
                <span className="shrink-0 font-mono text-[11px] font-semibold text-[#FE5300]">{app.applicationId || "DRAFT"}</span>
              </div>
              <p className="truncate text-[12px] text-slate-700">{app.visaId?.title || "-"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <StatusPill status={app.applicationStatus} />
                <span className="text-[11px] text-slate-500">{app.travellers?.length || 0} pax</span>
                <span className="ml-auto text-[11px] tabular-nums text-slate-400">{formatDay(app.createdAt)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-slate-500">
          Showing {totalItems > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 rounded-md border-slate-200 bg-white p-0 hover:bg-slate-50"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={activePage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1 px-1">
               {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                 let pageNum = activePage;
                 if (totalPages <= 5) pageNum = i + 1;
                 else if (activePage <= 3) pageNum = i + 1;
                 else if (activePage >= totalPages - 2) pageNum = totalPages - 4 + i;
                 else pageNum = activePage - 2 + i;

                 if (pageNum > totalPages) return null;

                 return (
                   <Button
                     key={pageNum}
                     variant={activePage === pageNum ? "default" : "ghost"}
                     size="sm"
                     className={`h-8 min-w-8 rounded-md px-2 text-[12px] tabular-nums ${activePage === pageNum ? 'bg-[#FE5300] font-semibold text-white hover:bg-[#FE5300]' : 'text-slate-600 hover:bg-orange-50 hover:text-[#FE5300]'}`}
                     onClick={() => setCurrentPage(pageNum)}
                   >
                     {pageNum}
                   </Button>
                 );
               })}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 rounded-md border-slate-200 bg-white p-0 hover:bg-slate-50"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={activePage >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[2px]">
            {/* Backdrop clickable overlay */}
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => setSelectedApp(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="relative z-10 flex h-full w-full max-w-[480px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl sm:max-w-[540px]"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ring-1 ring-inset", avatarTone(selectedApp._id))}>
                    {initials(applicantName(selectedApp))}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold capitalize text-slate-900">{applicantName(selectedApp)}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] font-semibold text-[#FE5300]">{selectedApp.applicationId || "DRAFT"}</span>
                      <StatusPill status={selectedApp.applicationStatus} />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {/* Visa summary */}
                <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-4">
                  <span className="text-[11px] text-slate-500">Applied for</span>
                  <p className="mt-0.5 text-[13px] font-semibold text-slate-900">{selectedApp.visaId?.title || "-"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
                    {selectedApp.visaId?.country && (
                      <span className="inline-flex items-center gap-1 capitalize"><Globe size={12} /> {selectedApp.visaId.country.replace(/-/g, " ")}</span>
                    )}
                    <span className="inline-flex items-center gap-1"><Users size={12} /> {selectedApp.travellers?.length || 0} pax</span>
                    <span>Submitted {formatDay(selectedApp.createdAt)}</span>
                  </div>
                </div>

                {/* Account details if user is logged in */}
                {selectedApp.userId && (
                  <section>
                    <SectionTitle icon={Mail}>Account contact</SectionTitle>
                    <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200/80 p-3">
                      <Field label="Email">
                        <span className="block truncate">{selectedApp.userId.email}</span>
                      </Field>
                      <Field label="Phone">{selectedApp.userId.phone || "N/A"}</Field>
                    </div>
                  </section>
                )}

                {/* MBGo app applicant: rider, chosen visa option and eligibility answers */}
                {selectedApp.riderId && (
                  <section>
                    <SectionTitle icon={Smartphone}>MBGo app application</SectionTitle>
                    <div className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200/80 p-3">
                      <Field label="Rider">
                        {selectedApp.riderId.fullName || "N/A"}
                        <span className="block text-[12px] font-normal text-slate-500">{selectedApp.riderId.mobileNumber || ""}</span>
                      </Field>
                      <Field label="Contact given">
                        <span className="block truncate">{selectedApp.email || "N/A"}</span>
                        <span className="block text-[12px] font-normal text-slate-500">{selectedApp.phone || ""}</span>
                      </Field>
                      <Field label="Visa option" className="col-span-2">
                        {getChosenVisaLabel(selectedApp) || "N/A"}
                        {selectedApp.isExpress ? " · Express" : ""}
                        {typeof selectedApp.totalCost === "number" && (
                          <span className="block text-[12px] font-normal text-slate-500">Total ₹{selectedApp.totalCost.toLocaleString("en-IN")} · Payment {selectedApp.paymentInfo?.status || "Pending"}</span>
                        )}
                      </Field>
                      {selectedApp.eligibility && (selectedApp.eligibility.purpose || selectedApp.eligibility.travelDate || selectedApp.eligibility.stayDuration) && (
                        <Field label="Eligibility answers" className="col-span-2">
                          <span className="font-normal text-slate-600">
                            {[
                              selectedApp.eligibility.purpose,
                              selectedApp.eligibility.travelDate && `Travel ${selectedApp.eligibility.travelDate}`,
                              selectedApp.eligibility.stayDuration && `Stay ${selectedApp.eligibility.stayDuration}`,
                            ].filter(Boolean).join(" · ")}
                          </span>
                        </Field>
                      )}
                      {selectedApp.resubmittedAt && (
                        <Field label="Resubmitted after return" className="col-span-2">
                          <span className="font-normal text-slate-600">
                            {new Date(selectedApp.resubmittedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            {selectedApp.returnReason ? ` · Earlier reason: ${selectedApp.returnReason}` : ""}
                          </span>
                        </Field>
                      )}
                    </div>
                  </section>
                )}

                {/* Traveller details */}
                <section>
                  <SectionTitle icon={User}>Travellers ({selectedApp.travellers?.length || 0} pax)</SectionTitle>
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200/80">
                    {selectedApp.travellers?.map((pax, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium capitalize text-slate-900">{pax.firstName} {pax.lastName}</p>
                          <p className="text-[11px] text-slate-500">
                            DOB {pax.dob} · <span className="capitalize">{pax.gender}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Documents categorized */}
                <section className="space-y-3">
                  <SectionTitle icon={FileText}>Documents</SectionTitle>

                  {selectedApp.travellers?.map((pax, pIdx) => {
                    const paxDocs = selectedApp.documents?.filter(d => d.travellerId === pIdx.toString() || d.travellerId === (pIdx + 1).toString());
                    if (paxDocs?.length === 0) return null;

                    return (
                      <div key={pIdx} className="space-y-1.5">
                        <p className="text-[11px] font-medium capitalize text-slate-500">{pax.firstName} {pax.lastName}</p>
                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                          {paxDocs?.map((doc, i) => (
                            <a
                              key={i}
                              href={doc.media.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group/doc flex items-center gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2.5 transition-colors hover:border-orange-200 hover:bg-orange-50/40"
                            >
                              <div className="rounded-md bg-orange-50 p-1.5 text-[#FE5300] transition-colors group-hover/doc:bg-[#FE5300] group-hover/doc:text-white">
                                <FileText size={14} />
                              </div>
                              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-slate-700">{doc.name}</span>
                              <ExternalLink size={12} className="shrink-0 text-slate-300 group-hover/doc:text-[#FE5300]" />
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* General legacy/general documents */}
                  {selectedApp.documents?.filter(d => !d.travellerId).length > 0 && (
                    <div className="space-y-1.5 border-t border-slate-100 pt-3">
                      <p className="text-[11px] font-medium text-slate-500">General documents</p>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {selectedApp.documents?.filter(d => !d.travellerId).map((doc, i) => (
                          <a
                            key={i}
                            href={doc.media.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/doc flex items-center gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2.5 transition-colors hover:bg-slate-50"
                          >
                            <div className="rounded-md bg-slate-100 p-1.5 text-slate-400 transition-colors group-hover/doc:bg-slate-400 group-hover/doc:text-white">
                              <FileText size={14} />
                            </div>
                            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-slate-700">{doc.name}</span>
                            <ExternalLink size={12} className="shrink-0 text-slate-300" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {/* Return Reason for Returned status */}
                {selectedApp.applicationStatus === "Returned" && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50/60 p-3">
                    <div className="rounded-md bg-red-100 p-1.5 text-red-600">
                       <RotateCcw size={14} />
                    </div>
                    <div className="flex flex-col">
                      <p className="mb-0.5 text-[11px] font-medium text-red-600">Return reason</p>
                      <p className="text-[12px] leading-relaxed text-red-700">{selectedApp.returnReason}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Update CTA footer wrapper */}
              {(selectedApp.applicationStatus === "Applied" || selectedApp.applicationStatus === "Under Review" || selectedApp.applicationStatus === "Reviewed" || selectedApp.applicationStatus === "Processing" || selectedApp.applicationStatus === "Submitted") && (
                <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-5">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-slate-500">Update status, or add a reason to return it</p>
                    <Input
                      className="h-9 rounded-md border-slate-200 bg-white text-[12px] focus-visible:ring-1 focus-visible:ring-[#FE5300] focus-visible:ring-offset-0"
                      placeholder="e.g., Passport photo is blurry..."
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    {(selectedApp.applicationStatus === "Applied" || selectedApp.applicationStatus === "Submitted") && (
                      <Button
                        className="h-9 flex-1 rounded-md bg-[#FE5300] text-[12px] font-semibold text-white hover:bg-[#e44a00]"
                        onClick={() => handleUpdateStatus(selectedApp._id, "Reviewed")}
                        disabled={isUpdating}
                      >
                        Mark Reviewed
                      </Button>
                    )}

                    {selectedApp.applicationStatus === "Reviewed" && (
                      <Button
                        className="h-9 flex-1 rounded-md bg-sky-600 text-[12px] font-semibold text-white hover:bg-sky-700"
                        onClick={() => handleUpdateStatus(selectedApp._id, "Processing")}
                        disabled={isUpdating}
                      >
                        Mark Processing
                      </Button>
                    )}

                    {(selectedApp.applicationStatus === "Reviewed" || selectedApp.applicationStatus === "Processing") && (
                      <Button
                        className="h-9 flex-1 rounded-md bg-emerald-600 text-[12px] font-semibold text-white hover:bg-emerald-700"
                        onClick={() => handleUpdateStatus(selectedApp._id, "Approved")}
                        disabled={isUpdating}
                      >
                        Approve Final
                      </Button>
                    )}

                    <Button
                      variant="destructive"
                      className="h-9 flex-1 rounded-md text-[12px] font-semibold"
                      onClick={() => handleUpdateStatus(selectedApp._id, "Returned", returnReason)}
                      disabled={isUpdating || !returnReason}
                    >
                      <RotateCcw size={14} className="mr-1.5" />
                      Return
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
