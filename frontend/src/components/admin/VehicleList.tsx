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
import { Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

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
}

interface UsersTableProps {
  vehicles: IVehicleList[];
  onStatusChange: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function VehiclesList({
  vehicles,
  onStatusChange,
  onDelete,
}: UsersTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const totalPages = Math.ceil((vehicles?.length || 0) / itemsPerPage);
  const paginatedVehicles = (vehicles || []).slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50/50">
              <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Vehicle Name</TableHead>
              <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Type</TableHead>
              <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Fuel</TableHead>
              <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Price (D/H)</TableHead>
              <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-2">Status</TableHead>
              <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right py-2">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedVehicles.map((cat: IVehicleList) => (
              <TableRow 
                key={cat._id}
                className="group border-b border-slate-100 hover:bg-slate-50/80 transition-colors duration-300"
              >
                <TableCell className="py-2">
                  <div className="text-[13px] font-semibold text-slate-700 leading-tight group-hover:translate-x-[1px] transition-transform duration-300">
                    {cat.vehicleName}
                  </div>
                </TableCell>
                <TableCell className="py-2 text-[11px] font-medium text-slate-500 capitalize">
                  {cat.vehicleType}
                </TableCell>
                <TableCell className="py-2 text-[11px] font-medium text-slate-500 capitalize">
                  {cat.fuelType}
                </TableCell>
                <TableCell className="py-2 text-[11px] font-medium text-slate-500">
                  ₹{cat.price?.daily} / ₹{cat.price?.hourly}
                </TableCell>
                <TableCell className="py-2">
                  <span className={`inline-flex items-center justify-center text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${cat.status === 'published' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                    {cat.status}
                  </span>
                </TableCell>
                <TableCell className="py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 border-slate-200 text-slate-400 hover:text-[#FE5300] hover:bg-orange-50 hover:border-orange-200 transition-all duration-300 opacity-60 group-hover:opacity-100"
                      onClick={() => onStatusChange(cat._id)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all duration-300 opacity-60 group-hover:opacity-100"
                      onClick={() => onDelete(cat._id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {paginatedVehicles.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-sm text-slate-500">
                  No vehicles found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/30">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-[#FE5300] hover:bg-orange-50 hover:border-orange-200 transition-all duration-300"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-[#FE5300] hover:bg-orange-50 hover:border-orange-200 transition-all duration-300"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginatedVehicles.map((cat: IVehicleList) => (
          <div key={cat._id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3 transition-colors duration-300 hover:border-orange-200 hover:shadow-md">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-[13px] font-semibold text-slate-700 leading-tight">{cat.vehicleName}</h3>
                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 capitalize">
                  <span>{cat.vehicleType}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span>{cat.fuelType}</span>
                </div>
              </div>
              <span className={`inline-flex items-center justify-center text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${cat.status === 'published' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                {cat.status}
              </span>
            </div>
            
            <div className="flex justify-between items-center pt-3 border-t border-slate-50">
              <span className="text-[11px] font-medium text-slate-500">₹{cat.price?.daily} / ₹{cat.price?.hourly}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-[10px] font-black uppercase tracking-widest text-slate-500 border-slate-200 hover:text-[#FE5300] hover:bg-orange-50 hover:border-orange-200 transition-all duration-300"
                  onClick={() => onStatusChange(cat._id)}
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-3 text-[10px] font-black uppercase tracking-widest text-slate-500 border-slate-200 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all duration-300"
                  onClick={() => onDelete(cat._id)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
        {paginatedVehicles.length === 0 && (
          <div className="text-center py-8 text-sm text-slate-500 border border-slate-200 rounded-xl bg-white">
            No vehicles found.
          </div>
        )}
        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
