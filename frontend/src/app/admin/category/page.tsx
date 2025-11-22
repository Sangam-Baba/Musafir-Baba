"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import CategoryList from "@/components/admin/CategoryList";

interface Category {
  _id: string;
  name: string;
  description: string;
  coverImage: string;
  slug: string;
  isActive: boolean;
  packages: string[];
}

export default function CategoryPage() {
  const token = useAuthStore((state) => state.accessToken);
  const permissions = useAuthStore((state) => state.permissions) as string[];
  const [category, setCategory] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ✅ Fetch blogs
  const fetchCategory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (data.success) {
        setCategory(data.data);
      } else {
        toast.error(data.message || "Failed to fetch Category");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong fetching Category");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategory();
  }, []);

  // ✅ Edit
  const handleEdit = (id: string) => {
    router.push(`/admin/category/edit/${id}`);
  };

  // ✅ Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category ?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/category/${id}`,
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
        toast.success("Category deleted successfully");
        fetchCategory(); // refetch after delete
      } else {
        toast.error(data.message || "Failed to delete category");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong while deleting category");
    }
  };

  if (!permissions.includes("category"))
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Category</h1>
        <button
          onClick={() => router.push("/admin/category/new")}
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
        >
          + Create
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <CategoryList
          categories={category.map((b) => ({
            id: b._id,
            name: b.name,
            slug: b.slug,
            url: `/holidays/${b.slug}/`,
          }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
