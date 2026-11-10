"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bot,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plane,
  User,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FleetEmptyState, FleetPill, fleetTh, fleetTone } from "@/components/admin/fleet/FleetUI";
import { cn } from "@/lib/utils";

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

export type EnquiryType = "visa" | "chatbot" | "general";

/**
 * Display-only classification. "Visa" uses the same rule as the dashboard's
 * visa-vs-booking chart (source contains "visa"); chatbot leads are the ones
 * the chatbot writes with a "Chatbot Enquiry" message prefix.
 */
export function enquiryType(e: { source?: string; message?: string }): EnquiryType {
  if (/visa/i.test(e.source ?? "")) return "visa";
  if (/^\s*chatbot enquiry/i.test(e.message ?? "")) return "chatbot";
  return "general";
}

const TYPE_META: Record<EnquiryType, { label: string; tone: string; icon: React.ElementType }> = {
  visa: { label: "Visa", tone: fleetTone.violet, icon: Plane },
  chatbot: { label: "Chatbot", tone: fleetTone.sky, icon: Bot },
  general: { label: "Website", tone: fleetTone.orange, icon: Globe },
};

/** Short, readable form of the source URL (path only), falling back to the raw value. */
function sourceLabel(source?: string) {
  if (!source) return "";
  try {
    const u = new URL(source);
    const path = u.pathname === "/" ? u.hostname.replace(/^www\./, "") : u.pathname;
    return decodeURIComponent(path);
  } catch {
    return source;
  }
}

const isLink = (s?: string) => !!s && /^https?:\/\//i.test(s);

