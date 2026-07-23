"use client";

import React, { useState, useEffect } from "react";
import { UserRoundCheck, Car, FileText, CheckCircle, XCircle, ChevronRight, X, ShieldAlert, MessageSquare, Clock, ArrowRight } from "lucide-react";
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

interface PartnerData {
  auth: {
    _id: string;
    email: string;
    status: string;
    isEmailVerified: boolean;
    createdAt: string;
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
    verificationStatus: string;
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
  }>;
  drivers: Array<{
    _id: string;
    name: string;
    mobile: string;
    licenceNumber: string;
    licenceImageUrl: string;
  }>;
}

export default function FleetVerificationClient() {
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<PartnerData | null>(null);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/partner-verification/pending`, {
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

  const updateStatus = async (status: string) => {
    if (!selectedPartner) return;
    
    // If rejecting or holding, open modal to gather reasons
    if ((status === "Rejected" || status === "Hold") && !statusModal) {
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
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          status,
          reasons: selectedReasons,
          comment: adminComment
        }),
      });
      if (res.ok) {
        toast.success(`Partner status updated to ${status}!`);
        fetchPartners();
        if (statusModal) setStatusModal(null);
        setSelectedPartner(null);
      } else {
        const err = await res.json();
        toast.error(err.message || "Failed to update status");
      }
    } catch (error) {
      toast.error("An error occurred");
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
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE5300]"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto w-full relative">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <ShieldAlert className="text-[#FE5300] h-8 w-8" />
          Fleet Verification Hub
        </h1>
        <p className="text-slate-500 mt-2">Interactive review and verification of partners, fleets, and drivers.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-full">
            <thead className="bg-slate-50 border-b border-slate-100 hidden md:table-header-group">
              <tr>
                <th className="px-6 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Partner</th>
                <th className="px-6 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stats</th>
                <th className="px-6 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No partners found.
                  </td>
                </tr>
              ) : (
                partners.map((partner) => (
                  <tr key={partner.auth._id} className="group hover:bg-slate-50/80 transition-all duration-300 ease-in-out flex flex-col md:table-row p-4 md:p-0">
                    <td className="md:px-6 md:py-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                          {partner.profile?.fullName ? partner.profile.fullName.charAt(0).toUpperCase() : "?"}
                        </div>
                        <div className="group-hover:translate-x-[1px] transition-transform duration-300 ease-in-out">
                          <div className="text-[13px] font-semibold text-slate-700 tracking-tight">
                            {partner.profile?.agencyName ? partner.profile.agencyName : (partner.profile?.fullName || "Incomplete Profile")}
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 capitalize">{partner.profile?.partnerType || "Unknown"}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="md:px-6 md:py-2 mt-2 md:mt-0 text-sm">
                      <div className="text-[13px] font-semibold text-slate-700 tracking-tight">{partner.profile?.mobileNumber || "N/A"}</div>
                      <div className="text-[10px] font-medium text-slate-400 lowercase">{partner.auth.email}</div>
                    </td>

                    <td className="md:px-6 md:py-2 mt-2 md:mt-0">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                           {partner.stats.drivers} Drivers
                        </span>
                        <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                           {partner.stats.vehicles} Vehicles
                        </span>
                      </div>
                    </td>

                    <td className="md:px-6 md:py-2 mt-2 md:mt-0">
                      <span className={`inline-flex text-[10px] px-2.5 py-1 rounded font-black uppercase tracking-widest ${
                        partner.auth.status === "Active" || partner.auth.status === "Approved" ? "bg-green-100 text-green-800" :
                        partner.auth.status === "PendingVerification" ? "bg-amber-100 text-amber-800" :
                        partner.auth.status === "Hold" ? "bg-orange-100 text-orange-800" :
                        partner.auth.status === "Rejected" ? "bg-red-100 text-red-800" :
                        "bg-slate-100 text-slate-800"
                      }`}>
                        {partner.auth.status}
                      </span>
                    </td>

                    <td className="md:px-6 md:py-2 mt-4 md:mt-0 text-right">
                      <button
                        onClick={() => handleSelectPartner(partner)}
                        className="inline-flex items-center justify-center h-7 w-7 bg-slate-50 hover:bg-slate-200 text-slate-500 rounded transition-all duration-300 ease-in-out shadow-none"
                        title="Review Profile"
                      >
                        <ArrowRight size={14} className="opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 ease-in-out" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INTERACTIVE SLIDE-OVER PANEL */}
      {selectedPartner && !statusModal && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedPartner(null)}></div>
          
          <div className="relative w-full max-w-5xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200">
            {/* Header & Status Actions */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Partner Intelligence</h2>
                <div className="text-xs text-slate-500 mt-1 flex gap-2 items-center">
                  <span className="font-medium">{selectedPartner.auth.email}</span>
                  <span className="px-1.5 py-0.5 bg-slate-200 rounded text-[9px] font-bold uppercase text-slate-600">{selectedPartner.auth.status}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateStatus("Approved")} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase rounded shadow-sm">Approve</button>
                <button onClick={() => updateStatus("Hold")} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold uppercase rounded shadow-sm">Hold</button>
                <button onClick={() => updateStatus("Rejected")} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold uppercase rounded shadow-sm">Reject</button>
                <button onClick={() => updateStatus("Blacklisted")} className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-[10px] font-bold uppercase rounded shadow-sm">Blacklist</button>
                <div className="w-px h-6 bg-slate-300 mx-2"></div>
                <button onClick={() => setSelectedPartner(null)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-full"><X size={18} /></button>
              </div>
            </div>

            {/* Content Split: Data vs Timeline */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              
              {/* LEFT: Dashboard UI Replica */}
              <div className="flex-1 p-6 overflow-y-auto border-r border-slate-100 bg-slate-50/50">
                
                {/* Agency/Profile Block */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Entity Profile</h3>
                    {!isEditingProfile ? (
                      <button onClick={() => setIsEditingProfile(true)} className="text-[10px] font-bold text-[#FE5300] hover:underline uppercase">Edit</button>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => setIsEditingProfile(false)} className="text-[10px] font-bold text-slate-500 hover:underline uppercase">Cancel</button>
                        <button onClick={handleUpdateProfile} className="text-[10px] font-bold text-emerald-600 hover:underline uppercase">Save</button>
                      </div>
                    )}
                  </div>
                  
                  {!isEditingProfile ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-bold">Primary Contact</span>
                        <div className="flex items-center gap-2 mt-1">
                          {selectedPartner.profile?.profilePicture && (
                            <img src={selectedPartner.profile.profilePicture} alt="Profile" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                          )}
                          <span className="font-semibold text-slate-800">{selectedPartner.profile?.fullName}</span>
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-bold">Mobile Number</span>
                        <span className="font-semibold text-slate-800">{selectedPartner.profile?.mobileNumber || "N/A"}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[10px] text-slate-500 uppercase font-bold">Address Line</span>
                        <span className="font-semibold text-slate-800">{selectedPartner.address?.addressLine || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-bold">City</span>
                        <span className="font-semibold text-slate-800">{selectedPartner.address?.city || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-bold">State</span>
                        <span className="font-semibold text-slate-800">{selectedPartner.address?.state || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-bold">PIN Code</span>
                        <span className="font-semibold text-slate-800">{selectedPartner.address?.pincode || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-500 uppercase font-bold">Partner Type</span>
                        <span className="font-semibold text-slate-800">{selectedPartner.profile?.partnerType || "N/A"}</span>
                      </div>
                      {selectedPartner.profile?.agencyName && (
                        <div className="col-span-2">
                          <span className="block text-[10px] text-slate-500 uppercase font-bold">Agency / Company</span>
                          <span className="font-semibold text-slate-800">{selectedPartner.profile.agencyName}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Full Name</label>
                        <input type="text" className="w-full border border-slate-300 rounded p-1.5 text-xs" value={editProfileForm.fullName} onChange={(e) => setEditProfileForm({...editProfileForm, fullName: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Mobile Number</label>
                        <input type="text" className="w-full border border-slate-300 rounded p-1.5 text-xs" value={editProfileForm.mobileNumber} onChange={(e) => setEditProfileForm({...editProfileForm, mobileNumber: e.target.value})} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Address Line</label>
                        <input type="text" className="w-full border border-slate-300 rounded p-1.5 text-xs" value={editProfileForm.addressLine} onChange={(e) => setEditProfileForm({...editProfileForm, addressLine: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">City</label>
                        <input type="text" className="w-full border border-slate-300 rounded p-1.5 text-xs" value={editProfileForm.city} onChange={(e) => setEditProfileForm({...editProfileForm, city: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">State</label>
                        <input type="text" className="w-full border border-slate-300 rounded p-1.5 text-xs" value={editProfileForm.state} onChange={(e) => setEditProfileForm({...editProfileForm, state: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">PIN Code</label>
                        <input type="text" className="w-full border border-slate-300 rounded p-1.5 text-xs" value={editProfileForm.pincode} onChange={(e) => setEditProfileForm({...editProfileForm, pincode: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Partner Type</label>
                        <input type="text" className="w-full border border-slate-300 rounded p-1.5 text-xs" value={editProfileForm.partnerType} onChange={(e) => setEditProfileForm({...editProfileForm, partnerType: e.target.value})} />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Agency / Company</label>
                        <input type="text" className="w-full border border-slate-300 rounded p-1.5 text-xs" value={editProfileForm.agencyName} onChange={(e) => setEditProfileForm({...editProfileForm, agencyName: e.target.value})} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Fleet Side-by-Side View */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Drivers */}
                  <div>
                    <h3 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Driver Roster ({selectedPartner.drivers?.length || 0})</h3>
                    <div className="space-y-2">
                      {selectedPartner.drivers?.length === 0 ? (
                        <div className="p-3 bg-white border border-dashed border-slate-200 rounded text-center text-xs text-slate-400">No drivers</div>
                      ) : (
                        selectedPartner.drivers?.map(d => {
                          const assigned = selectedPartner.vehicles?.find(v => v.assignedDriverId === d._id);
                          return (
                            <div key={d._id} className="bg-white border border-slate-200 p-3 rounded shadow-sm text-xs">
                              <span className="font-bold text-slate-900 block">{d.name}</span>
                              <span className="text-[10px] text-slate-500 block">{d.mobile}</span>
                              <div className="mt-2 flex justify-between items-center">
                                <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">{d.licenceNumber}</span>
                                {d.licenceImageUrl && (
                                  <a href={d.licenceImageUrl} target="_blank" className="text-[9px] font-bold text-emerald-600 hover:underline">View DL</a>
                                )}
                              </div>
                              {assigned && (
                                <div className="mt-2 pt-2 border-t border-slate-100 text-[9px] font-bold text-blue-600">
                                  Assigned: {assigned.brand} {assigned.vehicleName}
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Vehicles */}
                  <div>
                    <h3 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Vehicle Assets ({selectedPartner.vehicles?.length || 0})</h3>
                    <div className="space-y-2">
                      {selectedPartner.vehicles?.length === 0 ? (
                        <div className="p-3 bg-white border border-dashed border-slate-200 rounded text-center text-xs text-slate-400">No vehicles</div>
                      ) : (
                        selectedPartner.vehicles?.map(v => (
                          <div key={v._id} className="bg-white border border-slate-200 p-3 rounded shadow-sm text-xs">
                            <span className="font-bold text-slate-900 block">{v.brand} {v.vehicleName} <span className="text-slate-500">({v.model})</span></span>
                            <span className="text-[10px] text-slate-500 block">{v.category} • {v.seatingCapacity} Seater</span>
                            <div className="mt-2 flex justify-between items-center">
                              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">{v.registrationNumber}</span>
                            </div>
                            {(v.rcImageUrl || v.pucImageUrl || v.insuranceFileUrl || v.permitFileUrl || v.frontImageUrl || v.rearImageUrl || v.leftSideImageUrl || v.rightSideImageUrl || v.interiorImageUrl || v.otherImageUrl) && (
                              <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-3">
                                {v.rcImageUrl && <a href={v.rcImageUrl} target="_blank" className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-1"><FileText size={10} /> RC Image</a>}
                                {v.pucImageUrl && <a href={v.pucImageUrl} target="_blank" className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-1"><FileText size={10} /> PUC</a>}
                                {v.insuranceFileUrl && <a href={v.insuranceFileUrl} target="_blank" className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-1"><FileText size={10} /> Insurance</a>}
                                {v.permitFileUrl && <a href={v.permitFileUrl} target="_blank" className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-1"><FileText size={10} /> Permit</a>}
                                {v.frontImageUrl && <a href={v.frontImageUrl} target="_blank" className="text-[9px] font-bold text-emerald-600 hover:underline flex items-center gap-1"><Car size={10} /> Front</a>}
                                {v.rearImageUrl && <a href={v.rearImageUrl} target="_blank" className="text-[9px] font-bold text-emerald-600 hover:underline flex items-center gap-1"><Car size={10} /> Rear</a>}
                                {v.leftSideImageUrl && <a href={v.leftSideImageUrl} target="_blank" className="text-[9px] font-bold text-emerald-600 hover:underline flex items-center gap-1"><Car size={10} /> L-Side</a>}
                                {v.rightSideImageUrl && <a href={v.rightSideImageUrl} target="_blank" className="text-[9px] font-bold text-emerald-600 hover:underline flex items-center gap-1"><Car size={10} /> R-Side</a>}
                                {v.interiorImageUrl && <a href={v.interiorImageUrl} target="_blank" className="text-[9px] font-bold text-emerald-600 hover:underline flex items-center gap-1"><Car size={10} /> Interior</a>}
                                {v.otherImageUrl && <a href={v.otherImageUrl} target="_blank" className="text-[9px] font-bold text-emerald-600 hover:underline flex items-center gap-1"><Car size={10} /> Other</a>}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Documents */}
                <div className="mt-6">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Verification Documents</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {selectedPartner.documents?.map(doc => (
                      <a key={doc._id} href={doc.fileUrl} target="_blank" className="block bg-white border border-slate-200 p-2 rounded shadow-sm hover:border-blue-400 transition-colors">
                        <span className="block text-[10px] font-bold text-slate-700 truncate">{doc.documentType}</span>
                        {doc.fileUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                          <img src={doc.fileUrl} className="w-full h-16 object-cover mt-1 rounded bg-slate-100" />
                        ) : (
                          <div className="w-full h-16 bg-slate-100 mt-1 rounded flex items-center justify-center text-[10px] font-bold text-slate-400">PDF</div>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT: Timeline & Chat */}
              <div className="w-full md:w-80 flex flex-col bg-white">
                <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Clock size={14} /> Action Logs & Comments
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {logs.length === 0 ? (
                    <div className="text-center text-slate-400 text-xs italic">No activity logs yet.</div>
                  ) : (
                    logs.map(log => (
                      <div key={log._id} className="text-xs">
                        {log.actionType === "StatusChange" ? (
                          <div className="bg-slate-50 border border-slate-200 rounded p-3">
                            <span className="font-bold text-slate-800 block mb-1">Status changed to <span className="uppercase">{log.newStatus}</span></span>
                            {log.reasons && log.reasons.length > 0 && (
                              <ul className="list-disc pl-4 text-slate-600 text-[10px] mb-1">
                                {log.reasons.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            )}
                            {log.comment && <div className="mt-2 text-slate-700 italic border-l-2 border-slate-300 pl-2 text-[10px]">"{log.comment}"</div>}
                            <div className="text-[9px] text-slate-400 mt-2 font-mono">{new Date(log.createdAt).toLocaleString()}</div>
                          </div>
                        ) : (
                          <div className="bg-blue-50 border border-blue-100 rounded p-3 ml-4">
                            <div className="font-bold text-blue-800 flex items-center gap-1 mb-1"><MessageSquare size={10} /> Admin Comment</div>
                            <div className="text-slate-700 text-[11px]">"{log.comment}"</div>
                            <div className="text-[9px] text-slate-400 mt-2 font-mono">{new Date(log.createdAt).toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50">
                  <textarea 
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="Type a comment to notify the partner..."
                    className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none resize-none h-20 bg-white"
                  ></textarea>
                  <button onClick={addManualComment} disabled={!adminComment.trim()} className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider rounded disabled:opacity-50 transition-colors">
                    Post Comment & Notify
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* REJECTION / HOLD MODAL */}
      {statusModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setStatusModal(null)}></div>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative overflow-hidden flex flex-col">
            <div className={`p-4 border-b font-bold text-white flex justify-between items-center ${statusModal.status === "Hold" ? "bg-amber-500" : "bg-red-600"}`}>
              <span>Confirm {statusModal.status}</span>
              <button onClick={() => setStatusModal(null)}><X size={18} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-4 font-medium">Select predefined reasons to include in the notification email to the partner:</p>
              
              <div className="space-y-2 mb-6">
                {REJECTION_REASONS.map(reason => (
                  <label key={reason} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      checked={selectedReasons.includes(reason)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedReasons([...selectedReasons, reason]);
                        else setSelectedReasons(selectedReasons.filter(r => r !== reason));
                      }}
                    />
                    {reason}
                  </label>
                ))}
              </div>

              <div className="mb-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Additional Comments (Optional)</label>
                <textarea 
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 outline-none transition-all resize-none h-24"
                  placeholder="Provide specific feedback..."
                ></textarea>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setStatusModal(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded text-xs font-bold uppercase">Cancel</button>
              <button 
                onClick={() => updateStatus(statusModal.status)} 
                className={`px-4 py-2 text-white rounded text-xs font-bold uppercase transition-colors shadow-sm ${statusModal.status === "Hold" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"}`}
              >
                Confirm {statusModal.status}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
