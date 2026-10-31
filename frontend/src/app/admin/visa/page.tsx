"use client";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CheckCircle2, EyeOff, Layers, Loader2, Plane, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import VisaList from "@/components/admin/VisaList";
import { getPreviewToken } from "../blogs/page";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FleetEmptyState, FleetKpiStrip, FleetPage, FleetPanel, fleetSelectClass } from "@/components/admin/fleet/FleetUI";
import { VisaPageHeader } from "@/components/admin/visa/VisaAdminUI";
interface Visa {
  _id: string;
  country: string;
  cost: number;
  visaType: string;
  childUrl: string;
  slug: string;
  isActive?: boolean;
  updatedAt?: string;
  coverImage?: { url?: string };
  visas?: unknown[];
}

interface QueryResponse {
  success: boolean;
  data: Visa[];
}
const getAllVisa = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa`);
  if (!res.ok) throw new Error("Failed to fetch Visa");
  const data = await res.json();
  return data;
};
function VisaPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions,
  ) as string[];
  const router = useRouter();
  // On-screen filters only (the list is already fully loaded)
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data, isLoading, isError, error, refetch } = useQuery<QueryResponse>({
    queryKey: ["visa"],
    queryFn: getAllVisa,
    retry: 2,
    enabled: permissions.includes("visa"),
  });
  if (isError) {
    toast.error(error.message);
    return <h1>{error.message}</h1>;
  }
  const visa = data?.data ?? [];

  const { data: previewToken } = useQuery({
    queryKey: ["preview-token"],
    queryFn: () => getPreviewToken(accessToken),
    enabled: permissions.includes("visa") && !!accessToken,
  });

  const handleEdit = (id: string) => {
    router.push(`/admin/visa/edit/${id}`);
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this visa?")) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/visa/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      if (!res.ok) throw new Error("Failed to delete visa");
      toast.success("Visa: Deleted successfully");
      refetch();
    } catch (error) {
      console.log("error in deleting", error);
      toast.error("Something went wrong while deleting visa");
    }
  };

  if (!permissions.includes("visa")) return <h1>Access Denied</h1>;

  const visaTypes = Array.from(new Set(visa.map((b) => b.visaType).filter(Boolean))).sort();
  const liveCount = visa.filter((b) => b.isActive !== false).length;
  const query = search.trim().toLowerCase();
  const filtered = visa.filter(
    (b) =>
      (!query || b.country?.toLowerCase().includes(query) || b.slug?.toLowerCase().includes(query)) &&
      (typeFilter === "all" || b.visaType === typeFilter) &&
      (statusFilter === "all" || (statusFilter === "live" ? b.isActive !== false : b.isActive === false))
  );

  return (
    <FleetPage>
      <VisaPageHeader
        title="All Visas"
        description="Manage visa pages, pricing cards and what's live on the website."
        actions={
          <Button size="sm" className="h-8 gap-1.5 bg-[#FE5300] px-3 text-[12px] font-semibold hover:bg-[#e44a00]" onClick={() => router.push("/admin/visa/new")}>
            <Plus className="h-3.5 w-3.5" /> Create visa
          </Button>
        }
      />

      <FleetKpiStrip
        items={[
          { label: "Total visas", value: visa.length, icon: Plane, tone: "orange" },
          { label: "Live", value: liveCount, icon: CheckCircle2, tone: "emerald" },
          { label: "Inactive", value: visa.length - liveCount, icon: EyeOff, tone: "amber" },
          { label: "Visa types", value: visaTypes.length, icon: Layers, tone: "sky" },
        ]}
      />

      <FleetPanel
        title="Visas"
        description={isLoading ? "Loading…" : `${filtered.length} of ${visa.length} shown`}
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country"
                className="h-8 w-full pl-8 text-[13px] sm:w-52"
              />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={fleetSelectClass}>
              <option value="all">All types</option>
              {visaTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={fleetSelectClass}>
              <option value="all">All status</option>
              <option value="live">Live</option>
              <option value="inactive">Inactive</option>
            </select>
          </>
        }
      >
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <FleetEmptyState
            icon={Plane}
            title={visa.length === 0 ? "No visas yet" : "No visas match these filters"}
            hint={visa.length === 0 ? "Create your first visa to get started." : "Try a different search or filter."}
          />
        ) : (
          <VisaList
            visa={filtered.map((b) => ({
              id: b._id,
              country: b.country,
              cost: b.cost,
              visaType: b.visaType,
              url: `/visa/${b.slug}?token=${previewToken}`,
              image: b.coverImage?.url,
              isActive: b.isActive,
              updatedAt: b.updatedAt,
              options: Array.isArray(b.visas) ? b.visas.length : 0,
              path: `/visa/${b.slug}`,
            }))}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </FleetPanel>
    </FleetPage>
  );
}

export default VisaPage;