/** "2026-11-03" -> "03 Nov 2026" (falls back to the original string). */
function prettyDate(d?: string) {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  const date = new Date(y, m - 1, day);
  return Number.isNaN(date.getTime())
    ? d
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const initials = (name?: string) =>
  (name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("") || "?";

const AVATAR_TONES = [
  "bg-orange-50 text-orange-600 ring-orange-100",
  "bg-sky-50 text-sky-600 ring-sky-100",
  "bg-violet-50 text-violet-600 ring-violet-100",
  "bg-emerald-50 text-emerald-600 ring-emerald-100",
  "bg-amber-50 text-amber-600 ring-amber-100",
  "bg-rose-50 text-rose-600 ring-rose-100",
];
const avatarTone = (seed: string) =>
  AVATAR_TONES[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];

const digitsOnly = (phone?: string) => (phone ?? "").replace(/\D/g, "");

function TypePill({ enq }: { enq: Enquiry }) {
  const meta = TYPE_META[enquiryType(enq)];
  return (
    <FleetPill className={meta.tone} dot={false}>
      <span className="inline-flex items-center gap-1">
        <meta.icon size={11} />
        {meta.label}
      </span>
    </FleetPill>
  );
}

function WhatsAppPill({ value }: { value: string }) {
  const yes = value === "Yes";
  return <FleetPill className={yes ? fleetTone.emerald : fleetTone.slate}>{yes ? "Opted in" : "No"}</FleetPill>;
}

export default function EnquiryList({ enquiry }: EnquiryTableProps) {
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Pagination states & values
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalItems = enquiry.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedData = enquiry.slice(startIndex, startIndex + itemsPerPage);

  const copy = (value: string, key: string) => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(value).then(
      () => {
        setCopied(key);
        setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
      },
      () => {}
    );
  };

  if (totalItems === 0) {
    return <FleetEmptyState icon={MessageSquare} title="No enquiries found" hint="Try a different search or type filter." />;
  }

  return (
    <div className="w-full">
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100 bg-slate-50/60 hover:bg-slate-50/60">
              <TableHead className={cn(fleetTh, "w-[9%] pl-4")}>Lead</TableHead>
              <TableHead className={cn(fleetTh, "w-[22%]")}>Contact</TableHead>
              <TableHead className={cn(fleetTh, "w-[28%]")}>Message</TableHead>
              <TableHead className={cn(fleetTh, "w-[16%]")}>Source</TableHead>
              <TableHead className={cn(fleetTh, "w-[11%]")}>Received</TableHead>
              <TableHead className={cn(fleetTh, "w-[9%]")}>WhatsApp</TableHead>
              <TableHead className={cn(fleetTh, "w-[5%] pr-4 text-right")}>
                <span className="sr-only">Action</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((enq) => (
              <TableRow
                key={enq.leadId}
                onClick={() => setSelectedEnquiry(enq)}
                className="group cursor-pointer border-b border-slate-50 transition-colors last:border-0 hover:bg-orange-50/30"
              >
                <TableCell className="py-3 pl-4 align-top">
                  <span className="font-mono text-[12px] font-semibold text-[#FE5300]">{enq.leadId}</span>
                </TableCell>
                <TableCell className="max-w-0 py-3 align-top">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-inset",
                        avatarTone(enq.leadId)
                      )}
                    >
                      {initials(enq.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium capitalize text-slate-900" title={enq.name}>
                        {enq.name}
                      </p>
                      <p className="truncate text-[11px] text-slate-500" title={enq.phone}>
                        {enq.phone}
                      </p>
                      {enq.email && (
                        <p className="truncate text-[11px] text-slate-400" title={enq.email}>
                          {enq.email}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="max-w-0 py-3 align-top">
                  <div className="mb-1">
                    <TypePill enq={enq} />
                  </div>
                  <p className="line-clamp-2 whitespace-normal text-[12px] leading-relaxed text-slate-600" title={enq.message}>
                    {enq.message}
                  </p>
                </TableCell>
                <TableCell className="max-w-0 py-3 align-top">
                  {isLink(enq.source) ? (
                    <a
                      href={enq.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="group/src inline-flex max-w-full items-center gap-1 text-[12px] text-slate-500 transition-colors hover:text-[#FE5300]"
                      title={enq.source}
                    >
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-50 group-hover/src:opacity-100" />
                      <span className="truncate">{sourceLabel(enq.source)}</span>
                    </a>
                  ) : (
                    <span className="block truncate text-[12px] text-slate-400" title={enq.source}>
                      {enq.source || "—"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-3 align-top text-[12px] tabular-nums text-slate-600">
                  {prettyDate(enq.createdAt)}
                </TableCell>
                <TableCell className="py-3 align-top">
                  <WhatsAppPill value={enq.whatsapp} />
                </TableCell>
                <TableCell className="py-3 pr-4 text-right align-top">
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEnquiry(enq);
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md p-0 text-slate-400 transition-colors hover:bg-orange-50 hover:text-[#FE5300]"
                    aria-label={`View enquiry ${enq.leadId}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view */}
      <div className="divide-y divide-slate-100 md:hidden">
        {paginatedData.map((enq) => (
          <button
            key={enq.leadId}
            type="button"
            onClick={() => setSelectedEnquiry(enq)}
            className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-orange-50/30"
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-inset",
                avatarTone(enq.leadId)
              )}
            >
              {initials(enq.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[13px] font-medium capitalize text-slate-900">{enq.name}</p>
                <span className="shrink-0 font-mono text-[11px] font-semibold text-[#FE5300]">{enq.leadId}</span>
              </div>
              <p className="truncate text-[11px] text-slate-500">
                {enq.phone}
                {enq.email ? ` · ${enq.email}` : ""}
              </p>
              <p className="mt-1 line-clamp-2 text-[12px] text-slate-600">{enq.message}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <TypePill enq={enq} />
                <WhatsAppPill value={enq.whatsapp} />
                <span className="ml-auto text-[11px] tabular-nums text-slate-400">{prettyDate(enq.createdAt)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-slate-500">
          Showing {totalItems > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 rounded-md border-slate-200 bg-white p-0 hover:bg-slate-50"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={activePage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1 px-1">
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
                     className={`h-8 min-w-8 rounded-md px-2 text-[12px] tabular-nums ${activePage === pageNum ? 'bg-[#FE5300] font-semibold text-white hover:bg-[#FE5300]' : 'text-slate-600 hover:bg-orange-50 hover:text-[#FE5300]'}`}
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
              className="h-8 w-8 rounded-md border-slate-200 bg-white p-0 hover:bg-slate-50"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={activePage >= totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedEnquiry && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[2px]">
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
              className="relative z-10 flex h-full w-full max-w-[480px] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl sm:max-w-[520px]"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ring-1 ring-inset",
                      avatarTone(selectedEnquiry.leadId)
                    )}
                  >
                    {initials(selectedEnquiry.name)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold capitalize text-slate-900">{selectedEnquiry.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] font-semibold text-[#FE5300]">{selectedEnquiry.leadId}</span>
                      <TypePill enq={selectedEnquiry} />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEnquiry(null)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-3 gap-2 border-b border-slate-100 px-5 py-3">
                <a
                  href={selectedEnquiry.phone ? `tel:${selectedEnquiry.phone.replace(/\s+/g, "")}` : undefined}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md border border-slate-200 py-2 text-[12px] font-medium text-slate-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#FE5300]",
                    !selectedEnquiry.phone && "pointer-events-none opacity-40"
                  )}
                >
                  <Phone size={13} /> Call
                </a>
                <a
                  href={digitsOnly(selectedEnquiry.phone) ? `https://wa.me/${digitsOnly(selectedEnquiry.phone)}` : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md border border-slate-200 py-2 text-[12px] font-medium text-slate-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700",
                    !digitsOnly(selectedEnquiry.phone) && "pointer-events-none opacity-40"
                  )}
                >
                  <MessageSquare size={13} /> WhatsApp
                </a>
                <a
                  href={selectedEnquiry.email ? `mailto:${selectedEnquiry.email}` : undefined}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md border border-slate-200 py-2 text-[12px] font-medium text-slate-700 transition-colors hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700",
                    !selectedEnquiry.email && "pointer-events-none opacity-40"
                  )}
                >
                  <Mail size={13} /> Email
                </a>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto p-5">
                {/* Contact */}
                <section>
                  <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <User size={12} className="text-[#FE5300]" /> Contact
                  </h4>
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200/80">
                    {[
                      { key: "phone", icon: Phone, label: "Phone", value: selectedEnquiry.phone },
                      { key: "email", icon: Mail, label: "Email", value: selectedEnquiry.email },
                    ].map((row) => (
                      <div key={row.key} className="flex items-center gap-3 px-3 py-2.5">
                        <row.icon size={14} className="shrink-0 text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-slate-500">{row.label}</p>
                          <p className="truncate text-[13px] font-medium text-slate-800">{row.value || "N/A"}</p>
                        </div>
                        {row.value && (
                          <button
                            type="button"
                            onClick={() => copy(row.value, row.key)}
                            className="flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Copy size={12} /> {copied === row.key ? "Copied" : "Copy"}
                          </button>
                        )}
                      </div>
                    ))}
                    {(selectedEnquiry.state || selectedEnquiry.city) && (
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <MapPin size={14} className="shrink-0 text-slate-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-slate-500">Location</p>
                          <p className="truncate text-[13px] font-medium text-slate-800">
                            {selectedEnquiry.city ? `${selectedEnquiry.city}, ` : ""}
                            {selectedEnquiry.state || ""}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Message */}
                <section>
                  <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <MessageSquare size={12} className="text-[#FE5300]" /> Message
                  </h4>
                  <div className="whitespace-pre-wrap rounded-lg border border-slate-200/80 bg-slate-50/60 p-4 text-[13px] leading-relaxed text-slate-700">
                    {selectedEnquiry.message}
                  </div>
                </section>

                {/* Details */}
                <section>
                  <h4 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                    <Calendar size={12} className="text-[#FE5300]" /> Details
                  </h4>
                  <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200/80 text-[13px]">
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <dt className="text-slate-500">Received</dt>
                      <dd className="font-medium tabular-nums text-slate-800">{prettyDate(selectedEnquiry.createdAt)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <dt className="text-slate-500">WhatsApp updates</dt>
                      <dd><WhatsAppPill value={selectedEnquiry.whatsapp} /></dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <dt className="shrink-0 text-slate-500">Source page</dt>
                      <dd className="min-w-0">
                        {isLink(selectedEnquiry.source) ? (
                          <a
                            href={selectedEnquiry.source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-full items-center gap-1 font-medium text-[#FE5300] hover:underline"
                            title={selectedEnquiry.source}
                          >
                            <span className="truncate">{sourceLabel(selectedEnquiry.source)}</span>
                            <ExternalLink size={12} className="shrink-0" />
                          </a>
                        ) : (
                          <span className="block truncate font-medium text-slate-800">{selectedEnquiry.source || "N/A"}</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
