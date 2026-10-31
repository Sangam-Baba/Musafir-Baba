"use client";
import React, { useEffect, useRef, useState } from "react";
import { clearCache } from "@/app/actions";
import Pagination from "@/components/common/Pagination";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "@/components/custom/loader";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Package, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FleetPage, FleetPanel, fleetSelectClass } from "@/components/admin/fleet/FleetUI";
import { AdminPageHeader } from "@/components/admin/AdminFormUI";
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
  isBestSeller?: boolean;
  packagePercent?: number;
  author?: { name?: string } | string | null;
  status: "draft" | "published";
  image: string;
  pendingUpdates?: any;
}
const getAllPackages = async (
  page: number,
  search: string,
  limit: number,
  status: string,
  destination: string,
  sort: string
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/packages?page=${page}&search=${search}&limit=${limit}&status=${status}&destination=${destination}&sort=${sort}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      // Admin list must always be fresh (e.g. right after an approval)
      cache: "no-store",
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

// Fleet-style look for the shared PackagesList table, applied from outside so
// the customized-package lists that also use it are unaffected: drop the
// table's own card (it now sits in a panel), soften the header row, and pad
// the "Columns" button row.
const PACKAGES_TABLE_STYLES = [
  "[&_table]:rounded-none [&_table]:border-0 [&_table]:shadow-none",
  "[&_th]:h-9 [&_th]:text-[11px] [&_th]:font-medium [&_th]:normal-case [&_th]:tracking-normal [&_th]:text-slate-500",
  "[&>div>div:first-child]:px-4 [&>div>div:first-child]:pt-3",
].join(" ");
function PackagePage() {
  const [filter, setFilter] = useState({ search: "" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  // "" matches the existing default (no status filter — shows everything,
  // same as before this filter existed).
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  // Default: last modified first, newest to oldest.
  const [sort, setSort] = useState("desc");
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
  // Packages whose approval request is currently in flight
  const approvingIds = useRef<Set<string>>(new Set());
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const permissions = useAdminAuthStore(
    (state) => state.permissions
  ) as string[];
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["packages", page, debouncedSearch, pageSize, statusFilter, locationFilter, sort],
    queryFn: () => getAllPackages(page, debouncedSearch, pageSize, statusFilter, locationFilter, sort),
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
    // Ignore repeat clicks while this package's approval is still in flight
    if (approvingIds.current.has(id)) return;
    if (
      !confirm(
        publish
          ? "Approve these changes and publish the package live?"
          : "Approve these changes? The package's current status (draft/published) will stay as-is."
      )
    )
      return;
    approvingIds.current.add(id);
    const toastId = toast.loading(publish ? "Approving and publishing…" : "Approving changes…");
    try {
      const sendApprove = (token: string | null) =>
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/packages/${id}/approve`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ publish }),
        });
      let res = await sendApprove(useAdminAuthStore.getState().accessToken);
      // The access token can expire while this page sits open; refresh it once
      // and retry instead of failing until the page is reloaded.
      if (res.status === 401) {
        await useAdminAuthStore.getState().refreshAccessToken();
        res = await sendApprove(useAdminAuthStore.getState().accessToken);
      }
      if (!res.ok) {
        // Surface the server's reason (session expired, permission, validation…)
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || body?.message || `Failed to approve package (HTTP ${res.status})`);
      }
      toast.success(publish ? "Package approved and published" : "Package changes approved", { id: toastId });

      // Show the updated row right away; the public-site cache revalidation
      // (a round trip to the Next server) runs in the background instead of
      // holding up the list refresh.
      refetch();
      clearCache('/holidays', 'packages').catch((err) => {
        console.error('Failed to revalidate cache:', err);
      });
    } catch (error) {
      console.log("error in approving", error);
      toast.error(error instanceof Error && error.message ? `Approval failed: ${error.message}` : "Something went wrong while approving package", { id: toastId });
    } finally {
      approvingIds.current.delete(id);
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
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Failed to reject package updates (HTTP ${res.status})`);
      }
      toast.success("Package updates rejected successfully");
      refetch();
    } catch (error) {
      console.log("error in rejecting", error);
      toast.error(error instanceof Error && error.message ? `Reject failed: ${error.message}` : "Something went wrong while rejecting package updates");
    }
  };

  if (!permissions.includes("holidays"))
    return <h1 className="mx-auto text-2xl">Access Denied</h1>;

  if (isLoading) return <Loader size="lg" message="Loading packages..." />;
  if (isError) return <h1>{error.message}</h1>;

  return (
    <FleetPage>
      <AdminPageHeader
        section="Packages"
        icon={Package}
        title="All Packages"
        description={`${meta.total.toLocaleString("en-IN")} packages · manage pricing, batches and what's live on the website.`}
        actions={
          <Button size="sm" className="h-8 gap-1.5 bg-[#FE5300] px-3 text-[12px] font-semibold hover:bg-[#e44a00]" onClick={() => router.push("/admin/holidays/new")}>
            <Plus className="h-3.5 w-3.5" /> Create package
          </Button>
        }
      />

      <FleetPanel
        title="Packages"
        actions={
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
          <div className="relative w-full md:w-60">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by name or destination"
            className="h-8 w-full pl-8 text-[13px]"
            value={filter.search}
            onChange={(e) => {
              setFilter({ search: e.target.value });
              setPage(1);
            }}
          />
          </div>
          <Select
            value={statusFilter || "all"}
            onValueChange={(v) => {
              setStatusFilter(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger size="sm" className="h-8 w-full text-[13px] md:w-[140px]">
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
            <SelectTrigger size="sm" className="h-8 w-full text-[13px] md:w-[160px]">
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
          <Select
            value={sort}
            onValueChange={(v) => {
              setSort(v);
              setPage(1);
            }}
          >
            <SelectTrigger size="sm" className="h-8 w-full text-[13px] md:w-[180px]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Last Modified (Newest)</SelectItem>
              <SelectItem value="asc">Last Modified (Oldest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        }
      >
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div>
          {/* PackagesList is shared with the customized-package lists, so it's
              restyled from here (this page only) instead of edited. */}
          <div className={PACKAGES_TABLE_STYLES}>
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
                    days: b.duration?.days,
                    nights: b.duration?.nights,
                    isFeatured: b.isFeatured,
                    isBestSeller: b.isBestSeller,
                    packagePercent: b.packagePercent,
                    maxPeople: b.maxPeople,
                    author: typeof b.author === "string" ? b.author : b.author?.name,
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
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <p className="text-[12px] text-slate-500">
                Showing {meta.total === 0 ? 0 : ((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, meta.total)} of {meta.total}
              </p>
              <label className="flex items-center gap-2 text-[12px] text-slate-500">
                Per page
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className={fleetSelectClass}
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
      </FleetPanel>
      <PreviewDrawer id={previewId} isOpen={isPreviewOpen} onClose={() => { setIsPreviewOpen(false); setPreviewId(null); }} />
    </FleetPage>
  );
}

export default PackagePage;
