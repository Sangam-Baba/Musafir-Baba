"use client";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, ExternalLink, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
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
interface SpecialPageRow {
  _id: string;
  location?: Ref | null;
  specialType?: Ref | null;
  slug?: string;
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

const pathOf = (row: SpecialPageRow) =>
  row.location && row.specialType
    ? `/rental/${rentalSlug(row.location.slug) || rentalSlug(row.location.name)}/${row.specialType.slug}${row.slug ? `/${row.slug}` : ""}`
    : null;

const EDIT_BTN = "h-7 w-7 border-slate-200 text-slate-500 hover:border-orange-200 hover:bg-orange-50 hover:text-[#FE5300]";
const DEL_BTN = "h-7 w-7 border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600";

// Admin list of /rental/{city}/{special-type}[/{permalink}] pages
export default function RentalSpecialPagesPage() {
  const router = useRouter();
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ data: SpecialPageRow[] }>({
    queryKey: ["rental-special-page"],
    queryFn: () => authFetch(accessToken, "/rental-special/pages"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => authFetch(accessToken, `/rental-special/pages/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Special page deleted");
      queryClient.invalidateQueries({ queryKey: ["rental-special-page"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rows = data?.data ?? [];

  return (
    <FleetPage>
      <RentalPageHeader
        icon={Sparkles}
        title="Special Pages"
        description="Pages like /rental/delhi/wedding-car (landing) or /rental/delhi/wedding-car/delhi-to-agra: one banner, the ride search, content, SEO and FAQs. Special types are managed under Special Types."
        actions={
          <Button size="sm" className={rPrimaryBtn} onClick={() => router.push("/admin/rental-special-pages/create")}>
            <Plus className="h-3.5 w-3.5" /> Add special page
          </Button>
        }
      />

      <FleetPanel title="All special pages" description={`${rows.length} total`}>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <FleetEmptyState
            icon={Sparkles}
            title="No special pages yet"
            hint="Add a special type first, then a page for it."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`${fleetTh} pl-4`}>City</TableHead>
                <TableHead className={fleetTh}>Special type</TableHead>
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
                      {row.specialType?.name ?? <span className="text-slate-400">— (deleted)</span>}
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
                          onClick={() => router.push(`/admin/rental-special-pages/edit/${row._id}`)}
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
                            if (confirm("Delete this special page? Its URL will show Not Found.")) {
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
