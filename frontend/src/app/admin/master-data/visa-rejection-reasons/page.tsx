"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MasterDataDrawer } from "@/components/admin/MasterDataDrawer";

const fetchRejectionReasons = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/visa-rejection-reasons?all=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch visa rejection reasons");
  return res.json();
};

export default function VisaRejectionReasonsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["master-data", "visa-rejection-reasons"],
    queryFn: () => fetchRejectionReasons(accessToken),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/visa-rejection-reasons/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete reason");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Reason deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["master-data", "visa-rejection-reasons"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this reason?")) {
      deleteMutation.mutate(id);
    }
  };

  const reasons = data?.data || [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-[18px] font-bold text-slate-800 dark:text-white tracking-normal">Visa Rejection Reasons</h1>
        <Button onClick={() => setIsOpen(true)} size="sm" className="h-8">
          <Plus className="w-4 h-4 mr-2" /> Add Reason
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-950 rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead className="w-1/4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Title</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</TableHead>
                <TableHead className="w-24 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-right w-24 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reasons.map((reason: any) => (
                <TableRow key={reason._id} className="group hover:bg-slate-50/80 transition-colors duration-300 ease-in-out border-slate-100">
                  <TableCell className="py-2">
                    <div className="text-[13px] font-semibold text-slate-700 dark:text-slate-100 group-hover:translate-x-[1px] transition-transform duration-300 ease-in-out">{reason.title}</div>
                  </TableCell>
                  <TableCell className="py-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 max-w-xs truncate">
                    <div dangerouslySetInnerHTML={{ __html: reason.description || "" }} className="line-clamp-1" />
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${
                      reason.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {reason.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 text-right space-x-2 whitespace-nowrap">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-orange-50 text-slate-400 hover:text-[#FE5300] transition-colors duration-300" onClick={() => { setEditId(reason._id); setIsOpen(true); }}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors duration-300" onClick={() => handleDelete(reason._id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {reasons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                    No reasons found. Click &quot;Add Reason&quot; to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {isOpen && (
        <MasterDataDrawer
          endpoint="visa-rejection-reasons"
          title="Visa Rejection Reason"
          id={editId}
          showTitleDescFields={true}
          onClose={() => { setIsOpen(false); setEditId(null); }}
        />
      )}
    </div>
  );
}
