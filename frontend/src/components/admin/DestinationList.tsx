"use client";

import { useState } from "react";
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
interface Destination {
  id: string;
  name: string;
  country: string;
  state: string;
  url: string;
}
interface DestinationTableProps {
  destinations: Destination[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function DestinationList({
  destinations,
  onEdit,
  onDelete,
}: DestinationTableProps) {
  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table className="rounded-2xl shadow-md overflow-hidden">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[20%]">Name</TableHead>
              <TableHead className="w-[35%]">Country</TableHead>
              <TableHead className="w-[35%]">State</TableHead>
              <TableHead className="w-[20%]">URL</TableHead>
              <TableHead className="w-[25%] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {destinations.map((dest) => (
              <motion.tr
                key={dest.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b"
              >
                <TableCell className="font-medium">{dest.name}</TableCell>
                <TableCell className="truncate max-w-[250px]">
                  {dest.country.charAt(0).toUpperCase() + dest.country.slice(1)}
                </TableCell>
                <TableCell className="truncate max-w-[250px]">
                  {dest.state.charAt(0).toUpperCase() + dest.state.slice(1)}
                </TableCell>
                <TableCell>
                  <a
                    href={dest.url}
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
                    onClick={() => onEdit(dest.id)}
                  >
                    <Edit className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(dest.id)}
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
        {destinations.map((dest) => (
          <Card key={dest.id} className="shadow-md">
            <CardContent className="p-4 space-y-2">
              <h3 className="font-semibold text-lg">{dest.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {dest.country}
              </p>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {dest.state}
              </p>
              <a
                href={dest.url}
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
                  onClick={() => onEdit(dest.id)}
                >
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => onDelete(dest.id)}
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
