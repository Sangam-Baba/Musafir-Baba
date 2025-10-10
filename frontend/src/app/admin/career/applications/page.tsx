"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader } from "@/components/custom/loader";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import ApplicationsTable from "@/components/admin/ApplicationList";

interface Application {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  resumeUrl: string;
  hightestQualification: string;
  status: string;
  experience: string;
}
const getAllApplications = async (accessToken: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/jobapplication`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) throw new Error("Failed to fetch applications");
  const data = await res.json();
  return data;
};
function AllApplicationsPage() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();
  const aapId = 1;
  const { data, isLoading, isError } = useQuery({
    queryKey: ["applications", aapId],
    queryFn: () => getAllApplications(accessToken),
  });
  if (isLoading) return;
  if (isError) return <h1>Failed to fetch applications</h1>;
  const allapplications = data?.data ?? [];

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/jobapplication/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status }),
        }
      );
      if (!res.ok) throw new Error("Failed to update status");
      toast.success("Status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["applications", id] });
    } catch (error) {
      toast.error("Something went wrong while updating role");
      console.log("error in updating role", error);
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this applications?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/jobapplication/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to delete applications");
      toast.success("Applications: Deleted successfully");
      router.refresh();
    } catch (error) {
      console.log(error);
    }
  };
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">All Job Applications</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader size="lg" message="Loading jobs..." />
        </div>
      ) : (
        <ApplicationsTable
          applications={allapplications.map((b: Application) => ({
            _id: b._id,
            fullName: b.fullName,
            email: b.email,
            phone: b.phone,
            resumeUrl: b.resumeUrl,
            hightestQualification: b.hightestQualification,
            status: b.status,
            experience: b.experience,
          }))}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default AllApplicationsPage;
