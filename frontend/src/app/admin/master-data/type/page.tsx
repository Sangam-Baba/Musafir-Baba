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
import { MasterDataModal } from "@/components/admin/MasterDataModal";

import { useRouter } from "next/navigation";

const fetchTypes = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/type?all=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch types");
  return res.json();
};

export default function TypePage() {
  const router = useRouter();
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["master-data", "type"],
    queryFn: () => fetchTypes(accessToken),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/type/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete type");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Type deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["master-data", "type"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this type?")) {
      deleteMutation.mutate(id);
    }
  };

  const types = data?.data || [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-[18px] font-bold text-slate-800 dark:text-white">Vehicle Types</h1>
        <Button onClick={() => router.push("/admin/master-data/type/create")} className="bg-[#FE5300] hover:bg-[#e14a00]">
          <Plus className="w-4 h-4 mr-2" /> Add Type
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
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">Name</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">Status</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((type: any) => (
                <TableRow key={type._id} className="group hover:bg-slate-50/80 transition-colors duration-300">
                  <TableCell className="py-2">
                    <span className="text-[13px] font-semibold text-slate-700 tracking-tight transition-transform duration-300 group-hover:translate-x-[1px] inline-block">
                      {type.name}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={`px-2 py-0.5 rounded-sm text-[10px] font-black uppercase tracking-widest ${
                      type.status === "active" ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"
                    }`}>
                      {type.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 text-right space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-slate-400 hover:text-indigo-500 opacity-40 hover:opacity-100 hover:scale-110 transition-all duration-300"
                      onClick={() => router.push(`/admin/master-data/type/edit/${type._id}`)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-slate-400 hover:text-red-500 opacity-40 hover:opacity-100 hover:scale-110 transition-all duration-300"
                      onClick={() => handleDelete(type._id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {types.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-muted-foreground text-[13px]">
                    No types found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
