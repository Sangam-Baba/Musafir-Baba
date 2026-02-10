"use client";

import { useQuery } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import PageList from "@/components/admin/PageList";
import { useEffect, useState } from "react";
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
const getAllWebPage = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/webpage`, {
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
  const [filteredWebpages, setFilteredWebpages] = useState<WebPage[]>([]);
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } = useQuery<QueryResponse>({
    queryKey: ["webpage"],
    queryFn: () => getAllWebPage(accessToken),
    enabled: permissions.includes("webpage"),
    retry: 2,
  });
  const webpages = data?.data ?? [];

  const { data: previewToken } = useQuery({
    queryKey: ["preview-token"],
    queryFn: () => getPreviewToken(accessToken),
    enabled: permissions.includes("webpage") && !!accessToken,
  });

  useEffect(() => {
    if (webpages) {
      const result = webpages?.filter((pkg: WebPage) => {
        return pkg.title.toLowerCase().includes(filter.search.toLowerCase());
      });
      setFilteredWebpages(result);
    }
  }, [filter, webpages]);

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
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">All WebPages</h1>
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
          onClick={() => router.push("/admin/webpage/new")}
          className="bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
        >
          + Create
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <PageList
          webpages={filteredWebpages.map((b) => ({
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
      )}
      {isError && toast.error(error.message)}
    </div>
  );
}

export default WebPage;
