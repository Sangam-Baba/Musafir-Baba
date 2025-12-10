"use client";
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import VideoBannerList from "@/components/admin/VideoBannerList";
import VideoBanner from "@/components/admin/VideoBanner";
import { VideoBannerType } from "@/components/admin/VideoBannerList";

export const getAllMedia = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/videobanner`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Failed to fetch media");
  const data = await res.json();
  return data?.data;
};

const deleteMedia = async (accessToken: string, id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/videobanner/${id}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to delete media");
  return res.json();
};
function MediaVideoBanner() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions
  ) as string[];
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);

  const { data: mediaVideo, isLoading } = useQuery({
    queryKey: ["all-mediavideo"],
    queryFn: getAllMedia,
    enabled: permissions.includes("video-banner"),
  });

  const handleEdit = (id: string) => {
    setEditId(id);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this media?")) return;
    try {
      await deleteMedia(accessToken, id);
      await queryClient.invalidateQueries({ queryKey: ["all-mediavideo"] });
      toast.success("Media Video deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete Media Video");
    }
  };

  if (!permissions.includes("video-banner"))
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">All Video Banner</h1>
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
          <VideoBanner
            id={editId}
            onClose={() => {
              setIsOpen(false);
              setEditId(null);
            }}
            onSuccess={() => {
              queryClient.invalidateQueries({
                queryKey: ["all-mediavideo"],
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
        <VideoBannerList
          VideoBannerArray={mediaVideo?.map((b: VideoBannerType) => ({
            _id: b._id,
            title: b.title,
            description: b.description,
            media: b.media,
            metaTitle: b.metaTitle,
            metaDescription: b.metaDescription,
            related: b.related,
            type: b.type,
            link: b.link,
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default MediaVideoBanner;
