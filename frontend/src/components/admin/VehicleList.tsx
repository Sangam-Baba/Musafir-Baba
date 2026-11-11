"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Car, Copy, Edit, MapPin, Trash2 } from "lucide-react";
import { FleetEmptyState, fleetTh } from "@/components/admin/fleet/FleetUI";
import { RentalStatusPill } from "@/components/admin/rental/RentalAdminUI";

interface IVehicleList {
  _id: string;
  vehicleName: string;
  vehicleType: string;
  fuelType: string;
  price: {
    daily: number;
    hourly: number;
  };
  status: string;
  // Pickup city name (optional; shown so copies of one vehicle in several
  // cities can be told apart)
  locationName?: string;
  vehicleBrand?: string;
}

interface UsersTableProps {
  vehicles: IVehicleList[];
  onStatusChange: (id: string) => void;
  onDelete: (id: string) => void;
  // Optional "Duplicate to another city" action
  onDuplicate?: (id: string) => void;
}

const inr = (n?: number) => (typeof n === "number" ? `₹${n.toLocaleString("en-IN")}` : "—");
const iconBtn = "h-7 w-7 border-slate-200 text-slate-500 hover:border-orange-200 hover:bg-orange-50 hover:text-[#FE5300]";
const labelBtn = "h-7 gap-1 px-2.5 text-[12px]";

export default function VehiclesList({
  vehicles,
  onStatusChange,
  onDelete,
  onDuplicate,
}: UsersTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const list = vehicles || [];
  const totalPages = Math.max(1, Math.ceil(list.length / itemsPerPage));
  // Stay on a valid page when filters shrink the list
  const page = Math.min(currentPage, totalPages);
  const paginatedVehicles = list.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (list.length === 0) {
    return <FleetEmptyState icon={Car} title="No vehicles found" hint="Try clearing the search or filters." />;
  }

  const actions = (v: IVehicleList, withLabels = false) => (
    <div className="flex items-center justify-end gap-1.5">
      {onDuplicate && (
        <Button
          variant="outline"
          size={withLabels ? "sm" : "icon"}
          title="Duplicate to another city"
          aria-label="Duplicate to another city"
          className={withLabels ? labelBtn : iconBtn}
          onClick={() => onDuplicate(v._id)}
        >
          <Copy className="h-3.5 w-3.5" />
          {withLabels && "Duplicate"}
        </Button>
      )}
      <Button
        variant="outline"
        size={withLabels ? "sm" : "icon"}
        title="Edit"
        aria-label="Edit"
        className={withLabels ? labelBtn : iconBtn}
        onClick={() => onStatusChange(v._id)}
      >
        <Edit className="h-3.5 w-3.5" />
        {withLabels && "Edit"}
      </Button>
      <Button
        variant="outline"
        size={withLabels ? "sm" : "icon"}
        title="Delete"
        aria-label="Delete"
        className={
          withLabels
            ? `${labelBtn} hover:text-red-600`
            : "h-7 w-7 border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        }
        onClick={() => onDelete(v._id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {withLabels && "Delete"}
      </Button>
    </div>
  );

  return (
    <div className="w-full">
      {/* Desktop table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className={`${fleetTh} pl-4`}>Vehicle</TableHead>
              <TableHead className={fleetTh}>City</TableHead>
              <TableHead className={fleetTh}>Type</TableHead>
              <TableHead className={fleetTh}>Fuel</TableHead>
              <TableHead className={fleetTh}>Price / day</TableHead>
              <TableHead className={fleetTh}>Status</TableHead>
              <TableHead className={`${fleetTh} pr-4 text-right`}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedVehicles.map((v) => (
              <TableRow key={v._id} className="hover:bg-slate-50/70">
                <TableCell className="py-2.5 pl-4">
                  <p className="text-[13px] font-medium text-slate-900">{v.vehicleName}</p>
                  {v.vehicleBrand && <p className="text-[11px] text-slate-500">{v.vehicleBrand}</p>}
                </TableCell>
                <TableCell className="py-2.5 text-[12px] text-slate-600">
                  {v.locationName ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {v.locationName}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </TableCell>
                <TableCell className="py-2.5 text-[12px] capitalize text-slate-600">{v.vehicleType}</TableCell>
                <TableCell className="py-2.5 text-[12px] capitalize text-slate-600">{v.fuelType}</TableCell>
                <TableCell className="py-2.5 text-[12px] tabular-nums text-slate-700">
                  {inr(v.price?.daily)}
                  {v.price?.hourly ? <span className="text-slate-400"> · {inr(v.price.hourly)}/hr</span> : null}
                </TableCell>
                <TableCell className="py-2.5">
                  <RentalStatusPill status={v.status} />
                </TableCell>
                <TableCell className="py-2.5 pr-4">{actions(v)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-slate-100 md:hidden">
        {paginatedVehicles.map((v) => (
          <div key={v._id} className="space-y-2 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-slate-900">{v.vehicleName}</p>
                <p className="text-[11px] capitalize text-slate-500">
                  {[v.locationName, v.vehicleType, v.fuelType].filter(Boolean).join(" · ")}
                </p>
              </div>
              <RentalStatusPill status={v.status} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] tabular-nums text-slate-700">{inr(v.price?.daily)} / day</span>
              {actions(v, true)}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-slate-500">
            Showing {(page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, list.length)} of {list.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              disabled={page === 1}
              onClick={() => setCurrentPage(Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <span className="text-[12px] tabular-nums text-slate-500">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              disabled={page === totalPages}
              onClick={() => setCurrentPage(Math.min(totalPages, page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
