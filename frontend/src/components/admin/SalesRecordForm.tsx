"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import SmallEditor from "./SmallEditor"; // Reusing existing SmallEditor if it supports what we need

interface Props {
  accessToken: string;
}

const SalesRecordForm: React.FC<Props> = ({ accessToken }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    packageName: "",
    details: "",
    itinerary: "",
  });
  const [file, setFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditorChange = (content: string) => {
    setFormData((prev) => ({ ...prev, details: content }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || !formData.clientPhone || !formData.packageName || !formData.details) {
      return toast.error("Please fill in all fields.");
    }

    try {
      setLoading(true);
      let itineraryUrl = "";

      if (file) {
        toast.info("Uploading itinerary...");
        const presignRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/upload/cloudflare-url`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              fileName: file.name,
              fileType: file.type,
              folder: "sales-itineraries",
            }),
          }
        );

        if (!presignRes.ok) throw new Error("Failed to get upload URL");
        const { uploadUrl, fileUrl } = await presignRes.json();

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadRes.ok) throw new Error("Failed to upload file");
        itineraryUrl = fileUrl;
      }

      const payload = { ...formData, itinerary: itineraryUrl };

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/sales-record`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create sales record");

      toast.success("Sales record created successfully!");
      router.push("/admin/sales-record");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Client Name *</label>
          <input
            type="text"
            name="clientName"
            value={formData.clientName}
            onChange={handleChange}
            className="w-full px-4 h-8 bg-slate-50 border-none rounded focus:outline-none focus:ring-1 focus:ring-[#FE5300] text-[13px] transition-all"
            placeholder="John Doe"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Client Phone Number *</label>
          <input
            type="text"
            name="clientPhone"
            value={formData.clientPhone}
            onChange={handleChange}
            className="w-full px-4 h-8 bg-slate-50 border-none rounded focus:outline-none focus:ring-1 focus:ring-[#FE5300] text-[13px] transition-all"
            placeholder="+1 234 567 890"
            required
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Package Name *</label>
          <input
            type="text"
            name="packageName"
            value={formData.packageName}
            onChange={handleChange}
            className="w-full px-4 h-8 bg-slate-50 border-none rounded focus:outline-none focus:ring-1 focus:ring-[#FE5300] text-[13px] transition-all"
            placeholder="E.g. Dubai 5 Days Package"
            required
          />
        </div>
        
        <div className="space-y-2 md:col-span-2">
          <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Itinerary (Optional)</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full px-4 h-8 bg-slate-50 border-none rounded focus:outline-none focus:ring-1 focus:ring-[#FE5300] text-[13px] transition-all file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#FE5300] file:text-white hover:file:bg-[#e04a00]"
          />
          <p className="text-[10px] text-slate-400 mt-1">Upload a PDF or Image file outlining the itinerary.</p>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-[13px] font-semibold text-slate-700 tracking-tight">Details *</label>
          <div className="border border-slate-200 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-[#FE5300]">
            <SmallEditor content={formData.details} onChange={handleEditorChange} />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 h-7 text-[13px] border border-slate-200 text-slate-600 rounded hover:bg-slate-50 transition-colors flex items-center justify-center"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 h-7 text-[13px] bg-[#FE5300] text-white rounded hover:bg-orange-50 hover:text-[#FE5300] transition-colors flex items-center justify-center min-w-[100px] font-semibold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Record"}
        </button>
      </div>
    </form>
  );
};

export default SalesRecordForm;
