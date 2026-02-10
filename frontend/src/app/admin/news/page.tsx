"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ListTable from "@/components/admin/ListTable";
import { toast } from "sonner"; // or any toast library
import { Loader2 } from "lucide-react";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { getPreviewToken } from "../blogs/page";

interface News {
  _id: string;
  title: string;
  content: string;
  metaDescription: string;
  coverImage: string;
  slug: string;
  excerpt: string;
}

const getAllNews = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/news?limit=100`,
    { next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error("Failed to fetch news");
  const data = await res.json();
  return data.data;
};
export default function NewsPage() {
  const token = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions,
  ) as string[];
  const [filter, setFilter] = useState({
    search: "",
  });
  const [filteredNews, setFilteredNews] = useState<News[]>([]);
  const router = useRouter();

  const {
    data: allNews,
    refetch,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["all-news"],
    queryFn: getAllNews,
    enabled: permissions.includes("news"),
  });

  const { data: previewToken } = useQuery({
    queryKey: ["preview-token"],
    queryFn: () => getPreviewToken(token),
    enabled: permissions.includes("news") && !!token,
  });

  useEffect(() => {
    if (allNews) {
      const result = allNews?.filter((pkg: News) => {
        return (
          pkg.title.toLowerCase().includes(filter.search.toLowerCase()) ||
          pkg.excerpt?.toLowerCase().includes(filter.search.toLowerCase())
        );
      });
      setFilteredNews(result);
    }
  }, [filter, allNews]);

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
          onClick={() => router.push("/admin/news/new")}
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
        >
          + Create News
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ListTable
          blogs={filteredNews.map((b) => ({
            slug: b.slug,
            id: b._id,
            title: b.title,
            description: b.excerpt,
            url: `/news/${b.slug}`,
            previewUrl: `/news/${b.slug}?token=${previewToken}`,
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
