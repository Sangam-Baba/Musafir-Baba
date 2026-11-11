"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Edit, Trash2, Fuel } from "lucide-react";
import { FleetEmptyState, FleetPage, FleetPanel, fleetTh } from "@/components/admin/fleet/FleetUI";
import { RentalPageHeader, RentalStatusPill, rPrimaryBtn } from "@/components/admin/rental/RentalAdminUI";
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
    <FleetPage>
      <RentalPageHeader
        icon={Fuel}
        title="Fuel Types"
        description="Fuel types offered in the vehicle form."
        actions={
          <Button size="sm" className={rPrimaryBtn} onClick={() => setIsOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add fuel type
          </Button>
        }
      />

      <FleetPanel title="All fuel types" description={`${fuelTypes.length} total`}>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : fuelTypes.length === 0 ? (
          <FleetEmptyState icon={Fuel} title="No fuel types yet" hint="Add fuel types like Petrol or Diesel." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`${fleetTh} pl-4`}>Name</TableHead>
                <TableHead className={fleetTh}>Status</TableHead>
                <TableHead className={`${fleetTh} pr-4 text-right`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fuelTypes.map((type: any) => (
                <TableRow key={type._id} className="hover:bg-slate-50/70">
                  <TableCell className="py-2.5 pl-4 text-[13px] font-medium text-slate-900">{type.name}</TableCell>
                  <TableCell className="py-2.5">
                    <RentalStatusPill status={type.status} />
                  </TableCell>
                  <TableCell className="py-2.5 pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="icon" title="Edit" aria-label="Edit" className="h-7 w-7 border-slate-200 text-slate-500 hover:border-orange-200 hover:bg-orange-50 hover:text-[#FE5300]" onClick={() => { setEditId(type._id); setIsOpen(true); }}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" title="Delete" aria-label="Delete" className="h-7 w-7 border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(type._id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FleetPanel>

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
    </FleetPage>
  );
}
