"use client";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import ImageUploader, { UploadedFile } from "../admin/ImageUploader";
import { Loader } from "../custom/loader";

export default function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (media: UploadedFile) => void;
}) {
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;

  const { data: media, isLoading } = useQuery({
    queryKey: ["media-picker"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      return json.data;
    },
    enabled: open,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-[600px] max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Media Gallery</h2>
          <button
            onClick={onClose}
            className="text-red-500 hover:text-red-600 bg-gray-200 px-2 py-1 rounded"
          >
            X
          </button>
        </div>
        <h3 className="text-lg font-semibold mb-2">Upload Media</h3>
        <ImageUploader onUpload={onSelect as any} />
        <h3 className="text-lg font-semibold mt-4 mb-2">Existing Media</h3>
        {isLoading && <Loader size="md" />}
        <div className="grid grid-cols-3 gap-3">
          {media?.map((item: UploadedFile, i: number) => (
            <div
              key={i}
              className="border rounded cursor-pointer hover:ring-2 ring-blue-500 p-1"
              onClick={() => {
                onSelect(item);
                onClose();
              }}
            >
              {item.format === "mp4" ? (
                <video
                  src={item.url}
                  controls
                  width={200}
                  height={200}
                  className="w-full h-32 object-cover rounded"
                />
              ) : (
                <Image
                  src={item.url}
                  alt="Media"
                  width={200}
                  height={200}
                  className="w-full h-32 object-cover rounded"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
