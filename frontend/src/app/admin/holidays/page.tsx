"use client";
import React, { useEffect, useState } from "react";
import { clearCache } from "@/app/actions";
import Pagination from "@/components/common/Pagination";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "@/components/custom/loader";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import PackagesList from "@/components/admin/PackagesList";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PreviewDrawer from "@/components/admin/PreviewDrawer";
interface Batch {
  startDate: string;
  endDate: string;
  quad: number;
  triple: number;
  double: number;
  child: number;
  quadDiscount: number;
  tripleDiscount: number;
  doubleDiscount: number;
  childDiscount: number;
}
interface Package {
  _id: string;
  title: string;
  description: string;
  batch: Batch[];
  slug: string;
  coverImage: {
    url: string;
    public_id: string;
    alt: string;
    width?: number;
    height?: number;
  };
  gallery: [
    {
      url: string;
      public_id: string;
      alt: string;
      width?: number;
      height?: number;
    }
  ];
  duration: {
    days: number;
    nights: number;
  };
  destination?: {
    _id: string;
    name: string;
    slug: string;
    country: string;
    state: string;
    city?: string;
    coverImage: {
      url: string;
      public_id: string;
      alt: string;
      width?: number;
      height?: number;
    };
  };
  mainCategory: {
    _id: string;
    name: string;
    slug: string;
  };
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  maxPeople?: number;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  itinerary: string[];
  faqs: string[];
  createdAt: string;
  updatedAt: string;
  isFeatured: boolean;
  status: "draft" | "published";
  image: string;
  pendingUpdates?: any;
}
const getAllPackages = async (
  page: number,
  search: string,
  limit: number,
  status: string,
  destination: string
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/packages?page=${page}&search=${search}&limit=${limit}&status=${status}&destination=${destination}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("Failed to fetch packages");
  const data = await res.json();
  return data;
};

interface DestinationOption {
  _id: string;
  name: string;
  state: string;
}
// Same endpoint/shape src/app/admin/holidays/new/page.tsx already uses for
// its own destination dropdown — duplicated locally rather than imported
// across page files, to keep the two pages independent.
const getDestinations = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/destination`);
  if (!res.ok) throw new Error("Failed to get destinations");
  const data = await res.json();
  return data?.data ?? [];
};

// 512+ packages already exist today and growing, so the page-size cap
// needs real headroom above the old 500 max, not a bump that'll be too
// small again soon.
const PAGE_SIZE_OPTIONS = [10, 50, 100, 500, 2000];
function PackagePage() {
  const [filter, setFilter] = useState({ search: "" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // "" matches the existing default (no status filter — shows everything,
  // same as before this filter existed).
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filter.search);
    }, 500);
    return () => clearTimeout(handler);
  }, [filter.search]);

  const router = useRouter();
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const role = useAdminAuthStore((state) => state.role) as string;
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const permissions = useAdminAuthStore(
    (state) => state.permissions
  ) as string[];
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["packages", page, debouncedSearch, pageSize, statusFilter, locationFilter],
    queryFn: () => getAllPackages(page, debouncedSearch, pageSize, statusFilter, locationFilter),
    enabled: permissions.includes("holidays"),
  });

  const { data: destinations } = useQuery({
    queryKey: ["destinations"],
    queryFn: getDestinations,
    enabled: permissions.includes("holidays"),
  });

  const packages = data?.data ?? [];
  const meta = {
    total: data?.total ?? 0,
    totalPages: data?.pages ?? 1,
  };
  const handleEdit = (id: string) => {
    router.push(`/admin/holidays/edit/${id}`);
  };

  const handlePreview = (id: string) => {
    setPreviewId(id);
    setIsPreviewOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this package?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/packages/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to delete package");
      toast.success("Package: Deleted successfully");
      router.refresh();
    } catch (error) {
      console.log("error in deleting", error);
      toast.error("Something went wrong while deleting package");
    }
  };

  const handleApprove = async (id: string, publish: boolean) => {
    if (
      !confirm(
        publish
          ? "Approve these changes and publish the package live?"
          : "Approve these changes? The package's current status (draft/published) will stay as-is."
      )
    )
      return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/packages/${id}/approve`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ publish }),
        }
      );
      if (!res.ok) throw new Error("Failed to approve package");
      toast.success(publish ? "Package approved and published" : "Package changes approved");
      
      // Trigger frontend cache revalidation using Server Action
      try {
        await clearCache('/holidays', 'packages');
      } catch (err) {
        console.error('Failed to revalidate cache:', err);
      }
      
      refetch();
    } catch (error) {
      console.log("error in approving", error);
      toast.error("Something went wrong while approving package");
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject these changes?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/packages/${id}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to reject package updates");
      toast.success("Package updates rejected successfully");
      refetch();
    } catch (error) {
      console.log("error in rejecting", error);
      toast.error("Something went wrong while rejecting package updates");
    }
  };

  if (!permissions.includes("holidays"))
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;

  if (isLoading) return <Loader size="lg" message="Loading packages..." />;
  if (isError) return <h1>{error.message}</h1>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">All Packages</h1>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between  ">
          <Input
            type="text"
            placeholder="Search by name or destination"
            className="border border-gray-300 rounded-lg px-4 py-2 w-full max-w-[300px]"
            value={filter.search}
            onChange={(e) => {
              setFilter({ search: e.target.value });
              setPage(1);
            }}
          />
          <Select
            value={statusFilter || "all"}
            onValueChange={(v) => {
              setStatusFilter(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={locationFilter || "all"}
            onValueChange={(v) => {
              setLocationFilter(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {(destinations ?? [])
                .filter((dest: DestinationOption) => dest.state && dest.state.trim() !== "")
                .map((dest: DestinationOption) => (
                  <SelectItem key={dest._id} value={dest.state}>
                    {dest.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <button
          onClick={() => router.push("/admin/holidays/new")}
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
        <div className="space-y-4">
          <PackagesList
            packages={
              Array.isArray(packages)
                ? packages.map((b: Package) => ({
                    id: b._id as string,
                    name: b.title as string,
                    location:
                      b.destination?.state ? (b.destination?.state.charAt(0).toUpperCase() as string) +
                      b.destination?.state.slice(1) : "",
                    slug: b.slug as string,
                    price: b.batch?.length
                      ? b.batch[0].quad.toLocaleString()
                      : "0",
                    url: `/holidays/${b.mainCategory?.slug}/${b.destination?.state}/${b.slug}`,
                    status: b.pendingUpdates ? (b.pendingUpdates.updatedBy ? `Pending Updates by ${b.pendingUpdates.updatedBy}` : "Pending Updates") : (b.status === "published" ? "Published" : "Draft"),
                  }))
                : []
            }
            role={role}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onApprove={handleApprove}
            onReject={handleReject}
            onPreview={handlePreview}
          />
          <div className="flex items-center justify-between px-2 py-4">
            <div className="flex items-center gap-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Showing {meta.total === 0 ? 0 : ((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, meta.total)} of {meta.total}
              </p>
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Per Page
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 normal-case tracking-normal"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Pagination
              currentPage={page}
              totalPages={meta.totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        </div>
      )}
      <PreviewDrawer id={previewId} isOpen={isPreviewOpen} onClose={() => { setIsPreviewOpen(false); setPreviewId(null); }} />
    </div>
  );
}

export default PackagePage;
