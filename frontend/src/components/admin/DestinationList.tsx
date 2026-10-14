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
import { Edit, Trash2, ExternalLink, MapPin, Search } from "lucide-react";
import {
  FleetEmptyState,
  FleetPanel,
  FleetPill,
  fleetBtnSm,
  fleetTh,
  fleetTone,
} from "@/components/admin/fleet/FleetUI";

interface Destination {
  id: string;
  name: string;
  country: string;
  state: string;
  url: string;
  status?: string;
}
interface DestinationTableProps {
  destinations: Destination[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const capitalize = (v?: string) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : "");

function StatusPill({ status }: { status?: string }) {
  if (!status) return null;
  const tone =
    status === "published" ? fleetTone.emerald : status === "draft" ? fleetTone.amber : fleetTone.slate;
  return <FleetPill className={tone}>{capitalize(status)}</FleetPill>;
}

export default function DestinationList({
  destinations,
  onEdit,
  onDelete,
}: DestinationTableProps) {
  const [query, setQuery] = useState("");

  // Keep each row's original Sr.no even while filtering.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return destinations
      .map((dest, i) => ({ dest, srNo: destinations.length - i }))
      .filter(
        ({ dest }) =>
          !q ||
          [dest.name, dest.country, dest.state].some((v) => v?.toLowerCase().includes(q))
      );
  }, [destinations, query]);

  return (
    <FleetPanel
      title="All destinations"
      description={`${destinations.length} destination${destinations.length === 1 ? "" : "s"}`}
      icon={MapPin}
      actions={
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, country, state"
            className="h-8 pl-8 text-[13px]"
          />
        </div>
      }
    >
      {rows.length === 0 ? (
        <FleetEmptyState
          icon={MapPin}
          title={query ? "No destinations match your search" : "No destinations yet"}
          hint={query ? "Try a different name, country or state." : "Create your first destination to get started."}
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead className={`${fleetTh} w-16 pl-4`}>Sr.no</TableHead>
                  <TableHead className={fleetTh}>Name</TableHead>
                  <TableHead className={fleetTh}>Country</TableHead>
                  <TableHead className={fleetTh}>State</TableHead>
                  <TableHead className={fleetTh}>Status</TableHead>
                  <TableHead className={fleetTh}>URL</TableHead>
                  <TableHead className={`${fleetTh} pr-4 text-right`}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ dest, srNo }) => (
                  <TableRow key={dest.id} className="text-[13px]">
                    <TableCell className="pl-4 tabular-nums text-slate-500">{srNo}</TableCell>
                    <TableCell className="font-medium text-slate-900">{dest.name}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-slate-600">{capitalize(dest.country)}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-slate-600">{capitalize(dest.state)}</TableCell>
                    <TableCell>
                      <StatusPill status={dest.status} />
                    </TableCell>
                    <TableCell>
                      <a
                        href={dest.url}
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
                        <Button variant="outline" size="sm" className={fleetBtnSm} onClick={() => onEdit(dest.id)}>
                          <Edit className="mr-1 h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`${fleetBtnSm} border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700`}
                          onClick={() => onDelete(dest.id)}
                          aria-label={`Delete ${dest.name}`}
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
            {rows.map(({ dest, srNo }) => (
              <div key={dest.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] tabular-nums text-slate-400">#{srNo}</p>
                    <h3 className="truncate text-[14px] font-semibold text-slate-900">{dest.name}</h3>
                    <p className="text-[12px] text-slate-500">
                      {capitalize(dest.state)}
                      {dest.country ? `, ${capitalize(dest.country)}` : ""}
                    </p>
                  </div>
                  <StatusPill status={dest.status} />
                </div>
                <a
                  href={dest.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-sky-700 hover:underline"
                >
                  <ExternalLink size={13} />
                  Visit
                </a>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className={`${fleetBtnSm} flex-1`} onClick={() => onEdit(dest.id)}>
                    <Edit className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`${fleetBtnSm} flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700`}
                    onClick={() => onDelete(dest.id)}
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
