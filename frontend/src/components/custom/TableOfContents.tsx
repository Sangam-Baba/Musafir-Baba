"use client";

import React, { useState } from "react";
import { List, ChevronDown, ChevronRight } from "lucide-react";
import { Heading } from "@/utils/blogUtils";
import { cn } from "@/lib/utils";

interface TableOfContentsProps {
  headings: Heading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [isGlobalCollapsed, setIsGlobalCollapsed] = useState(false);

  if (!headings || headings.length === 0) return null;

  const toggleSection = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const visibleHeadings = [];
  let currentCollapsedLevel = Infinity;

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];

    if (heading.level <= currentCollapsedLevel) {
      currentCollapsedLevel = Infinity;
    }

    const nextHeading = headings[i + 1];
    const isParent = nextHeading && nextHeading.level > heading.level;

    if (currentCollapsedLevel === Infinity) {
      visibleHeadings.push({
        ...heading,
        isParent,
        originalIndex: i,
        isCollapsed: collapsedSections.has(heading.id),
      });

      if (collapsedSections.has(heading.id)) {
        currentCollapsedLevel = heading.level;
      }
    }
  }

  return (
    <div className="w-full pt-2">
      <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
        <div className="flex items-center gap-2">
          <List size={16} className="text-[#FE5300]" />
          <h2 className="text-[12px] font-black text-gray-900 uppercase tracking-widest">
            On this page
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsGlobalCollapsed(!isGlobalCollapsed)}
          className="p-1.5 hover:bg-orange-50 rounded-lg transition-colors text-gray-400 hover:text-[#FE5300]"
          title={isGlobalCollapsed ? "Expand table of contents" : "Collapse table of contents"}
        >
          {isGlobalCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {!isGlobalCollapsed && (
        <nav className="relative max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
          {/* Vertical accent line */}
          <div className="absolute left-[2px] top-2 bottom-2 w-[2px] bg-gray-100/80 rounded-full" />
          
          <div className="flex flex-col gap-0.5 mt-1">
            {visibleHeadings.map((heading) => (
              <a
                key={`${heading.id}-${heading.originalIndex}`}
                href={`#${heading.id}`}
                className={cn(
                  "group relative py-2 pr-3 transition-all duration-200 border-l-[3px] border-transparent flex items-start justify-between gap-2 rounded-r-lg",
                  "hover:border-[#FE5300] hover:text-[#FE5300] hover:bg-orange-50/50 text-gray-600",
                  heading.level === 2 ? "pl-4 text-[13px] font-semibold" : "",
                  heading.level === 3 ? "pl-8 text-[12px] font-medium text-gray-500" : "",
                  heading.level >= 4 ? "pl-11 text-[11px] font-normal text-gray-400" : ""
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
                <span 
                  className="relative z-10 flex-1 leading-snug" 
                  title={heading.text.replace(/<[^>]*>?/gm, '')}
                  dangerouslySetInnerHTML={{ __html: heading.text }}
                />
                {heading.isParent && (
                  <button
                    type="button"
                    onClick={(e) => toggleSection(heading.id, e)}
                    className="p-1 hover:bg-white/80 rounded-md transition-colors relative z-20 text-gray-400 group-hover:text-[#FE5300]"
                  >
                    {heading.isCollapsed ? (
                      <ChevronRight size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>
                )}
              </a>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
