"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "@/components/custom/loader";
import EnquiryList, { enquiryType } from "@/components/admin/EnquriyList";
import { exportToCSV } from "@/utils/exportToCSV";
import { CalendarDays, Download, MessageSquareText, Plane, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FleetKpiStrip, FleetPage, FleetPanel } from "@/components/admin/fleet/FleetUI";
import { AdminPageHeader } from "@/components/admin/AdminFormUI";

const getAllEnquiry = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/contact`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch enquriy");
  const data = await res.json();
  return data;
};
interface Enquiry {
  _id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  whatsapp: boolean;
  policy: boolean;
  source: string;
  state?: string;
  city?: string;
  createdAt: string;
}
interface QueryResponse {
  data: Enquiry[];
}

// WhatsApp icon isn't in lucide; tiny inline glyph keeps the KPI strip consistent.
const WhatsAppIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.13c-.24.68-1.43 1.32-1.97 1.37-.5.05-1.13.07-1.83-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.8-4.18-4.94-4.37-.14-.19-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.66.5.24.58.82 2.01.89 2.16.07.14.12.31.02.5-.1.19-.14.31-.29.48-.14.17-.3.37-.43.5-.14.14-.29.3-.13.59.17.29.74 1.22 1.59 1.98 1.09.97 2.01 1.27 2.3 1.42.29.14.46.12.63-.07.17-.19.73-.85.92-1.14.19-.29.39-.24.65-.14.27.1 1.69.8 1.98.94.29.14.48.22.55.34.07.12.07.7-.17 1.38Z" />
  </svg>
);

function EnquiryPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const permissions = useAdminAuthStore(
    (state) => state.permissions
  ) as string[];
  const { data, isLoading, isError, error } = useQuery<QueryResponse>({
    queryKey: ["enquiry"],
    queryFn: () => getAllEnquiry(accessToken),
    retry: 2,
    enabled: permissions.includes("enquiry"),
  });
  // View-only filters (search + type). They only narrow what's displayed;
  // lead IDs and the CSV export always use the full list, as before.
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");

  if (isError) {
    return <h1>{error.message}</h1>;
  }
  const enquiry = data?.data ?? [];

  const generateLeadId = (index: number) =>
    `MB-${String(index + 1).padStart(4, "0")}`;
  const totalEnquriy = enquiry.length;
  const handleExport = () => {
    const formattedData = enquiry.map((enq, index) => ({
      leadId: generateLeadId(totalEnquriy - index - 1),
      name: enq.name,
      email: enq.email,
      phone: enq.phone,
      message: enq.message,
      whatsapp: enq.whatsapp,
      source: enq.source,
      createdAt: enq.createdAt,
    }));
    exportToCSV(formattedData, { fileName: "enquiries" });
  };

  if (!permissions.includes("enquiry")) return <h1>Access Denied</h1>;

  // Same row mapping as before; lead IDs are assigned on the full list first.
  const rows = enquiry.map((b, i) => ({
    leadId: generateLeadId(totalEnquriy - i - 1),
    name: b.name,
    email: b.email,
    phone: b.phone,
    source: b.source,
    message: b.message,
    state: b.state,
    city: b.city,
    whatsapp: `${b.whatsapp === true ? "Yes" : "No"}`,
    createdAt: b.createdAt.split("T")[0],
  }));

  const q = search.trim().toLowerCase();
  const visibleRows = rows.filter((r) => {
    if (typeFilter !== "all" && enquiryType(r) !== typeFilter) return false;
    if (!q) return true;
    return [r.leadId, r.name, r.email, r.phone, r.message, r.city, r.state]
      .some((v) => (v ?? "").toString().toLowerCase().includes(q));
  });

  // KPI numbers, derived from the already-loaded list (no extra requests).
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = rows.filter((r) => r.createdAt?.startsWith(monthPrefix)).length;
  const visaCount = rows.filter((r) => enquiryType(r) === "visa").length;
  const whatsappCount = rows.filter((r) => r.whatsapp === "Yes").length;
  const isFiltered = q !== "" || typeFilter !== "all";

  return (
    <FleetPage>
      <AdminPageHeader
        section="Main"
        icon={MessageSquareText}
        title="Enquiries"
        description={`${totalEnquriy.toLocaleString("en-IN")} leads from the website, chatbot and visa pages.`}
        actions={
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-[#FE5300] px-3 text-[12px] font-semibold hover:bg-[#e44a00]"
            onClick={handleExport}
            disabled={isLoading || totalEnquriy === 0}
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      />

      {!isLoading && (
        <FleetKpiStrip
          items={[
            { label: "Total enquiries", value: totalEnquriy.toLocaleString("en-IN"), icon: MessageSquareText, tone: "orange" },
            { label: "This month", value: thisMonth.toLocaleString("en-IN"), icon: CalendarDays, tone: "sky" },
            { label: "Visa enquiries", value: visaCount.toLocaleString("en-IN"), icon: Plane, tone: "amber" },
            { label: "WhatsApp opt-in", value: whatsappCount.toLocaleString("en-IN"), icon: WhatsAppIcon as unknown as LucideIcon, tone: "emerald" },
          ]}
        />
      )}

      <FleetPanel
        title={isFiltered ? `Enquiries · ${visibleRows.length} of ${totalEnquriy}` : "All enquiries"}
        actions={
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="relative w-full md:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search name, phone, email, lead ID"
                className="h-8 w-full pl-8 text-[13px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger size="sm" className="h-8 w-full text-[13px] md:w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="general">Website</SelectItem>
                <SelectItem value="chatbot">Chatbot</SelectItem>
                <SelectItem value="visa">Visa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      >
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader size="lg" />
          </div>
        ) : (
          // key remounts the list when filters change so it returns to page 1
          <EnquiryList key={`${q}|${typeFilter}`} enquiry={visibleRows} />
        )}
      </FleetPanel>
    </FleetPage>
  );
}

export default EnquiryPage;
