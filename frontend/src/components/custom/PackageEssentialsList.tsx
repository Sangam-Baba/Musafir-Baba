"use client";

import React, { useMemo } from 'react';
import { Calendar, Info, MapPin, User, CheckCircle2, Navigation } from 'lucide-react';

export default function PackageEssentialsList({ html }: { html: string }) {
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
        // Skip the header row (Feature | Details)
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
    const lower = label.toLowerCase();
    const className = "w-4 h-4 text-blue-500 mr-2 shrink-0 mt-0.5";
    if (lower.includes('duration') || lower.includes('time') || lower.includes('date')) return <Calendar className={className} />;
    if (lower.includes('destination') || lower.includes('location')) return <MapPin className={className} />;
    if (lower.includes('price') || lower.includes('cost')) return <span className="w-4 h-4 text-blue-500 mr-2 shrink-0 flex items-center justify-center font-bold">₹</span>;
    if (lower.includes('accommodation') || lower.includes('meal') || lower.includes('transfer')) return <CheckCircle2 className={className} />;
    if (lower.includes('tour type') || lower.includes('theme')) return <Navigation className={className} />;
    return <Info className={className} />;
  };

  // Helper to check if value should be rendered as chips (if comma separated)
  const renderValue = (value: string) => {
    if (value.includes(',') && !value.toLowerCase().includes('price')) {
      const items = value.split(',').map(s => s.trim()).filter(Boolean);
      return (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-md whitespace-nowrap">
              {item}
            </span>
          ))}
        </div>
      );
    }
    
    return <span className="text-gray-900 text-[15px] font-medium leading-relaxed">{value}</span>;
  };

  return (
    <div className="w-full flex flex-col gap-2 md:gap-2.5">
      {rows.map((row, index) => (
        <div key={index} className="flex flex-row items-start gap-2 md:gap-3">
          <div className="w-[38%] md:w-1/3 shrink-0 mt-0.5 pr-1">
            <span className="text-gray-500 font-medium text-[13px] md:text-[14px] leading-tight break-words">{row.label}</span>
          </div>
          <div className="w-[62%] md:w-2/3 flex items-start">
            {getIconForLabel(row.label)}
            <div className="flex-1 min-w-0">
              {renderValue(row.value)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
