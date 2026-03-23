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
import { ExternalLink, Eye, X, MapPin, User, Mail, Phone, Calendar, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Enquiry {
  leadId: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  whatsapp: string;
  source: string;
  state?: string;
  city?: string;
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
              <TableHead className="w-[20%]">Email</TableHead>
              <TableHead className="w-[12%]">Phone</TableHead>
              <TableHead className="w-[20%]">Message</TableHead>
              <TableHead className="w-[10%] text-center">Source</TableHead>
              <TableHead className="w-[10%] text-center">Date</TableHead>
              <TableHead className="w-[8%] text-center">Whatsapp</TableHead>
              <TableHead className="w-[5%] text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enquiry.map((enq) => (
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

                  <TableCell className="font-medium text-gray-700 max-w-[200px] truncate">
                    {enq.message}
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
                  <TableCell className="text-center">
                    <button
                      onClick={() => toggleExpand(enq.leadId)}
                      title="View Details"
                      className="p-1.5 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-md transition"
                    >
                      <Eye size={18} />
                    </button>
                  </TableCell>
                </motion.tr>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-4">
        {enquiry.map((enq) => (
            <Card key={enq.leadId} className="shadow-md border border-gray-200">
              <CardContent className="p-4 space-y-1 relative">
                <button
                  onClick={() => toggleExpand(enq.leadId)}
                  className="absolute top-4 right-4 p-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-full transition"
                >
                  <Eye size={18} />
                </button>
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
                <p className="truncate max-w-[85%]">
                  <span className="font-semibold">Message:</span> {enq.message}
                </p>
                <div className="pt-2">
                    <a
                      href={enq.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1 text-sm"
                    >
                      <ExternalLink size={16} />
                      Visit Source
                    </a>
                </div>
              </CardContent>
            </Card>
        ))}
      </div>

      <AnimatePresence>
        {Object.entries(expandedRows).map(([id, isExpanded]) => {
          if (!isExpanded) return null;
          const enq = enquiry.find((e) => e.leadId === id);
          if (!enq) return null;

          return (
            <div key={`modal-${id}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Enquiry Details</h3>
                    <p className="text-sm text-gray-500 font-medium">#{enq.leadId}</p>
                  </div>
                  <button
                    onClick={() => toggleExpand(id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6">
                  {/* Lead Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-orange-50/30 p-5 rounded-xl border border-orange-100/50">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm text-orange-600"><User size={18} /></div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Full Name</p>
                        <p className="font-medium text-gray-900">{enq.name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600"><Phone size={18} /></div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Phone Number</p>
                        <p className="font-medium text-gray-900">{enq.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600"><Mail size={18} /></div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Email Address</p>
                        <p className="font-medium text-gray-900 break-all">{enq.email || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm text-purple-600"><Calendar size={18} /></div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Submitted On</p>
                        <p className="font-medium text-gray-900">{enq.createdAt}</p>
                      </div>
                    </div>
                  </div>

                  {/* Location Info (If Available) */}
                  {(enq.state || enq.city) && (
                    <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div className="p-2 bg-white rounded-lg shadow-sm text-rose-500"><MapPin size={18} /></div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Location Data</p>
                        <p className="font-medium text-gray-900 mt-0.5">
                          {enq.city ? `${enq.city}, ` : ""}
                          {enq.state ? enq.state : ""}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Message Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-900 font-semibold">
                      <MessageSquare size={18} className="text-gray-400" />
                      Client Message
                    </div>
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">
                      {enq.message}
                    </div>
                  </div>

                  {/* Footer Meta */}
                  <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100 text-sm">
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full font-medium text-gray-600">
                      WhatsApp: {enq.whatsapp}
                    </span>
                    <a
                      href={enq.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full font-medium transition"
                    >
                      <ExternalLink size={14} /> Full Source Link
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
