"use client";
import { useQuery } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import ImageUploader, { UploadedFile } from "@/components/admin/ImageUploader";
import Image from "next/image";
import { useState } from "react";
const allMedia = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  return json.data;
};

function page() {
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const [Upload, setUpload] = useState(false);

  const { data: media, isLoading } = useQuery({
    queryKey: ["media-gallery", Upload],
    queryFn: () => allMedia(accessToken),
    enabled: true,
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
            className="border rounded cursor-pointer hover:ring-2 ring-blue-500 p-1"
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
          </div>
        ))}
      </div>
    </div>
  );
}

export default page;
