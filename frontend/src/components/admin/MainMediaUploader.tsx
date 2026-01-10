"use client";
import Image from "next/image";
import React, { useState } from "react";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { X } from "lucide-react";
import { Button } from "../ui/button";

export interface UploadedFile {
  url: string;
  _id?: string;
  alt?: string;
  public_id?: string;
  key?: string;
  type?: "image" | "video" | "pdf";
  resource_type?: "image" | "video" | "raw";
  format?: string;
  width?: number;
  height?: number;
  duration?: number; // for video
  size?: number; // bytes
  thumbnail_url?: string; // optional preview for video/pdf
}

const uploadToDb = async (accessToken: string, media: UploadedFile) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/media`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(media),
  });
  if (!res.ok) throw new Error("Failed to fetch footers");
  return res.json();
};
export default function MainMediaUploader({
  onUpload,
}: {
  onUpload: () => void;
}) {
  const token = useAdminAuthStore((s) => s.accessToken) as string;
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadImages = async () => {
    if (!files) return;
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const presignRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/upload/cloudflare-url`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
            }),
          }
        );

        const { uploadUrl, fileUrl, key } = await presignRes.json();

        await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/media`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            url: fileUrl,
            key,
            format: file.type.split("/")[1],
            size: file.size,
          }),
        });
      }

      onUpload(); // refresh library
      setFiles(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border p-3 rounded">
      <input type="file" multiple onChange={(e) => setFiles(e.target.files)} />
      <button
        onClick={uploadImages}
        disabled={uploading}
        className="mt-2 bg-blue-600 text-white px-4 py-2 rounded"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}
