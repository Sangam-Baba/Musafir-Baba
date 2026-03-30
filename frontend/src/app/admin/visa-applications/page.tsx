"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import VisaApplicationList from "@/components/admin/VisaApplicationList";
import { Loader } from "@/components/custom/loader";

async function fetchApplications(accessToken: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa-application/all`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch applications");
  const data = await res.json();
  return data.data;
}

export default function AdminVisaApplicationsPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-visa-applications"],
    queryFn: () => fetchApplications(accessToken as string),
    enabled: !!accessToken,
  });

  if (isLoading) return <Loader size="lg" message="Fetching visa applications..." />;
  if (isError) return <div className="p-6 text-center text-red-500">Error loading applications</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Visa Applications</h1>
        <div className="text-sm text-gray-500">
          Total: {data?.length || 0}
        </div>
      </div>

      <VisaApplicationList 
        applications={data || []} 
        onStatusUpdate={() => refetch()} 
      />
    </div>
  );
}
