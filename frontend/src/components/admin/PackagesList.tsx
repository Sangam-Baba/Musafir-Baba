"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ExternalLink, CheckCircle, CheckCheck, XCircle, Eye, Columns3 } from "lucide-react";
import { motion } from "framer-motion";

// Client-side-only column visibility toggle for the desktop table.
// Stored per-browser in localStorage; purely a display preference —
// it never touches package data, props, or any handler passed in.
const COLUMN_VISIBILITY_STORAGE_KEY = "mb_admin_packages_visible_columns";
const TOGGLEABLE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "location", label: "Location" },
  { key: "price", label: "Price" },
  { key: "url", label: "URL" },
  { key: "status", label: "Status" },
  { key: "days", label: "Days" },
  { key: "nights", label: "Nights" },
  { key: "isFeatured", label: "Featured" },
  { key: "isBestSeller", label: "Best Seller" },
  { key: "packagePercent", label: "Package %" },
  { key: "maxPeople", label: "Max People" },
  { key: "author", label: "Author" },
] as const;
type ToggleableColumnKey = (typeof TOGGLEABLE_COLUMNS)[number]["key"];
type ColumnVisibility = Record<ToggleableColumnKey, boolean>;
const DEFAULT_COLUMN_VISIBILITY: ColumnVisibility = {
  name: true,
  location: true,
  price: true,
  url: true,
  status: true,
  days: false,
  nights: false,
  isFeatured: false,
  isBestSeller: false,
  packagePercent: false,
  maxPeople: false,
  author: false,
};

function useColumnVisibility() {
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>(DEFAULT_COLUMN_VISIBILITY);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
      if (raw) setVisibleColumns((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {
      // ignore malformed/unavailable storage — feature is purely cosmetic
    }
  }, []);

  const toggleColumn = (key: ToggleableColumnKey) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage failures — feature is purely cosmetic
      }
      return next;
    });
  };

  return { visibleColumns, toggleColumn };
}

