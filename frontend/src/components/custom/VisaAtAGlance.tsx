"use client";

import React, { useMemo } from 'react';
import { Globe, Clock, FileText, Book, CreditCard, Calendar, CheckCircle2, Plane } from 'lucide-react';

export default function VisaAtAGlance({ html }: { html: string }) {
  const rows = useMemo(() => {
    const parsedRows: { label: string; value: string }[] = [];
    const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    let isFirstRow = true;

    const decodeEntities = (str: string) => {
      return str.replace(/&(nbsp|amp|quot|lt|gt);/g, (match, entity) => {
        return { nbsp: " ", amp: "&", quot: "\"", lt: "<", gt: ">" }[entity] || match;
      }).replace(/&#(\d+);/gi, (match, numStr) => {
        return String.fromCharCode(parseInt(numStr, 10));
      });
    };

    while ((trMatch = trRegex.exec(html)) !== null) {
      if (isFirstRow) {
        isFirstRow = false;
        continue; // Always skip the first row (headers like 'Feature' / 'Details')
      }
      
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let tdMatch;
      const tds = [];
      while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
        let cleanText = tdMatch[1].replace(/<[^>]*>?/gm, '').trim();
        cleanText = decodeEntities(cleanText);
        tds.push(cleanText);
      }
      if (tds.length >= 2) {
        parsedRows.push({ label: tds[0], value: tds[1] });
      }
    }
    return parsedRows;
  }, [html]);

  if (rows.length === 0) return null;

  // Helper to get a relevant icon based on the label text
  const getIconForLabel = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('country')) return <Globe className="w-5 h-5" />;
    if (lowerLabel.includes('time') || lowerLabel.includes('duration') || lowerLabel.includes('process')) return <Clock className="w-5 h-5" />;
    if (lowerLabel.includes('passport') || lowerLabel.includes('document')) return <Book className="w-5 h-5" />;
    if (lowerLabel.includes('financial') || lowerLabel.includes('bank') || lowerLabel.includes('proof')) return <CreditCard className="w-5 h-5" />;
    if (lowerLabel.includes('entry') || lowerLabel.includes('category') || lowerLabel.includes('type')) return <FileText className="w-5 h-5" />;
    if (lowerLabel.includes('itinerary') || lowerLabel.includes('travel') || lowerLabel.includes('flight')) return <Plane className="w-5 h-5" />;
    if (lowerLabel.includes('validity') || lowerLabel.includes('date')) return <Calendar className="w-5 h-5" />;
    return <CheckCircle2 className="w-5 h-5" />;
  };

  return (
    <div className="relative flex flex-col items-center py-6 w-full mb-6 mt-2">
      <style dangerouslySetInnerHTML={{__html: `
        .dir-arrow-right {
          clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%);
        }
        @media (min-width: 768px) {
          .md-dir-arrow-left {
            clip-path: polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 50%);
          }
        }
      `}} />

      {/* Sleek Central Metallic Pillar (Desktop: Center, Mobile: Left) */}
      <div className="absolute top-0 bottom-0 w-1.5 md:w-2 bg-gradient-to-b from-gray-300 via-gray-400 to-gray-200 shadow-inner rounded-full left-[22px] md:left-1/2 md:-translate-x-1/2 z-0"></div>

      <div className="relative z-10 w-full max-w-4xl px-4 md:px-0 grid grid-cols-1 md:grid-cols-2 gap-y-3 md:gap-y-4 gap-x-0">
        {rows.map((row, index) => {
          const isLeftCol = index % 2 === 0;
          
          return (
            <div 
              key={index}
              className={`flex w-full ${isLeftCol ? 'md:justify-end md:pr-4' : 'md:justify-start md:pl-4'} pl-10 md:pl-0`}
            >
              {/* Desktop Connector Pin */}
              <div className={`hidden md:block absolute top-1/2 -translate-y-1/2 w-4 h-1 bg-gray-300 shadow-sm z-0 ${isLeftCol ? 'right-0' : 'left-0'}`}></div>

              <div 
                className={`relative group flex items-center bg-gray-50/80 hover:bg-[#fff9f5] hover:border-orange-200 hover:shadow-[0_8px_20px_rgba(254,83,0,0.08)] shadow-sm border border-gray-200/60 transition-all duration-300 w-full md:w-[280px] h-[52px] dir-arrow-right ${isLeftCol ? 'md:md-dir-arrow-left' : ''}`}
              >
                {/* Accent Line (Mobile: Left, Desktop Left Col: Right, Desktop Right Col: Left) */}
                <div className={`absolute top-0 bottom-0 w-1 bg-gradient-to-b from-[#FE5300] to-orange-500 group-hover:w-1.5 transition-all ${isLeftCol ? 'left-0 md:left-auto md:right-0' : 'left-0'}`}></div>

                <div className={`flex items-center gap-3 w-full px-4 ${isLeftCol ? 'md:flex-row-reverse md:text-right' : ''} md:px-5`}>
                  <div className="text-gray-400 group-hover:text-[#FE5300] transition-colors shrink-0">
                    {getIconForLabel(row.label)}
                  </div>
                  <div className="flex flex-col justify-center overflow-hidden">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1 line-clamp-1">
                      {row.label}
                    </span>
                    <span className="text-[13px] font-black text-gray-900 leading-none line-clamp-1">
                      {row.value}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
