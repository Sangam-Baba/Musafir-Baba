"use client";

import { useQuery } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PageList from "@/components/admin/PageList";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { getPreviewToken } from "../blogs/page";
interface WebPage {
  title: string;
  content: string;
  _id: string;
  slug: string;
  status: string;
  parent?: {
    title: string;
    slug: string;
    _id: string;
  };
  fullSlug: string;
}
interface QueryResponse {
  data: WebPage[];
  total: number;
  page: number;
  totalPages: number;
}
import Pagination from "@/components/common/Pagination";

const getAllWebPage = async (accessToken: string, page: number, search: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/webpage?page=${page}&search=${search}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch webpages");
  const data = await res.json();
  return data;
};
function WebPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions,
  ) as string[];
  const [filter, setFilter] = useState({
    search: "",
  });
  const [page, setPage] = useState(1);
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } = useQuery<any>({
    queryKey: ["webpage", page, filter.search],
    queryFn: () => getAllWebPage(accessToken, page, filter.search),
    enabled: permissions.includes("webpage"),
    retry: 2,
  });
  const webpages = data?.data ?? [];
  const meta = data?.meta ?? { totalPages: 1 };

  const { data: previewToken } = useQuery({
    queryKey: ["preview-token"],
    queryFn: () => getPreviewToken(accessToken),
    enabled: permissions.includes("webpage") && !!accessToken,
  });

  const handleEdit = (id: string) => {
    router.push(`/admin/webpage/edit/${id}`);
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this webpage?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/webpage/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (!res.ok) throw new Error("Failed to delete webpage");
      toast.success("Webpage: Deleted successfully");
      refetch();
    } catch (error) {
      console.log("error in deleting", error);
      toast.error("Failed to delete webpage");
    }
  };

  if (!permissions.includes("webpage"))
    return <h1 className="text-2xl">Access Denied</h1>;
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4 bg-slate-50/30 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200">
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-slate-800">WebPage Management</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Content Repository</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search..."
              className="pl-8 h-8 w-48 text-xs bg-white border-slate-200 rounded-md focus:ring-1 focus:ring-orange-500"
              value={filter.search}
              onChange={(e) => {
                setFilter({ search: e.target.value });
                setPage(1);
              }}
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
          </div>
          <button
            onClick={() => router.push("/admin/webpage/new")}
            className="h-8 bg-[#FE5300] hover:bg-[#FE5300]/90 text-white text-xs font-bold rounded-lg px-4 shadow-sm transition-all active:scale-95"
          >
            + Create Page
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          <PageList
            webpages={webpages.map((b: any) => ({
              id: b._id,
              title: b.title,
              status: b.status === "published" ? "Published" : "Draft",
              parent: b.parent
                ? `${
                    b?.parent?.slug.charAt(0).toUpperCase() +
                    b.parent.slug.slice(1)
                  }`
                : "No Parent",
              url: `/${b.fullSlug}`,
              previewUrl: `/${b.fullSlug}?token=${previewToken}`,
            }))}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
          
          <div className="flex items-center justify-between px-2 py-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Showing {((page - 1) * 10) + 1} - {Math.min(page * 10, meta.total)} of {meta.total}
            </p>
            <Pagination 
              currentPage={page}
              totalPages={meta.totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </div>
      )}
      {isError && toast.error(error.message)}
    </div>
  );
}

export default WebPage;
