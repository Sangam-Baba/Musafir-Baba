"use client";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { X } from "lucide-react";
import MediaPicker from "../common/MediaList";
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

  const handleRemove = () => {
    setUploadedImages([]);
    onUpload(null); // reset form value
  };

  return (
    <div className="p-4 border rounded-xl w-full  flex items-center justify-between gap-2">
      <Button
        type="button"
        onClick={() => setShowPicker(true)}
        className="mt-2 px-4 py-2 bg-green-500 text-white rounded "
      >
        Choose from Library
      </Button>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {uploadedImages.map((file, i) => (
          <div key={i} className="flex gap-5">
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
