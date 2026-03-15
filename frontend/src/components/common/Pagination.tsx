"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

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
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis-start");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push("ellipsis-end");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages.map((page, index) => {
      if (typeof page === "string") {
        return (
          <span key={index} className="px-1 text-gray-300">
            <MoreHorizontal className="w-4 h-4" />
          </span>
        );
      }

      const isActive = currentPage === page;

      return (
        <button
          key={index}
          onClick={() => onPageChange(page)}
          className={`w-[38px] h-[38px] flex items-center justify-center rounded-full text-sm font-bold transition-all duration-200 ${
            isActive
              ? "bg-[#FE5300] text-white shadow-sm scale-110"
              : "text-gray-600 hover:text-[#FE5300] hover:bg-gray-50"
          }`}
        >
          {page}
        </button>
      );
    });
  };

  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex items-center gap-1 md:gap-2">
        {/* PREV */}
        <Button
          variant="ghost"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-9 h-9 p-0 rounded-full text-gray-400 hover:text-[#FE5300] hover:bg-gray-50 disabled:opacity-20"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="sr-only">Previous</span>
        </Button>

        {/* NUMBERS */}
        <div className="flex items-center gap-1">
          {renderPageNumbers()}
        </div>

        {/* NEXT */}
        <Button
          variant="ghost"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-9 h-9 p-0 rounded-full text-gray-400 hover:text-[#FE5300] hover:bg-gray-50 disabled:opacity-20"
        >
          <ChevronRight className="w-5 h-5" />
          <span className="sr-only">Next</span>
        </Button>
      </div>
    </div>
  );
}
