import React from "react";
import { cache } from "react";
import SitemapTable from "./SitemapTable";
import { buildSitemapItems, filterSitemapItems, type SitemapItem } from "@/lib/sitemapUtils";

const ITEMS_PER_PAGE = 10;

const getAllSitemapData = cache(async (): Promise<SitemapItem[]> => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    // Single lightweight endpoint purpose-built for this page (see
    // backend/src/controllers/sitemapData.controller.js) instead of 11
    // separate calls into the heavy admin-CRUD list endpoints (full
    // populates, no field projection) those pages need but this page
    // doesn't. Response shape mirrors the same `{ data: [...] }` per key
    // `buildSitemapItems` already expects, so the merge logic is unchanged.
    const source = await fetch(`${baseUrl}/admin/sitemap-source`, {
      next: { revalidate: 60 },
    }).then((r) => r.json());

    return buildSitemapItems(source);
  } catch (error) {
    console.error("Error fetching sitemap data:", error);
    return [];
  }
});

export default async function SitemapPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const search = searchParams.search || "";
  const category = searchParams.category || "all";
  const page = parseInt(searchParams.page || "1");

  const allData = await getAllSitemapData();

  // Server-side filtering for category and title precision
  const filteredData = filterSitemapItems(allData, search, category);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <SitemapTable
        data={paginatedData}
        totalItems={totalItems}
        totalPages={totalPages}
        currentPage={page}
        currentSearch={search}
        currentCategory={category}
      />
    </div>
  );
}
