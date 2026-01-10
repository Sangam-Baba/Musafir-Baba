"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import ImageUploader, { UploadedFile } from "@/components/admin/ImageUploader";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Trash } from "lucide-react";

const allMedia = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  return json.data;
};
const deleteMedia = async (accessToken: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/media/${id}`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to delete media");
  return res.json();
};

function page() {
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const [Upload, setUpload] = useState(false);

  const { data: media, isLoading } = useQuery({
    queryKey: ["media-gallery", Upload],
    queryFn: () => allMedia(accessToken),
    enabled: true,
  });

  const mutation = useMutation({
    mutationFn: (id: string) => deleteMedia(accessToken, id),
    onSuccess: () => {
      setUpload(!Upload);
      toast.success("Media deleted successfully");
    },
    onError(error) {
      console.log(error);
      toast.error("Failed to delete media");
    },
  });
  return (
    <div className="max-w-7xl mx-auto">
      <h3 className="text-xl font-semibold mb-2">Add New Media</h3>
      <ImageUploader
        onUpload={(img) => setUpload(!Upload)}
        initialImage={null}
      />
      <h3 className="text-xl font-semibold mt-4 mb-2">Existing Media</h3>
      <div className="grid grid-cols-3 gap-3">
        {media?.map((item: UploadedFile, i: number) => (
          <div
            key={i}
            className="relative group border rounded cursor-pointer hover:ring-2 ring-blue-500 p-1"
            //   onClick={() => {
            //     onSelect(item);
            //     onClose();
            //   }}
          >
            {item.format === "mp4" ? (
              <video
                src={item.url}
                controls
                className="w-full h-32 object-cover rounded"
              ></video>
            ) : (
              <Image
                src={item.url}
                alt="Media"
                width={200}
                height={200}
                className="w-full h-32 object-cover rounded"
              />
            )}

            <button
              className="hidden text-red-500 group-hover:block absolute top-2 right-2"
              onClick={() => mutation.mutate(item._id as string)}
            >
              <Trash />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default page;
