"use client";
import React from "react";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import SalesRecordForm from "@/components/admin/SalesRecordForm";

function NewSalesRecordPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken);
  const permissions = useAdminAuthStore((state) => state.permissions) as string[];
  const role = useAdminAuthStore((state) => state.role);

  if (!permissions.includes("sales-record") && role !== "admin" && role !== "superadmin") {
    return <h1 className="text-2xl mx-auto">Access denied</h1>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Create Sales Record</h1>
      <SalesRecordForm accessToken={accessToken!} />
    </div>
  );
}

export default NewSalesRecordPage;
