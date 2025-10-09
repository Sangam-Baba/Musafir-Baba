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
import { Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
interface Job {
  id: string;
  title: string;
  experienceLevel: string;
  salaryRange: string;
  employmentType: string;
  isActive: string;
}
interface AuthorsTableProps {
  jobs: Job[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function JobList({ jobs, onEdit, onDelete }: AuthorsTableProps) {
  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table className="rounded-2xl shadow-md overflow-hidden">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[20%]">Name</TableHead>
              <TableHead className="w-[20%]">Experience</TableHead>
              <TableHead className="w-[20%]">Salary</TableHead>
              <TableHead className="w-[20%]">Type</TableHead>
              <TableHead className="w-[20%]">Status</TableHead>
              <TableHead className="w-[25%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((cat: Job) => (
              <motion.tr
                key={cat.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b"
              >
                <TableCell className="font-medium">{cat.title}</TableCell>
                <TableCell className="font-medium">
                  {cat.experienceLevel}
                </TableCell>
                <TableCell className="font-medium">{cat.salaryRange}</TableCell>
                <TableCell className="font-medium">
                  {cat.employmentType}
                </TableCell>
                <TableCell className="font-medium">{cat.isActive}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(cat.id)}
                  >
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(cat.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {jobs.map((cat: Job) => (
          <Card key={cat.id} className="shadow-md">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-lg">{cat.title}</h3>
              <h3 className="font-semibold text-lg">{cat.experienceLevel}</h3>
              <h3 className="font-semibold text-lg">{cat.salaryRange}</h3>
              <h3 className="font-semibold text-lg">{cat.employmentType}</h3>
              <h3 className="font-semibold text-lg">{cat.isActive}</h3>
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
