"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import DestinationSeoList from "@/components/admin/DestinationSeoList";
import { DestinationSeo } from "@/components/admin/DestinationSeoList";
import { Loader2 } from "lucide-react";
import DestinationSeoNew from "@/components/admin/DestinationSeoNew";
import { toast } from "sonner";

const getAllDestinationSeo = async (accessToken: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/destinationseo`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch destination seo");
  const data = await res.json();
  return data?.data;
};

const deleteDestinationSeo = async (accessToken: string, id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/destinationseo/${id}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to delete destination seo");
  return res.json();
};
function DestinationSeoMain() {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const permissions = useAuthStore((state) => state.permissions) as string[];
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);

  const { data: destinationSeo, isLoading } = useQuery({
    queryKey: ["all-destinationSeo"],
    queryFn: () => getAllDestinationSeo(accessToken),
    enabled: permissions.includes("destination-seo"),
  });

  const handleEdit = (id: string) => {
    setEditId(id);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDestinationSeo(accessToken, id);
      await queryClient.invalidateQueries({ queryKey: ["all-destinationSeo"] });
      toast.success("Destination SEO deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete Destination SEO");
    }
  };

  if (!permissions.includes("destination-seo"))
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">All Destination SEO</h1>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
        >
          + Create
        </button>
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <DestinationSeoNew
            id={editId}
            onClose={() => {
              setIsOpen(false);
              setEditId(null);
            }}
            onSuccess={() => {
              queryClient.invalidateQueries({
                queryKey: ["all-destinationSeo"],
              });
            }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DestinationSeoList
          destinationSeo={destinationSeo?.map((b: DestinationSeo) => ({
            _id: b._id,
            destinationId: b.destinationId,
            categoryId: b.categoryId,
            metaTitle: b.metaTitle,
            metaDescription: b.metaDescription,
            keywords: b.keywords,
            url: `/holidays/${b.categoryId.slug}/${b.destinationId.state}`,
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default DestinationSeoMain;
