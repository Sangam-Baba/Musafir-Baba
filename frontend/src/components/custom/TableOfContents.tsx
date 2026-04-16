"use client";

import React, { useState } from "react";
import { List, ChevronDown, ChevronRight } from "lucide-react";
import { Heading } from "@/utils/blogUtils";
import { cn } from "@/lib/utils";

interface TableOfContentsProps {
  headings: Heading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!headings || headings.length === 0) return null;

  return (
    <div className="my-4 border border-gray-200 rounded-lg bg-gray-50/80 overflow-hidden transition-all duration-300 w-full shadow-sm">
      <div 
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-100/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <List size={16} className="text-[#FE5300]" />
          <h2 className="text-sm font-semibold text-gray-700 m-0 uppercase tracking-wider">On this page</h2>
        </div>
        <button 
          className="text-gray-400 hover:text-[#FE5300] transition-colors"
          aria-label={isOpen ? "Collapse" : "Expand"}
        >
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      <div 
        className={cn(
          "px-4 pb-4 pt-1 transition-all duration-300 ease-in-out",
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 pointer-events-none overflow-hidden"
        )}
      >
        <nav className="space-y-0.5 border-l border-gray-100 ml-1">
          {headings.map((heading, index) => (
            <a
              key={`${heading.id}-${index}`}
              href={`#${heading.id}`}
              className={cn(
                "block py-1 text-gray-600 hover:text-[#FE5300] transition-all bg-transparent hover:bg-[#FE5300]/5 rounded-sm",
                heading.level === 2 ? "pl-3 text-sm font-medium" : "",
                heading.level === 3 ? "pl-6 text-[13px]" : "",
                heading.level === 4 ? "pl-9 text-[12px] text-gray-500" : "",
                heading.level === 5 ? "pl-12 text-[11px] text-gray-400" : "",
                heading.level === 6 ? "pl-14 text-[11px] text-gray-400" : ""
              )}
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById(heading.id);
                if (element) {
                  const yOffset = -100; // Offset for potential sticky header
                  const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                  window.scrollTo({ top: y, behavior: 'smooth' });
                }
              }}
            >
              {heading.text}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
