"use client";
import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import DiscussionThread from "@/components/admin/DiscussionThread";

interface SalesRecord {
  _id: string;
  clientName: string;
  clientPhone: string;
  packageName: string;
  details: string;
  itinerary?: string;
  status: string;
  createdBy: { _id: string; name: string; role: string };
  approvedBy?: { _id: string; name: string; role: string };
  approvedAt?: string;
  rejectedBy?: { _id: string; name: string; role: string };
  rejectedAt?: string;
  adminRemark?: string;
  createdAt: string;
  updatedAt: string;
}

function SalesRecordDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const accessToken = useAdminAuthStore((state) => state.accessToken);
  const permissions = useAdminAuthStore((state) => state.permissions) as string[];
  const role = useAdminAuthStore((state) => state.role);
  const isAdmin = role === "admin" || role === "superadmin";

  const [statusInput, setStatusInput] = useState("");
  const [remarkInput, setRemarkInput] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);

  const { data: record, isLoading, isError, error } = useQuery({
    queryKey: ["sales-record", id],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/sales-record/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch record");
      return data.data as SalesRecord;
    },
    enabled: !!id && !!accessToken && (permissions.includes("sales-record") || isAdmin),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, adminRemark }: { status: string; adminRemark: string }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/sales-record/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status, adminRemark }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update status");
      return data;
    },
    onSuccess: () => {
      toast.success("Status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["sales-record", id] });
      setShowStatusModal(false);
      setStatusInput("");
      setRemarkInput("");
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  if (!permissions.includes("sales-record") && !isAdmin) {
    return <h1 className="text-2xl mx-auto p-6">Access denied</h1>;
  }

  if (isLoading) {
    return <div className="flex justify-center items-center py-20"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (isError || !record) {
    return <div className="p-6 text-red-500">{(error as any)?.message || "Record not found"}</div>;
  }

  const handleUpdateStatusClick = (status: string) => {
    setStatusInput(status);
    setShowStatusModal(true);
  };

  const submitStatusUpdate = () => {
    updateStatusMutation.mutate({ status: statusInput, adminRemark: remarkInput });
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-[18px] font-bold text-slate-800 tracking-tight">Sales Record Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-[18px] font-bold text-slate-800">{record.clientName}</h2>
                <p className="text-slate-500 text-[13px] mt-0.5">{record.clientPhone}</p>
              </div>
              <span className={`px-2 py-0.5 text-[10px] tracking-widest uppercase font-black rounded ${
                record.status === 'Approved' ? 'bg-green-100 text-green-700' :
                record.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {record.status}
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Package</h3>
              <p className="text-[13px] font-semibold text-slate-700">{record.packageName}</p>
            </div>

            {record.itinerary && (
              <div className="mb-6">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Attached Itinerary</h3>
                <a 
                  href={record.itinerary} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 h-7 text-[13px] bg-slate-50 text-primary border border-slate-200 rounded font-semibold hover:bg-orange-50 transition-colors"
                >
                  View Itinerary File
                </a>
              </div>
            )}

            <div>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Details</h3>
              <div 
                className="prose max-w-none text-[13px] text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100"
                dangerouslySetInnerHTML={{ __html: record.details }}
              />
            </div>
          </div>

          {/* Discussion Thread */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <DiscussionThread recordId={id} accessToken={accessToken!} />
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Audit Info</h3>
            <div>
              <p className="text-xs text-slate-500">Created By</p>
              <p className="font-medium text-sm text-slate-800">{record.createdBy?.name || "Unknown"}</p>
              <p className="text-xs text-slate-400">{new Date(record.createdAt).toLocaleString()}</p>
            </div>
            {record.approvedBy && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-green-600 font-semibold">Approved By</p>
                <p className="font-medium text-sm text-slate-800">{record.approvedBy.name}</p>
                <p className="text-xs text-slate-400">{new Date(record.approvedAt!).toLocaleString()}</p>
              </div>
            )}
            {record.rejectedBy && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-red-600 font-semibold">Rejected By</p>
                <p className="font-medium text-sm text-slate-800">{record.rejectedBy.name}</p>
                <p className="text-xs text-slate-400">{new Date(record.rejectedAt!).toLocaleString()}</p>
              </div>
            )}
            {record.adminRemark && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500">Admin Remark</p>
                <p className="text-sm text-slate-700 italic">"{record.adminRemark}"</p>
              </div>
            )}
          </div>

          {/* Admin Actions */}
          {isAdmin && record.status === "Pending" && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-800">Admin Actions</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => handleUpdateStatusClick("Approved")}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleUpdateStatusClick("Rejected")}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              Confirm {statusInput === "Approved" ? "Approval" : "Rejection"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Admin Remark (Optional)
                </label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  rows={3}
                  placeholder="Add any remarks..."
                  value={remarkInput}
                  onChange={(e) => setRemarkInput(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitStatusUpdate}
                  disabled={updateStatusMutation.isPending}
                  className={`px-4 py-2 text-white rounded-lg text-sm flex items-center justify-center min-w-[100px] ${
                    statusInput === "Approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {updateStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalesRecordDetailPage;
