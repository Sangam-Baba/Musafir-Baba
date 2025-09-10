"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ListTable from "@/components/admin/ListTable";
import { toast } from "sonner"; // or any toast library
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

interface Blog {
  _id: string;
  title: string;
  content: string;
  metaDescription: string;
  coverImage: string;
  slug: string;
}

export default function BlogsPage() {
  const token = useAuthStore((state) => state.accessToken);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ✅ Fetch blogs
  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/blogs`, // adjust API route
        { cache: "no-store" }
      );
      const data = await res.json();

      if (data.success) {
        setBlogs(data.data);
      } else {
        toast.error(data.message || "Failed to fetch blogs");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong fetching blogs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  // ✅ Edit
  const handleEdit = (slug: string) => {
    router.push(`/admin/blogs/edit/${slug}`);
  };

  // ✅ Delete
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
        }
      );
      const data = await res.json();

      if (data.success) {
        toast.success("Blog deleted successfully");
        fetchBlogs(); // refetch after delete
      } else {
        toast.error(data.message || "Failed to delete blog");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong while deleting blog");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Blogs</h1>
        <button
          onClick={() => router.push("/admin/blogs/new")}
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
        >
          + Create Blog
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ListTable
          blogs={blogs.map((b) => ({
            slug: b.slug,
            id: b._id,
            title: b.title,
            description: b.metaDescription,
            url: `/blog/${b.slug}`, // or absolute link if needed
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