function ColumnVisibilityMenu({
  visibleColumns,
  toggleColumn,
}: {
  visibleColumns: ColumnVisibility;
  toggleColumn: (key: ToggleableColumnKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="relative hidden md:inline-block" ref={ref}>
      <Button
        type="button"
        variant="outline"
        className="h-8 gap-1.5 border-slate-200 text-slate-500 hover:text-slate-700 text-xs"
        onClick={() => setOpen((o) => !o)}
      >
        <Columns3 className="w-3.5 h-3.5" />
        Columns
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-slate-100 bg-white p-2 shadow-lg">
          {TOGGLEABLE_COLUMNS.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 px-2 py-1.5 text-[13px] text-slate-600 rounded hover:bg-slate-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={visibleColumns[col.key]}
                onChange={() => toggleColumn(col.key)}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

interface Package {
  id: string;
  name: string;
  slug: string;
  url: string;
  location: string;
  price: string;
  status: string;
  days?: number;
  nights?: number;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  packagePercent?: number;
  maxPeople?: number;
  author?: string;
}
interface PackageTableProps {
  packages: Package[];
  role?: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onApprove?: (id: string, publish: boolean) => void;
  onReject?: (id: string) => void;
  onPreview?: (id: string) => void;
}

export default function AuthorsList({
  packages,
  role,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  onPreview,
}: PackageTableProps) {
  const length = packages.length;
  const { visibleColumns, toggleColumn } = useColumnVisibility();
  return (
    <div className="w-full">
      <div className="hidden md:flex justify-end mb-2">
        <ColumnVisibilityMenu visibleColumns={visibleColumns} toggleColumn={toggleColumn} />
      </div>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table className="border border-slate-100 shadow-sm rounded-xl overflow-hidden bg-white">
          <TableHeader>
            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
              <TableHead className="w-[5%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10 px-4">Sr.No</TableHead>
              {visibleColumns.name && (
                <TableHead className="w-[15%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">Name</TableHead>
              )}
              {visibleColumns.location && (
                <TableHead className="w-[15%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">Location</TableHead>
              )}
              {visibleColumns.price && (
                <TableHead className="w-[15%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">Price</TableHead>
              )}
              {visibleColumns.url && (
                <TableHead className="w-[15%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">URL</TableHead>
              )}
              {visibleColumns.status && (
                <TableHead className="w-[15%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">Status</TableHead>
              )}
              {visibleColumns.days && (
                <TableHead className="w-[8%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">Days</TableHead>
              )}
              {visibleColumns.nights && (
                <TableHead className="w-[8%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">Nights</TableHead>
              )}
              {visibleColumns.isFeatured && (
                <TableHead className="w-[10%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">Featured</TableHead>
              )}
              {visibleColumns.isBestSeller && (
                <TableHead className="w-[10%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">Best Seller</TableHead>
              )}
              {visibleColumns.packagePercent && (
                <TableHead className="w-[10%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">Package %</TableHead>
              )}
              {visibleColumns.maxPeople && (
                <TableHead className="w-[10%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">Max People</TableHead>
              )}
              {visibleColumns.author && (
                <TableHead className="w-[12%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">Author</TableHead>
              )}
              <TableHead className="w-[20%] text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right h-10 pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.map((cat: Package, i: number) => (
              <motion.tr
                key={cat.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="group border-b border-slate-50 hover:bg-slate-50/80 transition-colors duration-300 ease-in-out"
              >
                <TableCell className="py-2 px-4">
                  <span className="text-[13px] font-semibold text-slate-700 tracking-tight block group-hover:translate-x-[1px] transition-transform duration-300 ease-in-out">
                    {length - i}
                  </span>
                </TableCell>
                {visibleColumns.name && (
                  <TableCell className="py-2">
                    <span className="text-[13px] font-semibold text-slate-700 tracking-tight">
                      {cat.name}
                    </span>
                  </TableCell>
                )}
                {visibleColumns.location && (
                  <TableCell className="py-2">
                    <span className="text-[13px] font-semibold text-slate-700 tracking-tight">
                      {cat.location}
                    </span>
                  </TableCell>
                )}
                {visibleColumns.price && (
                  <TableCell className="py-2">
                    <span className="text-[13px] font-semibold text-slate-700 tracking-tight">
                      Rs. {cat.price}
                    </span>
                  </TableCell>
                )}
                {visibleColumns.url && (
                  <TableCell className="py-2">
                    <a
                      href={cat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-400 lowercase font-mono group/link"
                    >
                      <ExternalLink size={12} className="opacity-40 group-hover/link:opacity-100 group-hover/link:scale-110 transition-all duration-300 ease-in-out" />
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out truncate max-w-[150px]">
                        Visit
                      </span>
                    </a>
                  </TableCell>
                )}
                {visibleColumns.status && (
                  <TableCell className="py-2">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded capitalize ${cat.status.toLowerCase() === 'published' ? 'text-green-600 bg-green-50/80' : cat.status.toLowerCase().includes('pending updates') ? 'text-amber-600 bg-amber-50/80' : 'text-slate-600 bg-slate-50/80'}`}>
                      {cat.status}
                    </span>
                  </TableCell>
                )}
                {visibleColumns.days && (
                  <TableCell className="py-2">
                    <span className="text-[13px] text-slate-700">{cat.days ?? "-"}</span>
                  </TableCell>
                )}
                {visibleColumns.nights && (
                  <TableCell className="py-2">
                    <span className="text-[13px] text-slate-700">{cat.nights ?? "-"}</span>
                  </TableCell>
                )}
                {visibleColumns.isFeatured && (
                  <TableCell className="py-2">
                    <span className="text-[13px] text-slate-700">{cat.isFeatured ? "Yes" : "No"}</span>
                  </TableCell>
                )}
                {visibleColumns.isBestSeller && (
                  <TableCell className="py-2">
                    <span className="text-[13px] text-slate-700">{cat.isBestSeller ? "Yes" : "No"}</span>
                  </TableCell>
                )}
                {visibleColumns.packagePercent && (
                  <TableCell className="py-2">
                    <span className="text-[13px] text-slate-700">{cat.packagePercent ?? 0}%</span>
                  </TableCell>
                )}
                {visibleColumns.maxPeople && (
                  <TableCell className="py-2">
                    <span className="text-[13px] text-slate-700">{cat.maxPeople ?? "-"}</span>
                  </TableCell>
                )}
                {visibleColumns.author && (
                  <TableCell className="py-2">
                    <span className="text-[13px] text-slate-700">{cat.author || "-"}</span>
                  </TableCell>
                )}
                <TableCell className="py-2 text-right pr-4">
                  <div className="flex justify-end gap-1.5">
                    {(cat.status.toLowerCase() === 'draft' || cat.status.toLowerCase().includes('pending updates')) && role && ['admin', 'superadmin'].includes(role) && (
                      <>
                        {onApprove && (
                          <Button
                            variant="outline"
                            className="h-7 w-7 p-0 border-slate-200 text-green-500 hover:text-green-700 hover:bg-green-50 transition-colors"
                            onClick={() => onApprove(cat.id, false)}
                            title="Approve (keeps current status — draft stays draft, published stays published)"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {onApprove && (
                          <Button
                            variant="outline"
                            className="h-7 w-7 p-0 border-slate-200 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors"
                            onClick={() => onApprove(cat.id, true)}
                            title="Approve & Publish"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {onReject && cat.status.toLowerCase().includes('pending updates') && (
                          <Button
                            variant="outline"
                            className="h-7 w-7 p-0 border-slate-200 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                            onClick={() => onReject(cat.id)}
                            title="Reject Changes"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </>
                    )}
                    {onPreview && (
                      <Button
                        variant="outline"
                        className="h-7 w-7 p-0 border-slate-200 text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                        onClick={() => onPreview(cat.id)}
                        title="Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="h-7 w-7 p-0 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      onClick={() => onEdit(cat.id)}
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      className="h-7 w-7 p-0 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white border-0 transition-colors"
                      onClick={() => onDelete(cat.id)}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {packages.map((cat: Package) => (
          <Card key={cat.id} className="shadow-md">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-lg">{cat.name}</h3>
              <h3 className="font-semibold text-lg">{cat.location}</h3>
              <h3 className="font-semibold text-lg">{cat.price}</h3>
              <a
                href={cat.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm"
              >
                <ExternalLink size={16} />
                Visit
              </a>
              <h3 className="font-semibold text-lg">{cat.status}</h3>
              <div className="flex gap-2 pt-2">
                {(cat.status.toLowerCase() === 'draft' || cat.status.toLowerCase().includes('pending updates')) && role && ['admin', 'superadmin'].includes(role) && (
                  <>
                    {onApprove && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => onApprove(cat.id, false)}
                        title="Keeps current status — draft stays draft, published stays published"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve
                      </Button>
                    )}
                    {onApprove && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => onApprove(cat.id, true)}
                      >
                        <CheckCheck className="w-4 h-4 mr-1" /> Publish
                      </Button>
                    )}
                    {onReject && cat.status.toLowerCase().includes('pending updates') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => onReject(cat.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                    )}
                  </>
                )}
                {onPreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                    onClick={() => onPreview(cat.id)}
                  >
                    <Eye className="w-4 h-4 mr-1" /> Preview
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onEdit(cat.id)}
                >
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => onDelete(cat.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
