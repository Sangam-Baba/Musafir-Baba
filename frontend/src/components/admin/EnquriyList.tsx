"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface Enquiry {
  leadId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  whatsapp: string;
  source: string;
  createdAt: string;
}

interface EnquiryTableProps {
  enquiry: Enquiry[];
}

export default function EnquiryList({ enquiry }: EnquiryTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-[8%] text-center">Lead ID</TableHead>
              <TableHead className="w-[12%]">Name</TableHead>
              <TableHead className="w-[25%]">Email</TableHead>
              <TableHead className="w-[10%]">Phone</TableHead>
              <TableHead className="w-[25%]">Message</TableHead>
              <TableHead className="w-[10%] text-center">Source</TableHead>
              <TableHead className="w-[10%] text-center">Date</TableHead>
              <TableHead className="w-[8%] text-center">Whatsapp</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {enquiry.map((enq) => {
              const isExpanded = expandedRows[enq.leadId];
              const message =
                enq.message.length > 100 && !isExpanded
                  ? `${enq.message.slice(0, 30)}...`
                  : enq.message;

              return (
                <motion.tr
                  key={enq.leadId}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <TableCell className="text-center font-semibold text-gray-700">
                    {enq.leadId}
                  </TableCell>

                  <TableCell className="font-medium truncate max-w-[120px]">
                    {enq.name}
                  </TableCell>
                  <TableCell className="font-medium truncate max-w-[150px]">
                    {enq.email}
                  </TableCell>
                  <TableCell className="font-medium">{enq.phone}</TableCell>

                  <TableCell className="font-medium text-gray-700 max-w-[300px]">
                    <span>{message}</span>
                    {enq.message.length > 120 && (
                      <button
                        onClick={() => toggleExpand(enq.leadId)}
                        className="ml-2 text-blue-600 text-sm font-medium hover:underline focus:outline-none"
                      >
                        {isExpanded ? "Read less" : "Read more"}
                      </button>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    <a
                      href={enq.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center justify-center gap-1"
                    >
                      <ExternalLink size={16} />
                      Visit
                    </a>
                  </TableCell>

                  <TableCell className="text-center">{enq.createdAt}</TableCell>
                  <TableCell className="text-center">{enq.whatsapp}</TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {enquiry.map((enq) => {
          const isExpanded = expandedRows[enq.leadId];
          const message =
            enq.message.length > 100 && !isExpanded
              ? `${enq.message.slice(0, 120)}...`
              : enq.message;

          return (
            <Card key={enq.leadId} className="shadow-md border border-gray-200">
              <CardContent className="p-4 space-y-1">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold">Lead ID:</span> {enq.leadId}
                </p>
                <p>
                  <span className="font-semibold">Name:</span> {enq.name}
                </p>
                <p>
                  <span className="font-semibold">Email:</span> {enq.email}
                </p>
                <p>
                  <span className="font-semibold">Phone:</span> {enq.phone}
                </p>
                <p>
                  <span className="font-semibold">Message:</span> {message}{" "}
                  {enq.message.length > 120 && (
                    <button
                      onClick={() => toggleExpand(enq.leadId)}
                      className="ml-2 text-blue-600 text-sm font-medium hover:underline focus:outline-none"
                    >
                      {isExpanded ? "Read less" : "Read more"}
                    </button>
                  )}
                </p>
                <a
                  href={enq.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm"
                >
                  <ExternalLink size={16} />
                  Visit Source
                </a>
                <p>
                  <span className="font-semibold">Date:</span> {enq.createdAt}
                </p>
                <p>
                  <span className="font-semibold">Whatsapp:</span>{" "}
                  {enq.whatsapp}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
