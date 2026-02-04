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
import { PopupInterface } from "@/app/admin/coupon/popup";
import Link from "next/link";

interface AuthorsTableProps {
  allpopups: PopupInterface[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function PopupList({
  allpopups,
  onEdit,
  onDelete,
}: AuthorsTableProps) {
  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table className="rounded-2xl shadow-md overflow-hidden">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[20%]">Button Title</TableHead>
              <TableHead className="w-[20%]">Button Link</TableHead>
              <TableHead className="w-[20%]">Image Link</TableHead>
              <TableHead className="w-[20%]">Page</TableHead>
              <TableHead className="w-[20%]">Status</TableHead>
              <TableHead className="w-[25%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allpopups?.map((cat: PopupInterface) => (
              <motion.tr
                key={cat._id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b"
              >
                <TableCell className="font-medium">
                  {cat.button?.title}
                </TableCell>
                <TableCell className="font-medium ">
                  <Link href={cat.button?.url}>
                    <ExternalLink className="w-4 h-4 mr-1" />
                  </Link>
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={cat.coverImage?.url}>
                    <ExternalLink className="w-4 h-4 mr-1" />
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{cat.page}</TableCell>
                <TableCell className="font-medium">
                  {cat.status === "published" ? "Active" : "Inactive"}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(cat._id)}
                  >
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(cat._id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                  </Button>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {allpopups?.map((cat: PopupInterface) => (
          <Card key={cat._id} className="shadow-md">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-lg">{cat.button?.title}</h3>
              <h3 className="font-semibold text-lg">
                <Link href={cat.button?.url}>
                  <ExternalLink className="w-4 h-4 mr-1" />
                </Link>
              </h3>
              <h3 className="font-semibold text-lg">
                <Link href={cat.coverImage?.url}>
                  <ExternalLink className="w-4 h-4 mr-1" />
                </Link>
              </h3>
              <h3 className="font-semibold text-lg">{cat.page}</h3>
              <h3 className="font-semibold text-lg">
                {cat.status === "published" ? "Active" : "Inactive"}
              </h3>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onEdit(cat._id)}
                >
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
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
