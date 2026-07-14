"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import MainMediaUploader, { UploadedFile as BaseUploadedFile } from "@/components/admin/MainMediaUploader";
import Image from "next/image";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash, Copy, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import Pagination from "@/components/common/Pagination";

type UploadedFile = BaseUploadedFile & { title?: string; description?: string; usage?: string[] };

interface MediaUploadInterface {
  alt?: string;
  title?: string;
  description?: string;
}

const allMedia = async (accessToken: string, page: number, search: string, usageFilter: string) => {
  const query = new URLSearchParams({
    page: page.toString(),
    limit: "20",
    withUsage: "true"
  });
  
  if (search) query.append("search", search);
  if (usageFilter && usageFilter !== "All") query.append("usageFilter", usageFilter);

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/media?${query.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  return await res.json();
};

const deleteMedia = async (accessToken: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/media/${id}`, {
    method: "DELETE",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to delete media");
  return res.json();
};

const updateMedia = async (accessToken: string, id: string, values: MediaUploadInterface) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/media/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error("Failed to update media");
  return res.json();
};

export default function Page() {
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const role = useAdminAuthStore((s) => s.role) as string;
  const isAdmin = role === "admin";
  
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [usageFilter, setUsageFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedMedia, setSelectedMedia] = useState<UploadedFile | null>(null);

  const form = useForm<MediaUploadInterface>();

  // Debounce search input to prevent spamming the backend
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1); // Reset page on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when usage filter changes
  useEffect(() => {
    setPage(1);
  }, [usageFilter]);

  const { data: response, isLoading } = useQuery({
    queryKey: ["media-gallery", page, debouncedSearch, usageFilter],
    queryFn: () => allMedia(accessToken, page, debouncedSearch, usageFilter),
    enabled: true,
  });

  const mediaList = response?.data || [];
  const pagination = response?.pagination || { currentPage: 1, totalPages: 1 };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMedia(accessToken, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-gallery"] });
      setSelectedMedia(null);
      toast.success("Media deleted successfully");
    },
    onError: (error) => {
      console.log(error);
      toast.error("Failed to delete media");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: MediaUploadInterface) => updateMedia(accessToken, selectedMedia?._id as string, values),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["media-gallery"] });
      toast.success("Media updated successfully");
      setSelectedMedia(prev => prev ? { ...prev, ...updated.data, usage: prev.usage } : updated.data);
    },
    onError: (error) => {
      console.log(error);
      toast.error("Failed to update media");
    },
  });

  const handleSelect = (item: UploadedFile) => {
    setSelectedMedia(item);
    form.reset({
      alt: item.alt || "",
      title: item.title || "",
      description: item.description || "",
    });
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied to clipboard!");
  };

  const handleDelete = (id: string) => {
    const confirmDelete = window.confirm("Are you sure? This media might be in use on the live website. Deleting it will break the image on the site.");
    if (confirmDelete) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex gap-6 pb-20">
      <div className="flex-1 min-w-0 flex flex-col">
        <h3 className="text-xl font-semibold mb-4">Add New Media</h3>
        <MainMediaUploader
          onUpload={() => queryClient.invalidateQueries({ queryKey: ["media-gallery"] })}
        />
        
        <div className="flex items-center justify-between mt-8 mb-4">
          <h3 className="text-xl font-semibold">Existing Media</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select 
                value={usageFilter} 
                onChange={(e) => setUsageFilter(e.target.value)}
                className="h-10 min-w-[210px] pl-9 pr-8 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg bg-white shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FE5300]/20 focus:border-[#FE5300] cursor-pointer transition-all"
              >
                <option value="All">All Usage</option>
                <option value="Blog">Used in Blog</option>
                <option value="WebPage">Used in WebPage</option>
                <option value="News">Used in News</option>
                <option value="Package">Used in Package</option>
                <option value="Unused">Unused Media</option>
              </select>
            </div>
            
            <div className="relative w-64 lg:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search media..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-10 pl-9 text-sm font-medium text-slate-700 border-slate-200 rounded-lg shadow-sm focus-visible:ring-2 focus-visible:ring-[#FE5300]/20 focus-visible:border-[#FE5300] transition-all"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <span className="text-gray-500">Loading media...</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {mediaList.map((item: UploadedFile, i: number) => (
                <div
                  key={item._id || i}
                  className={`relative group border rounded-lg cursor-pointer overflow-hidden bg-gray-50 ${
                    selectedMedia?._id === item._id ? "ring-2 ring-blue-500" : "hover:ring-2 hover:ring-gray-300"
                  }`}
                  onClick={() => handleSelect(item)}
                >
                  {item.format === "mp4" ? (
                    <video
                      src={item.url}
                      className="w-full h-32 object-cover"
                    ></video>
                  ) : item.format === "pdf" || item.resource_type === "raw" ? (
                    <div className="w-full h-32 flex flex-col items-center justify-center bg-orange-50 gap-2 p-2">
                      <span className="text-3xl">📄</span>
                      <span className="text-[10px] text-center text-gray-600 break-all line-clamp-2">
                        {item.url.split("/").pop()}
                      </span>
                    </div>
                  ) : (
                    <Image
                      src={item.url}
                      alt={item.alt || "Media"}
                      width={200}
                      height={200}
                      className="w-full h-32 object-cover"
                    />
                  )}
                  
                  {/* Overlay actions */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {isAdmin && (
                      <button
                        className="p-2 bg-white rounded-full text-gray-700 hover:text-blue-600 shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(item.url);
                        }}
                        title="Copy URL"
                      >
                        <Copy size={16} />
                      </button>
                    )}
                    <button
                      className="p-2 bg-white rounded-full text-red-500 hover:text-red-700 shadow-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item._id as string);
                      }}
                      title="Delete"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {mediaList.length === 0 && (
                <div className="col-span-full text-center py-16 text-gray-500 bg-gray-50 border border-dashed rounded-lg">
                  No media found matching the filters.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-2 py-4 mt-auto border-t">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Showing {((page - 1) * 20) + 1} - {Math.min(page * 20, pagination.totalCount || 0)} of {pagination.totalCount || 0}
                </p>
                <Pagination 
                  currentPage={page}
                  totalPages={pagination.totalPages}
                  onPageChange={(p) => setPage(p)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side panel for selected media */}
      {selectedMedia && (
        <div className="w-80 shrink-0 sticky top-4 self-start bg-gray-50 border rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Media Details</h3>
            <button onClick={() => setSelectedMedia(null)} className="text-gray-500 hover:text-gray-800">
              ✕
            </button>
          </div>

          <div className="mb-4 rounded-md overflow-hidden border bg-white flex items-center justify-center">
            {selectedMedia.format === "mp4" ? (
               <video src={selectedMedia.url} controls className="w-full max-h-40 object-contain bg-black" />
            ) : selectedMedia.format === "pdf" || selectedMedia.resource_type === "raw" ? (
               <div className="w-full h-40 flex items-center justify-center bg-orange-50">
                 <span className="text-4xl">📄</span>
               </div>
            ) : (
               <Image src={selectedMedia.url} alt="" width={300} height={200} className="w-full max-h-40 object-contain bg-gray-100" />
            )}
          </div>

          <div className="space-y-4">
             {selectedMedia.usage && selectedMedia.usage.length > 0 && (
               <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Used In</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedMedia.usage.map(u => (
                      <span key={u} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {u}
                      </span>
                    ))}
                  </div>
               </div>
             )}
             
             {(selectedMedia.usage === undefined || selectedMedia.usage.length === 0) && (
               <div>
                  <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                    Unused
                  </span>
               </div>
             )}

             {isAdmin && (
               <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">File URL</label>
                  <div className="flex mt-1">
                    <Input readOnly value={selectedMedia.url} className="text-xs rounded-r-none bg-white" />
                    <Button type="button" onClick={() => copyToClipboard(selectedMedia.url)} className="rounded-l-none px-3 border-l-0" variant="outline">
                       <Copy size={14} />
                    </Button>
                  </div>
               </div>
             )}

             <div className="space-y-3 pt-2">
               <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Title</label>
                  <Input {...form.register("title")} placeholder="Image title" className="mt-1 text-sm bg-white" />
               </div>
               <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Alt Text</label>
                  <Input {...form.register("alt")} placeholder="Alt text for SEO" className="mt-1 text-sm bg-white" />
               </div>
               <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Description</label>
                  <Textarea {...form.register("description")} placeholder="Description" className="mt-1 text-sm bg-white resize-none" rows={3} />
               </div>

               <Button 
                 type="button" 
                 onClick={form.handleSubmit((v) => updateMutation.mutate(v))} 
                 disabled={updateMutation.isPending}
                 className="w-full bg-[#FE5300] hover:bg-[#FE5300]/90 text-white"
               >
                 {updateMutation.isPending ? "Saving..." : "Save Details"}
               </Button>
             </div>
             
             <div className="pt-4 mt-4 border-t border-gray-200">
               <Button 
                 type="button" 
                 variant="outline" 
                 className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                 onClick={() => handleDelete(selectedMedia._id as string)}
               >
                 <Trash size={16} className="mr-2" />
                 Delete Media
               </Button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
