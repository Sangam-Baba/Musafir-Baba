"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import VisaApplicationList from "@/components/admin/VisaApplicationList";
import { Loader } from "@/components/custom/loader";

import { CheckCircle2, Clock3, Globe, RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FleetKpiStrip, FleetPage, FleetPanel, fleetSelectClass } from "@/components/admin/fleet/FleetUI";
import { AdminPageHeader } from "@/components/admin/AdminFormUI";
import { cn } from "@/lib/utils";

async function fetchApplications(accessToken: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa-application/all`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch applications");
  const data = await res.json();
  return data.data;
}

// Statuses that still need work from the team (display grouping only).
const IN_PROGRESS = ["Pending", "Submitted", "Applied", "Under Review", "Reviewed", "Processing"];

// Minimal shape used for search / counts; the list component owns the full type.
type AppRow = {
  applicationId?: string;
  applicationStatus?: string;
  email?: string;
  phone?: string;
  userId?: { name?: string; email?: string; phone?: string } | null;
  riderId?: { fullName?: string; mobileNumber?: string } | null;
  visaId?: { title?: string; country?: string } | null;
  travellers?: Array<{ firstName?: string; lastName?: string }>;
};

export default function AdminVisaApplicationsPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-visa-applications"],
    queryFn: () => fetchApplications(accessToken as string),
    enabled: !!accessToken,
  });

  // View-only filters: they narrow what's shown, never what's fetched or updated.
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");

  if (isLoading) return <Loader size="lg" message="Fetching visa applications..." />;
  if (isError) return <div className="p-6 text-center text-red-500">Error loading applications</div>;

  const all: AppRow[] = data || [];
  const count = (pred: (a: AppRow) => boolean) => all.filter(pred).length;
  const inProgress = count((a) => IN_PROGRESS.includes(a.applicationStatus ?? ""));
  const approved = count((a) => a.applicationStatus === "Approved");
  const returned = count((a) => a.applicationStatus === "Returned" || a.applicationStatus === "Rejected");

  const statuses = Array.from(new Set(all.map((a) => a.applicationStatus).filter(Boolean))) as string[];

  const q = search.trim().toLowerCase();
  const visible = all.filter((a) => {
    if (statusFilter === "in-progress" && !IN_PROGRESS.includes(a.applicationStatus ?? "")) return false;
    if (statusFilter !== "all" && statusFilter !== "in-progress" && a.applicationStatus !== statusFilter) return false;
    if (!q) return true;
    const haystack = [
      a.applicationId,
      a.userId?.name,
      a.userId?.email,
      a.userId?.phone,
      a.riderId?.fullName,
      a.riderId?.mobileNumber,
      a.email,
      a.phone,
      a.visaId?.title,
      a.visaId?.country,
      ...(a.travellers ?? []).map((t) => `${t.firstName ?? ""} ${t.lastName ?? ""}`),
    ];
    return haystack.some((v) => (v ?? "").toString().toLowerCase().includes(q));
  });
  const isFiltered = q !== "" || statusFilter !== "all";

  return (
    <FleetPage className="pb-8">
      <AdminPageHeader
        section="Main"
        icon={Globe}
        title="Visa Applications"
        description={`${all.length.toLocaleString("en-IN")} applications from the website and MBGo app.`}
      />

      <FleetKpiStrip
        items={[
          { label: "Total applications", value: all.length.toLocaleString("en-IN"), icon: Globe, tone: "orange" },
          { label: "In progress", value: inProgress.toLocaleString("en-IN"), icon: Clock3, tone: "amber" },
          { label: "Approved", value: approved.toLocaleString("en-IN"), icon: CheckCircle2, tone: "emerald" },
          { label: "Returned / rejected", value: returned.toLocaleString("en-IN"), icon: RotateCcw, tone: "red" },
        ]}
      />

      <FleetPanel
        title={isFiltered ? `Applications · ${visible.length} of ${all.length}` : "All applications"}
        actions={
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-72">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search applicant, app ID, visa, country"
                className="h-8 w-full pl-8 text-[13px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={cn(fleetSelectClass, "w-full md:w-[170px]")}
              aria-label="Status"
            >
              <option value="all">All statuses</option>
              <option value="in-progress">In progress</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        }
      >
        {/* key resets the list to page 1 when filters change */}
        <VisaApplicationList
          key={`${q}|${statusFilter}`}
          applications={visible as React.ComponentProps<typeof VisaApplicationList>["applications"]}
          onStatusUpdate={() => refetch()}
        />
      </FleetPanel>
    </FleetPage>
  );
}
