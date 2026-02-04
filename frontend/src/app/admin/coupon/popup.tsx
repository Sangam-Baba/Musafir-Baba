"use client";
import React from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { toast } from "sonner";
import { Loader } from "@/components/custom/loader";
import PopupList from "@/components/admin/PopupList";
import { CreateEditPopup } from "@/components/admin/CreateEditPopup";

export interface PopupInterface {
  _id: string;
  title?: string;
  description?: string;
  coverImage: {
    url: string;
    alt: string;
    width: number;
    height: number;
  };
  status: "published" | "draft";
  page: "home" | "webpage";
  button: {
    title: string;
    url: string;
  };
}
const getAllPopups = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/popup`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch all coupans");
  const data = await res.json();
  return data?.data;
};

const deletePopup = async (accessToken: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/popup/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to delete coupan");
  return res.json();
};
function Popup() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);

  const { data: allPopups, isLoading } = useQuery({
    queryKey: ["all-popups"],
    queryFn: () => getAllPopups(accessToken),
  });

  const handleEdit = (id: string) => {
    setEditId(id);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this popup?")) return;
    try {
      await deletePopup(accessToken, id);
      await queryClient.invalidateQueries({ queryKey: ["all-popups"] });
      toast.success("Popup deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete Popup");
    }
  };
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage popup</h1>
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
          <CreateEditPopup
            id={editId}
            onClose={() => {
              setIsOpen(false);
              setEditId(null);
            }}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader />
        </div>
      ) : (
        <PopupList
          allpopups={allPopups?.map((b: PopupInterface) => ({
            _id: b._id,
            title: b?.button?.title,
            url: b?.button?.url,
            coverImage: b.coverImage,
            page: b.page,
            status: b.status,
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default Popup;
