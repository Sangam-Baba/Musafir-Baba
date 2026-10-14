"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash2, ExternalLink, MapPinPenIcon, Search } from "lucide-react";
import {
  FleetEmptyState,
  FleetPanel,
  FleetPill,
  fleetBtnSm,
  fleetTh,
  fleetTone,
} from "@/components/admin/fleet/FleetUI";

export interface DestinationSeo {
  _id: string;
  categoryId: {
    name: string;
    _id: string;
    slug: string;
  };
  destinationId: {
    name: string;
    _id: string;
    state: string;
  };
  metaTitle: string;
  excerpt?: string;
  metaDescription: string;
  keywords: string[];
  url: string;
}
interface AuthorsTableProps {
  destinationSeo: DestinationSeo[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function DestinationSeoList({
  destinationSeo = [],
  onEdit,
  onDelete,
}: AuthorsTableProps) {
  const [query, setQuery] = useState("");

  // Keep each row's original Sr.no even while filtering.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return destinationSeo
      .map((cat, i) => ({ cat, srNo: destinationSeo.length - i }))
      .filter(
        ({ cat }) =>
          !q ||
          [cat.metaTitle, cat.categoryId?.name, cat.destinationId?.name, cat.destinationId?.state].some((v) =>
            v?.toLowerCase().includes(q)
          )
      );
  }, [destinationSeo, query]);

  return (
    <FleetPanel
      title="All category SEO pages"
      description={`${destinationSeo.length} page${destinationSeo.length === 1 ? "" : "s"} · one per category + destination`}
      icon={MapPinPenIcon}
      actions={
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, category, destination"
            className="h-8 pl-8 text-[13px]"
          />
        </div>
      }
    >
      {rows.length === 0 ? (
        <FleetEmptyState
          icon={MapPinPenIcon}
          title={query ? "No SEO pages match your search" : "No category SEO pages yet"}
          hint={query ? "Try a different title, category or destination." : "Create one to add SEO and content to a /holidays listing page."}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden w-full overflow-x-auto md:block">
            <Table className="min-w-[1000px] table-fixed">
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead className={`${fleetTh} w-[6%] pl-4`}>Sr.no</TableHead>
                  <TableHead className={`${fleetTh} w-[26%]`}>Page</TableHead>
                  <TableHead className={`${fleetTh} w-[14%]`}>Category</TableHead>
                  <TableHead className={`${fleetTh} w-[14%]`}>Destination</TableHead>
                  <TableHead className={`${fleetTh} w-[18%]`}>Keywords</TableHead>
                  <TableHead className={`${fleetTh} w-[8%]`}>Visit</TableHead>
                  <TableHead className={`${fleetTh} w-[14%] pr-4 text-right`}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ cat, srNo }) => (
                  <TableRow key={cat._id} className="text-[13px]">
                    <TableCell className="pl-4 tabular-nums text-slate-500">{srNo}</TableCell>
                    <TableCell className="min-w-0">
                      <p className="truncate font-medium text-slate-900" title={cat.metaTitle}>
                        {cat.metaTitle}
                      </p>
                      <p className="truncate text-[12px] text-slate-500" title={cat.metaDescription}>
                        {cat.metaDescription}
                      </p>
                    </TableCell>
                    <TableCell className="truncate">
                      <FleetPill className={fleetTone.violet} dot={false}>
                        {cat.categoryId?.name}
                      </FleetPill>
                    </TableCell>
                    <TableCell className="truncate text-slate-700">{cat.destinationId?.name}</TableCell>
                    <TableCell className="truncate text-[12px] text-slate-500" title={cat.keywords?.join(", ")}>
                      {cat.keywords?.length ? cat.keywords.join(", ") : <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell>
                      <a
                        href={cat.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-sky-700 hover:underline"
                      >
                        <ExternalLink size={13} />
                        Visit
                      </a>
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Button variant="outline" size="sm" className={fleetBtnSm} onClick={() => onEdit(cat._id)}>
                          <Edit className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`${fleetBtnSm} border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700`}
                          onClick={() => onDelete(cat._id)}
                          aria-label={`Delete ${cat.metaTitle}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="divide-y divide-slate-100 md:hidden">
            {rows.map(({ cat, srNo }) => (
              <div key={cat._id} className="space-y-2 p-4">
                <p className="text-[11px] tabular-nums text-slate-400">#{srNo}</p>
                <h3 className="text-[14px] font-semibold text-slate-900">{cat.metaTitle}</h3>
                <p className="line-clamp-2 text-[12px] text-slate-500">{cat.metaDescription}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <FleetPill className={fleetTone.violet} dot={false}>
                    {cat.categoryId?.name}
                  </FleetPill>
                  <FleetPill className={fleetTone.slate} dot={false}>
                    {cat.destinationId?.state}
                  </FleetPill>
                </div>
                {cat.keywords?.length > 0 && (
                  <p className="text-[12px] text-slate-500">{cat.keywords.join(", ")}</p>
                )}
                <a
                  href={cat.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-sky-700 hover:underline"
                >
                  <ExternalLink size={13} />
                  Visit
                </a>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className={`${fleetBtnSm} flex-1`} onClick={() => onEdit(cat._id)}>
                    <Edit className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`${fleetBtnSm} flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700`}
                    onClick={() => onDelete(cat._id)}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </FleetPanel>
  );
}
