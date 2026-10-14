"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import DestinationSeoList from "@/components/admin/DestinationSeoList";
import { DestinationSeo } from "@/components/admin/DestinationSeoList";
import { Loader2, Plus } from "lucide-react";
import DestinationSeoNew from "@/components/admin/DestinationSeoNew";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FleetPage } from "@/components/admin/fleet/FleetUI";
import { DestinationHubHeader } from "@/components/admin/destination/DestinationHub";

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
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions
  ) as string[];
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
    if (!confirm("Are you sure you want to delete this destination seo?"))
      return;
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
    <FleetPage>
      <DestinationHubHeader
        active="seo"
        actions={
          <Button
            onClick={() => setIsOpen(true)}
            className="h-8 bg-[#FE5300] text-[12px] hover:bg-[#e54b00]"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Create SEO Page
          </Button>
        }
      />

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]">
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
            excerpt: b.excerpt ?? "",
            keywords: b.keywords,
            url: `/holidays/${b.categoryId.slug}/${b.destinationId.state}`,
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </FleetPage>
  );
}

export default DestinationSeoMain;
