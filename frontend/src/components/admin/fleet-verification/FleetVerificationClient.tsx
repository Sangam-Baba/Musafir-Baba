"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Ban, Building2, Camera, Car, Check, CheckCircle, ChevronRight, Clock, ExternalLink, FileText, Hourglass,
  Landmark, Mail, MapPin, MessageSquare, PauseCircle, Pencil, Phone, RefreshCw, Search, Send, Settings2,
  ShieldCheck, UserRoundCheck, Users, X, XCircle, Trash2, RotateCcw, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";

interface ActionLog {
  _id: string;
  actionType: string;
  oldStatus: string;
  newStatus: string;
  reasons: string[];
  comment: string;
  createdAt: string;
}

interface DeleteImpact {
  email: string;
  status: string;
  hasProfile: boolean;
  activeRides: number;
  totalRides: number;
  walletBalance: number;
  pendingWalletBalance: number;
}

interface BulkDeleteImpactRow extends DeleteImpact {
  partnerId: string;
}

interface PartnerData {
  auth: {
    _id: string;
    email: string;
    status: string;
    isEmailVerified: boolean;
    createdAt: string;
    deletedAt?: string;
    deleteReason?: string;
  };
  profile: {
    fullName: string;
    mobileNumber: string;
    city: string;
    state: string;
    partnerType: string;
    agencyName?: string;
    profilePicture?: string;
  } | null;
  address?: {
    addressLine?: string;
    pincode?: string;
    city?: string;
    state?: string;
  } | null;
  bank?: {
    _id?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
    status?: string;
  } | null;
  settings?: {
    vehicleConfigs?: Array<any>;
  } | null;
  stats: {
    vehicles: number;
    drivers: number;
    pendingDocuments: number;
    rejectedDocuments: number;
  };
  documents: Array<{
    _id: string;
    documentType: string;
    fileUrl: string;
    status: string;
    remarks?: string;
  }>;
  vehicles: Array<{
    _id: string;
    brand: string;
    model: string;
    vehicleName: string;
    category: string;
    seatingCapacity: string;
    registrationNumber: string;
    assignedDriverId?: string;
    rcImageUrl?: string;
    pucImageUrl?: string;
    insuranceFileUrl?: string;
    permitFileUrl?: string;
    frontImageUrl?: string;
    rearImageUrl?: string;
    leftSideImageUrl?: string;
    rightSideImageUrl?: string;
    interiorImageUrl?: string;
    otherImageUrl?: string;
    engineNumber?: string;
    chassisNumber?: string;
    manufacturingYear?: number;
    permitDetails?: {
      hasCommercialPermit?: boolean;
      permitNumber?: string;
    };
  }>;
  drivers: Array<{
    _id: string;
    name: string;
    mobile: string;
    licenceNumber: string;
    licenceExpiry?: string;
    experienceYears?: number;
    licenceImageUrl: string;
    status: string;
  }>;
}

// ---------------------------------------------------------------------------
// Presentation helpers (display only — no data logic). Kept at module level
// so React does not remount them (and drop input focus) on every render.
// ---------------------------------------------------------------------------
const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  Active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  Approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  Verified: { label: "Verified", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  PendingVerification: { label: "Pending review", cls: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
  Pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
  Hold: { label: "On hold", cls: "bg-orange-50 text-orange-700 ring-orange-600/20", dot: "bg-orange-500" },
  Rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500" },
  Blacklisted: { label: "Blacklisted", cls: "bg-slate-900 text-white ring-slate-900", dot: "bg-white" },
  "In-Active": { label: "Inactive", cls: "bg-slate-50 text-slate-600 ring-slate-500/20", dot: "bg-slate-400" },
  Draft: { label: "Draft", cls: "bg-slate-50 text-slate-600 ring-slate-500/20", dot: "bg-slate-400" },
  Deleted: { label: "Deleted", cls: "bg-slate-100 text-slate-500 ring-slate-400/30", dot: "bg-slate-400" },
};

const StatusPill = ({ status, fallback = "Pending" }: { status?: string; fallback?: string }) => {
  const value = status || fallback;
  const meta = STATUS_META[value] || { label: value, cls: "bg-slate-50 text-slate-600 ring-slate-500/20", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${meta.cls}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
      <span className="truncate">{meta.label}</span>
    </span>
  );
};

const AVATAR_TONES = [
  "bg-orange-50 text-orange-700 ring-orange-200",
  "bg-sky-50 text-sky-700 ring-sky-200",
  "bg-violet-50 text-violet-700 ring-violet-200",
  "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "bg-rose-50 text-rose-700 ring-rose-200",
  "bg-slate-100 text-slate-700 ring-slate-200",
];
const initialsOf = (name?: string) =>
  (name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join("") || "?";
const Avatar = ({ name, src, size = "sm" }: { name?: string; src?: string; size?: "sm" | "lg" }) => {
  const dims = size === "lg" ? "h-11 w-11 text-sm" : "h-8 w-8 text-[11px]";
  const tone = AVATAR_TONES[(name || "?").charCodeAt(0) % AVATAR_TONES.length];
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name || "Partner"} className={`${dims} shrink-0 rounded-full object-cover ring-1 ring-slate-200`} />
  ) : (
    <div className={`${dims} shrink-0 rounded-full ring-1 flex items-center justify-center font-semibold ${tone}`}>{initialsOf(name)}</div>
  );
};

// Small labelled value used across the drawer sections
const Field = ({ label, value, mono, wide }: { label: string; value?: React.ReactNode; mono?: boolean; wide?: boolean }) => (
  <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
    <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
    <dd className={`mt-0.5 text-[13px] text-slate-900 break-words ${mono ? "font-mono tracking-tight" : "font-medium"}`}>{value || <span className="text-slate-400 font-normal">—</span>}</dd>
  </div>
);

