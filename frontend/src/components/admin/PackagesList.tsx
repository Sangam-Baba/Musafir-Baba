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
interface Package {
  id: string;
  name: string;
  slug: string;
  url: string;
  location: string;
  price: number;
  status: string;
}
interface PackageTableProps {
  packages: Package[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function AuthorsList({
  packages,
  onEdit,
  onDelete,
}: PackageTableProps) {
  const length = packages.length;
  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table className="rounded-2xl shadow-md overflow-hidden">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[5%]">Sr.No</TableHead>
              <TableHead className="w-[15%]">Name</TableHead>
              <TableHead className="w-[15%]">Location</TableHead>
              <TableHead className="w-[15%]">Price</TableHead>
              <TableHead className="w-[15%]">URL</TableHead>
              <TableHead className="w-[15%]">Status</TableHead>
              <TableHead className="w-[20%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.map((cat: Package, i: number) => (
              <motion.tr
                key={cat.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b"
              >
                <TableCell className="font-medium">{length - i}</TableCell>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell className="font-medium">{cat.location}</TableCell>
                <TableCell className="font-medium">{cat.price}</TableCell>
                <TableCell>
                  <a
                    href={cat.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink size={16} />
                    Visit
                  </a>
                </TableCell>
                <TableCell className="font-medium">{cat.status}</TableCell>
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
