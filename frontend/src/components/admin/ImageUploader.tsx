"use client";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { X } from "lucide-react";
import MediaPicker from "../common/MediaList";
import { Button } from "../ui/button";

export interface UploadedFile {
  url: string;
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
export default function ImageUploader({
  initialImage,
  onUpload,
}: {
  initialImage?: UploadedFile | null;
  onUpload: (img: UploadedFile | null) => void;
}) {
  const token = useAdminAuthStore((state) => state.accessToken) as string;
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedFile[]>(
    initialImage ? [initialImage] : []
  );
  const [uploading, setUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (initialImage) {
      setUploadedImages([initialImage]);
    }
  }, [initialImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const uploadImages = async () => {
    if (!files) return;
    setUploading(true);

    // try {
    //   // 1. Get signature from backend
    //   const data = await fetch(
    //     `${process.env.NEXT_PUBLIC_BASE_URL}/upload/signature`,
    //     {
    //       method: "GET",
    //       headers: {
    //         "Content-Type": "application/json",
    //         Authorization: `Bearer ${token}`,
    //       },
    //     }
    //   );
    //   const sigData = await data.json();
    //   const formUploads = Array.from(files).map(async (file) => {
    //     const formData = new FormData();
    //     formData.append("file", file);
    //     formData.append("api_key", sigData.apiKey);
    //     formData.append("timestamp", sigData.timestamp);
    //     formData.append("signature", sigData.signature);
    //     formData.append("eager", sigData.eager);
    //     // formData.append("folder", "blogs"); // optional

    //     // 2. Upload directly to Cloudinary
    //     const res = await fetch(
    //       `https://api.cloudinary.com/v1_1/${sigData.cloudName}/auto/upload`,
    //       {
    //         method: "POST",
    //         body: formData,
    //       }
    //     );
    //     const json = await res.json();
    //     const uploaded = {
    //       url: json.secure_url,
    //       public_id: json.public_id,
    //       resource_type: json.resource_type,
    //       format: json.format,
    //       width: json.width,
    //       height: json.height,
    //       pages: json.pages,
    //       thumbnail_url:
    //         json.resource_type === "video" ? json.eager?.[0]?.secure_url : null,
    //     };
    //     const res2 = await uploadToDb(token, uploaded);
    //     onUpload(uploaded);
    //     return uploaded;
    //   });

    //   const results = await Promise.all(formUploads);

    //   // 3. Save to local state (later send to your DB with blog data)
    //   setUploadedImages(results);

    //   onUpload(results[0] ?? null);
    // }
    try {
      const uploads = Array.from(files).map(async (file) => {
        const folder = file.type.startsWith("image")
          ? "images"
          : file.type.startsWith("video")
          ? "videos"
          : "docs";

        /* 1️⃣ Ask backend for presigned URL */
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
              fileType: file.type, // ✅ Already sending this
              folder,
            }),
          }
        );

        if (!presignRes.ok) {
          throw new Error("Failed to get presigned URL");
        }

        const { uploadUrl, fileUrl, key } = await presignRes.json();

        /* 2️⃣ Upload directly to Cloudflare R2 */
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error("Upload error:", errorText);
          throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        const uploaded: UploadedFile = {
          url: fileUrl,
          key,
          type:
            folder === "docs"
              ? "pdf"
              : (folder.slice(0, -1) as "image" | "video"),
          format: file.type.split("/")[1],
          size: file.size,
        };

        /* 3️⃣ Save media to DB */
        await uploadToDb(token, uploaded);

        return uploaded;
      });

      const results = await Promise.all(uploads);
      setUploadedImages(results);
      onUpload(results[0] ?? null);
      setFiles(null);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setUploadedImages([]);
    onUpload(null); // reset form value
  };

  return (
    <div className="p-4 border rounded-xl w-full max-w-lg">
      <input
        type="file"
        multiple
        accept="image/*,video/*,application/pdf"
        onChange={handleFileChange}
      />
      <button
        onClick={uploadImages}
        disabled={uploading}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
      <button
        type="button"
        onClick={() => setShowPicker(true)}
        className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
      >
        Choose from Library
      </button>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {uploadedImages.map((file, i) => (
          <div key={i}>
            {file.resource_type === "video" ? (
              <div className="relative">
                {file.thumbnail_url ? (
                  <Image
                    src={file.thumbnail_url!}
                    width={200}
                    height={200}
                    alt="Video thumbnail"
                    className="rounded"
                  />
                ) : (
                  <video width={200} height={200} controls className="mt-2">
                    <source src={file.url} />
                  </video>
                )}
              </div>
            ) : (
              <Image
                src={file.url}
                width={200}
                height={200}
                alt="Musafirbaba"
              />
            )}

            <Button
              type="button"
              onClick={() => handleRemove()}
              className="mt-2 px-2 py-1 bg-red-500 text-white rounded"
            >
              <X className=" h-2 w-2" />
            </Button>
          </div>
        ))}
      </div>
      {showPicker && (
        <MediaPicker
          open={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={(media) => {
            setUploadedImages([media]);
            onUpload(media);
            setShowPicker(false);
            setFiles(null);
          }}
        />
      )}
    </div>
  );
}
