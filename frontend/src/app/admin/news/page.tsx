"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ListTable from "@/components/admin/ListTable";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { getPreviewToken } from "../blogs/page";
import Pagination from "@/components/common/Pagination";

interface News {
  _id: string;
  title: string;
  content: string;
  metaDescription: string;
  coverImage: string;
  slug: string;
  excerpt: string;
  status: string;
}

const getAllNews = async (page: number, search: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/news?page=${page}&search=${search}&limit=10`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  if (!res.ok) throw new Error("Failed to fetch news");
  const data = await res.json();
  return data;
};

export default function NewsPage() {
  const token = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions,
  ) as string[];
  const [filter, setFilter] = useState({
    search: "",
  });
  const [page, setPage] = useState(1);
  const router = useRouter();

  const {
    data: allNewsData,
    refetch,
    isLoading,
    isError,
    error
  } = useQuery<any>({
    queryKey: ["all-news", page, filter.search],
    queryFn: () => getAllNews(page, filter.search),
    enabled: permissions.includes("news"),
    retry: 2,
  });

  const newsList = allNewsData?.data ?? [];
  const meta = {
    total: allNewsData?.total ?? 0,
    totalPages: allNewsData?.pages ?? 1,
  };

  const { data: previewToken } = useQuery({
    queryKey: ["preview-token"],
    queryFn: () => getPreviewToken(token),
    enabled: permissions.includes("news") && !!token,
  });

  // ✅ Edit
  const handleEdit = (slug: string) => {
    router.push(`/admin/news/edit/${slug}`);
  };

  // ✅ Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this news?")) return null;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/news/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await res.json();

      if (data.success) {
        toast.success("News deleted successfully");
        refetch();
      } else {
        toast.error(data.message || "Failed to delete News");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong while deleting News");
    }
  };

  if (!permissions.includes("news"))
    return <h1 className="text-2xl">Access Denied</h1>;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">News</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search..."
              className="pl-8 border border-gray-300 rounded-md px-2 py-1"
              value={filter.search}
              onChange={(e) => {
                setFilter({ search: e.target.value });
                setPage(1);
              }}
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={14} />
            </div>
          </div>
          <button
            onClick={() => router.push("/admin/news/new")}
            className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
          >
            + Create News
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          <ListTable
            blogs={newsList.map((b: News) => ({
              slug: b.slug,
              id: b._id,
              title: b.title,
              description: b.excerpt,
              status: b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : "Draft",
              url: `/news/${b.slug}`,
              previewUrl: `/news/${b.slug}?token=${previewToken}`,
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
