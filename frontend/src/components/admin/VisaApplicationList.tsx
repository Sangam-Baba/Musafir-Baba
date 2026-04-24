"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, X, User, Mail, Phone, Calendar, CheckCircle, RotateCcw, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";

interface VisaApplication {
  _id: string;
  applicationId?: string;
  visaId: {
    _id: string;
    title: string;
    country: string;
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
  }>;
  createdAt: string;
}

interface VisaApplicationListProps {
  applications: VisaApplication[];
  onStatusUpdate: () => void;
}

export default function VisaApplicationList({ applications, onStatusUpdate }: VisaApplicationListProps) {
  const [selectedApp, setSelectedApp] = useState<VisaApplication | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const accessToken = useAdminAuthStore((state) => state.accessToken);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "bg-green-100 text-green-700";
      case "Returned": return "bg-red-100 text-red-700";
      case "Applied": return "bg-blue-100 text-blue-700";
      case "Under Review": return "bg-orange-100 text-orange-700";
      case "Reviewed": return "bg-purple-100 text-purple-700";
      case "Processing": return "bg-indigo-100 text-indigo-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[120px]">App ID</TableHead>
              <TableHead>Account Holder</TableHead>
              <TableHead>Visa Details</TableHead>
              <TableHead className="text-center">Travellers</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((app) => (
              <TableRow key={app._id} className="hover:bg-gray-50 transition border-b border-gray-100">
                <TableCell className="font-mono text-xs font-bold text-orange-600">
                  {app.applicationId || "DRAFT"}
                </TableCell>
                <TableCell>
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 bg-orange-50 rounded-lg text-orange-600">
                      <User size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 text-sm">{app.userId?.name || "Guest User"}</span>
                      <span className="text-[10px] text-gray-500 font-medium">{app.userId?.email || app.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 text-sm">{app.visaId?.title}</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{app.visaId?.country}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className="inline-flex items-center justify-center bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200">
                    {app.travellers?.length || 0} Pax
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${getStatusColor(app.applicationStatus)}`}>
                    {app.applicationStatus}
                  </span>
                </TableCell>
                <TableCell className="text-xs font-medium text-gray-600">
                  {new Date(app.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedApp(app)}
                    className="text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-all rounded-lg"
                  >
                    <Eye size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
                <h3 className="text-lg font-bold">Application Details</h3>
                <button onClick={() => setSelectedApp(null)} className="p-2 hover:bg-gray-200 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-8">
                <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 flex items-center justify-between">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-orange-600 uppercase">Application ID</span>
                      <span className="text-xl font-black text-gray-900 font-mono tracking-tight">{selectedApp.applicationId || "DRAFT"}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Current Status</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border ${getStatusColor(selectedApp.applicationStatus)}`}>
                        {selectedApp.applicationStatus}
                      </span>
                   </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                    <User size={14} className="text-orange-600" />
                    Travellers Details ({selectedApp.travellers?.length || 0})
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedApp.travellers?.map((pax, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors group">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                           <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-gray-400 uppercase">Full Name</span>
                              <span className="text-sm font-bold text-gray-900">{pax.firstName} {pax.lastName}</span>
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-gray-400 uppercase">Date of Birth</span>
                              <span className="text-sm font-medium text-gray-700">{pax.dob}</span>
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-gray-400 uppercase">Gender</span>
                              <span className="text-sm font-medium text-gray-700">{pax.gender}</span>
                           </div>
                           <div className="flex flex-col items-end justify-center">
                              <span className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[10px] font-black text-gray-400 group-hover:bg-orange-600 group-hover:text-white group-hover:border-orange-600 transition-all">
                                {i + 1}
                              </span>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                    <FileText size={14} className="text-orange-600" />
                    Document Package (Categorized)
                  </h4>
                  
                  {selectedApp.travellers?.map((pax, pIdx) => {
                    // Match by index as travellerId is often the index in the current implementation
                    const paxDocs = selectedApp.documents?.filter(d => d.travellerId === pIdx.toString() || d.travellerId === (pIdx + 1).toString());
                    
                    if (paxDocs?.length === 0) return null;

                    return (
                      <div key={pIdx} className="space-y-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Documents for: {pax.firstName} {pax.lastName}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {paxDocs?.map((doc, i) => (
                            <a
                              key={i}
                              href={doc.media.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-3 bg-white rounded-xl hover:bg-gray-50 transition border border-gray-200 group"
                            >
                              <div className="flex items-center gap-3">
                                 <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <FileText size={16} />
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-900">{doc.name}</span>
                                    <span className="text-[9px] text-gray-500 font-medium">Verify Document</span>
                                 </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Show documents with no traveller association (legacy or general) */}
                  {selectedApp.documents?.filter(d => !d.travellerId).length > 0 && (
                    <div className="space-y-3 border-t pt-4">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">General Documents</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedApp.documents?.filter(d => !d.travellerId).map((doc, i) => (
                          <a
                            key={i}
                            href={doc.media.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-white rounded-xl hover:bg-gray-50 transition border border-gray-200 group"
                          >
                            <div className="flex items-center gap-3">
                               <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:bg-gray-400 group-hover:text-white transition-colors">
                                  <FileText size={16} />
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-sm font-bold text-gray-900">{doc.name}</span>
                                  <span className="text-[9px] text-gray-500 font-medium">General File</span>
                               </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Account details if user is logged in */}
                {selectedApp.userId && (
                  <div className="space-y-4 pt-4 border-t border-dashed">
                      <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <Mail size={14} className="text-orange-600" />
                        Account Contact
                      </h4>
                      <div className="bg-gray-50 p-4 rounded-xl flex items-center gap-8">
                         <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Email</span>
                            <span className="text-sm font-medium text-gray-700">{selectedApp.userId.email}</span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Phone</span>
                            <span className="text-sm font-medium text-gray-700">{selectedApp.userId.phone || "N/A"}</span>
                         </div>
                      </div>
                  </div>
                )}

                {(selectedApp.applicationStatus === "Applied" || selectedApp.applicationStatus === "Under Review" || selectedApp.applicationStatus === "Reviewed" || selectedApp.applicationStatus === "Processing" || selectedApp.applicationStatus === "Submitted") && (
                  <div className="space-y-4 pt-6 border-t font-sans">
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-black uppercase tracking-widest">Update status or Add Return Reason</p>
                      <Input
                        className="bg-gray-50 border-gray-200 focus:border-orange-500 focus:ring-orange-500 rounded-xl"
                        placeholder="e.g., Passport photo not clear (Required for Return)"
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(selectedApp.applicationStatus === "Applied" || selectedApp.applicationStatus === "Submitted") && (
                        <Button
                          className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-purple-200"
                          onClick={() => handleUpdateStatus(selectedApp._id, "Reviewed")}
                          disabled={isUpdating}
                        >
                          Mark as Reviewed
                        </Button>
                      )}
                      
                      {selectedApp.applicationStatus === "Reviewed" && (
                        <Button
                          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200"
                          onClick={() => handleUpdateStatus(selectedApp._id, "Processing")}
                          disabled={isUpdating}
                        >
                          Mark as Processing
                        </Button>
                      )}

                      {(selectedApp.applicationStatus === "Reviewed" || selectedApp.applicationStatus === "Processing") && (
                        <Button
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-200"
                          onClick={() => handleUpdateStatus(selectedApp._id, "Approved")}
                          disabled={isUpdating}
                        >
                          Approve Final
                        </Button>
                      )}
                      
                      <Button
                        variant="destructive"
                        className="flex-1 font-bold rounded-xl shadow-lg shadow-red-200"
                        onClick={() => handleUpdateStatus(selectedApp._id, "Returned", returnReason)}
                        disabled={isUpdating || !returnReason}
                      >
                        <RotateCcw size={16} className="mr-2" />
                        Return/Reject
                      </Button>
                    </div>
                  </div>
                )}

                {selectedApp.applicationStatus === "Returned" && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                       <RotateCcw size={16} />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[10px] text-red-500 font-black uppercase mb-1">Return Reason</p>
                      <p className="text-sm text-red-700 font-medium leading-relaxed">{selectedApp.returnReason}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
