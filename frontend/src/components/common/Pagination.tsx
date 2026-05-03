"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages.map((pageNum) => (
      <Button
        key={pageNum}
        variant={currentPage === pageNum ? "default" : "ghost"}
        size="sm"
        onClick={() => onPageChange(pageNum)}
        className={`h-8 w-8 p-0 rounded-lg text-[11px] font-bold ${
          currentPage === pageNum 
            ? 'bg-[#FE5300] hover:bg-[#FE5300] text-white shadow-sm' 
            : 'text-slate-400 hover:text-[#FE5300] hover:bg-orange-50'
        }`}
      >
        {pageNum}
      </Button>
    ));
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 rounded-lg border-slate-200 text-slate-400 hover:text-[#FE5300] hover:border-orange-200 disabled:opacity-30 transition-all"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-1 px-2">
        {renderPageNumbers()}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 rounded-lg border-slate-200 text-slate-400 hover:text-[#FE5300] hover:border-orange-200 disabled:opacity-30 transition-all"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
