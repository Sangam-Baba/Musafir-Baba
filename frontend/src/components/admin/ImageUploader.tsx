"use client";
import Image from "next/image";
import React, { useState } from "react";

interface UploadedImage {
  url: string;
  public_id: string;
}

export default function ImageUploader() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const uploadImages = async () => {
    if (!files) return;
    setUploading(true);

    try {
      // 1. Get signature from backend
      const data = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/upload/signature`);
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
        return { url: json.secure_url, public_id: json.public_id };
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
      <input type="file" multiple accept="image/*" onChange={handleFileChange} />
      <button
        onClick={uploadImages}
        disabled={uploading}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload Images"}
      </button>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {uploadedImages.map((img) => (
          <div key={img.public_id}>
            <Image src={img.url} alt="Uploaded" className="rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
