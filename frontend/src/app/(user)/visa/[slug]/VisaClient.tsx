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

type TabKey = "description" | "faqs" | "documents" | "process" | "visasList" | "highlights" | "quickAnswer" | "whyThisVisa" | "eligibility" | "feesAndCharges" | "howToApply" | "helpfulResources" | "cta" | "rejectionReasons";

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

export default function VisaClient({ visa, sidebar, bottomContent }: { visa: any, sidebar?: React.ReactNode, bottomContent?: React.ReactNode }) {
  const [active, setActive] = useState<TabKey>(
    visa.visas && visa.visas.length > 0 ? "visasList" : "description"
  );
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);

  const tabs: { key: TabKey; label: string }[] = [];

  if (visa.visas && visa.visas.length > 0) tabs.push({ key: "visasList", label: "Visa Types" });
  if (visa.highlights && visa.highlights.trim() !== "") tabs.push({ key: "highlights", label: "Highlights" });
  if (visa.quickAnswer && visa.quickAnswer.trim() !== "") tabs.push({ key: "quickAnswer", label: "Quick Answers" });
  if (visa.whyThisVisa && visa.whyThisVisa.trim() !== "") tabs.push({ key: "whyThisVisa", label: `Why Visit ${visa.country || 'Destination'}` });
  if (visa.content) tabs.push({ key: "description", label: "Visa Overview" });
  if (visa.eligibility && visa.eligibility.trim() !== "") tabs.push({ key: "eligibility", label: "Eligibility" });
  if (visa.documentsContent && typeof visa.documentsContent === "string" && visa.documentsContent.trim() !== "") tabs.push({ key: "documents", label: "Documents Required" });
  if (visa.feesAndCharges && visa.feesAndCharges.trim() !== "") tabs.push({ key: "feesAndCharges", label: "Fees & Charges" });
  if (visa.howToApply && visa.howToApply.trim() !== "") tabs.push({ key: "howToApply", label: "How to Apply" });
  if (visa.process && (Array.isArray(visa.process) ? visa.process.length > 0 : typeof visa.process === "string" && visa.process.trim() !== "")) tabs.push({ key: "process", label: "Process" });
  if (visa.rejectionReasons && visa.rejectionReasons.length > 0) tabs.push({ key: "rejectionReasons", label: "Rejection Reasons" });
  if (visa.faqs && visa.faqs.length > 0) tabs.push({ key: "faqs", label: "FAQs" });
  if (visa.helpfulResources && visa.helpfulResources.trim() !== "") tabs.push({ key: "helpfulResources", label: "Helpful Resources" });
  if (visa.cta && visa.cta.trim() !== "") tabs.push({ key: "cta", label: "CTA" });

  return (
    <div className="w-full">
      {/* Quick Summary Rendering Before Tabs */}
      {visa.quickSummary && visa.quickSummary.trim() !== "" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 mt-4">
          <section className="prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:my-0">
            <BlogContent html={visa.quickSummary} />
          </section>
        </div>
      )}

      {/* 100% width Sticky Tab Bar Background */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] w-full mb-6">
        {/* Constrained container for the tabs matching the site width */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap w-full gap-2 pb-1">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                onClick={() => {
                  setActive(tab.key);
                  const el = document.getElementById(tab.key);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className={`shrink-0 ${
                  active === tab.key
                    ? "bg-[#FE5300] hover:bg-[#FE5300] text-white"
                    : "bg-white hover:bg-gray-50 text-black border border-[#FE5300]"
                }`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 px-4 sm:px-6 lg:px-8">
        {/* Main Content Column */}
        <article className="w-full md:w-[65%] space-y-10">
          <div className="w-full space-y-12">
        {(() => {
          const sectionHeadings: Record<string, string> = {
            highlights: "Highlights",
            quickAnswer: "Quick Answers",
            whyThisVisa: `Why Visit ${visa.country || 'Destination'}`,
            eligibility: "Eligibility",
            feesAndCharges: "Fees & Charges",
            howToApply: "How to Apply",
            helpfulResources: "Helpful Resources",
            cta: "CTA"
          };
          
          const renderDynamicSection = (key: string) => {
            if (!visa[key]) return null;
            return (
              <div id={key} key={key} className="scroll-mt-40 mb-16 pb-12 border-b border-gray-100 last:border-0">
                <h3 className="text-xl font-bold font-heading text-black mb-5">{sectionHeadings[key]}</h3>
                <section className="prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:my-0">
                  <BlogContent html={visa[key]} />
                </section>
              </div>
            );
          };

          return (
            <>
              {visa.visas && visa.visas.length > 0 && (
                <div id="visasList" className="scroll-mt-40 mb-16 pb-12 border-b border-gray-100 last:border-0">
                  <h3 className="text-xl font-bold font-heading text-black mb-5">Visa Types</h3>
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
                </div>
              )}

              {renderDynamicSection("highlights")}
              {renderDynamicSection("quickAnswer")}
              {renderDynamicSection("whyThisVisa")}

              {visa.content && (
                <div id="description" className="scroll-mt-40 mb-16 pb-12 border-b border-gray-100 last:border-0">
                  <h3 className="text-xl font-bold font-heading text-black mb-5">Visa Overview</h3>
                  <section className="prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:my-0">
                    <BlogContent html={visa.content} />
                  </section>
                </div>
              )}

              {renderDynamicSection("eligibility")}

              {visa.documentsContent && (
                <div id="documents" className="scroll-mt-40 mb-16 pb-12 border-b border-gray-100 last:border-0">
                  <h3 className="text-xl font-bold font-heading text-black mb-5">Documents Required</h3>
                  <div 
                    className="prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:my-0"
                    dangerouslySetInnerHTML={{ __html: visa.documentsContent }}
                  />
                </div>
              )}

              {renderDynamicSection("feesAndCharges")}
              {renderDynamicSection("howToApply")}

              {visa.process && (
                <div id="process" className="scroll-mt-40 mb-16 pb-12 border-b border-gray-100 last:border-0">
                  <h3 className="text-xl font-bold font-heading text-black mb-5">Step-by-Step Process</h3>
                  {Array.isArray(visa.process) ? (
                    <ul className="space-y-1">
                      {visa.process.map((step: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-[#FE5300] shrink-0 mt-0.5" />
                          <span className="text-base text-black leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div 
                      className="prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:my-0"
                      dangerouslySetInnerHTML={{ __html: visa.process }} 
                    />
                  )}
                </div>
              )}

              {visa.rejectionReasons && visa.rejectionReasons.length > 0 && (
                <div id="rejectionReasons" className="scroll-mt-40 mb-16 pb-12 border-b border-gray-100 last:border-0">
                  <h3 className="text-xl font-bold font-heading text-black mb-5">Common Rejection Reasons</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {visa.rejectionReasons.map((reason: any, idx: number) => (
                      <div key={idx} className="flex flex-col h-full border-l-2 border-red-500 pl-4 py-1">
                        <h4 className="text-base font-bold font-heading text-black flex items-center gap-2 mb-2">
                          {reason.title}
                        </h4>
                        <div className="prose prose-sm text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:my-0">
                          <BlogContent html={reason.description} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {visa.faqs && visa.faqs.length > 0 && (
                <div id="faqs" className="scroll-mt-40 mb-16 pb-12 border-b border-gray-100 last:border-0">
                  <h3 className="text-xl font-bold font-heading text-black mb-5">FAQs</h3>
                  <Accordion
                    type="single"
                    collapsible
                    value={openItem}
                    onValueChange={setOpenItem}
                    className="w-full space-y-2"
                  >
                  {visa.faqs.map((faq: Faq, index: number) => {
                    const isOpen = openItem === `faq-${index}`;
                    return (
                      <AccordionItem
                        key={index}
                        value={`faq-${index}`}
                        className="border-b border-gray-200 py-2"
                      >
                        <AccordionTrigger className="text-sm font-bold font-heading text-black hover:text-[#FE5300] transition-colors hover:no-underline text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-justify pt-3">
                          <section className="prose prose-sm max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:my-0">
                            <BlogContent html={faq.answer} />
                          </section>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                  </Accordion>
                </div>
              )}

              {renderDynamicSection("helpfulResources")}
              {renderDynamicSection("cta")}
            </>
          );
        })()}
          </div>

          {/* Render extra content passed from page below the active tab content */}
          {bottomContent}
        </article>

        {/* Sidebar Column */}
        <aside className="w-full md:w-[35%] md:sticky md:top-32 self-start space-y-6">
          {sidebar}
        </aside>
      </div>
    </div>
  );
}
