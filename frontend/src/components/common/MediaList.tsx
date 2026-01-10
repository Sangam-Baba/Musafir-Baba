"use client";

import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "../custom/loader";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Button } from "../ui/button";
import MainMediaUploader from "../admin/MainMediaUploader";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

interface MediaUploadInterface {
  alt?: string;
  title?: string;
  description?: string;
}

export default function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (media: any) => void;
}) {
  const token = useAdminAuthStore((s) => s.accessToken) as string;
  const queryClient = useQueryClient();

  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

  const form = useForm<MediaUploadInterface>();

  /*  FETCH MEDIA  */
  const { data: media, isLoading } = useQuery({
    queryKey: ["media"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/media`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json.data;
    },
  });

  /*  UPDATE MEDIA  */
  const mutation = useMutation({
    mutationFn: async (values: MediaUploadInterface) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/media/${selectedMedia._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(values),
        }
      );
      return res.json();
    },
    onSuccess: (updated) => {
      onSelect(updated.data);
      console.log(updated);
      queryClient.invalidateQueries({ queryKey: ["media"] });
      onClose();
    },
  });

  /*  MEDIA CLICK */
  const handleSelect = (item: any) => {
    setSelectedMedia(item);
    form.reset({
      alt: item.alt || "",
      title: item.title || "",
      description: item.description || "",
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-full max-w-5xl p-4 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between mb-3">
          <h2 className="text-xl font-semibold">Media Library</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* UPLOAD */}
        <MainMediaUploader
          onUpload={() =>
            queryClient.invalidateQueries({ queryKey: ["media"] })
          }
        />

        <div className="flex gap-4 mt-6 relative">
          {/* MEDIA GRID */}
          <div className="grid grid-cols-4 gap-3 flex-1 overflow-auto">
            {isLoading && <Loader size="md" />}

            {media?.map((item: any) => (
              <div
                key={item._id}
                onClick={() => handleSelect(item)}
                className={`cursor-pointer border rounded p-1 ${
                  selectedMedia?._id === item._id ? "ring-2 ring-blue-500" : ""
                }`}
              >
                {item.format === "mp4" ? (
                  <video src={item.url} className="h-28 w-full object-cover" />
                ) : (
                  <Image
                    src={item.url}
                    alt=""
                    width={200}
                    height={200}
                    className="h-28 w-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>

          {/* RIGHT PANEL */}
          {selectedMedia && (
            <div className="w-80 bg-gray-100 p-4 rounded sticky top-10 self-start">
              <h3 className="font-semibold mb-2">Attachment Details</h3>

              <form
                className="space-y-3"
                // onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
              >
                <label>Alt</label>
                <Input
                  {...form.register("alt")}
                  placeholder="Alt text"
                  className="w-full p-2 border rounded"
                />
                <label>Title</label>
                <Input
                  {...form.register("title")}
                  placeholder="Title"
                  className="w-full p-2 border rounded"
                />
                <label>Description</label>
                <Textarea
                  {...form.register("description")}
                  placeholder="Description"
                  className="w-full p-2 border rounded"
                />

                <Button
                  type="button"
                  onClick={form.handleSubmit((v) => mutation.mutate(v))}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Saving..." : "Select"}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
