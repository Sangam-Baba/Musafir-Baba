"use client";

import React, { useState } from "react";
import { BlogContent } from "@/components/custom/BlogContent";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Check, Calendar, Clock, Globe, Zap, ChevronRight, Info } from "lucide-react";
import Link from "next/link";

type TabKey = "description" | "faqs" | "documents" | "process" | "visasList";

interface Faq {
  question: string;
  answer: string;
}

function VisaCard({ visaCard, entry, slug }: { visaCard: any; entry: any; slug: string }) {
  const [isExpressTab, setIsExpressTab] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const govFee = isExpressTab ? (entry.expressGovernmentFee ?? visaCard.expressGovernmentFee ?? 0) : (entry.governmentFee ?? visaCard.governmentFee ?? 0);
  
  const processTime = isExpressTab ? (entry.expressVisaDuration || visaCard.expressVisaDuration) : (entry.processTime || visaCard.processTime);

  return (
    <>
      <div
        className="group relative bg-white rounded-2xl border border-gray-200/90 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-all duration-300 flex flex-col justify-between gap-3 select-none"
      >
        {/* Expanding Green Bubble Background Wrapper (stays fully still & solid when cursor is on the card) */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0">
          <div className="absolute top-0 left-0 w-6 h-6 rounded-full bg-[#87E87F]/12 -translate-x-1/2 -translate-y-1/2 scale-0 group-hover:scale-[45] transition-transform duration-700 ease-out origin-top-left" />
        </div>

        {/* Top-Left Diagonal Brand Ribbon for Visa Type */}
        <div className="absolute top-0 left-0 overflow-hidden w-20 h-20 pointer-events-none z-20 rounded-tl-2xl">
          <div className="absolute top-4 -left-7 bg-[#FE5300] text-white text-[9px] font-black py-0.5 w-24 text-center transform -rotate-45 shadow-sm uppercase tracking-widest leading-none">
            {visaCard.visaType || "e-Visa"}
          </div>
        </div>

        {/* Purpose, Type, Info Icon & Switcher */}
        <div className="relative z-30 flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 min-w-0 pl-10 md:pl-8">
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#FE5300]/10 text-[#FE5300] uppercase tracking-wider shrink-0">
              {visaCard.visaPurpose || "Tourist"}
            </span>
            
            {/* Info Button with hover Popover and click Modal fallbacks */}
            <div className="relative group/info">
              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                className="p-1 hover:bg-gray-150 rounded-full text-gray-400 hover:text-[#FE5300] transition-colors shrink-0"
                title="View Details"
              >
                <Info className="w-4.5 h-4.5" />
              </button>

              {/* Hover Popover Box (visible on hover on desktop, micro-font size for maximum readability) */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2.5 z-40 w-72 md:w-80 p-3.5 bg-white rounded-xl border border-gray-150 shadow-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 pointer-events-auto">
                {/* Micro CSS styles to force perfect rendering and tight line-heights inside parsed HTML lists */}
                <style dangerouslySetInnerHTML={{__html: `
                  .tooltip-content p, .tooltip-content li {
                    font-size: 9px !important;
                    line-height: 1.35 !important;
                    margin: 2px 0 !important;
                    color: #4b5563 !important;
                  }
                  .tooltip-content ul, .tooltip-content ol {
                    padding-left: 12px !important;
                    margin: 2px 0 !important;
                  }
                  .tooltip-content li::marker {
                    color: #FE5300 !important;
                    font-size: 8px !important;
                  }
                `}} />
                
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[7px] border-transparent border-b-white" />
                <div className="space-y-2.5 text-[9px] text-gray-600 leading-normal">
                  <div className="border-b border-gray-100 pb-1.5 flex justify-between items-center">
                    <span className="font-extrabold text-gray-800 text-[10px]">{visaCard.visaType} Specifications</span>
                    <span className="px-1.5 py-0.5 rounded text-[7px] font-bold bg-[#FE5300]/10 text-[#FE5300] uppercase">
                      {visaCard.visaPurpose}
                    </span>
                  </div>

                  {visaCard.documents && (
                    <div className="space-y-1">
                      <h5 className="font-extrabold text-gray-800 flex items-center gap-1 text-[9px]">
                        <Check className="w-2.5 h-2.5 text-green-600 shrink-0" /> Required Documents
                      </h5>
                      <div className="max-h-[75px] overflow-y-auto text-gray-500 bg-gray-50 p-2 rounded border border-gray-100/70 tooltip-content">
                        <BlogContent html={visaCard.documents} />
                      </div>
                    </div>
                  )}

                  {visaCard.processSteps && (
                    <div className="space-y-1">
                      <h5 className="font-extrabold text-gray-800 flex items-center gap-1 text-[9px]">
                        <Clock className="w-2.5 h-2.5 text-orange-600 shrink-0" /> Step-by-Step Process
                      </h5>
                      <div className="max-h-[75px] overflow-y-auto text-gray-500 bg-gray-50 p-2 rounded border border-gray-100/70 tooltip-content">
                        <BlogContent html={visaCard.processSteps} />
                      </div>
                    </div>
                  )}

                  {(!visaCard.documents && !visaCard.processSteps) && (
                    <p className="text-gray-400 text-center py-2">No additional specifications configured.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          {visaCard.isExpress && (
            <div className="flex bg-gray-100 p-0.5 rounded-full text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setIsExpressTab(false)}
                className={`px-3 py-1 rounded-full transition-all ${!isExpressTab ? "bg-white text-gray-800 shadow-xs" : "text-gray-455"}`}
              >
                Std
              </button>
              <button
                type="button"
                onClick={() => setIsExpressTab(true)}
                className={`px-3 py-1 rounded-full transition-all flex items-center gap-0.5 ${isExpressTab ? "bg-[#FE5300] text-white shadow-xs" : "text-gray-455"}`}
              >
                <Zap className="w-3 h-3 fill-current" /> Exp
              </button>
            </div>
          )}
        </div>

        {/* Metadata & Pricing Row */}
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-2">
          {/* Metadata: Validity Entry Data */}
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-y-3 gap-x-5 text-xs md:text-sm text-gray-500 font-medium w-full md:w-auto">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <span>Val: <strong className="text-gray-800 font-extrabold">{entry.visaValidity || visaCard.visaValidity || "N/A"}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              <span>Stay: <strong className="text-gray-800 font-extrabold">{entry.visaDuration || visaCard.visaDuration || "N/A"}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-gray-400 shrink-0" />
              <span>Entry: <strong className="text-gray-800 font-extrabold">{entry.entryType || visaCard.entryType || "Single"}</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400 shrink-0" />
              <span>Time: <strong className="text-gray-800 font-extrabold">{processTime || "N/A"}</strong></span>
            </span>
          </div>
          
          {/* Govt Fee */}
          <div className="self-end md:self-auto text-right shrink-0 mt-2 md:mt-0 flex flex-col items-end md:items-end">
            <span className="uppercase font-bold tracking-wider text-gray-400 text-[10px] block mb-1 md:mb-0.5">Govt Fee</span>
            <span className="text-lg md:text-2xl font-black text-[#FE5300] leading-none">₹{govFee}</span>
          </div>
        </div>
      </div>

      {/* Info Details Modal */}
      {showInfoModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowInfoModal(false);
          }}
        >
          <div 
            className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl flex flex-col gap-4 relative animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#FE5300]/10 text-[#FE5300] uppercase tracking-wider">
                  {visaCard.visaPurpose}
                </span>
                <h3 className="text-sm font-bold text-gray-900 mt-1">
                  {visaCard.visaType} Specifications & Steps
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1.5 hover:bg-gray-100 rounded-lg transition-colors leading-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-4 text-xs text-gray-700">
              {/* Documents Block */}
              {visaCard.documents && (
                <div className="space-y-2">
                  <h4 className="font-bold text-[#FE5300] text-xs border-b border-dashed border-gray-100 pb-1 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-green-600" /> Required Documents
                  </h4>
                  <div className="prose prose-sm max-w-none text-gray-600 bg-gray-50/50 p-3 rounded-xl border border-gray-100 max-h-[25vh] overflow-y-auto">
                    <BlogContent html={visaCard.documents} />
                  </div>
                </div>
              )}

              {/* Process Steps Block */}
              {visaCard.processSteps && (
                <div className="space-y-2">
                  <h4 className="font-bold text-[#FE5300] text-xs border-b border-dashed border-gray-100 pb-1 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-orange-600" /> Step-by-Step Process
                  </h4>
                  <div className="prose prose-sm max-w-none text-gray-600 bg-gray-50/50 p-3 rounded-xl border border-gray-100 max-h-[25vh] overflow-y-auto">
                    <BlogContent html={visaCard.processSteps} />
                  </div>
                </div>
              )}

              {(!visaCard.documents && !visaCard.processSteps) && (
                <p className="text-gray-400 text-center py-4">No additional details configured for this visa.</p>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="mt-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 rounded-xl transition-all text-xs"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function VisaClient({ visa }: { visa: any }) {
  const [active, setActive] = useState<TabKey>(
    visa.visas && visa.visas.length > 0 ? "visasList" : "description"
  );
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "description", label: "Visa Info" },
  ];

  if (
    visa.process && 
    (Array.isArray(visa.process) ? visa.process.length > 0 : typeof visa.process === "string" && visa.process.trim() !== "")
  ) {
    tabs.push({ key: "process", label: "Process" });
  }
  if (
    visa.documentsContent && typeof visa.documentsContent === "string" && visa.documentsContent.trim() !== ""
  ) {
    tabs.push({ key: "documents", label: "Documents" });
  }
  if (visa.faqs && visa.faqs.length > 0) {
    tabs.push({ key: "faqs", label: "FAQs" });
  }

  // Prepend visasList if visas array exists
  if (visa.visas && visa.visas.length > 0) {
    tabs.unshift({ key: "visasList", label: "Visa Types" });
  }

  return (
    <div className="w-full">
      <div className="flex md:flex-wrap w-full gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            size="lg"
            onClick={() => setActive(tab.key)}
            className={`mt-4 ${
              active === tab.key
                ? "bg-[#FE5300] hover:bg-[#FE5300] text-white"
                : "bg-white hover:bg-gray-50 text-black border border-[#FE5300]"
            }`}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="mt-8 w-full">
        {active === "visasList" && visa.visas && visa.visas.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {visa.visas.flatMap((visaCard: any, index: number) => {
              const entries = visaCard.validityEntries && visaCard.validityEntries.length > 0
                ? visaCard.validityEntries
                : [visaCard]; // Legacy fallback

              return entries.map((entry: any, eIdx: number) => (
                <VisaCard key={`${visaCard._id}-${eIdx}`} visaCard={visaCard} entry={entry} slug={visa.slug} />
              ));
            })}
          </div>
        )}

        {active === "description" && (
          <div className="rounded-xl bg-[#87E87F]/20 px-8 py-6 shadow">
            <section className="prose prose-lg max-w-none">
              <BlogContent html={visa.content} />
            </section>
          </div>
        )}

        {active === "faqs" && visa.faqs && visa.faqs.length > 0 && (
          <Accordion
            type="single"
            collapsible
            value={openItem}
            onValueChange={setOpenItem}
            className="w-full space-y-3 rounded-xl bg-[#87E87F]/20 px-4 py-6 shadow"
          >
            {visa.faqs.map((faq: Faq, index: number) => {
              const isOpen = openItem === `faq-${index}`;
              return (
                <AccordionItem
                  key={index}
                  value={`faq-${index}`}
                  className="rounded-2xl shadow-sm p-4 bg-white"
                >
                  <AccordionTrigger className="text-base md:text-lg font-semibold hover:text-[#FE5300] transition-colors hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-justify">
                    <section className="prose prose-lg max-w-none text-gray-600">
                      <BlogContent html={faq.answer} />
                    </section>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {active === "documents" && visa.documentsContent && (
          <div className="rounded-xl bg-[#87E87F]/20 px-4 py-6 shadow">
            <div 
              className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground"
              dangerouslySetInnerHTML={{ __html: visa.documentsContent }}
            />
          </div>
        )}

        {active === "process" && visa.process && (
          <div className="rounded-xl bg-[#87E87F]/20 px-4 py-6 shadow">
            <h3 className="text-lg font-semibold text-foreground mb-4">Step-by-Step Process</h3>
            {Array.isArray(visa.process) ? (
              <ul className="space-y-3">
                {visa.process.map((step: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{step}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div 
                className="prose prose-sm dark:prose-invert max-w-none text-sm text-foreground"
                dangerouslySetInnerHTML={{ __html: visa.process }} 
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
