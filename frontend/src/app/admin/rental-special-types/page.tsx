"use client";
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Edit, ExternalLink, FileText, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FleetEmptyState, FleetPage, FleetPanel, fleetTh } from "@/components/admin/fleet/FleetUI";
import { RentalPageHeader, RentalStatusPill, rPrimaryBtn, rSecondaryBtn } from "@/components/admin/rental/RentalAdminUI";
import { dInput } from "@/components/admin/destination/FormBits";

// Special types for /rental/{special-type}[/{permalink}], e.g.
// "Wedding Car". Name + status only; the pages themselves are under Special
// Pages. A name a vehicle type or city already uses is refused by the backend.

interface SpecialType {
  _id: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
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

const ICON_BTN = "h-7 w-7 border-slate-200 text-slate-500 hover:border-orange-200 hover:bg-orange-50 hover:text-[#FE5300]";
const DEL_BTN = "h-7 w-7 border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600";

interface Draft {
  id: string | null; // null = new
  name: string;
  status: "active" | "inactive";
}

export default function RentalSpecialTypesPage() {
  const accessToken = useAdminAuthStore((s) => s.accessToken) as string;
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data, isLoading } = useQuery<{ data: SpecialType[] }>({
    queryKey: ["rental-special-type", "all"],
    queryFn: () => authFetch(accessToken, "/rental-special/types?all=true"),
  });
  const rows = data?.data ?? [];
  const router = useRouter();
  // Which types already have their own page content (/rental/{type})
  const { data: pagesRes } = useQuery<{ data: { slug?: string; specialType?: { _id: string } | null }[] }>({
    queryKey: ["rental-special-page"],
    queryFn: () => authFetch(accessToken, "/rental-special/pages"),
  });
  const hasContent = new Set(
    (pagesRes?.data ?? []).filter((p) => !p.slug && p.specialType).map((p) => p.specialType!._id),
  );
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["rental-special-type"] });

  const save = useMutation({
    mutationFn: (d: Draft) =>
      authFetch(accessToken, d.id ? `/rental-special/types/${d.id}` : "/rental-special/types", {
        method: d.id ? "PATCH" : "POST",
        body: JSON.stringify({ name: d.name, status: d.status }),
      }),
    onSuccess: (_r, d) => {
      toast.success(d.id ? "Special type updated" : "Special type created");
      setDraft(null);
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => authFetch(accessToken, `/rental-special/types/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Special type deleted");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editor = draft && (
    <form
      className="flex flex-col gap-3 rounded-lg border border-slate-200/80 bg-slate-50/60 p-3 md:flex-row md:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.name.trim()) return toast.error("Please enter a name");
        save.mutate(draft);
      }}
    >
      <label className="flex flex-1 flex-col gap-1 text-[12px] font-medium text-slate-700">
        Name
        <input
          autoFocus
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="e.g. Wedding Car"
          className={dInput}
        />
      </label>
      <label className="flex flex-col gap-1 text-[12px] font-medium text-slate-700">
        Status
        <select
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value as Draft["status"] })}
          className={dInput}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className={rSecondaryBtn} onClick={() => setDraft(null)}>
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
        <Button type="submit" disabled={save.isPending} className={rPrimaryBtn}>
          <Check className="h-3.5 w-3.5" /> {save.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );

  return (
    <FleetPage>
      <RentalPageHeader
        icon={Sparkles}
        title="Special Types"
        description="Types for special rental pages, e.g. Wedding Car → /rental/wedding-car. The URL part comes from the name."
        actions={
          <Button size="sm" className={rPrimaryBtn} onClick={() => setDraft({ id: null, name: "", status: "active" })}>
            <Plus className="h-3.5 w-3.5" /> Add special type
          </Button>
        }
      />

      <FleetPanel title="All special types" description={`${rows.length} total`}>
        {draft && !draft.id && <div className="p-3">{editor}</div>}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <FleetEmptyState icon={Sparkles} title="No special types yet" hint="Add one, then create pages for it under Special Pages." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`${fleetTh} pl-4`}>Name</TableHead>
                <TableHead className={fleetTh}>Page</TableHead>
                <TableHead className={fleetTh}>Status</TableHead>
                <TableHead className={`${fleetTh} pr-4 text-right`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) =>
                draft?.id === row._id ? (
                  <TableRow key={row._id}>
                    <TableCell colSpan={4} className="p-3">{editor}</TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={row._id} className="hover:bg-slate-50/70">
                    <TableCell className="py-2.5 pl-4 text-[13px] font-medium text-slate-900">{row.name}</TableCell>
                    <TableCell className="py-2.5 text-[12px]">
                      <a
                        href={`/rental/${row.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-[#FE5300]"
                      >
                        /rental/{row.slug}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className={`ml-2 text-[11px] ${hasContent.has(row._id) ? "text-emerald-600" : "text-slate-400"}`}>
                        {hasContent.has(row._id) ? "Content added" : "No content yet"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <RentalStatusPill status={row.status} />
                    </TableCell>
                    <TableCell className="py-2.5 pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          title="Banner, search, content, FAQs and SEO of /rental/{type}"
                          className="h-7 gap-1 border-slate-200 px-2 text-[12px] text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-[#FE5300]"
                          onClick={() => router.push(`/admin/rental-special-types/${row._id}/content`)}
                        >
                          <FileText className="h-3.5 w-3.5" /> Page content
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          title="Edit"
                          aria-label="Edit"
                          className={ICON_BTN}
                          onClick={() => setDraft({ id: row._id, name: row.name, status: row.status })}
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
                            if (confirm(`Delete the special type "${row.name}"?`)) remove.mutate(row._id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        )}
      </FleetPanel>
    </FleetPage>
  );
}
