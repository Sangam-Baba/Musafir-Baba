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
    <div className="relative w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl overflow-hidden hover:border-[#FE5300]/50 transition-colors group">
      {uploadedImages.length > 0 ? (
        <div className="w-full h-full relative">
          {uploadedImages[0].resource_type === "video" ? (
            <div className="w-full h-full bg-black flex items-center justify-center">
              {uploadedImages[0].thumbnail_url ? (
                <Image
                  src={uploadedImages[0].thumbnail_url}
                  fill
                  alt="Video thumbnail"
                  className="object-cover"
                />
              ) : (
                <video className="w-full h-full object-cover">
                  <source src={uploadedImages[0].url} />
                </video>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  variant="secondary"
                  size="sm"
                  className="bg-white/90 hover:bg-white text-black font-semibold"
                >
                  Change Video
                </Button>
              </div>
            </div>
          ) : uploadedImages[0].format === "pdf" || uploadedImages[0].resource_type === "raw" ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-orange-50 gap-2 p-3">
              <span className="text-4xl">📄</span>
              <span className="text-[10px] text-center text-gray-600 break-all line-clamp-2">
                {uploadedImages[0].url.split("/").pop()}
              </span>
              <Button
                type="button"
                onClick={() => setShowPicker(true)}
                variant="ghost"
                size="sm"
                className="text-[#FE5300] hover:bg-orange-100 h-7 text-xs"
              >
                Change PDF
              </Button>
            </div>
          ) : (
            <>
              <Image
                src={uploadedImages[0].url}
                fill
                alt="Preview"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  variant="secondary"
                  size="sm"
                  className="bg-white/90 hover:bg-white text-black font-semibold"
                >
                  Change Image
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowPicker(true)}
          className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-gray-100 transition-colors text-gray-400 hover:text-[#FE5300]"
        >
          <div className="w-10 h-10 border-2 border-current border-dashed rounded-full flex items-center justify-center">
            <span className="text-2xl">+</span>
          </div>
          <span className="text-xs font-medium">Choose Media</span>
        </button>
      )}

      {showPicker && (
        <MediaPicker
          open={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={(media) => {
            setUploadedImages([media]);
            onUpload(media);
            setShowPicker(false);
          }}
        />
      )}
    </div>
  );
}
