"use client";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import UsersList from "@/components/admin/UsersList";
import CreateEditStaff from "@/components/auth/CreateEditStaff";
import { Button } from "@/components/ui/button";
import VehiclesList from "@/components/admin/VehicleList";
import { CreateEditVehicle } from "@/components/admin/CreateEditVehicle";
export interface IVehicleData {
  _id: string;
  vehicleName: string;
  vehicleType: string;
  vehicleYear: string;
  vehicleBrand: string;
  vehicleMilage?: string;
  fuelType: string;
  price: {
    daily: number;
    hourly: number;
  };
  content: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  vehicleModel?: string;
  gallery?: {
    url: string;
    title?: string;
    alt: string;
  };
  status: string;
}

interface QueryParams {
  data: IVehicleData[];
}

const getAllVehicle = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/vehicle`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch Vehicle", { cause: res });
  const data = await res.json();
  return data;
};
function VehiclePage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions,
  ) as string[];

  const { data, isLoading, isError, error } = useQuery<QueryParams>({
    queryKey: ["vehicle"],
    queryFn: () => getAllVehicle(accessToken),
    retry: 2,
    enabled: permissions.includes("vehicle"),
  });
  const vehicles = data?.data ?? [];
  if (isError) {
    toast.error(error.message);
    return <h1>{error.message}</h1>;
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!res.ok) throw new Error(`Failed to delete  vehicle `);
      toast.success("Vehicle: Deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["vehicle"] });
    } catch (error) {
      console.log("error in deleting", error);
      toast.error("Something went wrong while deleting");
    }
  };

  if (!permissions.includes("vehicle"))
    return <div className="mx-auto text-2xl">Access Denied</div>;
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Your Vehicles</h1>
        <div>
          <Button onClick={() => setIsOpen(true)}>Add Vehicle</Button>
        </div>
        {/* Modal */}
        {isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <CreateEditVehicle
              id={editId}
              onClose={() => {
                setIsOpen(false);
                setEditId(null);
              }}
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <VehiclesList
          vehicles={vehicles?.map((b) => ({
            _id: b._id,
            vehicleName: b.vehicleName,
            vehicleType: b.vehicleType,
            fuelType: b.fuelType,
            price: b.price,
            status: b.status,
          }))}
          onStatusChange={(id) => {
            setEditId(id);
            setIsOpen(true);
          }}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default VehiclePage;
