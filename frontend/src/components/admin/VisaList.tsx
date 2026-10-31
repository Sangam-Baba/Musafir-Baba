"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ExternalLink, Plane } from "lucide-react";
import { FleetPill, fleetTone, fleetTh, fleetBtnSm } from "@/components/admin/fleet/FleetUI";

interface Visa {
  id: string;
  country: string;
  cost: number;
  url: string;
  visaType: string;
  image?: string;
  isActive?: boolean;
  updatedAt?: string;
  options?: number;
  path?: string;
}

interface VisaTableProps {
  visa: Visa[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const formatFee = (cost: number) => (cost ? `₹${Number(cost).toLocaleString("en-IN")}` : "—");
const formatDate = (date?: string) =>
  date ? new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

function CountryCell({ item }: { item: Visa }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100 text-slate-400">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Plane size={15} />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-slate-900">{item.country}</p>
        {item.path && <p className="truncate font-mono text-[11px] text-slate-400">{item.path}</p>}
      </div>
    </div>
  );
}

function StatusPill({ active }: { active?: boolean }) {
  return active === false ? (
    <FleetPill className={fleetTone.amber}>Inactive</FleetPill>
  ) : (
    <FleetPill className={fleetTone.emerald}>Live</FleetPill>
  );
}

function RowActions({ item, onEdit, onDelete }: { item: Visa; onEdit: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="flex justify-end gap-1.5">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        title="Preview"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
      <Button variant="outline" className={`${fleetBtnSm} gap-1 border-slate-200 text-slate-700`} onClick={() => onEdit(item.id)} title="Edit">
        <Edit className="h-3.5 w-3.5" /> Edit
      </Button>
      <Button
        variant="outline"
        className="h-7 w-7 border-red-100 p-0 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
        onClick={() => onDelete(item.id)}
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function VisaList({ visa, onEdit, onDelete }: VisaTableProps) {
  return (
    <div className="w-full">
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
              <TableHead className={`${fleetTh} pl-4`}>Country</TableHead>
              <TableHead className={fleetTh}>Visa type</TableHead>
              <TableHead className={`${fleetTh} text-right`}>Options</TableHead>
              <TableHead className={`${fleetTh} text-right`}>Fee</TableHead>
              <TableHead className={fleetTh}>Status</TableHead>
              <TableHead className={fleetTh}>Updated</TableHead>
              <TableHead className={`${fleetTh} pr-4 text-right`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visa.map((item) => (
              <TableRow key={item.id} className="border-slate-100 hover:bg-slate-50/70">
                <TableCell className="py-2.5 pl-4">
                  <CountryCell item={item} />
                </TableCell>
                <TableCell className="py-2.5">
                  {item.visaType ? <FleetPill className={fleetTone.sky} dot={false}>{item.visaType}</FleetPill> : <span className="text-slate-400">—</span>}
                </TableCell>
                <TableCell className="py-2.5 text-right text-[13px] tabular-nums text-slate-600">{item.options ?? 0}</TableCell>
                <TableCell className="py-2.5 text-right text-[13px] font-semibold tabular-nums text-slate-900">{formatFee(item.cost)}</TableCell>
                <TableCell className="py-2.5">
                  <StatusPill active={item.isActive} />
                </TableCell>
                <TableCell className="py-2.5 text-[12px] text-slate-500">{formatDate(item.updatedAt)}</TableCell>
                <TableCell className="py-2.5 pr-4">
                  <RowActions item={item} onEdit={onEdit} onDelete={onDelete} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile list */}
      <div className="divide-y divide-slate-100 md:hidden">
        {visa.map((item) => (
          <div key={item.id} className="space-y-2.5 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <CountryCell item={item} />
              <StatusPill active={item.isActive} />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
              {item.visaType && <FleetPill className={fleetTone.sky} dot={false}>{item.visaType}</FleetPill>}
              <span className="font-semibold text-slate-900">{formatFee(item.cost)}</span>
              <span>· {item.options ?? 0} options</span>
            </div>
            <RowActions item={item} onEdit={onEdit} onDelete={onDelete} />
          </div>
        ))}
      </div>
    </div>
  );
}
