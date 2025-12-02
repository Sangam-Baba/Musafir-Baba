"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ListTable from "@/components/admin/ListTable";
import { toast } from "sonner"; // or any toast library
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

interface News {
  _id: string;
  title: string;
  content: string;
  metaDescription: string;
  coverImage: string;
  slug: string;
  excerpt: string;
}

export default function NewsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const permissions = useAuthStore((state) => state.permissions) as string[];
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ✅ Fetch blogs
  const fetchNews = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/news?limit=100`, // adjust API route
        { cache: "no-store" }
      );
      const data = await res.json();

      if (data.success) {
        setNews(data.data);
      } else {
        toast.error(data.message || "Failed to fetch News");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong fetching news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // ✅ Edit
  const handleEdit = (slug: string) => {
    router.push(`/admin/news/edit/${slug}`);
  };

  // ✅ Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this news?")) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/news/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();

      if (data.success) {
        toast.success("News deleted successfully");
        fetchNews(); // refetch after delete
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
        <button
          onClick={() => router.push("/admin/news/new")}
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
        >
          + Create News
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ListTable
          blogs={news.map((b) => ({
            slug: b.slug,
            id: b._id,
            title: b.title,
            description: b.excerpt,
            url: `/news/${b.slug}`, // or absolute link if needed
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
