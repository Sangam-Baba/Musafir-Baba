"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import MembershipList from "@/components/admin/MembershipList";
interface Membership {
  _id: string;
  name: string;
  price: number;
  duration: string;
}

interface QueryResponse {
  success: boolean;
  data: Membership[];
}
const getAllMemberships = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/membership`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch membership");
  const data = await res.json();
  return data;
};
function MembershipPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions
  ) as string[];
  const router = useRouter();
  const { data, isLoading, isError, error } = useQuery<QueryResponse>({
    queryKey: ["membership"],
    queryFn: () => getAllMemberships(accessToken),
    retry: 2,
  });
  if (isError) {
    toast.error(error.message);
    return <h1>{error.message}</h1>;
  }
  const membership = data?.data ?? [];
  const handleEdit = (id: string) => {
    router.push(`/admin/membership/edit/${id}`);
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this membership?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/membership/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to delete membership");
      toast.success("membership: Deleted successfully");
      router.refresh();
    } catch (error) {
      console.log("error in deleting", error);
      toast.error("Something went wrong while deleting membership");
    }
  };

  if (!permissions.includes("membership")) return <h1>Access Denied</h1>;
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">All Membership</h1>
        <button
          onClick={() => router.push("/admin/membership/new")}
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
        <MembershipList
          membership={membership.map((b) => ({
            id: b._id,
            name: b.name,
            price: b.price,
            duration: b.duration.charAt(0).toUpperCase() + b.duration.slice(1),
            url: `/membership`,
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default MembershipPage;
