"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "@/components/custom/loader";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import AllDocList from "@/components/User/AllDocList";
import AddEditDoc from "@/components/User/AddEditDoc";

const getMyDoc = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/document/my`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      AUthorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch documents");
  const data = await res.json();
  return data?.data;
};

function DocumentPage() {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["documents"],
    queryFn: () => getMyDoc(accessToken),
  });
  if (isLoading) return <Loader />;
  console.log(data);
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <Button onClick={() => setOpen(true)}>+ Add</Button>
      </div>
      <div>
        <AllDocList
          documents={data ?? []}
          onEdit={(id) => {
            setEditId(id);
            setOpen(true);
          }}
        />
      </div>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 mx-auto flex items-center justify-center">
          <AddEditDoc
            id={editId}
            onClose={() => {
              setOpen(false);
              setEditId(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default DocumentPage;
