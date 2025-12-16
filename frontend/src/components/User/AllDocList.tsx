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
import { Edit, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
interface DocumentInterface {
  _id: string;
  name: string;
  media: {
    url: string;
  };
  relatd?: string;
}
interface AuthorsTableProps {
  documents: DocumentInterface[];
  onEdit: (id: string) => void;
}

export default function AllDocList({ documents, onEdit }: AuthorsTableProps) {
  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table className="rounded-2xl shadow-md overflow-hidden ">
          <TableHeader>
            <TableRow className="bg-muted ">
              <TableHead className="w-[30%]">Name</TableHead>
              <TableHead className="w-[30%]">Document</TableHead>
              <TableHead className="w-[25%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="bg-gray-200 ">
            {documents.map((cat: DocumentInterface) => (
              <motion.tr
                key={cat._id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b"
              >
                <TableCell className="font-medium">{cat.name}</TableCell>
                {/* <TableCell className="font-medium">{cat.media.url}</TableCell> */}
                <TableCell>
                  <a
                    href={cat.media.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink size={16} />
                    View
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
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {documents.map((cat: DocumentInterface) => (
          <Card
            key={cat._id}
            className="shadow-md border border-gray-200 bg-gary-100"
          >
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-lg">{cat.name}</h3>
              <a
                href={cat.media.url}
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
