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

const fetchFuelTypes = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/fuel-type?all=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch fuel types");
  return res.json();
};

export default function FuelTypePage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["master-data", "fuel-type"],
    queryFn: () => fetchFuelTypes(accessToken),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/fuel-type/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete fuel type");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Fuel type deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["master-data", "fuel-type"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this fuel type?")) {
      deleteMutation.mutate(id);
    }
  };

  const fuelTypes = data?.data || [];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vehicle Fuel Types</h1>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Fuel Type
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-950 rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fuelTypes.map((type: any) => (
                <TableRow key={type._id}>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      type.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {type.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => { setEditId(type._id); setIsOpen(true); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(type._id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {fuelTypes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                    No fuel types found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <MasterDataModal
            endpoint="fuel-type"
            title="Fuel Type"
            id={editId}
            onClose={() => { setIsOpen(false); setEditId(null); }}
          />
        </div>
      )}
    </div>
  );
}
