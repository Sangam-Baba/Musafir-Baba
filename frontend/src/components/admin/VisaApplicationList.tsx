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
import { Eye, X, User, Mail, Phone, Calendar, CheckCircle, RotateCcw, FileText, ChevronLeft, ChevronRight } from "lucide-react";
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
    travellerId?: string;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "bg-green-50 text-green-700 border-green-150";
      case "Returned": return "bg-red-50 text-red-700 border-red-150";
      case "Applied": return "bg-blue-50 text-blue-700 border-blue-150";
      case "Under Review": return "bg-orange-50 text-orange-700 border-orange-150";
      case "Reviewed": return "bg-purple-50 text-purple-700 border-purple-150";
      case "Processing": return "bg-indigo-50 text-indigo-700 border-indigo-150";
      default: return "bg-slate-50 text-slate-700 border-slate-150";
    }
  };

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 border-b border-slate-100">
              <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-[120px]">App ID</TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Holder</TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Visa Details</TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">Travellers</TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Submitted On</TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((app) => (
              <TableRow key={app._id} className="group hover:bg-slate-50/80 border-b border-slate-50 last:border-0 transition-colors duration-300 ease-in-out">
                <TableCell className="font-mono text-[13px] font-bold text-[#FE5300] py-2 px-4">
                  {app.applicationId || "DRAFT"}
                </TableCell>
                <TableCell className="py-2 px-4 max-w-[160px] sm:max-w-[200px]">
                  <div className="flex items-start gap-2.5 transition-transform duration-300 ease-in-out group-hover:translate-x-[1px]">
                    <div className="p-1.5 bg-orange-50 rounded-lg text-[#FE5300] transition-colors duration-300 ease-in-out shrink-0">
                      <User size={14} />
                    </div>
                    <div className="flex flex-col overflow-hidden w-full">
                      <span className="text-[13px] font-semibold text-slate-700 leading-tight truncate block max-w-[120px] sm:max-w-[160px]" title={app.userId?.name || "Guest User"}>
                        {app.userId?.name || "Guest User"}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono lowercase font-medium mt-0.5 truncate block max-w-[120px] sm:max-w-[160px]" title={app.userId?.email || app.email}>
                        {app.userId?.email || app.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-2 px-4 max-w-[220px] sm:max-w-[280px]">
                  <div className="flex flex-col transition-transform duration-300 ease-in-out group-hover:translate-x-[1px]">
                    <span className="text-[13px] font-semibold text-slate-700 leading-tight truncate block" title={app.visaId?.title}>
                      {app.visaId?.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-0.5">{app.visaId?.country}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center py-2 px-4">
                  <span className="inline-flex items-center justify-center bg-slate-50 text-slate-500 text-[10px] font-black px-2.5 py-0.5 rounded-md border border-slate-100 uppercase tracking-widest transition-all duration-300 ease-in-out">
                    {app.travellers?.length || 0} Pax
                  </span>
                </TableCell>
                <TableCell className="py-2 px-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${getStatusColor(app.applicationStatus)} transition-colors duration-300 ease-in-out`}>
                    {app.applicationStatus}
                  </span>
                </TableCell>
                <TableCell className="text-[11px] font-semibold text-slate-500 py-2 px-4">
                  {new Date(app.createdAt).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                </TableCell>
                <TableCell className="text-right py-2 px-4">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedApp(app)}
                    className="inline-flex items-center justify-center h-7 w-7 p-0 rounded-md text-slate-400 hover:text-[#FE5300] hover:bg-orange-50 transition-all duration-300 ease-in-out group/icon"
                  >
                    <Eye className="h-4 w-4 opacity-40 group-hover/icon:opacity-100 group-hover/icon:scale-110 transition-all duration-300 ease-in-out" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-2 py-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Showing {totalItems > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg border-slate-200 transition-colors duration-300 ease-in-out bg-white hover:bg-slate-50"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={activePage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1 px-4">
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
                     className={`h-8 w-8 p-0 rounded-lg transition-all duration-300 ease-in-out ${activePage === pageNum ? 'bg-[#FE5300] hover:bg-[#FE5300] text-white font-black' : 'text-slate-600 hover:text-[#FE5300] hover:bg-orange-50'}`}
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
              className="h-8 w-8 p-0 rounded-lg border-slate-200 transition-colors duration-300 ease-in-out bg-white hover:bg-slate-50"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={activePage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
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
              className="relative z-10 bg-white h-full w-full max-w-[480px] sm:max-w-[540px] shadow-2xl flex flex-col overflow-hidden border-l border-slate-100"
            >
              <div className="px-5 py-4 border-b flex items-center justify-between bg-slate-50/50 border-slate-100">
                <div className="flex flex-col">
                  <h3 className="text-[14px] font-bold text-slate-800 leading-tight">Application Details</h3>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 lowercase">ID: {selectedApp.applicationId || "DRAFT"}</span>
                </div>
                <button 
                  onClick={() => setSelectedApp(null)} 
                  className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors duration-300 ease-in-out"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-6 flex-1 max-h-full">
                {/* Main status indicator */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between transition-colors duration-300 ease-in-out">
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Submitted Version</span>
                      <span className="text-[11px] font-bold text-slate-500 capitalize">{selectedApp.visaId?.title}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 leading-none">Status</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest border ${getStatusColor(selectedApp.applicationStatus)} transition-colors duration-300 ease-in-out`}>
                        {selectedApp.applicationStatus}
                      </span>
                   </div>
                </div>

                {/* Account details if user is logged in */}
                {selectedApp.userId && (
                  <div className="space-y-3 pt-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-2">
                        <Mail size={12} className="text-[#FE5300]" />
                        Account Contact
                      </h4>
                      <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                         <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Email Address</span>
                            <span className="text-[12px] font-semibold text-slate-700 font-mono truncate">{selectedApp.userId.email}</span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Phone Number</span>
                            <span className="text-[12px] font-semibold text-slate-700 font-mono">{selectedApp.userId.phone || "N/A"}</span>
                         </div>
                      </div>
                  </div>
                )}

                {/* Traveller details */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-2">
                    <User size={12} className="text-[#FE5300]" />
                    Travellers ({selectedApp.travellers?.length || 0} Pax)
                  </h4>
                  <div className="space-y-2">
                    {selectedApp.travellers?.map((pax, i) => (
                      <div key={i} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-orange-200 transition-colors duration-300 ease-in-out group">
                        <div className="grid grid-cols-3 gap-2">
                           <div className="flex flex-col col-span-2">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Full Name</span>
                              <span className="text-[12px] font-bold text-slate-700 sentence-case">{pax.firstName} {pax.lastName}</span>
                           </div>
                           <div className="flex flex-col items-end justify-center">
                              <span className="w-5 h-5 bg-white border border-slate-200 rounded-md flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:bg-[#FE5300] group-hover:text-white group-hover:border-[#FE5300] transition-all duration-300 ease-in-out">
                                {i + 1}
                              </span>
                           </div>
                           <div className="flex flex-col mt-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Date of Birth</span>
                              <span className="text-[11px] font-medium text-slate-600">{pax.dob}</span>
                           </div>
                           <div className="flex flex-col mt-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Gender</span>
                              <span className="text-[11px] font-medium text-slate-600 capitalize">{pax.gender}</span>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Documents categorized */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-2">
                    <FileText size={12} className="text-[#FE5300]" />
                    Document Scans
                  </h4>
                  
                  {selectedApp.travellers?.map((pax, pIdx) => {
                    const paxDocs = selectedApp.documents?.filter(d => d.travellerId === pIdx.toString() || d.travellerId === (pIdx + 1).toString());
                    if (paxDocs?.length === 0) return null;

                    return (
                      <div key={pIdx} className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-[9px]">{pax.firstName} {pax.lastName}</p>
                        <div className="space-y-1.5">
                          {paxDocs?.map((doc, i) => (
                            <a
                              key={i}
                              href={doc.media.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-2.5 bg-white rounded-lg hover:bg-slate-50/50 transition border border-slate-100 group/doc"
                            >
                              <div className="flex items-center gap-2.5">
                                 <div className="p-1.5 bg-orange-50 rounded text-[#FE5300] group-hover/doc:bg-[#FE5300] group-hover/doc:text-white transition-colors duration-300 ease-in-out">
                                    <FileText size={14} />
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-[12px] font-semibold text-slate-700 leading-tight">{doc.name}</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Click to review scan</span>
                                 </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* General legacy/general documents */}
                  {selectedApp.documents?.filter(d => !d.travellerId).length > 0 && (
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-[9px]">General Documents</p>
                      <div className="space-y-1.5">
                        {selectedApp.documents?.filter(d => !d.travellerId).map((doc, i) => (
                          <a
                            key={i}
                            href={doc.media.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 bg-white rounded-lg hover:bg-slate-50/50 transition border border-slate-100 group/doc"
                          >
                            <div className="flex items-center gap-2.5">
                               <div className="p-1.5 bg-slate-50 rounded text-slate-400 group-hover/doc:bg-slate-400 group-hover/doc:text-white transition-colors duration-300 ease-in-out">
                                  <FileText size={14} />
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[12px] font-semibold text-slate-700 leading-tight">{doc.name}</span>
                                  <span className="text-[9px] text-slate-400 font-medium">General Attachments</span>
                               </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Return Reason for Returned status */}
                {selectedApp.applicationStatus === "Returned" && (
                  <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-start gap-2.5">
                    <div className="p-1.5 bg-red-100 text-red-600 rounded">
                       <RotateCcw size={14} />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[9px] text-red-500 font-black uppercase mb-0.5 tracking-wider">Return Reason</p>
                      <p className="text-[12px] text-red-700 font-medium leading-relaxed">{selectedApp.returnReason}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Update CTA footer wrapper */}
              {(selectedApp.applicationStatus === "Applied" || selectedApp.applicationStatus === "Under Review" || selectedApp.applicationStatus === "Reviewed" || selectedApp.applicationStatus === "Processing" || selectedApp.applicationStatus === "Submitted") && (
                <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                  <div className="space-y-1">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Update status or Add Return Reason</p>
                    <Input
                      className="h-9 text-[12px] bg-white border-slate-200 focus-visible:ring-1 focus-visible:ring-[#FE5300] focus:ring-1 focus:ring-[#FE5300] focus-visible:ring-offset-0 focus:outline-none rounded-lg"
                      placeholder="e.g., Passport photo is blurry..."
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    {(selectedApp.applicationStatus === "Applied" || selectedApp.applicationStatus === "Submitted") && (
                      <Button
                        className="flex-1 h-9 text-[11px] bg-[#FE5300] hover:bg-[#FE5300]/90 text-white font-bold rounded-lg shadow-sm"
                        onClick={() => handleUpdateStatus(selectedApp._id, "Reviewed")}
                        disabled={isUpdating}
                      >
                        Mark Reviewed
                      </Button>
                    )}
                    
                    {selectedApp.applicationStatus === "Reviewed" && (
                      <Button
                        className="flex-1 h-9 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm"
                        onClick={() => handleUpdateStatus(selectedApp._id, "Processing")}
                        disabled={isUpdating}
                      >
                        Mark Processing
                      </Button>
                    )}

                    {(selectedApp.applicationStatus === "Reviewed" || selectedApp.applicationStatus === "Processing") && (
                      <Button
                        className="flex-1 h-9 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                        onClick={() => handleUpdateStatus(selectedApp._id, "Approved")}
                        disabled={isUpdating}
                      >
                        Approve Final
                      </Button>
                    )}
                    
                    <Button
                      variant="destructive"
                      className="flex-1 h-9 text-[11px] font-bold rounded-lg shadow-sm"
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
