"use client";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize = 15,
  totalItems,
}: PaginationProps) {
  const total = Math.ceil(totalPages / pageSize); // Convert total items into total pages

  if (total <= 1) return null; // No pagination needed

  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < total) onPageChange(currentPage + 1);
  };

  return (
    <div className="flex items-center justify-center mt-6 border-t border-slate-200 dark:border-slate-700 pt-4 gap-2">
      <Button
        variant="outline"
        onClick={handlePrev}
        disabled={currentPage === 1}
      >
        Previous
      </Button>

      <div className="text-slate-600 dark:text-slate-300">
        Page <strong>{currentPage}</strong> of <strong>{total}</strong>
      </div>

      <Button
        variant="outline"
        onClick={handleNext}
        disabled={currentPage === total}
      >
        Next
      </Button>
    </div>
  );
}
