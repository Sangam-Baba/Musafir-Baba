"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Edit, Trash2, MapPin } from "lucide-react";
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

const fetchDestinations = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/pickup-destination?all=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch destinations");
  return res.json();
};

export default function PickupDestinationPage() {
  const router = useRouter();
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["master-data", "pickup-destination"],
    queryFn: () => fetchDestinations(accessToken),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/pickup-destination/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to delete destination");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Destination deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["master-data", "pickup-destination"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this destination?")) {
      deleteMutation.mutate(id);
    }
  };

  const destinations = data?.data || [];

  return (
    <FleetPage>
      <RentalPageHeader
        icon={MapPin}
        title="Cities (Pickup Points)"
        description="Cities vehicles are picked up from. Each has its own page, e.g. /rental/delhi."
        actions={
          <Button size="sm" className={rPrimaryBtn} onClick={() => router.push("/admin/master-data/pickup-destination/create")}>
            <Plus className="h-3.5 w-3.5" /> Add city
          </Button>
        }
      />

      <FleetPanel title="All cities" description={`${destinations.length} total`}>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : destinations.length === 0 ? (
          <FleetEmptyState icon={MapPin} title="No cities yet" hint="Add the cities you rent vehicles in." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`${fleetTh} pl-4`}>Name</TableHead><TableHead className={`${fleetTh}`}>City</TableHead><TableHead className={`${fleetTh}`}>State</TableHead>
                <TableHead className={fleetTh}>Status</TableHead>
                <TableHead className={`${fleetTh} pr-4 text-right`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {destinations.map((dest: any) => (
                <TableRow key={dest._id} className="hover:bg-slate-50/70">
                  <TableCell className="py-2.5 pl-4 text-[13px] font-medium text-slate-900">{dest.name}</TableCell>
                  <TableCell className="py-2.5 text-[12px] text-slate-600">{dest.city || "—"}</TableCell>
                  <TableCell className="py-2.5 text-[12px] capitalize text-slate-600">{dest.state || "—"}</TableCell>
                  <TableCell className="py-2.5">
                    <RentalStatusPill status={dest.status} />
                  </TableCell>
                  <TableCell className="py-2.5 pr-4">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="icon" title="Edit" aria-label="Edit" className="h-7 w-7 border-slate-200 text-slate-500 hover:border-orange-200 hover:bg-orange-50 hover:text-[#FE5300]" onClick={() => router.push(`/admin/master-data/pickup-destination/edit/${dest._id}`)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="icon" title="Delete" aria-label="Delete" className="h-7 w-7 border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600" onClick={() => handleDelete(dest._id)}>
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
