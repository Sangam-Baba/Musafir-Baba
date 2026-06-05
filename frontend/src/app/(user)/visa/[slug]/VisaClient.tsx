"use client";

import React, { useState, useEffect, useRef } from "react";
import { BlogContent } from "@/components/custom/BlogContent";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Check, Calendar, Clock, Globe, Zap, ChevronRight, Info, AlertCircle, Lightbulb } from "lucide-react";
import Link from "next/link";
import { Testimonial } from "@/components/custom/Testimonial";
import HelpfulResources from "@/components/custom/HelpfulResources";
import VisaAtAGlance from "@/components/custom/VisaAtAGlance";

type TabKey = "description" | "faqs" | "documents" | "process" | "visasList" | "highlights" | "quickAnswer" | "whyThisVisa" | "eligibility" | "feesAndCharges" | "howToApply" | "helpfulResources" | "cta" | "rejectionReasons" | "expertTips";

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
        className="group relative bg-white rounded-2xl border border-gray-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-all duration-300 select-none shrink-0 w-[82vw] snap-center md:w-auto md:shrink"
      >
        {/* Expanding Green Bubble */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-0 left-0 w-6 h-6 rounded-full bg-[#87E87F]/12 -translate-x-1/2 -translate-y-1/2 scale-0 group-hover:scale-[45] transition-transform duration-700 ease-out origin-top-left" />
        </div>

        {/* Top-Left Ribbon */}
        <div className="absolute top-0 left-0 overflow-hidden w-20 h-20 pointer-events-none z-20 rounded-tl-2xl">
          <div className="absolute top-4 -left-7 bg-[#FE5300] text-white text-[9px] font-black py-0.5 w-24 text-center transform -rotate-45 shadow-sm uppercase tracking-widest leading-none">
            {visaCard.visaType || "e-Visa"}
          </div>
        </div>

        {/* ─── DESKTOP: single horizontal row ─── */}
        <div className="hidden md:flex items-center gap-3 px-5 py-4 relative z-10 min-h-[68px]">

          {/* Left: Purpose badge + Info btn */}
          <div className="flex items-center gap-2 pl-8 shrink-0">
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#FE5300]/10 text-[#FE5300] uppercase tracking-wider whitespace-nowrap">
              {visaCard.visaPurpose || "Tourist"}
            </span>

            {/* Info popover */}
            <div className="relative group/info">
              <button type="button" onClick={() => setShowInfoModal(true)} className="p-1 rounded-full text-gray-400 hover:text-[#FE5300] transition-colors" title="View Details">
                <Info className="w-4 h-4" />
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2.5 z-40 w-72 p-3.5 bg-white rounded-xl border border-gray-150 shadow-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 pointer-events-auto">
                <style dangerouslySetInnerHTML={{__html: `.tooltip-content p,.tooltip-content li{font-size:9px!important;line-height:1.35!important;margin:2px 0!important;color:#4b5563!important}.tooltip-content ul,.tooltip-content ol{padding-left:12px!important;margin:2px 0!important}.tooltip-content li::marker{color:#FE5300!important;font-size:8px!important}`}} />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-[7px] border-transparent border-b-white" />
                <div className="space-y-2.5 text-[9px] text-gray-600">
                  <div className="border-b border-gray-100 pb-1.5 flex justify-between items-center">
                    <span className="font-extrabold text-gray-800 text-[10px]">{visaCard.visaType} Specifications</span>
                    <span className="px-1.5 py-0.5 rounded text-[7px] font-bold bg-[#FE5300]/10 text-[#FE5300] uppercase">{visaCard.visaPurpose}</span>
                  </div>
                  {visaCard.documents && (<div className="space-y-1"><h5 className="font-extrabold text-gray-800 flex items-center gap-1 text-[9px]"><Check className="w-2.5 h-2.5 text-green-600 shrink-0" /> Required Documents</h5><div className="max-h-[75px] overflow-y-auto text-gray-500 bg-gray-50 p-2 rounded border border-gray-100/70 tooltip-content"><BlogContent html={visaCard.documents} /></div></div>)}
                  {visaCard.processSteps && (<div className="space-y-1"><h5 className="font-extrabold text-gray-800 flex items-center gap-1 text-[9px]"><Clock className="w-2.5 h-2.5 text-orange-600 shrink-0" /> Step-by-Step Process</h5><div className="max-h-[75px] overflow-y-auto text-gray-500 bg-gray-50 p-2 rounded border border-gray-100/70 tooltip-content"><BlogContent html={visaCard.processSteps} /></div></div>)}
                  {(!visaCard.documents && !visaCard.processSteps) && (<p className="text-gray-400 text-center py-2">No additional specifications configured.</p>)}
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-200 shrink-0" />

          {/* Middle: 4 info chips in 2×2 grid — always fully visible, no scroll */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 flex-1 text-xs text-gray-500 font-medium">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              Val: <strong className="text-gray-800 font-extrabold">{entry.visaValidity || visaCard.visaValidity || "N/A"}</strong>
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              Stay: <strong className="text-gray-800 font-extrabold">{entry.visaDuration || visaCard.visaDuration || "N/A"}</strong>
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              Entry: <strong className="text-gray-800 font-extrabold">
                {(() => {
                  const v = entry.entryType || visaCard.entryType || "Single";
                  return v.toLowerCase().includes("entry") ? v : `${v} Entry`;
                })()}
              </strong>
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              Time: <strong className="text-gray-800 font-extrabold">{processTime || "N/A"}</strong>
            </span>
          </div>

          {/* Express toggle */}
          {visaCard.isExpress && (
            <div className="flex bg-gray-100 p-0.5 rounded-full text-xs font-bold shrink-0">
              <button type="button" onClick={() => setIsExpressTab(false)} className={`px-3 py-1 rounded-full transition-all ${!isExpressTab ? "bg-white text-gray-800 shadow-xs" : "text-gray-400"}`}>Std</button>
              <button type="button" onClick={() => setIsExpressTab(true)} className={`px-3 py-1 rounded-full transition-all flex items-center gap-0.5 ${isExpressTab ? "bg-[#FE5300] text-white shadow-xs" : "text-gray-400"}`}><Zap className="w-3 h-3 fill-current" /> Exp</button>
            </div>
          )}

          {/* Divider */}
          <div className="w-px h-8 bg-gray-200 shrink-0" />

          {/* Right: Govt Fee */}
          <div className="text-right shrink-0">
            <span className="uppercase font-bold tracking-wider text-gray-400 text-[10px] block mb-0.5">Govt Fee</span>
            <span className="text-2xl font-black text-[#FE5300] leading-none">₹{Number(govFee).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* ─── MOBILE: compact card layout ─── */}
        <div className="flex md:hidden flex-col gap-3 px-4 py-4 relative z-10">
          {/* Top row: badge + express toggle + fee */}
          <div className="flex items-center justify-between gap-2 pl-9">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#FE5300]/10 text-[#FE5300] uppercase tracking-wider">
                {visaCard.visaPurpose || "Tourist"}
              </span>
              <button type="button" onClick={() => setShowInfoModal(true)} className="p-1 rounded-full text-gray-400 hover:text-[#FE5300] transition-colors">
                <Info className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              {visaCard.isExpress && (
                <div className="flex bg-gray-100 p-0.5 rounded-full text-[10px] font-bold">
                  <button type="button" onClick={() => setIsExpressTab(false)} className={`px-2.5 py-1 rounded-full transition-all ${!isExpressTab ? "bg-white text-gray-800 shadow-xs" : "text-gray-400"}`}>Std</button>
                  <button type="button" onClick={() => setIsExpressTab(true)} className={`px-2.5 py-1 rounded-full transition-all flex items-center gap-0.5 ${isExpressTab ? "bg-[#FE5300] text-white shadow-xs" : "text-gray-400"}`}><Zap className="w-3 h-3 fill-current" /> Exp</button>
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100" />

          {/* Info chips: 2 per row */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              Val: <strong className="text-gray-800 font-extrabold ml-0.5">{entry.visaValidity || visaCard.visaValidity || "N/A"}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              Stay: <strong className="text-gray-800 font-extrabold ml-0.5">{entry.visaDuration || visaCard.visaDuration || "N/A"}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>Entry: <strong className="text-gray-800 font-extrabold">
                {(() => {
                  const v = entry.entryType || visaCard.entryType || "Single";
                  return v.toLowerCase().includes("entry") ? v : `${v} Entry`;
                })()}
              </strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              Time: <strong className="text-gray-800 font-extrabold ml-0.5">{processTime || "N/A"}</strong>
            </span>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100" />

          {/* Fee row */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Govt Fee</span>
            <span className="text-xl font-black text-[#FE5300]">₹{Number(govFee).toLocaleString('en-IN')}</span>
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
  const [openItem, setOpenItem] = useState<string>("faq-0");
  const [showMobileCalculator, setShowMobileCalculator] = useState(false);
  // Track whether a click-scroll is in progress so observer doesn't fight it
  const isClickScrollingRef = useRef(false);
  // Refs for each tab button so we can scroll it into view when active changes
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Scroll the active tab button into view in the tab bar
  useEffect(() => {
    const btn = tabButtonRefs.current[active];
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [active]);

  let displayCost = visa.cost;
  if (visa.visas && visa.visas.length > 0) {
    let lowestGovFee = Infinity;
    visa.visas.forEach((card: any) => {
      const entries = card.validityEntries && card.validityEntries.length > 0 ? card.validityEntries : [card];
      entries.forEach((entry: any) => {
        const stdGovFee = entry.governmentFee ?? card.governmentFee;
        const expGovFee = entry.expressGovernmentFee ?? card.expressGovernmentFee;
        if (stdGovFee !== undefined && stdGovFee !== null && stdGovFee > 0 && stdGovFee < lowestGovFee) {
          lowestGovFee = stdGovFee;
          displayCost = stdGovFee;
        }
        if (expGovFee !== undefined && expGovFee !== null && expGovFee > 0 && expGovFee < lowestGovFee) {
          lowestGovFee = expGovFee;
          displayCost = expGovFee;
        }
      });
    });
  }

  const tabs: { key: TabKey; label: string }[] = [];

  const hasContent = (content: any) => {
    if (!content) return false;
    if (Array.isArray(content)) return content.length > 0;
    if (typeof content !== 'string') return true;
    const stripped = content.replace(/<[^>]*>?/gm, '').trim();
    return stripped.length > 0;
  };

  if (hasContent(visa.visas)) tabs.push({ key: "visasList", label: "Visa Types" });
  if (hasContent(visa.whyThisVisa)) tabs.push({ key: "whyThisVisa", label: `Why Visit ${visa.country || 'Destination'}` });
  if (hasContent(visa.content)) tabs.push({ key: "description", label: "Visa Info" });
  if (hasContent(visa.eligibility)) tabs.push({ key: "eligibility", label: "Eligibility" });
  if (hasContent(visa.documentsContent)) tabs.push({ key: "documents", label: "Documents" });
  if (hasContent(visa.feesAndCharges)) tabs.push({ key: "feesAndCharges", label: "Fees & Charges" });
  if (hasContent(visa.howToApply)) tabs.push({ key: "howToApply", label: "How to Apply" });
  if (hasContent(visa.process)) tabs.push({ key: "process", label: "Process" });
  if (hasContent(visa.rejectionReasons)) tabs.push({ key: "rejectionReasons", label: "Rejection Reasons" });
  if (hasContent(visa.expertTips)) tabs.push({ key: "expertTips", label: "Expert Tips" });
  if (hasContent(visa.faqs)) tabs.push({ key: "faqs", label: "FAQs" });
  if (hasContent(visa.cta)) tabs.push({ key: "cta", label: "CTA" });

  // ── Scroll spy: update active tab when sections scroll into view ──
  const tabKeys = tabs.map((t) => t.key);
  useEffect(() => {
    if (tabKeys.length === 0) return;
    const observers: IntersectionObserver[] = [];
    tabKeys.forEach((key) => {
      const el = document.getElementById(key);
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // Only change active tab from scroll if not in the middle of a click-scroll
            if (entry.isIntersecting && !isClickScrollingRef.current) {
              setActive(key as TabKey);
            }
          });
        },
        {
          // Offset for sticky tab bar (~56px) + small buffer
          rootMargin: "-80px 0px -60% 0px",
          threshold: 0,
        }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKeys.join(',')]);

  return (
    <div className="w-full bg-slate-50/60 min-h-screen pb-10">
      {/* Quick Summary Rendering Before Tabs */}
      {visa.quickSummary && visa.quickSummary.trim() !== "" && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 mt-4">
          <section className="visa-prose prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4">
            <BlogContent html={visa.quickSummary} />
          </section>
        </div>
      )}

      {/* Highlights & Quick Answers Above Tabs */}
      {(visa.highlights?.trim() || visa.quickAnswer?.trim()) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
            {visa.highlights && visa.highlights.trim() !== "" && (
              <div>
                <div className="flex flex-col gap-2 mb-3">
                  <h3 className="text-xl font-bold font-heading text-black">Visa at a Glance</h3>
                  <div className="w-12 h-1 bg-[#FE5300]"></div>
                </div>
                <VisaAtAGlance html={visa.highlights} />
              </div>
            )}

            {visa.quickAnswer && visa.quickAnswer.trim() !== "" && (
              <div>
                <div className="flex flex-col gap-2 mb-3">
                  <h3 className="text-xl font-bold font-heading text-black">Quick Answers</h3>
                  <div className="w-12 h-1 bg-[#FE5300]"></div>
                </div>
                <section className="max-w-none text-black leading-relaxed [&_.prose]:!m-0 [&_.prose>ul]:!m-0 [&_p:empty]:hidden [&_ul]:!m-0 [&_ul]:list-none [&_ul]:pl-0 [&_ul]:flex [&_ul]:overflow-x-auto [&_ul]:no-scrollbar [&_ul]:snap-x [&_ul]:snap-mandatory md:[&_ul]:grid md:[&_ul]:grid-cols-2 lg:[&_ul]:grid-cols-2 [&_ul]:gap-3 md:[&_ul]:gap-4 [&_ul]:pb-4 md:[&_ul]:pb-0 [&_li]:relative [&_li]:p-3.5 md:[&_li]:p-4 [&_li]:pl-11 md:[&_li]:pl-12 [&_li]:!m-0 [&_li]:shrink-0 [&_li]:snap-start [&_li]:w-[85vw] md:[&_li]:w-auto md:[&_li]:shrink [&_li::marker]:hidden [&_li::before]:content-[''] [&_li::before]:absolute [&_li::before]:left-3 md:[&_li::before]:left-4 [&_li::before]:top-3.5 md:[&_li::before]:top-4 [&_li::before]:w-6 [&_li::before]:h-6 [&_li::before]:bg-orange-50 [&_li::before]:rounded-full [&_li::before]:transition-all [&_li::before]:duration-300 [&_li::before]:shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] [&_li::before]:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRTUzMDAiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cG9seWxpbmUgcG9pbnRzPSI5IDE4IDE1IDEyIDkgNiIvPjwvc3ZnPg==')] [&_li::before]:bg-no-repeat [&_li::before]:bg-center [&_li::before]:bg-[length:12px_12px] [&_li:hover::before]:bg-[#FE5300] [&_li:hover::before]:scale-110 [&_li:hover::before]:shadow-[0_4px_12px_rgba(254,83,0,0.3)] [&_li:hover::before]:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBvbHlsaW5lIHBvaW50cz0iOSAxOCAxNSAxMiA5IDYiLz48L3N2Zz4=')] [&_li]:bg-white [&_li]:border [&_li]:border-gray-100/80 [&_li]:rounded-2xl [&_li]:shadow-[0_4px_20px_rgba(0,0,0,0.03)] [&_li]:transition-all [&_li]:duration-400 [&_li:hover]:-translate-y-0.5 [&_li:hover]:shadow-[0_8px_30px_rgba(254,83,0,0.08)] [&_li:hover]:border-orange-200/60 [&_li_*]:!m-0 [&_li_*]:!leading-relaxed [&_li_strong]:block [&_li_strong]:mb-1 [&_li_strong]:text-[13px] md:[&_li_strong]:text-[14px] [&_li_strong]:text-gray-900 [&_li_strong]:transition-colors [&_li_strong]:leading-snug [&_li_b]:block [&_li_b]:mb-1 [&_li_b]:text-[13px] md:[&_li_b]:text-[14px] [&_li_b]:text-gray-900 [&_li_b]:transition-colors [&_li_b]:leading-snug [&_li:hover_strong]:text-[#FE5300] [&_li:hover_b]:text-[#FE5300] [&_li]:text-gray-500 [&_li]:text-[12px] md:[&_li]:text-[13px] [&_li_p]:text-gray-500 [&_li_p]:text-[12px] md:[&_li_p]:text-[13px] [&_li_p]:leading-relaxed">
                  <BlogContent html={visa.quickAnswer} />
                </section>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 100% width Sticky Tab Bar Background */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] w-full mb-6">
        {/* Constrained container for the tabs matching the site width */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-4">
          <div className="flex flex-nowrap md:flex-wrap w-full gap-2 pb-1 overflow-x-auto no-scrollbar md:overflow-visible snap-x snap-mandatory md:snap-none">
            {tabs.map((tab) => (
              <Button
                key={tab.key}
                size="sm"
                ref={(el) => { tabButtonRefs.current[tab.key] = el as HTMLButtonElement | null; }}
                onClick={() => {
                  setActive(tab.key);
                  const el = document.getElementById(tab.key);
                  if (el) {
                    // Suppress scroll spy while click-scroll is animating
                    isClickScrollingRef.current = true;
                    el.scrollIntoView({ behavior: 'smooth' });
                    setTimeout(() => { isClickScrollingRef.current = false; }, 800);
                  }
                }}
                className={`shrink-0 snap-start text-xs md:text-sm h-8 md:h-9 px-3 md:px-4 rounded-full ${
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

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Content Column */}
        <article className="w-full md:w-[65%]">
          <div className="w-full">
        {(() => {
          const sectionHeadings: Record<string, string> = {
            highlights: "Highlights",
            quickAnswer: "Quick Answers",
            whyThisVisa: `Why Visit ${visa.country || 'Destination'}`,
            eligibility: "Eligibility",
            feesAndCharges: "Fees & Charges",
            howToApply: "How to Apply",
            cta: "CTA"
          };
          
          const renderDynamicSection = (key: string) => {
            if (!hasContent(visa[key])) return null;
            return (
              <div id={key} key={key} className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                <div className="flex flex-col gap-2 mb-5">
                  <h3 className="text-xl font-bold font-heading text-black">{sectionHeadings[key]}</h3>
                  <div className="w-12 h-1 bg-[#FE5300]"></div>
                </div>
                <section className="visa-prose prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4">
                  <BlogContent html={visa[key]} />
                </section>
              </div>
            );
          };

          return (
            <>
              {visa.visas && visa.visas.length > 0 && (
                <div id="visasList" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h3 className="text-xl font-bold font-heading text-black">Visa Types</h3>
                    <div className="w-12 h-1 bg-[#FE5300]"></div>
                  </div>
                  <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-4 pb-4 md:grid md:grid-cols-1 md:overflow-visible md:snap-none md:pb-0">
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

              {renderDynamicSection("whyThisVisa")}

              {hasContent(visa.content) && (
                <div id="description" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h3 className="text-xl font-bold font-heading text-black">Visa Info</h3>
                    <div className="w-12 h-1 bg-[#FE5300]"></div>
                  </div>
                  <section className="visa-prose prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4">
                    <BlogContent html={visa.content} />
                  </section>
                </div>
              )}

              {renderDynamicSection("eligibility")}

              {hasContent(visa.documentsContent) && (
                <div id="documents" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h3 className="text-xl font-bold font-heading text-black">Documents</h3>
                    <div className="w-12 h-1 bg-[#FE5300]"></div>
                  </div>
                  <div 
                    className="visa-prose prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4"
                    dangerouslySetInnerHTML={{ __html: visa.documentsContent }}
                  />
                </div>
              )}

              {renderDynamicSection("feesAndCharges")}
              {renderDynamicSection("howToApply")}

              {hasContent(visa.process) && (
                <div id="process" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h3 className="text-xl font-bold font-heading text-black">Step-by-Step Process</h3>
                    <div className="w-12 h-1 bg-[#FE5300]"></div>
                  </div>
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
                      className="visa-prose prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4"
                      dangerouslySetInnerHTML={{ __html: visa.process }} 
                    />
                  )}
                </div>
              )}

              {hasContent(visa.rejectionReasons) && (
                <div id="rejectionReasons" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h3 className="text-xl font-bold font-heading text-black">Common Rejection Reasons</h3>
                    <div className="w-12 h-1 bg-[#FE5300]"></div>
                  </div>
                  <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-4 pb-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:snap-none md:pb-0">
                    {visa.rejectionReasons.map((reason: any, idx: number) => (
                      <div key={idx} className="shrink-0 snap-start w-[70vw] md:w-auto md:shrink aspect-auto md:aspect-square bg-white border border-gray-200 p-3 md:p-4 flex flex-col justify-start text-left overflow-hidden rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center mb-3 shrink-0">
                          <AlertCircle className="w-4 h-4 text-red-600" strokeWidth={2} />
                        </div>
                        <h4 className="text-sm font-bold font-heading text-gray-900 mb-1.5 leading-tight">
                          {reason.title}
                        </h4>
                        <div className="prose text-[12px] text-gray-500 leading-snug line-clamp-5 prose-ul:pl-4 prose-ol:pl-4 prose-li:my-0 prose-p:my-0">
                          <BlogContent html={reason.description} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasContent(visa.expertTips) && (
                <div id="expertTips" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h3 className="text-xl font-bold font-heading text-black">Expert Tips</h3>
                    <div className="w-12 h-1 bg-[#FE5300]"></div>
                  </div>
                  <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-4 pb-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:snap-none md:pb-0">
                    {visa.expertTips.map((tip: any, idx: number) => (
                      <div key={idx} className="shrink-0 snap-start w-[70vw] md:w-auto md:shrink aspect-auto md:aspect-square bg-white border border-gray-200 p-3 md:p-4 flex flex-col justify-start text-left overflow-hidden rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center mb-3 shrink-0">
                          <Lightbulb className="w-4 h-4 text-emerald-500" strokeWidth={2} />
                        </div>
                        <h4 className="text-sm font-bold font-heading text-gray-900 mb-1.5 leading-tight">
                          {tip.title}
                        </h4>
                        <div className="prose text-[12px] text-gray-500 leading-snug line-clamp-5 prose-ul:pl-4 prose-ol:pl-4 prose-li:my-0 prose-p:my-0">
                          <BlogContent html={tip.description} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasContent(visa.faqs) && (
                <div id="faqs" className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
                  <div className="flex flex-col gap-2 mb-5">
                    <h3 className="text-xl font-bold font-heading text-black">FAQs</h3>
                    <div className="w-12 h-1 bg-[#FE5300]"></div>
                  </div>
                  <Accordion
                    type="single"
                    value={openItem}
                    onValueChange={(val) => { if (val) setOpenItem(val); }}
                    className="w-full space-y-2"
                  >
                  {visa.faqs.map((faq: Faq, index: number) => {
                    const isOpen = openItem === `faq-${index}`;
                    return (
                      <AccordionItem
                        key={index}
                        value={`faq-${index}`}
                        className="border-b border-gray-200 py-1 md:py-2"
                      >
                        <AccordionTrigger className="text-xs md:text-sm font-bold font-heading text-black hover:text-[#FE5300] transition-colors hover:no-underline text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-justify pt-3">
                          <section className="prose prose-sm max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4">
                            <BlogContent html={faq.answer} />
                          </section>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                  </Accordion>
                </div>
              )}

              {/* About the Author Section moved above Testimonials */}
              <div className="mt-12 mb-16 p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row gap-6 items-start">
                <div className="w-16 h-16 rounded-full bg-[#FE5300]/10 flex items-center justify-center shrink-0 border border-[#FE5300]/20">
                  <span className="text-[#FE5300] font-black text-2xl tracking-tighter">MB</span>
                </div>
                <div className="flex-1 space-y-2.5">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">About the Author</h4>
                  <h3 className="text-lg font-bold text-slate-900 font-heading">MusafirBaba Visa Team</h3>
                  <p className="text-[13px] text-slate-600 leading-relaxed">
                    Our visa specialists regularly assist travelers with tourist visa applications, documentation guidance, travel planning, and visa consultation for a wide range of international destinations.
                  </p>
                  <div className="pt-3 mt-3 border-t border-slate-200/60 flex flex-col sm:flex-row gap-2 sm:gap-6 text-[11px] text-slate-500 font-medium">
                    <span>Last Updated: <strong className="text-slate-700">June 2026</strong></span>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <span>Reviewed By: <strong className="text-slate-700">Senior Visa Consultants, MusafirBaba</strong></span>
                  </div>
                </div>
              </div>

              {visa.reviews && visa.reviews.length > 0 && (
                <div id="testimonials" className="mb-16 pb-12 border-b border-gray-100 last:border-0">
                  <Testimonial data={visa.reviews} />
                </div>
              )}

              {hasContent(visa.helpfulResources) && (
                <div id="helpfulResources" className="mb-16 w-full">
                  {Array.isArray(visa.helpfulResources) ? (
                    <HelpfulResources data={visa.helpfulResources} />
                  ) : (
                    <div className="border border-gray-200 px-6 py-8 flex flex-col gap-6 w-full rounded-xl bg-gray-50 shadow-sm">
                      <div className="flex flex-col gap-2 mb-2">
                        <h3 className="text-lg md:text-xl font-bold font-heading text-center text-gray-900">
                          Helpful Resources
                        </h3>
                        <div className="w-12 h-1 bg-[#FE5300] mx-auto"></div>
                      </div>
                      <section className="prose prose-sm md:prose-base max-w-none text-gray-700 leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4 [&_a]:text-blue-500 [&_a]:hover:underline">
                        <BlogContent html={visa.helpfulResources} />
                      </section>
                    </div>
                  )}
                </div>
              )}
              {renderDynamicSection("cta")}
            </>
          );
        })()}
          </div>

          {/* Render extra content passed from page below the active tab content */}
          {bottomContent}

        </article>

        {/* Sidebar Column */}
        <aside className="hidden md:block w-full md:w-[35%] md:sticky md:top-32 self-start space-y-6">
          {sidebar}
        </aside>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div 
        className="md:hidden fixed left-0 right-0 z-[60] bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] px-4 py-3 pb-safe flex justify-between items-center"
        style={{ bottom: '65px' }}
      >
        <div className="flex flex-col">
          <span className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Starting from</span>
          <span className="text-xl font-black text-[#FE5300] leading-none mt-0.5">₹ {Number(displayCost).toLocaleString('en-IN')}/-</span>
        </div>
        <Button 
          onClick={() => setShowMobileCalculator(true)}
          className="bg-[#FE5300] hover:bg-[#e44a00] text-white px-6 py-5 rounded-xl font-bold shadow-md shadow-[#FE5300]/20 text-base"
        >
          Apply Visa
        </Button>
      </div>

      {/* Mobile Calculator Modal */}
      {showMobileCalculator && (
        <div 
          className="md:hidden fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowMobileCalculator(false)}
        >
          <div 
            className="w-full bg-gray-50 rounded-t-3xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-full duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center z-10 rounded-t-3xl shadow-sm">
              <h3 className="font-bold text-lg text-gray-900">Apply Visa</h3>
              <button
                type="button"
                onClick={() => setShowMobileCalculator(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              >
                &times;
              </button>
            </div>
            <div className="p-4 space-y-4">
              {sidebar}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
