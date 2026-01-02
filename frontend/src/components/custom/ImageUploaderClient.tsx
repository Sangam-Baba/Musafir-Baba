"use client";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { X } from "lucide-react";

export interface UploadedFile {
  url: string;
  public_id?: string;
  key?: string;
  type?: "image" | "video" | "pdf";
  resource_type?: string;
  format?: string;
  width?: number;
  height?: number;
  pages?: number;
  size?: number;
}

export default function ImageUploaderClient({
  initialImage,
  onUpload,
  type,
}: {
  initialImage?: UploadedFile | null;
  onUpload: (img: UploadedFile | null) => void;
  type: string;
}) {
  const token = useAuthStore((state) => state.accessToken) as string;
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedFile[]>(
    initialImage ? [initialImage] : []
  );
  const [uploading, setUploading] = useState(false);

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

    //     let cloudinaryUrl = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`;
    //     if (type === "pdf") {
    //       cloudinaryUrl = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/raw/upload`;
    //     }
    //     // 2. Upload directly to Cloudinary
    //     const res = await fetch(cloudinaryUrl, {
    //       method: "POST",
    //       body: formData,
    //     });
    //     const json = await res.json();
    //     const uploaded = {
    //       url: json.secure_url,
    //       public_id: json.public_id,
    //       resource_type: json.resource_type,
    //       format: json.format,
    //       width: json.width,
    //       height: json.height,
    //       pages: json.pages,
    //     };
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
          ? "Client-images"
          : file.type.startsWith("video")
          ? "Client-videos"
          : "Client-docs";

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
            folder === "Client-docs"
              ? "pdf"
              : (folder.slice(0, -1) as "image" | "video"),
          format: file.type.split("/")[1],
          size: file.size,
        };

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
        accept="image/*,application/pdf"
        onChange={handleFileChange}
      />
      <button
        onClick={uploadImages}
        disabled={uploading}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {type === "image" &&
          uploadedImages.map((img, idx) => (
            <div key={idx} className="relative">
              <Image
                src={img.url}
                alt="Uploaded"
                className="rounded-md"
                width={200}
                height={200}
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        {type === "pdf" &&
          uploadedImages.some((img) => img?.url) &&
          uploadedImages.map((img, idx) => (
            <div key={idx} className="relative">
              <a
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                View
              </a>
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
              >
                <X size={16} />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
