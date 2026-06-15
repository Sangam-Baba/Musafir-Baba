"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "@/components/custom/loader";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import PackagesList from "@/components/admin/PackagesList";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import CustomizedPreviewDrawer from "@/components/admin/CustomizedPreviewDrawer";
import { useState } from "react";

interface Package {
  _id: string;
  title: string;
  duration: {
    days: number;
    nights: number;
  };
  destination?: {
    name: string;
    state: string;
    country: string;
  };
  plans: [
    {
      title: string;
      include: string;
      price: number;
    }
  ];
  slug: string;
  status: string;
  canonicalUrl?: string;
  pendingUpdates?: {
    updatedBy?: string;
  };
}
const getAllPackages = async (accessToken: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch packages");
  const data = await res.json();
  // console.log("All packages is: ",data.data);
  return data?.data;
};
function PackagePage() {
  const router = useRouter();
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const role = useAdminAuthStore((state) => state.role) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions
  ) as string[];
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["customizedpackage"],
    queryFn: () => getAllPackages(accessToken),
    enabled: permissions.includes("customized-tour-package"),
  });
  if (isLoading) return <Loader size="lg" message="Loading packages..." />;
  if (isError) return <h1>{error.message}</h1>;
  const packages = data ?? [];
  const handleEdit = (id: string) => {
    router.push(`/admin/customized-tour-package/edit/${id}`);
  };

  const handlePreview = (id: string) => {
    setPreviewId(id);
    setIsPreviewOpen(true);
  };

  const handleApprove = async (id: string) => {
    if (!confirm("Are you sure you want to approve these changes?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/${id}/approve`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to approve package updates");
      toast.success("Package updates approved successfully");
      refetch();
    } catch (error) {
      console.log("error in approving", error);
      toast.error("Something went wrong while approving package");
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject these changes?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/${id}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to reject package updates");
      toast.success("Package updates rejected successfully");
      refetch();
    } catch (error) {
      console.log("error in rejecting", error);
      toast.error("Something went wrong while rejecting package updates");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this package?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to delete package");
      toast.success("Package: Deleted successfully");
      router.refresh();
    } catch (error) {
      console.log("error in deleting", error);
      toast.error("Something went wrong while deleting package");
    }
  };

  if (!permissions.includes("customized-tour-package"))
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">All Customized Tour Packages</h1>
        <button
          onClick={() => router.push("/admin/customized-tour-package/new")}
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
        >
          + Create
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <PackagesList
          packages={
            Array.isArray(packages)
              ? packages.map((b: Package) => ({
                  id: b._id as string,
                  name: b.title as string,
                  location:
                    (b.destination?.state?.charAt(0).toUpperCase() as string) +
                    b.destination?.state?.slice(1),
                  price: b.plans[0]?.price?.toLocaleString("en-US"),
                  url: b.canonicalUrl || `/holidays/customised-tour-packages/${b.destination?.state?.toLowerCase().replace(/ /g, '-')}/${b.slug}`,
                  slug: b.slug as string,
                  status: b.pendingUpdates ? (b.pendingUpdates.updatedBy ? `Pending Updates by ${b.pendingUpdates.updatedBy}` : "Pending Updates") : (b.status === "published" ? "Published" : "Draft"),
                }))
              : []
          }
          role={role}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onApprove={handleApprove}
          onReject={handleReject}
          onPreview={handlePreview}
        />
      )}
      <CustomizedPreviewDrawer id={previewId} isOpen={isPreviewOpen} onClose={() => { setIsPreviewOpen(false); setPreviewId(null); }} />
    </div>
  );
}

export default PackagePage;
