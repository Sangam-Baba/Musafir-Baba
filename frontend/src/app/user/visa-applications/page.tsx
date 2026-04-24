"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader } from "@/components/custom/loader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, FileText, AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

async function getMyVisaApplications(token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa-application/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch applications");
  const data = await res.json();
  return data.data;
}

export default function UserVisaApplicationsPage() {
  const token = useAuthStore((state) => state.accessToken) as string;
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  const { data: applications, isLoading, isError } = useQuery({
    queryKey: ["my-visa-applications"],
    queryFn: () => getMyVisaApplications(token),
    enabled: !!token,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "bg-green-100 text-green-700 border-green-200";
      case "Returned": return "bg-red-100 text-red-700 border-red-200";
      case "Applied": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Under Review": return "bg-orange-100 text-orange-700 border-orange-200";
      case "Reviewed": return "bg-purple-100 text-purple-700 border-purple-200";
      case "Processing": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "Reviewed": return "Reviewed at MusafirBaba & Filling application under process";
      case "Applied": return "Under Review";
      default: return status;
    }
  };

  if (isLoading) return <Loader size="lg" message="Loading your applications..." />;

  return (
    <main className="min-h-screen bg-slate-50 p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Visa Applications</h1>
        <p className="text-slate-500">Track and manage your visa application status</p>
      </div>

      <Card className="bg-white shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle>My Applications</CardTitle>
          <CardDescription>All your submitted visa applications</CardDescription>
        </CardHeader>
        <CardContent>
          {!applications || applications.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No applications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visa</TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app: any) => {
                    const mainTraveller = app.travellers?.[0];
                    const appStatus = app.applicationStatus || "Pending";
                    
                    return (
                      <TableRow key={app._id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                              <span>{app.visaId?.title}</span>
                              <span className="text-xs text-gray-500">{app.visaId?.country}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {mainTraveller ? `${mainTraveller.firstName} ${mainTraveller.lastName}` : "Not specified"}
                          {app.travellers?.length > 1 && (
                            <span className="text-xs text-gray-400 ml-1">+{app.travellers.length - 1} more</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(appStatus)}>
                            {getStatusText(appStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={
                            app.paymentInfo?.status === "Paid" ? "bg-green-50 text-green-600 border-green-200" : 
                            app.paymentInfo?.status === "Failed" ? "bg-red-50 text-red-600 border-red-200" : 
                            "bg-orange-50 text-orange-600 border-orange-200"
                          }>
                            {app.paymentInfo?.status || "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(app.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {(appStatus === "Pending" || appStatus === "Returned") && (
                                <Button variant="outline" size="sm" className="bg-[#FE5300]/10 text-[#FE5300] border-[#FE5300]/20 hover:bg-[#FE5300] hover:text-white" asChild>
                                    <a href={`/visa/${app.visaId?.slug}/apply?applicationId=${app._id}`}>
                                        {appStatus === "Pending" ? (app.paymentInfo?.status === "Failed" ? "Retry Payment" : "Resume") : "Edit & Fix"}
                                    </a>
                                </Button>
                            )}
                              <Button variant="ghost" size="sm" onClick={() => setSelectedApp(app)}>
                              <Eye size={18} className="text-primary" />
                              </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
                <h3 className="text-lg font-bold">Application Details</h3>
                <button onClick={() => setSelectedApp(null)} className="p-2 hover:bg-gray-200 rounded-full">
                   ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                {(selectedApp.applicationStatus === "Returned" || selectedApp.status === "Returned") && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3">
                    <AlertCircle className="text-red-500 shrink-0" />
                    <div>
                      <p className="font-bold text-red-700 text-sm">Action Required: Application Returned</p>
                      <p className="text-red-600 text-sm mt-1">{selectedApp.returnReason}</p>
                      <Button size="sm" variant="destructive" className="mt-3" asChild>
                        <a href={`/visa/${selectedApp.visaId?.slug}/apply?applicationId=${selectedApp._id}`}>Re-apply / Fix Documents</a>
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-bold uppercase">Applicant Name</p>
                    <p className="font-medium">
                      {selectedApp.travellers?.[0] 
                        ? `${selectedApp.travellers[0].firstName} ${selectedApp.travellers[0].lastName}` 
                        : "Not specified"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-bold uppercase">Visa Type</p>
                    <p className="font-medium">{selectedApp.visaId?.title}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-bold uppercase">Submitted On</p>
                    <p className="font-medium">{new Date(selectedApp.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-bold uppercase">Application ID</p>
                    <p className="font-medium text-xs">#{selectedApp._id}</p>
                  </div>
                </div>

                <div className="space-y-2">
                   <p className="text-xs text-gray-500 font-bold uppercase">Uploaded Documents</p>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                     {selectedApp.documents.map((doc: any, i: number) => (
                       <div key={i} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border text-sm">
                         <FileText size={16} className="text-primary" />
                         <span className="font-medium">{doc.name}</span>
                       </div>
                     ))}
                   </div>
                </div>

                <div className="pt-4 border-t flex justify-between items-center text-sm font-bold">
                  <span>Total Amount Paid</span>
                  <span className="text-[#FE5300]">₹{selectedApp.paymentInfo?.amount}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
