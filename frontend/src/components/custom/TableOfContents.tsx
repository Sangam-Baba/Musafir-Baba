"use client";

import React, { useState } from "react";
import { List, ChevronDown, ChevronRight } from "lucide-react";
import { Heading } from "@/utils/blogUtils";
import { cn } from "@/lib/utils";

interface TableOfContentsProps {
  headings: Heading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  if (!headings || headings.length === 0) return null;

  return (
    <div className="py-2 w-full">
      <div className="flex items-center gap-2 mb-4 px-1">
        <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-widest">
          On this page
        </h2>
      </div>

      <nav className="relative">
        {/* Vertical accent line */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gray-100 rounded-full" />
        
        <div className="flex flex-col">
          {headings.map((heading, index) => (
            <a
              key={`${heading.id}-${index}`}
              href={`#${heading.id}`}
              className={cn(
                "group relative py-2 pr-4 transition-all duration-200 border-l-2 border-transparent -ml-[2px]",
                "hover:border-[#FE5300] hover:text-[#FE5300] text-gray-500",
                heading.level === 2 ? "pl-4 text-[13px] font-semibold" : "",
                heading.level === 3 ? "pl-8 text-xs font-medium" : "",
                heading.level >= 4 ? "pl-12 text-[11px] font-normal" : ""
              )}
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById(heading.id);
                if (element) {
                  const yOffset = -100;
                  const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                  window.scrollTo({ top: y, behavior: 'smooth' });
                }
              }}
            >
              <span className="relative z-10">{heading.text}</span>
              {/* Active state line would be injected here if we had scroll tracking */}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