const Section = ({ title, icon: Icon, action, children }: { title: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode }) => (
  <section className="rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
    <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
      <h3 className="flex items-center gap-2 text-[12px] font-semibold text-slate-700">
        <Icon size={14} className="text-slate-400" />
        {title}
      </h3>
      {action}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

const miniBtn = "inline-flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const rejectBtn = `${miniBtn} border border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600`;
const approveBtn = `${miniBtn} border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700`;
const fileChip = "inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900 transition-colors";

const inputCls = "h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-slate-900 shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition focus:border-[#FE5300] focus:ring-2 focus:ring-orange-100";

export default function FleetVerificationClient() {
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<PartnerData | null>(null);
  const [activeAdminTab, setActiveAdminTab] = useState<"profile" | "bank" | "assets" | "documents" | "settings">("profile");
  const [logs, setLogs] = useState<ActionLog[]>([]);
  // The list is loaded without inline images/files (?lite=true); the full
  // record for the opened partner is fetched on demand.
  const [detailsLoading, setDetailsLoading] = useState(false);
  // List view: client-side search + status filter (display only)
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState("all");

  // Soft delete (admin / superadmin) and restore (superadmin)
  const role = useAdminAuthStore((s) => s.role);
  const canDeletePartner = role === "admin" || role === "superadmin";
  const canRestorePartner = role === "superadmin";
  const [deleteModal, setDeleteModal] = useState<{ loading: boolean; impact: DeleteImpact | null } | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Bulk soft delete (admin / superadmin). Selection is always a subset of
  // the rows currently on screen: it is cleared whenever the filter/search
  // changes so nothing hidden can be deleted by accident.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<{ loading: boolean; rows: BulkDeleteImpactRow[] } | null>(null);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkConfirmText, setBulkConfirmText] = useState("");
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [listStatus, listSearch]);
  const detailsRequestRef = useRef<string | null>(null);
  
  const [statusModal, setStatusModal] = useState<{ isOpen: boolean; status: string } | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [adminComment, setAdminComment] = useState("");
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    fullName: "",
    mobileNumber: "",
    city: "",
    state: "",
    partnerType: "",
    agencyName: "",
    addressLine: "",
    pincode: "",
  });
  
  const accessToken = useAdminAuthStore((s) => s.accessToken);

  const REJECTION_REASONS = [
    "Basic info not correct",
    "Document not clear",
    "Documents are not correct",
    "Driver information missing or incorrect",
    "Vehicle details invalid",
    "Bank details invalid",
    "Other"
  ];

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-verification/pending?lite=true`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setPartners(json.data || []);
      }
    } catch (error) {
      toast.error("Failed to load partners");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (partnerId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-verification/${partnerId}/logs`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch logs");
    }
  };

  const handleSelectPartner = (partner: PartnerData) => {
    setSelectedPartner(partner);
    setActiveAdminTab("profile");
    setIsEditingProfile(false);
    setEditProfileForm({
      fullName: partner.profile?.fullName || "",
      mobileNumber: partner.profile?.mobileNumber || "",
      city: partner.address?.city || "",
      state: partner.address?.state || "",
      partnerType: partner.profile?.partnerType || "",
      agencyName: partner.profile?.agencyName || "",
      addressLine: partner.address?.addressLine || "",
      pincode: partner.address?.pincode || "",
    });
    fetchLogs(partner.auth._id);
    fetchPartnerDetails(partner.auth._id);
  };

  const fetchPartnerDetails = async (partnerId: string) => {
    detailsRequestRef.current = partnerId;
    setDetailsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-verification/${partnerId}/details`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        // Ignore stale responses if the admin has opened another partner since.
        if (json.data && detailsRequestRef.current === partnerId) {
          setSelectedPartner((prev) => (prev && prev.auth._id === partnerId ? json.data : prev));
        }
      } else if (detailsRequestRef.current === partnerId) {
        toast.error("Failed to load partner details");
      }
    } catch (error) {
      if (detailsRequestRef.current === partnerId) toast.error("Failed to load partner details");
    } finally {
      if (detailsRequestRef.current === partnerId) setDetailsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!selectedPartner) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-verification/${selectedPartner.auth._id}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(editProfileForm),
      });
      if (res.ok) {
        toast.success("Profile updated successfully");
        setIsEditingProfile(false);
        fetchPartners();
        setSelectedPartner(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            profile: {
              ...prev.profile,
              ...editProfileForm
            } as any,
            address: {
              ...prev.address,
              addressLine: editProfileForm.addressLine,
              pincode: editProfileForm.pincode,
              city: editProfileForm.city,
              state: editProfileForm.state,
            }
          };
        });
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to update profile");
      }
    } catch (error) {
      toast.error("An error occurred while updating profile");
    }
  };

  const updateStatus = async (status: string, overrideReasons?: string[], overrideComment?: string) => {
    if (!selectedPartner) return;
    
    // If rejecting or holding, open modal to gather reasons
    if ((status === "Rejected" || status === "Hold") && !statusModal && !overrideReasons) {
      setStatusModal({ isOpen: true, status });
      setSelectedReasons([]);
      setAdminComment("");
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-verification/${selectedPartner.auth._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${useAdminAuthStore.getState().accessToken}`,
        },
        body: JSON.stringify({ 
          status, 
          reasons: overrideReasons || selectedReasons, 
          comment: overrideComment || adminComment 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Partner status updated to ${status}`);
        fetchPartners();
        if (statusModal) setStatusModal(null);
        setSelectedPartner({...selectedPartner, auth: {...selectedPartner.auth, status: status}});
      } else {
        toast.error(data.message || "Failed to update status");
      }
    } catch (error) {
      toast.error("An error occurred while updating status");
    }
  };

  const verifyBank = async (bankId: string, status: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-verification/bank/${bankId}/verify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${useAdminAuthStore.getState().accessToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Bank marked as ${status}`);
        if (selectedPartner?.bank) {
           setSelectedPartner({...selectedPartner, bank: {...selectedPartner.bank, status: status}});
        }
      } else {
        toast.error(data.message || "Failed to verify bank");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const verifyDocument = async (documentId: string, status: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-verification/document/${documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${useAdminAuthStore.getState().accessToken}`,
        },
        body: JSON.stringify({ status, remarks: status === 'Rejected' ? 'Document issue' : undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Document marked as ${status}`);
        if (selectedPartner?.documents) {
           const updatedDocs = selectedPartner.documents.map(d => d._id === documentId ? {...d, status: status} : d);
           setSelectedPartner({...selectedPartner, documents: updatedDocs});
        }
      } else {
        toast.error(data.message || "Failed to verify document");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const verifyVehicle = async (vehicleId: string, status: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-verification/vehicle/${vehicleId}/verify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${useAdminAuthStore.getState().accessToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Vehicle marked as ${status}`);
        if (selectedPartner?.vehicles) {
           const updatedVehicles = selectedPartner.vehicles.map(v => v._id === vehicleId ? {...v, status: status} : v);
           setSelectedPartner({...selectedPartner, vehicles: updatedVehicles});
        }
      } else {
        toast.error(data.message || "Failed to verify vehicle");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const verifyDriver = async (driverId: string, status: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-verification/driver/${driverId}/verify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${useAdminAuthStore.getState().accessToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Driver marked as ${status}`);
        if (selectedPartner?.drivers) {
           const updatedDrivers = selectedPartner.drivers.map(d => d._id === driverId ? {...d, status: status} : d);
           setSelectedPartner({...selectedPartner, drivers: updatedDrivers});
        }
      } else {
        toast.error(data.message || "Failed to verify driver");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const openDeleteModal = async () => {
    if (!selectedPartner) return;
    setDeleteReason("");
    setDeleteConfirmEmail("");
    setDeleteModal({ loading: true, impact: null });
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-verification/${selectedPartner.auth._id}/delete-impact`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setDeleteModal({ loading: false, impact: json.data });
      } else {
        toast.error(json.message || "Could not check this partner");
        setDeleteModal(null);
      }
    } catch (error) {
      toast.error("Could not check this partner");
      setDeleteModal(null);
    }
  };

  const confirmDeletePartner = async () => {
    if (!selectedPartner) return;
    const partnerId = selectedPartner.auth._id;
    setIsDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-verification/${partnerId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ reason: deleteReason.trim(), confirmEmail: deleteConfirmEmail.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Partner deleted. Their records are kept.");
        setDeleteModal(null);
        setSelectedPartner((prev) =>
          prev && prev.auth._id === partnerId
            ? { ...prev, auth: { ...prev.auth, status: "Deleted", deletedAt: new Date().toISOString(), deleteReason: deleteReason.trim() } }
            : prev
        );
        fetchPartners();
        fetchLogs(partnerId);
      } else {
        toast.error(json.message || "Failed to delete partner");
      }
    } catch (error) {
      toast.error("Failed to delete partner");
    } finally {
      setIsDeleting(false);
    }
  };

  const restoreDeletedPartner = async () => {
    if (!selectedPartner) return;
    const partnerId = selectedPartner.auth._id;
    if (!window.confirm("Restore this partner account to its previous status?")) return;
    setIsRestoring(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-verification/${partnerId}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Partner restored");
        setSelectedPartner((prev) =>
          prev && prev.auth._id === partnerId
            ? { ...prev, auth: { ...prev.auth, status: json.data?.status || "In-Active", deletedAt: undefined, deleteReason: undefined } }
            : prev
        );
        fetchPartners();
        fetchLogs(partnerId);
      } else {
        toast.error(json.message || "Failed to restore partner");
      }
    } catch (error) {
      toast.error("Failed to restore partner");
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-verification/bulk-delete-impact`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ partnerIds: ids }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setBulkModal({ loading: false, rows: json.data || [] });
      } else {
        toast.error(json.message || "Could not check the selected partners");
        setBulkModal(null);
      }
    } catch (error) {
      toast.error("Could not check the selected partners");
      setBulkModal(null);
    }
  };

  const confirmBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-verification/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ partnerIds: ids, reason: bulkReason.trim(), confirmText: bulkConfirmText.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const { deleted = [], skipped = [], failed = [] } = json.data || {};
        if (failed.length) toast.error(json.message);
        else if (skipped.length) toast.warning(json.message);
        else toast.success(`${deleted.length} partner(s) deleted. Their records are kept.`);
        setBulkModal(null);
        setSelectedIds(new Set());
        fetchPartners();
      } else {
        toast.error(json.message || "Bulk delete failed");
      }
    } catch (error) {
      toast.error("Bulk delete failed");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const addManualComment = async () => {
    if (!selectedPartner || !adminComment.trim()) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-verification/${selectedPartner.auth._id}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ comment: adminComment }),
      });
      if (res.ok) {
        toast.success("Comment added and partner notified.");
        setAdminComment("");
        fetchLogs(selectedPartner.auth._id);
      }
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 animate-pulse">
        <div className="space-y-2">
          <div className="h-3 w-40 rounded bg-slate-200" />
          <div className="h-5 w-64 rounded bg-slate-200" />
        </div>
        <div className="h-[62px] rounded-lg border border-slate-200/80 bg-white" />
        <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white">
          <div className="h-12 border-b border-slate-100" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
              <div className="h-8 w-8 rounded-full bg-slate-100" />
              <div className="h-3 w-48 rounded bg-slate-100" />
              <div className="ml-auto h-4 w-20 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const partnerStats = {
    total: partners.filter((p) => p.auth.status !== "Deleted").length,
    deleted: partners.filter((p) => p.auth.status === "Deleted").length,
    pending: partners.filter((p) => p.auth.status === "PendingVerification").length,
    hold: partners.filter((p) => p.auth.status === "Hold").length,
    rejected: partners.filter((p) => p.auth.status === "Rejected" || p.auth.status === "Blacklisted").length,
  };

  const partnerDisplayName = (partner: PartnerData) =>
    partner.profile?.agencyName ? partner.profile.agencyName : (partner.profile?.fullName || "Incomplete Profile");

  // Client-side search / status filter over the already-loaded list
  const STATUS_FILTERS = [
    { key: "all", label: "All", count: partnerStats.total },
    { key: "PendingVerification", label: "Pending", count: partnerStats.pending },
    { key: "Hold", label: "On hold", count: partnerStats.hold },
    { key: "Rejected", label: "Rejected", count: partnerStats.rejected },
    ...(partnerStats.deleted > 0 ? [{ key: "Deleted", label: "Deleted", count: partnerStats.deleted }] : []),
  ];
  const q = listSearch.trim().toLowerCase();
  const visiblePartners = partners.filter((p) => {
    // Deleted partners only show under their own tab
    if (listStatus !== "Deleted" && p.auth.status === "Deleted") return false;
    if (listStatus === "Rejected" && !(p.auth.status === "Rejected" || p.auth.status === "Blacklisted")) return false;
    if (listStatus !== "all" && listStatus !== "Rejected" && p.auth.status !== listStatus) return false;
    if (!q) return true;
    return [p.profile?.fullName, p.profile?.agencyName, p.profile?.mobileNumber, p.auth.email]
      .some((v) => (v || "").toLowerCase().includes(q));
  });

  // Only non-deleted rows on screen can be selected for bulk delete
  const selectablePartners = canDeletePartner ? visiblePartners.filter((p) => p.auth.status !== "Deleted") : [];
  const allVisibleSelected = selectablePartners.length > 0 && selectablePartners.every((p) => selectedIds.has(p.auth._id));
  const toggleSelectAllVisible = () =>
    setSelectedIds(allVisibleSelected ? new Set() : new Set(selectablePartners.map((p) => p.auth._id)));
  const bulkConfirmPhrase = `DELETE ${selectedIds.size}`;

  const ADMIN_TABS: Array<{ key: "profile" | "assets" | "documents" | "settings"; label: string; icon: React.ElementType; count?: number }> = selectedPartner
    ? [
        { key: "profile", label: "Profile & Bank", icon: Building2 },
        { key: "assets", label: "Fleet", icon: Car, count: (selectedPartner.drivers?.length || 0) + (selectedPartner.vehicles?.length || 0) },
        { key: "documents", label: "Documents", icon: FileText, count: selectedPartner.documents?.length || 0 },
        { key: "settings", label: "Settings", icon: Settings2, count: selectedPartner.settings?.vehicleConfigs?.length || 0 },
      ]
    : [];

  return (
    <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-5">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <span>Fleet Management</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="text-slate-700">Partner Verification</span>
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            <ShieldCheck size={18} className="text-[#FE5300]" />
            Fleet Verification Hub
          </h1>
          <p className="mt-0.5 text-[13px] text-slate-500">Review and verify partners, their fleet, drivers and documents.</p>
        </div>
        <button
          onClick={fetchPartners}
          className="inline-flex h-8 items-center gap-1.5 self-start rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:bg-slate-50 sm:self-auto"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:grid-cols-4">
        {[
          { label: "Total partners", value: partnerStats.total, icon: Users, tone: "text-slate-500 bg-slate-100" },
          { label: "Pending review", value: partnerStats.pending, icon: Hourglass, tone: "text-amber-600 bg-amber-50" },
          { label: "On hold", value: partnerStats.hold, icon: PauseCircle, tone: "text-orange-600 bg-orange-50" },
          { label: "Rejected / blacklisted", value: partnerStats.rejected, icon: Ban, tone: "text-red-600 bg-red-50" },
        ].map((kpi, i) => (
          <div
            key={kpi.label}
            className={`flex items-center gap-3 px-4 py-3 ${i % 2 === 1 ? "border-l border-slate-100" : ""} ${i >= 2 ? "border-t border-slate-100 lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${kpi.tone}`}>
              <kpi.icon size={15} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-slate-500">{kpi.label}</p>
              <p className="text-lg font-semibold leading-tight tabular-nums text-slate-900">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Partners table */}
      <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-1 overflow-x-auto rounded-md bg-slate-100/80 p-0.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setListStatus(f.key)}
                className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded px-2.5 text-[12px] font-medium transition-colors ${
                  listStatus === f.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {f.label}
                <span className={`rounded px-1 text-[10px] tabular-nums ${listStatus === f.key ? "bg-slate-100 text-slate-600" : "text-slate-400"}`}>{f.count}</span>
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Search name, phone or email"
              className={`${inputCls} pl-8`}
            />
          </div>
        </div>

        {canDeletePartner && selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-100 bg-red-50/60 px-4 py-2">
            <span className="text-[12px] font-medium text-slate-800">
              {selectedIds.size} partner{selectedIds.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSelectedIds(new Set())}
                className={`${miniBtn} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
              >
                Clear
              </button>
              <button onClick={openBulkDeleteModal} className={`${miniBtn} bg-red-600 text-white hover:bg-red-700`}>
                <Trash2 size={12} /> Delete selected
              </button>
            </div>
          </div>
        )}

        {visiblePartners.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <UserRoundCheck size={18} />
            </div>
            <p className="text-[13px] font-medium text-slate-700">No partners found</p>
            {(q || listStatus !== "all") && <p className="text-[12px] text-slate-500">Try a different search or filter.</p>}
          </div>
        ) : (
          <>
            {/* Mobile list */}
            <ul className="divide-y divide-slate-100 md:hidden">
              {visiblePartners.map((partner) => (
                <li key={partner.auth._id} className="flex items-center">
                  {canDeletePartner && (
                    <label className="flex shrink-0 items-center self-stretch pl-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${partnerDisplayName(partner)}`}
                        disabled={partner.auth.status === "Deleted"}
                        checked={selectedIds.has(partner.auth._id)}
                        onChange={() => toggleSelected(partner.auth._id)}
                        className="h-3.5 w-3.5 rounded border-slate-300 accent-[#FE5300] disabled:opacity-30"
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSelectPartner(partner)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <Avatar name={partnerDisplayName(partner)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[13px] font-medium text-slate-900">{partnerDisplayName(partner)}</p>
                        <StatusPill status={partner.auth.status} />
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-slate-500">
                        {partner.profile?.mobileNumber || "No phone"} · {partner.stats.drivers} drivers · {partner.stats.vehicles} vehicles
                      </p>
                    </div>
                    <ChevronRight size={14} className="shrink-0 text-slate-300" />
                  </button>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="w-full table-fixed text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    {canDeletePartner && (
                      <th className="w-[40px] py-2 pl-4">
                        <input
                          type="checkbox"
                          aria-label="Select all visible partners"
                          disabled={selectablePartners.length === 0}
                          checked={allVisibleSelected}
                          onChange={toggleSelectAllVisible}
                          className="h-3.5 w-3.5 rounded border-slate-300 accent-[#FE5300] disabled:opacity-30"
                        />
                      </th>
                    )}
                    <th className="px-4 py-2 text-[11px] font-medium text-slate-500">Partner</th>
                    <th className="px-4 py-2 text-[11px] font-medium text-slate-500">Contact</th>
                    <th className="hidden w-[170px] px-4 py-2 text-[11px] font-medium text-slate-500 lg:table-cell">Fleet</th>
                    <th className="w-[150px] px-4 py-2 text-[11px] font-medium text-slate-500">Status</th>
                    <th className="w-[56px] px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visiblePartners.map((partner) => (
                    <tr
                      key={partner.auth._id}
                      onClick={() => handleSelectPartner(partner)}
                      className={`group cursor-pointer transition-colors hover:bg-slate-50/80 ${selectedIds.has(partner.auth._id) ? "bg-orange-50/40" : ""}`}
                    >
                      {canDeletePartner && (
                        <td className="py-2.5 pl-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Select ${partnerDisplayName(partner)}`}
                            disabled={partner.auth.status === "Deleted"}
                            checked={selectedIds.has(partner.auth._id)}
                            onChange={() => toggleSelected(partner.auth._id)}
                            className="h-3.5 w-3.5 rounded border-slate-300 accent-[#FE5300] disabled:opacity-30"
                          />
                        </td>
                      )}
                      <td className="px-4 py-2.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar name={partnerDisplayName(partner)} />
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-slate-900">{partnerDisplayName(partner)}</p>
                            <p className="truncate text-[11px] capitalize text-slate-500">
                              {partner.profile?.partnerType || "Unknown"}
                              <span className="lg:hidden"> · {partner.stats.drivers}D · {partner.stats.vehicles}V</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="truncate text-[13px] tabular-nums text-slate-700">{partner.profile?.mobileNumber || <span className="text-slate-400">—</span>}</p>
                        <p className="truncate text-[11px] text-slate-500" title={partner.auth.email}>{partner.auth.email}</p>
                      </td>
                      <td className="hidden px-4 py-2.5 lg:table-cell">
                        <div className="flex items-center gap-3 text-[12px] text-slate-600">
                          <span className="inline-flex items-center gap-1"><Users size={12} className="text-slate-400" />{partner.stats.drivers}</span>
                          <span className="inline-flex items-center gap-1"><Car size={12} className="text-slate-400" />{partner.stats.vehicles}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={partner.auth.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelectPartner(partner); }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors group-hover:bg-white group-hover:text-slate-700 group-hover:shadow-sm group-hover:ring-1 group-hover:ring-slate-200"
                          title="Review partner"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/40 px-4 py-2 text-[11px] text-slate-500">
          <span>Showing {visiblePartners.length} of {listStatus === "Deleted" ? partnerStats.deleted : partnerStats.total} partners</span>
        </div>
      </div>

      {/* REVIEW DRAWER */}
      {selectedPartner && !statusModal && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => setSelectedPartner(null)}></div>

          <div className="relative flex h-full w-full max-w-[1040px] flex-col bg-slate-50 shadow-2xl ring-1 ring-slate-900/5 animate-in slide-in-from-right duration-300">
            {/* Drawer header */}
            <div className="border-b border-slate-200 bg-white px-5 pt-4">
              <div className="flex items-start gap-3">
                <Avatar name={partnerDisplayName(selectedPartner)} src={selectedPartner.profile?.profilePicture} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-[15px] font-semibold text-slate-900">{partnerDisplayName(selectedPartner)}</h2>
                    <StatusPill status={selectedPartner.auth.status} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
                    <span className="inline-flex min-w-0 items-center gap-1"><Mail size={12} className="shrink-0" /><span className="truncate">{selectedPartner.auth.email}</span></span>
                    {selectedPartner.profile?.mobileNumber && (
                      <span className="inline-flex items-center gap-1"><Phone size={12} />{selectedPartner.profile.mobileNumber}</span>
                    )}
                    {selectedPartner.profile?.partnerType && (
                      <span className="inline-flex items-center gap-1 capitalize"><Building2 size={12} />{selectedPartner.profile.partnerType}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPartner(null)}
                  className="-mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {selectedPartner.auth.status === "Deleted" ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex min-w-0 items-start gap-2 text-[12px] text-slate-600">
                    <Trash2 size={13} className="mt-0.5 shrink-0 text-slate-400" />
                    <span className="min-w-0">
                      <span className="font-medium text-slate-800">Account deleted</span>
                      {selectedPartner.auth.deletedAt ? ` on ${new Date(selectedPartner.auth.deletedAt).toLocaleDateString()}` : ""}
                      {selectedPartner.auth.deleteReason ? <> · <span className="italic">{selectedPartner.auth.deleteReason}</span></> : null}
                      <span className="block text-[11px] text-slate-500">Login and ride dispatch are disabled. Rides, wallet history and documents are kept.</span>
                    </span>
                  </div>
                  {canRestorePartner && (
                    <button
                      onClick={restoreDeletedPartner}
                      disabled={isRestoring}
                      className={`${miniBtn} h-8 px-3 text-[12px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-100`}
                    >
                      <RotateCcw size={13} /> {isRestoring ? "Restoring…" : "Restore"}
                    </button>
                  )}
                </div>
              ) : (
              /* Decision toolbar */
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <button disabled={detailsLoading} onClick={() => updateStatus("Approved")} className={`${miniBtn} h-8 px-3 text-[12px] border border-emerald-600 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700`}>
                  <Check size={13} /> Approve
                </button>
                <button disabled={detailsLoading} onClick={() => updateStatus("Hold")} className={`${miniBtn} h-8 px-3 text-[12px] border border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700`}>
                  <PauseCircle size={13} /> Hold
                </button>
                <button disabled={detailsLoading} onClick={() => updateStatus("Rejected")} className={`${miniBtn} h-8 px-3 text-[12px] border border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600`}>
                  <XCircle size={13} /> Reject
                </button>
                <button disabled={detailsLoading} onClick={() => updateStatus("Blacklisted")} className={`${miniBtn} h-8 px-3 text-[12px] border border-slate-200 bg-white text-slate-700 hover:border-slate-800 hover:bg-slate-900 hover:text-white`}>
                  <Ban size={13} /> Blacklist
                </button>
                {canDeletePartner && (
                  <button
                    disabled={detailsLoading}
                    onClick={openDeleteModal}
                    className={`${miniBtn} ml-auto h-8 px-3 text-[12px] text-red-600 hover:bg-red-50`}
                  >
                    <Trash2 size={13} /> Delete partner
                  </button>
                )}
              </div>
              )}

              {/* Tabs */}
              <nav className="-mb-px mt-3 flex gap-4 overflow-x-auto">
                {ADMIN_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveAdminTab(tab.key)}
                    className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 pb-2.5 pt-1 text-[12px] font-medium transition-colors ${
                      activeAdminTab === tab.key ? "border-[#FE5300] text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <tab.icon size={13} className={activeAdminTab === tab.key ? "text-[#FE5300]" : "text-slate-400"} />
                    {tab.label}
                    {tab.count !== undefined && !detailsLoading && (
                      <span className="rounded bg-slate-100 px-1.5 text-[10px] tabular-nums text-slate-600">{tab.count}</span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Body: data | activity */}
            <div className="flex flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
              <div className="min-w-0 flex-1 p-4 md:overflow-y-auto md:p-5">
                {detailsLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="animate-pulse rounded-lg border border-slate-200/80 bg-white p-4">
                        <div className="h-3 w-32 rounded bg-slate-200" />
                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div className="h-3 rounded bg-slate-100" />
                          <div className="h-3 rounded bg-slate-100" />
                          <div className="h-3 rounded bg-slate-100" />
                          <div className="h-3 rounded bg-slate-100" />
                        </div>
                      </div>
                    ))}
                    <p className="text-center text-[11px] text-slate-400">Loading partner details…</p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {activeAdminTab === "profile" && (
                      <>
                        <Section
                          title="Entity profile"
                          icon={Building2}
                          action={
                            !isEditingProfile ? (
                              <button onClick={() => setIsEditingProfile(true)} className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-[#FE5300]">
                                <Pencil size={12} /> Edit
                              </button>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => setIsEditingProfile(false)} className={`${miniBtn} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}>Cancel</button>
                                <button onClick={handleUpdateProfile} className={`${miniBtn} bg-slate-900 text-white hover:bg-black`}>Save changes</button>
                              </div>
                            )
                          }
                        >
                          {!isEditingProfile ? (
                            <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
                              <Field label="Primary contact" value={selectedPartner.profile?.fullName} />
                              <Field label="Mobile number" value={selectedPartner.profile?.mobileNumber} mono />
                              <Field label="Partner type" value={selectedPartner.profile?.partnerType} />
                              {selectedPartner.profile?.agencyName && <Field label="Agency / company" value={selectedPartner.profile.agencyName} />}
                              <Field label="Address" value={selectedPartner.address?.addressLine} wide />
                              <Field label="City" value={selectedPartner.address?.city} />
                              <Field label="State" value={selectedPartner.address?.state} />
                              <Field label="PIN code" value={selectedPartner.address?.pincode} mono />
                            </dl>
                          ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {([
                                ["fullName", "Full name", false],
                                ["mobileNumber", "Mobile number", false],
                                ["addressLine", "Address line", true],
                                ["city", "City", false],
                                ["state", "State", false],
                                ["pincode", "PIN code", false],
                                ["partnerType", "Partner type", false],
                                ["agencyName", "Agency / company", true],
                              ] as const).map(([key, label, wide]) => (
                                <label key={key} className={`block ${wide ? "sm:col-span-2" : ""}`}>
                                  <span className="mb-1 block text-[11px] font-medium text-slate-500">{label}</span>
                                  <input
                                    type="text"
                                    className={inputCls}
                                    value={editProfileForm[key]}
                                    onChange={(e) => setEditProfileForm({ ...editProfileForm, [key]: e.target.value })}
                                  />
                                </label>
                              ))}
                            </div>
                          )}
                        </Section>

                        <Section
                          title="Bank details"
                          icon={Landmark}
                          action={selectedPartner.bank ? <StatusPill status={selectedPartner.bank.status} /> : undefined}
                        >
                          <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
                            <Field label="Bank name" value={selectedPartner.bank?.bankName} />
                            <Field label="Account holder" value={selectedPartner.bank?.accountHolderName} />
                            <Field label="Account number" value={selectedPartner.bank?.accountNumber} mono />
                            <Field label="IFSC code" value={selectedPartner.bank?.ifscCode} mono />
                          </dl>
                          {selectedPartner.bank && (
                            <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-3">
                              <button onClick={() => verifyBank(selectedPartner.bank!._id!, "Rejected")} className={rejectBtn}><X size={12} /> Reject</button>
                              <button onClick={() => verifyBank(selectedPartner.bank!._id!, "Verified")} className={approveBtn}><Check size={12} /> Verify bank</button>
                            </div>
                          )}
                        </Section>
                      </>
                    )}

                    {activeAdminTab === "assets" && (
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <Section title={`Drivers (${selectedPartner.drivers?.length || 0})`} icon={Users}>
                          {!selectedPartner.drivers?.length ? (
                            <p className="py-4 text-center text-[12px] text-slate-400">No drivers added</p>
                          ) : (
                            <ul className="-my-1 divide-y divide-slate-100">
                              {selectedPartner.drivers.map((d) => {
                                const assigned = selectedPartner.vehicles?.find((v) => v.assignedDriverId === d._id);
                                return (
                                  <li key={d._id} className="py-3 first:pt-1 last:pb-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex min-w-0 items-center gap-2.5">
                                        <Avatar name={d.name} />
                                        <div className="min-w-0">
                                          <p className="truncate text-[13px] font-medium text-slate-900">{d.name}</p>
                                          <p className="text-[11px] tabular-nums text-slate-500">{d.mobile}</p>
                                        </div>
                                      </div>
                                      <StatusPill status={d.status} />
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-700">{d.licenceNumber}</span>
                                      {d.experienceYears ? <span>{d.experienceYears} yrs exp</span> : null}
                                      {d.licenceExpiry ? <span>DL exp {new Date(d.licenceExpiry).toLocaleDateString()}</span> : null}
                                      {assigned && <span className="inline-flex items-center gap-1 text-sky-700"><Car size={11} />{assigned.brand} {assigned.vehicleName}</span>}
                                    </div>
                                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                                      {d.licenceImageUrl ? (
                                        <a href={d.licenceImageUrl} target="_blank" className={fileChip}><FileText size={11} /> Driving licence <ExternalLink size={10} /></a>
                                      ) : <span />}
                                      <div className="flex gap-1.5">
                                        <button onClick={() => verifyDriver(d._id, "Rejected")} className={rejectBtn}>Reject</button>
                                        <button onClick={() => verifyDriver(d._id, "Active")} className={approveBtn}>Verify</button>
                                      </div>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </Section>

                        <Section title={`Vehicles (${selectedPartner.vehicles?.length || 0})`} icon={Car}>
                          {!selectedPartner.vehicles?.length ? (
                            <p className="py-4 text-center text-[12px] text-slate-400">No vehicles added</p>
                          ) : (
                            <ul className="-my-1 divide-y divide-slate-100">
                              {selectedPartner.vehicles.map((v) => {
                                const files = [
                                  { url: v.rcImageUrl, label: "RC", icon: FileText },
                                  { url: v.pucImageUrl, label: "PUC", icon: FileText },
                                  { url: v.insuranceFileUrl, label: "Insurance", icon: FileText },
                                  { url: v.permitFileUrl, label: "Permit", icon: FileText },
                                  { url: v.frontImageUrl, label: "Front", icon: Camera },
                                  { url: v.rearImageUrl, label: "Rear", icon: Camera },
                                  { url: v.leftSideImageUrl, label: "Left", icon: Camera },
                                  { url: v.rightSideImageUrl, label: "Right", icon: Camera },
                                  { url: v.interiorImageUrl, label: "Interior", icon: Camera },
                                  { url: v.otherImageUrl, label: "Other", icon: Camera },
                                ].filter((f) => f.url);
                                return (
                                  <li key={v._id} className="py-3 first:pt-1 last:pb-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <p className="truncate text-[13px] font-medium text-slate-900">
                                          {v.brand} {v.vehicleName} <span className="font-normal text-slate-500">· {v.model}</span>
                                        </p>
                                        <p className="text-[11px] text-slate-500">{v.category} · {v.seatingCapacity} seater{v.manufacturingYear ? ` · ${v.manufacturingYear}` : ""}</p>
                                      </div>
                                      <StatusPill status={(v as any).status} />
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-700">{v.registrationNumber}</span>
                                      {v.engineNumber && <span>Eng {v.engineNumber}</span>}
                                      {v.chassisNumber && <span>Chassis {v.chassisNumber}</span>}
                                      {v.permitDetails?.hasCommercialPermit && (
                                        <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle size={11} />Permit {v.permitDetails.permitNumber}</span>
                                      )}
                                    </div>
                                    {files.length > 0 && (
                                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                                        {files.map((f) => (
                                          <a key={f.label} href={f.url} target="_blank" className={fileChip}><f.icon size={11} /> {f.label}</a>
                                        ))}
                                      </div>
                                    )}
                                    <div className="mt-2.5 flex justify-end gap-1.5">
                                      <button onClick={() => verifyVehicle(v._id, "Rejected")} className={rejectBtn}>Reject</button>
                                      <button onClick={() => verifyVehicle(v._id, "Active")} className={approveBtn}>Verify</button>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </Section>
                      </div>
                    )}

                    {activeAdminTab === "documents" && (
                      !selectedPartner.documents?.length ? (
                        <div className="rounded-lg border border-dashed border-slate-200 bg-white py-12 text-center text-[12px] text-slate-400">No documents uploaded</div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {selectedPartner.documents.map((doc) => {
                            const url = doc.fileUrl || "";
                            const isImage = !!url.match(/\.(jpeg|jpg|gif|png)$/i) || url.startsWith("data:image/");
                            return (
                              <div key={doc._id} className="group overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-md">
                                <a href={url || undefined} target="_blank" className="relative block h-32 bg-slate-100">
                                  {isImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={url} alt={doc.documentType} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-slate-400">
                                      <FileText size={20} />
                                      View document
                                    </div>
                                  )}
                                  <span className="absolute right-2 top-2 rounded-md bg-white/90 p-1 text-slate-500 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                                    <ExternalLink size={12} />
                                  </span>
                                </a>
                                <div className="p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="min-w-0 break-words text-[12px] font-medium text-slate-800">{doc.documentType}</p>
                                    <StatusPill status={doc.status} />
                                  </div>
                                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                                    <button onClick={() => verifyDocument(doc._id, "Rejected")} className={`${rejectBtn} justify-center`}>Reject</button>
                                    <button onClick={() => verifyDocument(doc._id, "Approved")} className={`${approveBtn} justify-center`}>Approve</button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}

                    {activeAdminTab === "settings" && (
                      <Section title="Vehicle settings & locations" icon={Settings2}>
                        {(!selectedPartner.settings?.vehicleConfigs || selectedPartner.settings.vehicleConfigs.length === 0) ? (
                          <p className="py-4 text-center text-[12px] text-slate-400">No settings configured yet</p>
                        ) : (
                          <div className="space-y-3">
                            {selectedPartner.settings.vehicleConfigs.map((config: any) => (
                              <div key={config.vehicleId} className="rounded-md border border-slate-200/80">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2">
                                  <p className="min-w-0 break-words text-[12px] font-medium text-slate-800">{config.vehicleName}</p>
                                  <span className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-600 ring-1 ring-slate-200">{config.registrationNumber}</span>
                                </div>
                                <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                                  <div className="px-3 py-2">
                                    <p className="text-[11px] text-slate-500">Per km rate</p>
                                    <p className="text-[13px] font-semibold tabular-nums text-slate-900">₹{config.perKmRate || 0}</p>
                                  </div>
                                  <div className="px-3 py-2">
                                    <p className="text-[11px] text-slate-500">Full day rate</p>
                                    <p className="text-[13px] font-semibold tabular-nums text-slate-900">₹{config.fullDayRate || 0}</p>
                                  </div>
                                </div>
                                {config.locations && config.locations.length > 0 && (
                                  <div className="px-3 py-2">
                                    <p className="mb-1.5 text-[11px] text-slate-500">Assigned locations ({config.locations.length})</p>
                                    <ul className="space-y-1">
                                      {config.locations.map((loc: any, idx: number) => (
                                        <li key={idx} className="flex items-center gap-1.5 text-[12px] text-slate-700">
                                          <MapPin size={11} className="shrink-0 text-slate-400" />
                                          <span className="truncate">{loc.address ? `${loc.address}, ` : ""}{loc.city}, {loc.state} {loc.pincode ? `(${loc.pincode})` : ""}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </Section>
                    )}
                  </div>
                )}
              </div>

              {/* Activity rail */}
              <aside className="flex w-full shrink-0 flex-col border-t border-slate-200 bg-white md:w-[300px] md:border-l md:border-t-0">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                  <h3 className="flex items-center gap-2 text-[12px] font-semibold text-slate-700">
                    <Clock size={13} className="text-slate-400" /> Activity
                  </h3>
                  <span className="text-[11px] tabular-nums text-slate-400">{logs.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3">
                  {logs.length === 0 ? (
                    <p className="py-8 text-center text-[12px] text-slate-400">No activity yet</p>
                  ) : (
                    <ol className="relative space-y-4 border-l border-slate-200 pl-4">
                      {logs.map((log) => (
                        <li key={log._id} className="relative">
                          <span className={`absolute -left-[21px] top-1 flex h-2.5 w-2.5 rounded-full ring-4 ring-white ${log.actionType === "StatusChange" ? (STATUS_META[log.newStatus]?.dot || "bg-slate-400") : "bg-sky-500"}`} />
                          {log.actionType === "StatusChange" ? (
                            <div>
                              <p className="text-[12px] text-slate-700">
                                Status changed to <span className="font-semibold text-slate-900">{STATUS_META[log.newStatus]?.label || log.newStatus}</span>
                              </p>
                              {log.reasons && log.reasons.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {log.reasons.map((r, i) => (
                                    <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{r}</span>
                                  ))}
                                </div>
                              )}
                              {log.comment && <p className="mt-1.5 rounded-md bg-slate-50 px-2 py-1.5 text-[11px] italic text-slate-600">&ldquo;{log.comment}&rdquo;</p>}
                            </div>
                          ) : (
                            <div>
                              <p className="flex items-center gap-1 text-[12px] font-medium text-sky-700"><MessageSquare size={11} /> Admin comment</p>
                              <p className="mt-1 rounded-md border border-sky-100 bg-sky-50/60 px-2 py-1.5 text-[12px] text-slate-700">{log.comment}</p>
                            </div>
                          )}
                          <p className="mt-1 text-[10px] tabular-nums text-slate-400">{new Date(log.createdAt).toLocaleString()}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                <div className="border-t border-slate-100 p-3">
                  <div className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] focus-within:border-[#FE5300] focus-within:ring-2 focus-within:ring-orange-100">
                    <textarea
                      value={adminComment}
                      onChange={(e) => setAdminComment(e.target.value)}
                      placeholder="Write a note — the partner will be notified"
                      className="block h-16 w-full resize-none rounded-t-lg bg-transparent px-3 py-2 text-[12px] text-slate-800 outline-none placeholder:text-slate-400"
                    ></textarea>
                    <div className="flex justify-end border-t border-slate-100 px-2 py-1.5">
                      <button
                        onClick={addManualComment}
                        disabled={!adminComment.trim()}
                        className={`${miniBtn} bg-slate-900 text-white hover:bg-black`}
                      >
                        <Send size={11} /> Post & notify
                      </button>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE MODAL (soft delete) */}
      {bulkModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-150" onClick={() => !isBulkDeleting && setBulkModal(null)}></div>
          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 px-5 pt-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <Trash2 size={16} />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-900">Delete {selectedIds.size} partner account{selectedIds.size > 1 ? "s" : ""}</h3>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    They will no longer be able to log in or receive rides. Rides, wallet history, documents and logs are kept,
                    emails stay reserved, and a superadmin can restore each account.
                  </p>
                </div>
              </div>
              <button onClick={() => setBulkModal(null)} disabled={isBulkDeleting} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={15} /></button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              {bulkModal.loading ? (
                <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2.5 text-[12px] text-slate-500">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                  Checking open rides and wallets…
                </div>
              ) : (
                (() => {
                  const withOpenItems = bulkModal.rows.filter((r) => r.activeRides > 0 || r.walletBalance > 0 || r.pendingWalletBalance > 0);
                  const nameFor = (id: string) => {
                    const p = partners.find((x) => x.auth._id === id);
                    return p ? partnerDisplayName(p) : id;
                  };
                  return (
                    <>
                      <div className="max-h-40 overflow-y-auto rounded-md border border-slate-200">
                        <ul className="divide-y divide-slate-100">
                          {[...selectedIds].map((id) => (
                            <li key={id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-[12px]">
                              <span className="truncate text-slate-800">{nameFor(id)}</span>
                              <span className="shrink-0 truncate text-[11px] text-slate-400">{partners.find((x) => x.auth._id === id)?.auth.email}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {withOpenItems.length > 0 ? (
                        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                          <p className="flex items-center gap-1.5 text-[12px] font-medium text-amber-800">
                            <AlertTriangle size={13} /> {withOpenItems.length} partner{withOpenItems.length > 1 ? "s have" : " has"} open items — you can still delete
                          </p>
                          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[12px] text-amber-800">
                            {withOpenItems.map((r) => (
                              <li key={String(r.partnerId)}>
                                <span className="font-medium">{nameFor(String(r.partnerId))}</span>:{" "}
                                {[
                                  r.activeRides > 0 && `${r.activeRides} ride(s) in progress`,
                                  r.walletBalance > 0 && `₹${r.walletBalance.toLocaleString("en-IN")} available`,
                                  r.pendingWalletBalance > 0 && `₹${r.pendingWalletBalance.toLocaleString("en-IN")} pending`,
                                ].filter(Boolean).join(", ")}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
                          <CheckCircle size={13} /> None of these partners has an active ride or unpaid balance.
                        </div>
                      )}
                    </>
                  );
                })()
              )}

              <label className="mt-4 block">
                <span className="mb-1 block text-[11px] font-medium text-slate-500">Reason (required, saved in each partner&apos;s activity log)</span>
                <textarea
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  className="h-16 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-[12px] text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  placeholder="e.g. Test / duplicate signups cleanup"
                ></textarea>
              </label>

              <label className="mt-3 block">
                <span className="mb-1 block text-[11px] font-medium text-slate-500">
                  Type <span className="font-mono text-slate-800">{bulkConfirmPhrase}</span> to confirm
                </span>
                <input
                  value={bulkConfirmText}
                  onChange={(e) => setBulkConfirmText(e.target.value)}
                  autoComplete="off"
                  className="h-8 w-full rounded-md border border-slate-200 px-2.5 font-mono text-[12px] text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
              <button onClick={() => setBulkModal(null)} disabled={isBulkDeleting} className={`${miniBtn} h-8 px-3 text-[12px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>Cancel</button>
              <button
                onClick={confirmBulkDelete}
                disabled={isBulkDeleting || bulkModal.loading || !bulkReason.trim() || bulkConfirmText.trim() !== bulkConfirmPhrase}
                className={`${miniBtn} h-8 px-3 text-[12px] bg-red-600 text-white shadow-sm hover:bg-red-700`}
              >
                <Trash2 size={13} /> {isBulkDeleting ? "Deleting…" : `Delete ${selectedIds.size} partner${selectedIds.size > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE PARTNER MODAL (soft delete) */}
      {deleteModal && selectedPartner && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-150" onClick={() => !isDeleting && setDeleteModal(null)}></div>
          <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 px-5 pt-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <Trash2 size={16} />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-900">Delete partner account</h3>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    {partnerDisplayName(selectedPartner)} will no longer be able to log in or receive rides. Rides, wallet history,
                    documents and logs are kept, and the email stays reserved.
                  </p>
                </div>
              </div>
              <button onClick={() => setDeleteModal(null)} disabled={isDeleting} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={15} /></button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              {deleteModal.loading || !deleteModal.impact ? (
                <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2.5 text-[12px] text-slate-500">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                  Checking open rides and wallet…
                </div>
              ) : (
                (() => {
                  const impact = deleteModal.impact;
                  const warnings = [
                    impact.activeRides > 0 && `${impact.activeRides} ride${impact.activeRides > 1 ? "s are" : " is"} in progress with this partner. Reassign ${impact.activeRides > 1 ? "them" : "it"} from Ride Bookings.`,
                    impact.walletBalance > 0 && `₹${impact.walletBalance.toLocaleString("en-IN")} available wallet balance is unpaid.`,
                    impact.pendingWalletBalance > 0 && `₹${impact.pendingWalletBalance.toLocaleString("en-IN")} pending earnings have not been released.`,
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
                      <CheckCircle size={13} /> No active rides or unpaid balance.
                      {impact.totalRides > 0 && <span className="text-emerald-700">{impact.totalRides} past ride(s) stay in history.</span>}
                    </div>
                  );
                })()
              )}

              <label className="mt-4 block">
                <span className="mb-1 block text-[11px] font-medium text-slate-500">Reason (required, saved in activity log)</span>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="h-16 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-[12px] text-slate-800 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  placeholder="e.g. Duplicate account, requested by partner, fraud…"
                ></textarea>
              </label>

              <label className="mt-3 block">
                <span className="mb-1 block text-[11px] font-medium text-slate-500">
                  Type <span className="font-mono text-slate-800">{selectedPartner.auth.email}</span> to confirm
                </span>
                <input
                  value={deleteConfirmEmail}
                  onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                  autoComplete="off"
                  className="h-8 w-full rounded-md border border-slate-200 px-2.5 text-[12px] text-slate-900 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
              <button onClick={() => setDeleteModal(null)} disabled={isDeleting} className={`${miniBtn} h-8 px-3 text-[12px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>Cancel</button>
              <button
                onClick={confirmDeletePartner}
                disabled={
                  isDeleting ||
                  deleteModal.loading ||
                  !deleteReason.trim() ||
                  deleteConfirmEmail.trim().toLowerCase() !== selectedPartner.auth.email.toLowerCase()
                }
                className={`${miniBtn} h-8 px-3 text-[12px] bg-red-600 text-white shadow-sm hover:bg-red-700`}
              >
                <Trash2 size={13} /> {isDeleting ? "Deleting…" : "Delete partner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION / HOLD MODAL */}
      {statusModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-150" onClick={() => setStatusModal(null)}></div>
          <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 px-5 pt-5">
              <div className="flex items-start gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${statusModal.status === "Hold" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
                  {statusModal.status === "Hold" ? <PauseCircle size={17} /> : <XCircle size={17} />}
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-900">{statusModal.status === "Hold" ? "Put partner on hold" : "Reject partner"}</h3>
                  <p className="mt-0.5 text-[12px] text-slate-500">Selected reasons are included in the email sent to the partner.</p>
                </div>
              </div>
              <button onClick={() => setStatusModal(null)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={15} /></button>
            </div>

            <div className="overflow-y-auto px-5 py-4">
              <div className="space-y-1">
                {REJECTION_REASONS.map((reason) => {
                  const checked = selectedReasons.includes(reason);
                  return (
                    <label key={reason} className={`flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-[12px] transition-colors ${checked ? "border-slate-300 bg-slate-50 text-slate-900" : "border-transparent text-slate-700 hover:bg-slate-50"}`}>
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300 accent-slate-900"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedReasons([...selectedReasons, reason]);
                          else setSelectedReasons(selectedReasons.filter((r) => r !== reason));
                        }}
                      />
                      {reason}
                    </label>
                  );
                })}
              </div>

              <label className="mt-4 block">
                <span className="mb-1 block text-[11px] font-medium text-slate-500">Additional comments (optional)</span>
                <textarea
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  className="h-20 w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-[12px] text-slate-800 outline-none transition focus:border-[#FE5300] focus:ring-2 focus:ring-orange-100"
                  placeholder="Provide specific feedback…"
                ></textarea>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
              <button onClick={() => setStatusModal(null)} className={`${miniBtn} h-8 px-3 text-[12px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>Cancel</button>
              <button
                onClick={() => updateStatus(statusModal.status)}
                className={`${miniBtn} h-8 px-3 text-[12px] text-white shadow-sm ${statusModal.status === "Hold" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"}`}
              >
                Confirm {statusModal.status === "Hold" ? "hold" : "rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
