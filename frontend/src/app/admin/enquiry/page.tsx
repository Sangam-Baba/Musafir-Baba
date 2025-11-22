"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader } from "@/components/custom/loader";
import EnquiryList from "@/components/admin/EnquriyList";
import { exportToCSV } from "@/utils/exportToCSV";

const getAllEnquiry = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/contact`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch enquriy");
  const data = await res.json();
  return data;
};
interface Enquiry {
  _id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  whatsapp: boolean;
  policy: boolean;
  source: string;
  createdAt: string;
}
interface QueryResponse {
  data: Enquiry[];
}
function EnquiryPage() {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const permissions = useAuthStore((state) => state.permissions) as string[];
  const { data, isLoading, isError, error } = useQuery<QueryResponse>({
    queryKey: ["enquiry"],
    queryFn: () => getAllEnquiry(accessToken),
    retry: 2,
    enabled: permissions.includes("enquiry"),
  });
  if (isError) {
    return <h1>{error.message}</h1>;
  }
  const enquiry = data?.data ?? [];

  const generateLeadId = (index: number) =>
    `MB-${String(index + 1).padStart(4, "0")}`;
  const totalEnquriy = enquiry.length;
  const handleExport = () => {
    const formattedData = enquiry.map((enq, index) => ({
      leadId: generateLeadId(totalEnquriy - index - 1),
      name: enq.name,
      email: enq.email,
      phone: enq.phone,
      message: enq.message,
      whatsapp: enq.whatsapp,
      source: enq.source,
      createdAt: enq.createdAt,
    }));
    exportToCSV(formattedData, { fileName: "enquiries" });
  };

  if (!permissions.includes("enquiry")) return <h1>Access Denied</h1>;
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">All Enquiry ({totalEnquriy})</h1>
        <button
          onClick={handleExport}
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
        >
          + Export CSV
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader size="lg" />
        </div>
      ) : (
        <EnquiryList
          enquiry={enquiry.map((b, i) => ({
            leadId: generateLeadId(totalEnquriy - i - 1),
            name: b.name,
            email: b.email,
            phone: b.phone,
            source: b.source,
            message: b.message,
            whatsapp: `${b.whatsapp === true ? "Yes" : "No"}`,
            createdAt: b.createdAt.split("T")[0],
          }))}
        />
      )}
    </div>
  );
}

export default EnquiryPage;
