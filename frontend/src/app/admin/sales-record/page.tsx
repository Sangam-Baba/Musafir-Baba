"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import SalesRecordList from "@/components/admin/SalesRecordList";

interface SalesRecord {
  _id: string;
  clientName: string;
  clientPhone: string;
  packageName: string;
  status: string;
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

interface QueryResponse {
  success: boolean;
  message: string;
  data: SalesRecord[];
}

const getAllRecords = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/sales-record`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch records");
  const data = await res.json();
  return data;
};

function SalesRecordPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken);
  const permissions = useAdminAuthStore((state) => state.permissions) as string[];
  const role = useAdminAuthStore((state) => state.role);
  const router = useRouter();

  const { data, isLoading, isError, error } = useQuery<QueryResponse>({
    queryKey: ["sales-records"],
    queryFn: () => getAllRecords(accessToken!),
    retry: 2,
    enabled: (permissions.includes("sales-record") || role === "admin" || role === "superadmin") && !!accessToken,
  });

  if (isError) {
    toast.error(error.message);
    return <h1>{error.message}</h1>;
  }

  const records = data?.data ?? [];

  if (!permissions.includes("sales-record") && role !== "admin" && role !== "superadmin") {
    return <h1 className="text-2xl mx-auto">Access denied</h1>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Sales Records</h1>
        <button
          onClick={() => router.push("/admin/sales-record/new")}
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Create
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <SalesRecordList records={records} isAdmin={role === "admin" || role === "superadmin"} />
      )}
    </div>
  );
}

export default SalesRecordPage;
