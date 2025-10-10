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
import { Edit, ExternalLink, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
interface Application {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  resumeUrl: string;
  hightestQualification: string;
  status: string;
  experience: string;
}
interface AuthorsTableProps {
  applications: Application[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

export default function ApplicationsTable({
  applications,
  onStatusChange,
  onDelete,
}: AuthorsTableProps) {
  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table className="rounded-2xl shadow-md overflow-hidden">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[20%]">Name</TableHead>
              <TableHead className="w-[20%]">Email</TableHead>
              <TableHead className="w-[20%]">Phone</TableHead>
              <TableHead className="w-[20%]">Qualification</TableHead>
              <TableHead className="w-[20%]">Experience</TableHead>
              <TableHead className="w-[20%]">Resume</TableHead>
              <TableHead className="w-[25%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((cat: Application) => (
              <motion.tr
                key={cat._id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b"
              >
                <TableCell className="font-medium">{cat.fullName}</TableCell>
                <TableCell className="font-medium">{cat.email}</TableCell>
                <TableCell className="font-medium">{cat.phone}</TableCell>
                <TableCell className="font-medium">
                  {cat.hightestQualification}
                </TableCell>
                <TableCell className="font-medium">{cat.experience}</TableCell>
                <TableCell>
                  <a
                    href={cat.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink size={16} />
                    Visit
                  </a>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <select
                    value={cat.status}
                    onChange={(e) => onStatusChange(cat._id, e.target.value)}
                    className="border border-blue-600 p-1 rounded-md  text-blue-600 hover:bg-blue-600 hover:text-white inline-flex items-center gap-1"
                  >
                    <option value="">
                      {cat.status.charAt(0).toUpperCase() + cat.status.slice(1)}
                    </option>
                    <option value="Pending">Pending</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="Shortlisted">Shortlisted</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Hired">Hired</option>
                  </select>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(cat._id)}
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
        {applications.map((cat: Application) => (
          <Card key={cat._id} className="shadow-md">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-lg">{cat.fullName}</h3>
              <h3 className="font-semibold text-lg">{cat.email}</h3>
              <h3 className="font-semibold text-lg">{cat.phone}</h3>
              <h3 className="font-semibold text-lg">
                {cat.hightestQualification}
              </h3>
              <h3 className="font-semibold text-lg">{cat.experience}</h3>
              <h3>
                <a
                  href={cat.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink size={16} />
                  Visit
                </a>
              </h3>
              <div className="flex gap-2 pt-2">
                <select
                  value={cat.status}
                  onChange={(e) => onStatusChange(cat._id, e.target.value)}
                  className="border border-blue-600 p-1 rounded-md  text-blue-600 hover:bg-blue-600 hover:text-white inline-flex items-center gap-1"
                >
                  <option value="">
                    {cat.status.charAt(0).toUpperCase() + cat.status.slice(1)}
                  </option>
                  <option value="Pending">Pending</option>
                  <option value="Reviewed">Reviewed</option>
                  <option value="Shortlisted">Shortlisted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Hired">Hired</option>
                </select>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => onDelete(cat._id)}
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
