"use client";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, ExternalLink, Layers, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FleetEmptyState, FleetPage, FleetPanel, fleetTh } from "@/components/admin/fleet/FleetUI";
import { RentalPageHeader, RentalStatusPill, rPrimaryBtn } from "@/components/admin/rental/RentalAdminUI";
import { rentalSlug } from "@/lib/rentalUrl";

interface Ref {
  _id: string;
  name: string;
  slug?: string;
}
interface CityPageRow {
  _id: string;
  location?: Ref | null;
  vehicleType?: Ref | null;
  title?: string;
  status: string;
}

const authFetch = async (accessToken: string, path: string, init: RequestInit = {}) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || "Request failed");
  return body;
};

const pathOf = (row: CityPageRow) =>
  row.location && row.vehicleType
    ? `/rental/${rentalSlug(row.location.slug) || rentalSlug(row.location.name)}/${rentalSlug(row.vehicleType.slug) || rentalSlug(row.vehicleType.name)}`
    : null;

const EDIT_BTN = "h-7 w-7 border-slate-200 text-slate-500 hover:border-orange-200 hover:bg-orange-50 hover:text-[#FE5300]";
const DEL_BTN = "h-7 w-7 border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600";

// Admin list of /rental/{city}/{type} page contents
export default function RentalCityPagesPage() {
  const router = useRouter();
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ data: CityPageRow[] }>({
    queryKey: ["rental-city-page"],
    queryFn: () => authFetch(accessToken, "/rental-city-page"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authFetch(accessToken, `/rental-city-page/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("City + type page deleted");
      queryClient.invalidateQueries({ queryKey: ["rental-city-page"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rows = data?.data ?? [];

  return (
    <FleetPage>
      <RentalPageHeader
        icon={Layers}
        title="City + Type Pages"
        description="One landing page per city and vehicle type, e.g. /rental/delhi/traveller: its own heading, text, banner, SEO and FAQs. Without one, the page shows an automatic heading."
        actions={
          <Button size="sm" className={rPrimaryBtn} onClick={() => router.push("/admin/rental-city-pages/create")}>
            <Plus className="h-3.5 w-3.5" /> Add city + type page
          </Button>
        }
      />

      <FleetPanel title="All city + type pages" description={`${rows.length} total`}>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <FleetEmptyState
            icon={Layers}
            title="No city + type pages yet"
            hint="Add one to give a page like /rental/delhi/car its own content."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`${fleetTh} pl-4`}>City</TableHead>
                <TableHead className={fleetTh}>Vehicle type</TableHead>
                <TableHead className={fleetTh}>Page</TableHead>
                <TableHead className={fleetTh}>Heading</TableHead>
                <TableHead className={fleetTh}>Status</TableHead>
                <TableHead className={`${fleetTh} pr-4 text-right`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const path = pathOf(row);
                return (
                  <TableRow key={row._id} className="hover:bg-slate-50/70">
                    <TableCell className="py-2.5 pl-4 text-[13px] font-medium text-slate-900">
                      {row.location?.name ?? <span className="text-slate-400">— (deleted)</span>}
                    </TableCell>
                    <TableCell className="py-2.5 text-[12px] text-slate-600">
                      {row.vehicleType?.name ?? <span className="text-slate-400">— (deleted)</span>}
                    </TableCell>
                    <TableCell className="py-2.5 text-[12px]">
                      {path ? (
                        <a href={path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-slate-600 hover:text-[#FE5300]">
                          {path}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-[12px] text-slate-600">
                      {row.title || <span className="text-slate-400">Automatic</span>}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <RentalStatusPill status={row.status} />
                    </TableCell>
                    <TableCell className="py-2.5 pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          title="Edit"
                          aria-label="Edit"
                          className={EDIT_BTN}
                          onClick={() => router.push(`/admin/rental-city-pages/edit/${row._id}`)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          title="Delete"
                          aria-label="Delete"
                          className={DEL_BTN}
                          onClick={() => {
                            if (confirm("Delete this city + type page? Its URL keeps working with an automatic heading.")) {
                              deleteMutation.mutate(row._id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </FleetPanel>
    </FleetPage>
  );
}
