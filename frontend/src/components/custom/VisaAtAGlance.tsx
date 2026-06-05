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
        continue;
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

  const getIconForLabel = (label: string) => {
    const lowerLabel = label.toLowerCase();
    const className = "w-4 h-4";
    if (lowerLabel.includes('country')) return <Globe className={className} />;
    if (lowerLabel.includes('time') || lowerLabel.includes('duration') || lowerLabel.includes('process')) return <Clock className={className} />;
    if (lowerLabel.includes('passport') || lowerLabel.includes('document')) return <Book className={className} />;
    if (lowerLabel.includes('financial') || lowerLabel.includes('bank') || lowerLabel.includes('proof')) return <CreditCard className={className} />;
    if (lowerLabel.includes('entry') || lowerLabel.includes('category') || lowerLabel.includes('type')) return <FileText className={className} />;
    if (lowerLabel.includes('itinerary') || lowerLabel.includes('travel') || lowerLabel.includes('flight')) return <Plane className={className} />;
    if (lowerLabel.includes('validity') || lowerLabel.includes('date')) return <Calendar className={className} />;
    return <CheckCircle2 className={className} />;
  };

  const hoverThemes = [
    { border: 'hover:border-orange-300/80', shadow: 'hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_inset_0_-1px_2px_rgba(0,0,0,0.02),_0_12px_30px_rgba(254,83,0,0.15),_0_4px_8px_rgba(254,83,0,0.08)]', dot: 'group-hover:bg-[#FE5300] group-hover:border-[#FE5300]', pinLine: 'group-hover:bg-orange-300', glow: 'from-[#FE5300] to-orange-400', iconBg: 'group-hover:bg-gradient-to-br group-hover:from-orange-50 group-hover:to-orange-100', iconBorder: 'group-hover:border-orange-200/50', iconText: 'group-hover:text-[#FE5300]', textHover: 'group-hover:text-[#FE5300]' },
    { border: 'hover:border-blue-300/80', shadow: 'hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_inset_0_-1px_2px_rgba(0,0,0,0.02),_0_12px_30px_rgba(59,130,246,0.15),_0_4px_8px_rgba(59,130,246,0.08)]', dot: 'group-hover:bg-blue-500 group-hover:border-blue-500', pinLine: 'group-hover:bg-blue-300', glow: 'from-blue-500 to-blue-400', iconBg: 'group-hover:bg-gradient-to-br group-hover:from-blue-50 group-hover:to-blue-100', iconBorder: 'group-hover:border-blue-200/50', iconText: 'group-hover:text-blue-500', textHover: 'group-hover:text-blue-500' },
    { border: 'hover:border-emerald-300/80', shadow: 'hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_inset_0_-1px_2px_rgba(0,0,0,0.02),_0_12px_30px_rgba(16,185,129,0.15),_0_4px_8px_rgba(16,185,129,0.08)]', dot: 'group-hover:bg-emerald-500 group-hover:border-emerald-500', pinLine: 'group-hover:bg-emerald-300', glow: 'from-emerald-500 to-emerald-400', iconBg: 'group-hover:bg-gradient-to-br group-hover:from-emerald-50 group-hover:to-emerald-100', iconBorder: 'group-hover:border-emerald-200/50', iconText: 'group-hover:text-emerald-500', textHover: 'group-hover:text-emerald-500' },
    { border: 'hover:border-violet-300/80', shadow: 'hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_inset_0_-1px_2px_rgba(0,0,0,0.02),_0_12px_30px_rgba(139,92,246,0.15),_0_4px_8px_rgba(139,92,246,0.08)]', dot: 'group-hover:bg-violet-500 group-hover:border-violet-500', pinLine: 'group-hover:bg-violet-300', glow: 'from-violet-500 to-violet-400', iconBg: 'group-hover:bg-gradient-to-br group-hover:from-violet-50 group-hover:to-violet-100', iconBorder: 'group-hover:border-violet-200/50', iconText: 'group-hover:text-violet-500', textHover: 'group-hover:text-violet-500' },
    { border: 'hover:border-rose-300/80', shadow: 'hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_inset_0_-1px_2px_rgba(0,0,0,0.02),_0_12px_30px_rgba(244,63,110,0.15),_0_4px_8px_rgba(244,63,110,0.08)]', dot: 'group-hover:bg-rose-500 group-hover:border-rose-500', pinLine: 'group-hover:bg-rose-300', glow: 'from-rose-500 to-rose-400', iconBg: 'group-hover:bg-gradient-to-br group-hover:from-rose-50 group-hover:to-rose-100', iconBorder: 'group-hover:border-rose-200/50', iconText: 'group-hover:text-rose-500', textHover: 'group-hover:text-rose-500' },
    { border: 'hover:border-amber-300/80', shadow: 'hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),_inset_0_-1px_2px_rgba(0,0,0,0.02),_0_12px_30px_rgba(245,158,11,0.15),_0_4px_8px_rgba(245,158,11,0.08)]', dot: 'group-hover:bg-amber-500 group-hover:border-amber-500', pinLine: 'group-hover:bg-amber-300', glow: 'from-amber-500 to-amber-400', iconBg: 'group-hover:bg-gradient-to-br group-hover:from-amber-50 group-hover:to-amber-100', iconBorder: 'group-hover:border-amber-200/50', iconText: 'group-hover:text-amber-500', textHover: 'group-hover:text-amber-500' }
  ];

  return (
    <div className="relative flex flex-col items-center w-full mb-6">
      {/* Sleek Central Pillar */}
      <div className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-gray-200 to-transparent left-1/2 -translate-x-1/2 z-0"></div>

      <div className="relative z-10 w-full max-w-4xl px-1 md:px-0 grid grid-cols-2 gap-y-2 md:gap-y-4 gap-x-0">
        {rows.map((row, index) => {
          const isLeftCol = index % 2 === 0;
          const theme = hoverThemes[index % hoverThemes.length];
          
          return (
            <div 
              key={index}
              className={`group flex w-full relative ${isLeftCol ? 'justify-end pr-2 md:pr-5' : 'justify-start pl-2 md:pl-5'}`}
            >
              {/* Connector Pin */}
              <div className={`absolute top-1/2 -translate-y-1/2 h-[2px] bg-gray-200 transition-colors duration-300 z-0 ${theme.pinLine}
                ${isLeftCol ? 'right-0 w-2 md:w-5' : 'left-0 w-2 md:w-5'}
              `}>
                <div className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full border border-white md:border-[2px] bg-gray-200 shadow-sm transition-all duration-300 group-hover:scale-125 z-10 ${theme.dot}
                  ${isLeftCol ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'}
                `}></div>
              </div>

              {/* Card */}
              <div 
                className={`relative flex items-center bg-gradient-to-b from-white to-gray-50/50 hover:-translate-y-1 shadow-[inset_0_1px_1px_rgba(255,255,255,1),_0_4px_12px_rgba(0,0,0,0.03),_0_1px_2px_rgba(0,0,0,0.02)] border border-gray-200/60 transition-all duration-400 w-full max-w-[165px] md:max-w-none md:w-[270px] min-h-[44px] md:min-h-[56px] rounded-xl md:rounded-2xl z-20 overflow-hidden cursor-default ${theme.shadow} ${theme.border}`}
              >
                {/* Accent Glow Line */}
                <div className={`absolute top-0 bottom-0 w-0.5 md:w-1 bg-gradient-to-b opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${theme.glow} ${isLeftCol ? 'right-0' : 'left-0'}`}></div>

                <div className={`flex items-center gap-1.5 md:gap-3 w-full px-2 py-1.5 md:px-4 md:py-2.5 ${isLeftCol ? 'flex-row-reverse text-right' : ''}`}>
                  {/* Icon Container */}
                  <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full bg-emerald-50/50 border border-emerald-100/50 flex items-center justify-center shrink-0 transition-all duration-300 text-emerald-500 group-hover:scale-110 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] [&>svg]:w-3 [&>svg]:h-3 md:[&>svg]:w-4 md:[&>svg]:h-4 ${theme.iconBg} ${theme.iconBorder} ${theme.iconText}`}>
                    {getIconForLabel(row.label)}
                  </div>
                  
                  {/* Text Content */}
                  <div className="flex flex-col justify-center overflow-hidden flex-1">
                    <span className="text-[7.5px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5 md:mb-1 line-clamp-1 group-hover:text-gray-500 transition-colors">
                      {row.label}
                    </span>
                    <span className={`text-[10px] md:text-[13px] font-black text-gray-800 leading-tight line-clamp-2 transition-colors ${theme.textHover}`}>
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
