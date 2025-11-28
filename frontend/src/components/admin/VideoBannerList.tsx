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
export interface VideoBannerType {
  _id: string;
  title: string;
  description: string;
  media: {
    url: string;
    public_id: string;
    alt: string;
    width: number;
    height: number;
    thumbnail_url: string;
  };
  metaTitle: string;
  metaDescription: string;
  related: string;
  type: string;
  link: string;
}
interface AuthorsTableProps {
  VideoBannerArray: VideoBannerType[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function VideoBannerList({
  VideoBannerArray,
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
              <TableHead className="w-[20%]">Title</TableHead>
              <TableHead className="w-[20%]">Related</TableHead>
              <TableHead className="w-[20%]">Linked Url</TableHead>
              <TableHead className="w-[20%]">Visit</TableHead>
              <TableHead className="w-[25%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {VideoBannerArray.map((cat: VideoBannerType) => (
              <motion.tr
                key={cat._id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b"
              >
                <TableCell className="font-medium">{cat.title}</TableCell>
                <TableCell className="font-medium ">{cat.related}</TableCell>
                <TableCell className="font-medium">{cat.link}</TableCell>
                <TableCell>
                  <a
                    href={cat?.media?.url}
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
        {VideoBannerArray.map((cat: VideoBannerType) => (
          <Card key={cat._id} className="shadow-md">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-lg">{cat.title}</h3>
              <h3 className="font-semibold text-lg">{cat.related}</h3>
              <h3 className="font-semibold text-lg">{cat.link}</h3>
              <a
                href={cat.media?.url}
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
