"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ListTable from "@/components/admin/ListTable";
import { toast } from "sonner"; // or any toast library
import { Loader2 } from "lucide-react";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";

interface Blog {
  _id: string;
  title: string;
  content: string;
  metaDescription: string;
  coverImage: string;
  slug: string;
  excerpt: string;
}

const getBlogs = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/blogs?limit=100`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  if (!res.ok) throw new Error("Failed to get blogs");
  const data = await res.json();
  return data?.data;
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
  const [filter, setFilter] = useState({
    search: "",
  });
  const token = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions,
  ) as string[];
  const {
    data: blogs,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["blogs"],
    queryFn: getBlogs,
    enabled: permissions.includes("blogs") && !!token,
  });
  const { data: previewToken } = useQuery({
    queryKey: ["preview-token"],
    queryFn: () => getPreviewToken(token),
    enabled: permissions.includes("blogs") && !!token,
  });
  const [filteredBlogs, setFilteredBlogs] = useState<Blog[]>(blogs);

  useEffect(() => {
    if (blogs) {
      const result = blogs?.filter((pkg: Blog) => {
        return (
          pkg.title.toLowerCase().includes(filter.search.toLowerCase()) ||
          pkg.excerpt?.toLowerCase().includes(filter.search.toLowerCase())
        );
      });
      setFilteredBlogs(result);
    }
  }, [filter, blogs]);
  const router = useRouter();

  const handleEdit = (id: string) => {
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
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await res.json();

      if (data.success) {
        toast.success("Blog deleted successfully");
      } else {
        toast.error(data.message || "Failed to delete blog");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong while deleting blog");
    }
  };
  if (!permissions.includes("blogs")) {
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;
  }
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Blogs</h1>
        <div>
          <Input
            type="text"
            placeholder="Search..."
            className="border border-gray-300 rounded-md px-2 py-1"
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
          />
        </div>
        <button
          onClick={() => router.push("/admin/blogs/new")}
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
        >
          + Create Blog
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <p>{(error as Error).message}</p>
      ) : (
        <ListTable
          blogs={
            filteredBlogs?.map((b) => ({
              slug: b.slug,
              id: b._id,
              title: b.title,
              description: b.excerpt,
              url: `/blog/${b.slug}?token=${previewToken}`,
            })) ?? []
          }
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
