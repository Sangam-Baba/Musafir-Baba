"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Edit, Trash2, ListChecks } from "lucide-react";
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
    <FleetPage>
      <RentalPageHeader
        icon={ListChecks}
        title="Vehicle Types"
        description="Car, Bike, Traveller... Content for a city and type lives on City + Type Pages, e.g. /rental/delhi/car."
        actions={
          <Button size="sm" className={rPrimaryBtn} onClick={() => router.push("/admin/master-data/type/create")}>
            <Plus className="h-3.5 w-3.5" /> Add type
          </Button>
        }
      />

      <FleetPanel title="All vehicle types" description={`${types.length} total`}>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : types.length === 0 ? (
          <FleetEmptyState icon={ListChecks} title="No vehicle types yet" hint="Add types like Car, Bike or Traveller." />
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
              {types.map((type: any) => (
                <TableRow key={type._id} className="hover:bg-slate-50/70">
                  <TableCell className="py-2.5 pl-4 text-[13px] font-medium text-slate-900">{type.name}</TableCell>
                  <TableCell className="py-2.5">
                    <RentalStatusPill status={type.status} />
                  </TableCell>
                  <TableCell className="py-2.5 pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="icon" title="Edit" aria-label="Edit" className="h-7 w-7 border-slate-200 text-slate-500 hover:border-orange-200 hover:bg-orange-50 hover:text-[#FE5300]" onClick={() => router.push(`/admin/master-data/type/edit/${type._id}`)}>
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
    </FleetPage>
  );
}
