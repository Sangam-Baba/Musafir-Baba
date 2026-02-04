"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CreateEditCoupan } from "@/components/admin/CreateEditCoupan";
import CoupansList from "@/components/admin/CoupansList";
import Popup from "./popup";

export interface CoupansInterface {
  _id: string;
  code: string;
  description: string;
  type: string;
  value: number;
  minAmount: number;
  maxDiscount: number;
  applicableItems: { itemId: string; itemType: string }[];
  validFrom: string;
  validTill: string;
  isActive: boolean;
}

const getAllCoupans = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/coupan`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch all coupans");
  const data = await res.json();
  return data?.data;
};

const deleteCoupan = async (accessToken: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/coupan/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to delete coupan");
  return res.json();
};
function CoupanCode() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions,
  ) as string[];
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);

  const { data: allCoupans, isLoading } = useQuery({
    queryKey: ["all-coupans"],
    queryFn: () => getAllCoupans(accessToken),
    enabled: permissions.includes("coupon"),
  });

  const handleEdit = (id: string) => {
    setEditId(id);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupan?")) return;
    try {
      await deleteCoupan(accessToken, id);
      await queryClient.invalidateQueries({ queryKey: ["all-coupans"] });
      toast.success("Coupan deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete Coupan");
    }
  };

  if (!permissions.includes("coupon"))
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Coupan Offers</h1>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
        >
          + Create
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <CreateEditCoupan
            id={editId}
            onClose={() => {
              setIsOpen(false);
              setEditId(null);
            }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <CoupansList
          allCoupans={allCoupans?.map((b: CoupansInterface) => ({
            _id: b._id,
            code: b.code,
            description: b.description,
            type: b.type,
            value: b.value,
            minAmount: b.minAmount,
            maxDiscount: b.maxDiscount,
            applicableItems: b.applicableItems,
            validFrom: b.validFrom,
            validTill: new Date(b.validTill).toDateString(),
            isActive: b.isActive,
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <Popup />
    </div>
  );
}

export default CoupanCode;
