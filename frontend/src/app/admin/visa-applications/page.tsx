"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import VisaApplicationList from "@/components/admin/VisaApplicationList";
import { Loader } from "@/components/custom/loader";

import { Globe } from "lucide-react";

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
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header aligned with sitemap spec */}
      <div className="flex items-center justify-between border-b pb-4 border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-orange-50 rounded-lg flex items-center justify-center text-[#FE5300]">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-slate-800 leading-none">Visa Applications</h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1.5">
              Total Records: {data?.length || 0}
            </p>
          </div>
        </div>
      </div>

      <VisaApplicationList 
        applications={data || []} 
        onStatusUpdate={() => refetch()} 
      />
    </div>
  );
}
