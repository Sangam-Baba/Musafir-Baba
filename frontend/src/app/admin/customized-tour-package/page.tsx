"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "@/components/custom/loader";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import PackagesList from "@/components/admin/PackagesList";
import { useAuthStore } from "@/store/useAuthStore";

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
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const permissions = useAuthStore((state) => state.permissions) as string[];
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["customizedpackage"],
    queryFn: () => getAllPackages(accessToken),
    enabled: permissions.includes("customized-package"),
  });
  if (isLoading) return <Loader size="lg" message="Loading packages..." />;
  if (isError) return <h1>{error.message}</h1>;
  const packages = data ?? [];
  const handleEdit = (id: string) => {
    router.push(`/admin/customized-tour-package/edit/${id}`);
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

  if (!permissions.includes("customized-package"))
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
                  price: b.plans[0]?.price,
                  url: `/customized-tour-package/${b.slug}`,
                  slug: b.slug as string,
                  status: b.status === "published" ? "Published" : "Draft",
                }))
              : []
          }
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default PackagePage;
