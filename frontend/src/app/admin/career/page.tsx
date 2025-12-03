"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "@/components/custom/loader";
import { useRouter } from "next/navigation";
import JobList from "@/components/admin/JobList";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { toast } from "sonner";

interface Job {
  _id: string;
  title: string;
  experienceLevel: string;
  salaryRange: string;
  employmentType: string;
  isActive: boolean;
}
const getAllJobs = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/job`);

  if (!res.ok) throw new Error("Failed to fetch jobs");
  const data = await res.json();
  return data;
};
function CareerPage() {
  const router = useRouter();
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions
  ) as string[];
  const { data, isLoading, isError } = useQuery({
    queryKey: ["jobs"],
    queryFn: getAllJobs,
    enabled: permissions.includes("career"),
  });
  if (isLoading) return;
  if (isError) return <h1>Failed to fetch jobs</h1>;
  const allJobs = data?.data ?? [];

  const handleEdit = (id: string) => {
    router.push(`/admin/career/edit/${id}`);
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/job/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete job");
      toast.success("Job: Deleted successfully");
      router.refresh();
    } catch (error) {
      console.log(error);
    }
  };
  if (!permissions.includes("career"))
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">All Posted Jobs</h1>
        <button
          onClick={() => router.push("/admin/career/new")}
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
        >
          + Create
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader size="lg" message="Loading jobs..." />
        </div>
      ) : (
        <JobList
          jobs={allJobs.map((b: Job) => ({
            id: b._id,
            title: b.title,
            experienceLevel: b.experienceLevel,
            salaryRange: b.salaryRange,
            employmentType: b.employmentType,
            isActive: `${b.isActive === true ? "Active" : "Inactive"}`,
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default CareerPage;
