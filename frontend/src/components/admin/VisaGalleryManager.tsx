"use client";
import Image from "next/image";
import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, ImagePlus, Images, Loader2, Star, Trash2, UploadCloud } from "lucide-react";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import MediaPicker from "@/components/common/MediaList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface VisaGalleryImage {
  _id?: string;
  url: string;
  alt?: string;
  caption?: string;
  public_id?: string;
  width?: number;
  height?: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOAD_CONCURRENCY = 3;

// Reads natural dimensions so the public gallery can reserve space (no layout shift).
const readDimensions = (file: File) =>
  new Promise<{ width?: number; height?: number }>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    img.onerror = () => {
      resolve({});
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  });

// Same presign -> PUT -> media library flow as MainMediaUploader, kept separate so that component stays untouched.
async function uploadFile(file: File, token: string): Promise<VisaGalleryImage> {
  const presignRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/upload/cloudflare-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fileName: file.name, fileType: file.type, folder: "media" }),
  });
  if (!presignRes.ok) throw new Error("Could not get upload URL");
  const { uploadUrl, fileUrl, key } = await presignRes.json();
  if (!uploadUrl || !fileUrl) throw new Error("Invalid upload URL");

  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) throw new Error("Upload failed");

  const { width, height } = await readDimensions(file);

  // Register in media library so the image is reusable elsewhere; failure here shouldn't block the gallery.
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url: fileUrl, key, format: file.type.split("/")[1], size: file.size, width, height }),
  }).catch(() => null);

  return { url: fileUrl, public_id: key, width, height };
}

export default function VisaGalleryManager({
  value,
  onChange,
  defaultAlt = "",
}: {
  value: VisaGalleryImage[];
  onChange: (images: VisaGalleryImage[]) => void;
  defaultAlt?: string;
}) {
  const token = useAdminAuthStore((s) => s.accessToken) as string;
  const [pending, setPending] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Latest list, so parallel uploads append without overwriting each other.
  const latest = useRef(value);
  latest.current = value;
  const commit = (next: VisaGalleryImage[]) => {
    latest.current = next;
    onChange(next);
  };

  const handleFiles = async (fileList: FileList | File[] | null) => {
    if (!fileList) return;
    const files = Array.from(fileList).filter((f) => {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name}: only images are allowed`);
        return false;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name}: larger than 10MB`);
        return false;
      }
      return true;
    });
    if (!files.length) return;

    setPending((p) => p + files.length);
    let failed = 0;
    const queue = [...files];
    const worker = async () => {
      while (queue.length) {
        const file = queue.shift()!;
        try {
          const img = await uploadFile(file, token);
          commit([...latest.current, { ...img, alt: defaultAlt, caption: "" }]);
        } catch {
          failed++;
        } finally {
          setPending((p) => p - 1);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, worker));

    if (failed) toast.error(`${failed} image(s) failed to upload`);
    else toast.success(`${files.length} image(s) added to gallery`);
    if (inputRef.current) inputRef.current.value = "";
  };

  const update = (index: number, patch: Partial<VisaGalleryImage>) =>
    commit(latest.current.map((img, i) => (i === index ? { ...img, ...patch } : img)));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= latest.current.length) return;
    const next = [...latest.current];
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  };

  const remove = (index: number) => commit(latest.current.filter((_, i) => i !== index));

  return (
    <div className="bg-gray-50/50 p-3 rounded border space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Visa Gallery</p>
          <p className="text-[10px] text-gray-500">
            First image is featured. Use arrows to reorder. Changes are saved when you submit the form.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-[11px] font-semibold rounded-sm"
            onClick={() => setShowPicker(true)}
          >
            <Images className="w-3 h-3 mr-1" /> From Library
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 text-[11px] font-semibold rounded-sm bg-[#FE5300] hover:bg-[#e44a00]"
            onClick={() => inputRef.current?.click()}
            disabled={pending > 0}
          >
            <ImagePlus className="w-3 h-3 mr-1" /> Upload Images
          </Button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => pending === 0 && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-1 py-6 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
          dragOver ? "border-[#FE5300] bg-orange-50" : "border-gray-200 bg-white hover:border-[#FE5300]/50"
        }`}
      >
        {pending > 0 ? (
          <>
            <Loader2 className="w-5 h-5 text-[#FE5300] animate-spin" />
            <span className="text-[11px] text-gray-600">Uploading {pending} image(s)...</span>
          </>
        ) : (
          <>
            <UploadCloud className="w-5 h-5 text-gray-400" />
            <span className="text-[11px] text-gray-600">Drag & drop images here, or click to browse</span>
            <span className="text-[10px] text-gray-400">JPG, PNG, WEBP, AVIF · up to 10MB each · multiple allowed</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {value.length === 0 ? (
        <div className="text-center py-4 text-[11px] text-gray-500 border border-dashed rounded bg-white">
          No gallery images yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {value.map((img, index) => (
            <div key={img._id || img.url + index} className="bg-white rounded border shadow-sm overflow-hidden flex flex-col">
              <div className="relative aspect-[4/3] bg-gray-100 group">
                <Image src={img.url} alt={img.alt || ""} fill sizes="200px" className="object-cover" />
                <span className="absolute top-1 left-1 text-[10px] font-bold bg-black/60 text-white rounded px-1.5 py-0.5 flex items-center gap-0.5">
                  {index === 0 && <Star className="w-2.5 h-2.5 fill-yellow-300 text-yellow-300" />}#{index + 1}
                </span>
                <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className="w-6 h-6 rounded bg-white/90 flex items-center justify-center disabled:opacity-40"
                      aria-label="Move left"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={index === value.length - 1}
                      onClick={() => move(index, 1)}
                      className="w-6 h-6 rounded bg-white/90 flex items-center justify-center disabled:opacity-40"
                      aria-label="Move right"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="w-6 h-6 rounded bg-red-600 text-white flex items-center justify-center"
                    aria-label="Remove image"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="p-1.5 space-y-1">
                <Input
                  className="h-6 text-[11px] px-1.5 rounded-sm"
                  placeholder="Alt text (SEO)"
                  value={img.alt || ""}
                  onChange={(e) => update(index, { alt: e.target.value })}
                />
                <Input
                  className="h-6 text-[11px] px-1.5 rounded-sm"
                  placeholder="Caption (optional)"
                  value={img.caption || ""}
                  onChange={(e) => update(index, { caption: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Portaled outside the <form>: MediaPicker's own buttons have no type and would otherwise submit it. */}
      {showPicker && createPortal(
        <MediaPicker
          open={showPicker}
          onClose={() => setShowPicker(false)}
          onSelect={(media) => {
            if (!media?.url) return;
            commit([
              ...latest.current,
              {
                url: media.url,
                alt: media.alt || defaultAlt,
                caption: "",
                public_id: media.public_id || media.key,
                width: media.width,
                height: media.height,
              },
            ]);
            setShowPicker(false);
          }}
        />,
        document.body
      )}
    </div>
  );
}
