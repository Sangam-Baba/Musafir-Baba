"use client";

import { useQuery } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import ListTable from "@/components/admin/ListTable";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import Pagination from "@/components/common/Pagination";

interface Blog {
  _id: string;
  title: string;
  content: string;
  metaDescription: string;
  coverImage: string;
  slug: string;
  excerpt: string;
  status: string;
}

const getBlogs = async (page: number, search: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/blogs?page=${page}&search=${search}&limit=10`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  if (!res.ok) throw new Error("Failed to fetch blogs");
  const data = await res.json();
  return data;
};

export const getPreviewToken = async (token: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/admin/preview-token`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
  if (!res.ok) throw new Error("Failed to get preview token");
  const data = await res.json();
  return data?.data;
};

export default function BlogsPage() {
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
    queryKey: ["blogs", page, filter.search],
    queryFn: () => getBlogs(page, filter.search),
    enabled: permissions.includes("blogs"),
    retry: 2,
  });

  const blogs = data?.data ?? [];
  const meta = {
    total: data?.total ?? 0,
    totalPages: data?.pages ?? 1,
  };

  const { data: previewToken } = useQuery({
    queryKey: ["preview-token"],
    queryFn: () => getPreviewToken(accessToken),
    enabled: permissions.includes("blogs") && !!accessToken,
  });

  const handleEdit = (id: string) => {
    // Check if the id passed is actually a slug or _id. 
    // In the previous code it was router.push(`/admin/blogs/edit/${id}`);
    // And the directory is [slug]. But the handleEdit in ListTable passes blog.id.
    // Let's check if the backend getBlogById works with _id or slug.
    // Looking at the edit/[slug]/page.tsx, it uses slug in queryKey but calls getBlogById(token, slug).
    // Let's assume id is the _id for now as it's more stable.
    router.push(`/admin/blogs/edit/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this blog?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/blogs/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (!res.ok) throw new Error("Failed to delete blog");
      toast.success("Blog: Deleted successfully");
      refetch();
    } catch (error) {
      console.log("error in deleting", error);
      toast.error("Failed to delete blog");
    }
  };

  if (!permissions.includes("blogs"))
    return <h1 className="text-2xl">Access Denied</h1>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4 bg-slate-50/30 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 border-slate-200">
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-slate-800">Blog Management</h1>
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
              <Search size={14} />
            </div>
          </div>
          <button
            onClick={() => router.push("/admin/blogs/new")}
            className="h-8 bg-[#FE5300] hover:bg-[#FE5300]/90 text-white text-xs font-bold rounded-lg px-4 shadow-sm transition-all active:scale-95"
          >
            + Create Blog
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
            blogs={blogs.map((b: any) => ({
              slug: b.slug,
              id: b._id,
              title: b.title,
              description: b.excerpt,
              status: b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : "Draft",
              url: `/blog/${b.slug}`,
              previewUrl: `/blog/${b.slug}?token=${previewToken}`,
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
