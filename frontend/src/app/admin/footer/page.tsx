"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import FooterList from "@/components/admin/FooterList";
interface Footer {
  _id: string;
  title: string;
  content: Content[];
}
interface Content {
  text: string;
  url: string;
}
interface QueryResponse {
  success: boolean;
  message: string;
  data: Footer[];
}
const getAllFooters = async (token: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/footer`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch footers");
  const data = await res.json();
  return data;
};
function FooterPage() {
  const token = useAuthStore((state) => state.accessToken) as string;
  const permissions = useAuthStore((state) => state.permissions) as string[];
  const router = useRouter();
  const { data, isLoading, isError, error } = useQuery<QueryResponse>({
    queryKey: ["authors"],
    queryFn: () => getAllFooters(token),
    retry: 2,
    enabled: permissions.includes("footer"),
  });
  if (isError) {
    toast.error(error.message);
    return <h1>{error.message}</h1>;
  }
  const footers = data?.data ?? [];
  const handleEdit = (id: string) => {
    router.push(`/admin/footer/edit/${id}`);
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this footer?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/footer/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to delete footer");
      toast.success("Fooetr: Deleted successfully");
      router.refresh();
    } catch (error) {
      console.log("error in deleting", error);
      toast.error("Something went wrong while deleting footer");
    }
  };

  if (!permissions.includes("footer"))
    return <h1 className="text-2xl">Access Denied</h1>;
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">All Footer Items</h1>
        <button
          onClick={() => router.push("/admin/footer/new")}
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
        <FooterList
          footers={footers.map((b) => ({
            id: b._id,
            title: b.title,
            content: b.content,
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default FooterPage;
