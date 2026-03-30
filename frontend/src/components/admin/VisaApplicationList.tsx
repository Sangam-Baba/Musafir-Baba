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
  visaId: {
    _id: string;
    title: string;
    country: string;
  };
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
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
              <TableHead>User</TableHead>
              <TableHead>Visa</TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((app) => (
              <TableRow key={app._id} className="hover:bg-gray-50 transition">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{app.userId?.name}</span>
                    <span className="text-xs text-gray-500">{app.userId?.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{app.visaId?.title}</span>
                    <span className="text-xs text-gray-500">{app.visaId?.country}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {app.firstName} {app.lastName}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <div className={`w-2 h-2 rounded-full ${app.documents?.length > 0 ? "bg-green-500" : "bg-gray-300"}`} title="Docs" />
                    <div className={`w-2 h-2 rounded-full ${app.firstName ? "bg-green-500" : "bg-gray-300"}`} title="Info" />
                    <div className={`w-2 h-2 rounded-full ${app.paymentInfo?.status === "Paid" ? "bg-green-500" : "bg-gray-300"}`} title="Payment" />
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(app.status)}`}>
                    {app.status}
                  </span>
                </TableCell>
                <TableCell>{new Date(app.createdAt).toLocaleDateString()}</TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedApp(app)}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  >
                    <Eye size={18} />
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

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Applicant Name</p>
                    <p className="font-medium">{selectedApp.firstName} {selectedApp.lastName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Phone</p>
                    <p className="font-medium">{selectedApp.phone}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Documents</p>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedApp.documents.map((doc, i) => (
                      <a
                        key={i}
                        href={doc.media.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition border"
                      >
                        <FileText size={18} className="text-blue-600" />
                        <span className="text-sm font-medium truncate">{doc.name}</span>
                      </a>
                    ))}
                  </div>
                </div>

                {(selectedApp.status === "Applied" || selectedApp.status === "Under Review" || selectedApp.status === "Reviewed" || selectedApp.status === "Processing") && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Status Update / Return Reason</p>
                      <Input
                        placeholder="e.g., Passport photo not clear (Required for Return)"
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedApp.status === "Applied" && (
                        <Button
                          className="flex-1 bg-purple-600 hover:bg-purple-700"
                          onClick={() => handleUpdateStatus(selectedApp._id, "Reviewed")}
                          disabled={isUpdating}
                        >
                          Mark as Reviewed
                        </Button>
                      )}
                      
                      {selectedApp.status === "Reviewed" && (
                        <Button
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => handleUpdateStatus(selectedApp._id, "Processing")}
                          disabled={isUpdating}
                        >
                          Mark as Processing
                        </Button>
                      )}

                      {(selectedApp.status === "Reviewed" || selectedApp.status === "Processing") && (
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleUpdateStatus(selectedApp._id, "Approved")}
                          disabled={isUpdating}
                        >
                          Approve Final
                        </Button>
                      )}
                      
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleUpdateStatus(selectedApp._id, "Returned", returnReason)}
                        disabled={isUpdating || !returnReason}
                      >
                        <RotateCcw size={18} className="mr-2" />
                        Return
                      </Button>
                    </div>
                  </div>
                )}

                {selectedApp.status === "Returned" && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-xs text-red-500 font-bold uppercase mb-1">Return Reason</p>
                    <p className="text-sm text-red-700">{selectedApp.returnReason}</p>
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
