"use client";

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
import { Edit, Trash2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
interface Visa {
  id: string;
  country: string;
  cost: number;
  url: string;
  visaType: string;
}

interface AuthorsTableProps {
  visa: Visa[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function AuthorsList({
  visa,
  onEdit,
  onDelete,
}: AuthorsTableProps) {
  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table className="border border-slate-100 shadow-sm rounded-xl overflow-hidden bg-white">
          <TableHeader>
            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-100">
              <TableHead className="w-[20%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10 px-4">Country</TableHead>
              <TableHead className="w-[15%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">Fee</TableHead>
              <TableHead className="w-[20%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">Visa Type</TableHead>
              <TableHead className="w-[25%] text-[10px] font-bold text-slate-400 uppercase tracking-wider h-10">URL</TableHead>
              <TableHead className="w-[20%] text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right h-10 pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visa.map((cat: Visa) => (
              <motion.tr
                key={cat.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="group border-b border-slate-50 hover:bg-slate-50/80 transition-colors duration-300 ease-in-out"
              >
                <TableCell className="py-2 px-4">
                  <span className="text-[13px] font-semibold text-slate-700 tracking-tight block group-hover:translate-x-[1px] transition-transform duration-300 ease-in-out">
                    {cat.country}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-[13px] font-semibold text-slate-700 tracking-tight">₹{cat.cost}</span>
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded capitalize">
                    {cat.visaType}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <a
                    href={cat.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-400 lowercase font-mono group/link"
                  >
                    <ExternalLink size={12} className="opacity-40 group-hover/link:opacity-100 group-hover/link:scale-110 transition-all duration-300 ease-in-out" />
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out truncate max-w-[150px]">
                      /visa/{cat.country.toLowerCase().replace(/\s+/g, "-")}
                    </span>
                  </a>
                </TableCell>
                <TableCell className="py-2 text-right pr-4">
                  <div className="flex justify-end gap-1.5">
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
        {visa.map((cat: Visa) => (
          <Card key={cat.id} className="shadow-md">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-lg">{cat.country}</h3>
              <h3 className="font-semibold text-lg">{cat.cost}</h3>
              <h3 className="font-semibold text-lg">{cat.visaType}</h3>
              <a
                href={cat.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm"
              >
                <ExternalLink size={16} />
                Visit
              </a>
              <div className="flex gap-2 pt-2">
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
                  <Trash2 className="w-4 h-4 mr-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
