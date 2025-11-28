"use client";

import Pagination from "@/components/common/Pagination";
import React from "react";
import { useRouter } from "next/navigation";

function PaginationClient({
  totalPages,
  currentPage,
}: {
  totalPages: number;
  currentPage: number;
}) {
  const router = useRouter();
  return (
    <Pagination
      totalPages={totalPages ?? 1}
      currentPage={currentPage ?? 1}
      onPageChange={(page: number) => {
        router.push(`?page=${page}`);
      }}
    />
  );
}

export default PaginationClient;
