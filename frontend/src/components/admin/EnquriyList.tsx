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
import { ExternalLink, Eye, X, MapPin, User, Mail, Phone, Calendar, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

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
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  // Pagination states & values
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalItems = enquiry.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedData = enquiry.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="w-full space-y-4">
      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 border-b border-slate-100">
              <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center w-[8%]">Lead ID</TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-[15%]">Name</TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-[20%]">Email</TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-[12%]">Phone</TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-[20%]">Message</TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center w-[10%]">Source</TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center w-[10%]">Date</TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center w-[10%]">Whatsapp</TableHead>
              <TableHead className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right w-[5%]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((enq) => (
              <TableRow key={enq.leadId} className="group hover:bg-slate-50/80 border-b border-slate-50 last:border-0 transition-colors duration-300 ease-in-out">
                <TableCell className="text-center font-mono text-[13px] font-bold text-[#FE5300] py-2 px-4">
                  {enq.leadId}
                </TableCell>
                <TableCell className="py-2 px-4 font-semibold text-slate-700 text-[13px] max-w-[120px] sm:max-w-[160px]">
                  <div className="transition-transform duration-300 ease-in-out group-hover:translate-x-[1px] sentence-case truncate block w-full" title={enq.name}>
                    {enq.name}
                  </div>
                </TableCell>
                <TableCell className="py-2 px-4 max-w-[120px] sm:max-w-[160px]">
                  <span className="font-mono text-[10px] text-slate-400 lowercase truncate block w-full" title={enq.email}>
                    {enq.email}
                  </span>
                </TableCell>
                <TableCell className="py-2 px-4 max-w-[110px] sm:max-w-[130px]">
                  <span className="font-semibold text-slate-500 text-[11px] font-mono truncate block w-full" title={enq.phone}>
                    {enq.phone}
                  </span>
                </TableCell>
                <TableCell className="py-2 px-4 max-w-[160px] sm:max-w-[200px]">
                  <span className="text-[13px] font-medium text-slate-600 truncate block w-full" title={enq.message}>
                    {enq.message}
                  </span>
                </TableCell>
                <TableCell className="text-center py-2 px-4">
                  <a
                    href={enq.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#FE5300] transition-colors duration-300 ease-in-out group/icon"
                  >
                    <ExternalLink className="h-3.5 w-3.5 opacity-40 group-hover/icon:opacity-100 group-hover/icon:scale-110 transition-all duration-300 ease-in-out" />
                    Visit
                  </a>
                </TableCell>
                <TableCell className="text-center text-[11px] font-semibold text-slate-500 py-2 px-4">
                  {enq.createdAt}
                </TableCell>
                <TableCell className="text-center py-2 px-4">
                  <span className="inline-flex items-center justify-center bg-slate-50 text-slate-500 text-[10px] font-black px-2.5 py-0.5 rounded-md border border-slate-100 uppercase tracking-widest transition-all duration-300 ease-in-out">
                    {enq.whatsapp}
                  </span>
                </TableCell>
                <TableCell className="text-right py-2 px-4">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedEnquiry(enq)}
                    className="inline-flex items-center justify-center h-7 w-7 p-0 rounded-md text-slate-400 hover:text-[#FE5300] hover:bg-orange-50 transition-all duration-300 ease-in-out group/icon2"
                  >
                    <Eye className="h-4 w-4 opacity-40 group-hover/icon2:opacity-100 group-hover/icon2:scale-110 transition-all duration-300 ease-in-out" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-3">
        {paginatedData.map((enq) => (
          <Card key={enq.leadId} className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
            <CardContent className="p-4 relative">
              <Button
                variant="ghost"
                onClick={() => setSelectedEnquiry(enq)}
                className="absolute top-3 right-3 h-7 w-7 p-0 rounded-md text-slate-400 hover:text-[#FE5300] hover:bg-orange-50 transition-all duration-300 ease-in-out"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <div className="space-y-1.5">
                <span className="font-mono text-[11px] font-bold text-[#FE5300] block">{enq.leadId}</span>
                <h4 className="text-[14px] font-bold text-slate-800 sentence-case leading-tight">{enq.name}</h4>
                <div className="grid grid-cols-2 gap-1 pt-1 text-[11px] text-slate-500 font-medium">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none mb-0.5">Email</span>
                    <span className="font-mono truncate block max-w-[140px] lowercase">{enq.email || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none mb-0.5">Phone</span>
                    <span>{enq.phone}</span>
                  </div>
                </div>
                <div className="pt-1.5 border-t border-slate-50">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none mb-0.5">Message</span>
                  <p className="text-[12px] text-slate-600 font-medium truncate max-w-[85%]">{enq.message}</p>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="inline-flex items-center justify-center bg-slate-50 text-slate-500 text-[10px] font-black px-2.5 py-0.5 rounded-md border border-slate-100 uppercase tracking-widest">
                    WA: {enq.whatsapp}
                  </span>
                  <a
                    href={enq.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#FE5300] bg-orange-50 hover:bg-[#FE5300]/90 px-2 py-0.5 rounded transition-all duration-300"
                  >
                    <ExternalLink size={10} /> Visit Source
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-2 py-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Showing {totalItems > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg border-slate-200 transition-colors duration-300 ease-in-out bg-white hover:bg-slate-50"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={activePage <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1 px-4">
               {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                 let pageNum = activePage;
                 if (totalPages <= 5) pageNum = i + 1;
                 else if (activePage <= 3) pageNum = i + 1;
                 else if (activePage >= totalPages - 2) pageNum = totalPages - 4 + i;
                 else pageNum = activePage - 2 + i;

                 if (pageNum > totalPages) return null;

                 return (
                   <Button
                     key={pageNum}
                     variant={activePage === pageNum ? "default" : "ghost"}
                     size="sm"
                     className={`h-8 w-8 p-0 rounded-lg transition-all duration-300 ease-in-out ${activePage === pageNum ? 'bg-[#FE5300] hover:bg-[#FE5300] text-white font-black' : 'text-slate-600 hover:text-[#FE5300] hover:bg-orange-50'}`}
                     onClick={() => setCurrentPage(pageNum)}
                   >
                     {pageNum}
                   </Button>
                 );
               })}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg border-slate-200 transition-colors duration-300 ease-in-out bg-white hover:bg-slate-50"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={activePage >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedEnquiry && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
            {/* Backdrop clickable overlay */}
            <div 
              className="absolute inset-0 cursor-pointer"
              onClick={() => setSelectedEnquiry(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="relative z-10 bg-white h-full w-full max-w-[480px] sm:max-w-[540px] shadow-2xl flex flex-col overflow-hidden border-l border-slate-100"
            >
              <div className="px-5 py-4 border-b flex items-center justify-between bg-slate-50/50 border-slate-100">
                <div className="flex flex-col">
                  <h3 className="text-[14px] font-bold text-slate-800 leading-tight">Enquiry Details</h3>
                  <span className="text-[10px] text-slate-400 font-mono mt-0.5 lowercase">ID: {selectedEnquiry.leadId}</span>
                </div>
                <button 
                  onClick={() => setSelectedEnquiry(null)} 
                  className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors duration-300 ease-in-out"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-6 flex-1 max-h-full">
                {/* Lead Contact Info Block */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-2">
                    <User size={12} className="text-[#FE5300]" />
                    Lead Information
                  </h4>
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-4">
                     <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Full Name</span>
                        <span className="text-[12px] font-bold text-slate-700 sentence-case">{selectedEnquiry.name}</span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Phone Number</span>
                        <span className="text-[12px] font-semibold text-slate-700 font-mono">{selectedEnquiry.phone}</span>
                     </div>
                     <div className="flex flex-col col-span-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Email Address</span>
                        <span className="text-[12px] font-semibold text-slate-700 font-mono truncate">{selectedEnquiry.email || "N/A"}</span>
                     </div>
                  </div>
                </div>

                {/* Location data if available */}
                {(selectedEnquiry.state || selectedEnquiry.city) && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-2">
                      <MapPin size={12} className="text-[#FE5300]" />
                      Location Details
                    </h4>
                    <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                      <div className="p-1.5 bg-rose-50 text-rose-500 rounded">
                        <MapPin size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Geography</span>
                        <span className="text-[12px] font-bold text-slate-700">
                          {selectedEnquiry.city ? `${selectedEnquiry.city}, ` : ""}
                          {selectedEnquiry.state || ""}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message Section */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center gap-2">
                    <MessageSquare size={12} className="text-[#FE5300]" />
                    Client Inquiry
                  </h4>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 leading-relaxed text-[13px] whitespace-pre-wrap font-medium">
                    {selectedEnquiry.message}
                  </div>
                </div>

                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500">
                    WhatsApp: {selectedEnquiry.whatsapp}
                  </span>
                  <a
                    href={selectedEnquiry.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-[#FE5300] hover:bg-[#FE5300] hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ease-in-out group/visit"
                  >
                    <ExternalLink size={12} className="group-hover/visit:scale-110 transition-transform duration-300" />
                    Visit Source
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
