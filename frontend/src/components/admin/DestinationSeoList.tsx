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
export interface DestinationSeo {
  _id: string;
  categoryId: {
    name: string;
    _id: string;
    slug: string;
  };
  destinationId: {
    name: string;
    _id: string;
    state: string;
  };
  metaTitle: string;
  excerpt?: string;
  metaDescription: string;
  keywords: string[];
  url: string;
}
interface AuthorsTableProps {
  destinationSeo: DestinationSeo[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function DestinationSeoList({
  destinationSeo,
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
              <TableHead className="w-[5%]">Sr.no</TableHead>
              <TableHead className="w-[20%]">Title</TableHead>
              <TableHead className="w-[20%]">Description</TableHead>
              <TableHead className="w-[20%]">Excerpt</TableHead>
              <TableHead className="w-[20%]">Keywords</TableHead>
              <TableHead className="w-[20%]">Category</TableHead>
              <TableHead className="w-[20%]">Destination</TableHead>
              <TableHead className="w-[25%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {destinationSeo.map((cat: DestinationSeo, i: number) => (
              <motion.tr
                key={cat._id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b"
              >
                <TableCell className="font-medium">
                  {destinationSeo.length - i}
                </TableCell>
                <TableCell className="font-medium">{cat.metaTitle}</TableCell>
                <TableCell className="font-medium ">
                  {cat.metaDescription.slice(0, 50)}
                </TableCell>
                <TableCell className="font-medium ">
                  {cat.excerpt?.slice(0, 20)}
                </TableCell>
                <TableCell className="font-medium">
                  {cat.keywords.join(", ")}
                </TableCell>
                <TableCell className="font-medium">
                  {cat.categoryId.name}
                </TableCell>
                <TableCell className="font-medium">
                  {cat.destinationId.name}
                </TableCell>
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
        {destinationSeo.map((cat: DestinationSeo, i: number) => (
          <Card key={cat._id} className="shadow-md">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-sm">
                {destinationSeo.length - i}
              </h3>
              <h3 className="font-semibold text-lg">{cat.metaTitle}</h3>
              <h3 className=" text-lg">{cat.metaDescription}</h3>
              <h3 className=" text-lg">{cat.excerpt}</h3>
              <h3 className="text-lg">{cat.keywords.join(", ")} </h3>
              <h3 className=" text-lg">{cat.categoryId.name}</h3>
              <h3 className=" text-lg">{cat.destinationId.state}</h3>
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
