"use client";
import Image from "next/image";
import React, { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";

interface UploadedFile {
  url: string;
  public_id: string;
  resource_type: string;
  format: string;
  width?: number;
  height?: number;
  pages?: number;
}

export default function ImageUploader({onUpload}:{onUpload: (img: UploadedFile) => void}) {
  const token= useAuthStore((state) => state.accessToken);
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const uploadImages = async () => {
    if (!files) return;
    setUploading(true);

    try {
      // 1. Get signature from backend
      const data = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/upload/signature`,{
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const sigData = await data.json();
      const formUploads = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", sigData.apiKey);
        formData.append("timestamp", sigData.timestamp);
        formData.append("signature", sigData.signature);
        // formData.append("folder", "blogs"); // optional

        // 2. Upload directly to Cloudinary
        const res = await fetch(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`,{
          method: "POST",
          body: formData,
         }
        );
        const json = await res.json();
        const uploaded= {
          url: json.secure_url,
          public_id: json.public_id,
          resource_type: json.resource_type,
          format: json.format,
          width: json.width,
          height: json.height,
          pages: json.pages,
        }
        onUpload(uploaded);
        return uploaded;
      });

      const results = await Promise.all(formUploads);

      // 3. Save to local state (later send to your DB with blog data)
      setUploadedImages(results);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border rounded-xl w-full max-w-lg">
      <input type="file" multiple accept="image/*,application/pdf" onChange={handleFileChange} />
      <button
        onClick={uploadImages}
        disabled={uploading}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {uploadedImages.map((img) => (
          <div key={img.public_id}>
            <Image src={img.url} alt="Uploaded" className="rounded-md" width={200} height={200} />
          </div>
        ))}
      </div>
    </div>
  );
}
