import React, { Suspense } from "react";
import { 
  Globe, 
  Search, 
  Layout, 
  Plane, 
  MapPin, 
  Hash, 
  Newspaper, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Helper components moved to separate functions for clarity
interface SitemapItem {
  title: string;
  url: string;
  category: string;
}

const CATEGORIES: Record<string, { label: string; icon: any; color: string }> = {
  webpage: { label: "Web Page", icon: Layout, color: "text-blue-500" },
  holiday: { label: "Package", icon: Plane, color: "text-orange-500" },
  destination: { label: "Destination", icon: MapPin, color: "text-green-500" },
  category: { label: "Category", icon: MapPin, color: "text-slate-400" },
  visa: { label: "Visa", icon: Hash, color: "text-indigo-500" },
  blog: { label: "Blog", icon: Newspaper, color: "text-pink-500" },
  news: { label: "News", icon: Newspaper, color: "text-red-500" },
};

const ITEMS_PER_PAGE = 10;

async function getAllSitemapData() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    const [blogs, news, catRes, packages, destinations, webpages, visas] = await Promise.all([
      fetch(`${baseUrl}/blogs/?status=published`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${baseUrl}/news/?status=published`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${baseUrl}/category`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${baseUrl}/packages/`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${baseUrl}/destination`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${baseUrl}/webpage/?status=published`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${baseUrl}/visa`, { next: { revalidate: 60 } }).then(r => r.json()),
    ]);

    const items: SitemapItem[] = [
      { title: "Home Page", url: "/", category: "webpage" },
      { title: "Holidays Listing", url: "/holidays", category: "holiday" },
      { title: "Destinations", url: "/destinations", category: "destination" },
      { title: "Visa Services", url: "/visa", category: "visa" },
      { title: "Travel Blog", url: "/blog", category: "blog" },
      { title: "Latest News", url: "/news", category: "news" },
      { title: "About Us", url: "/about-us", category: "webpage" },
    ];

    webpages.data?.forEach((p: any) => items.push({ title: p.title, url: `/${p.fullSlug}`, category: "webpage" }));
    blogs.data?.forEach((b: any) => items.push({ title: b.title, url: `/blog/${b.slug}`, category: "blog" }));
    news.data?.forEach((n: any) => items.push({ title: n.title, url: `/news/${n.slug}`, category: "news" }));
    catRes.data?.forEach((c: any) => items.push({ title: c.name, url: `/holidays/${c.slug}`, category: "category" }));
    packages.data?.forEach((p: any) => items.push({ 
      title: p.title, 
      url: `/holidays/${p.mainCategory?.slug}/${p.destination?.state}/${p.slug}`, 
      category: "holiday" 
    }));
    destinations.data?.forEach((d: any) => items.push({ title: d.name, url: `/destinations/${d.state}`, category: "destination" }));
    visas.data?.forEach((v: any) => items.push({ title: `${v.country} Visa`, url: `/visa/${v.slug}`, category: "visa" }));

    return items;
  } catch (error) {
    console.error("Error fetching sitemap data:", error);
    return [];
  }
}

// Client component for interaction
import SitemapControls from "@/app/admin/sitemap/SitemapControls";

export default async function SitemapPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const search = searchParams.search || "";
  const category = searchParams.category || "all";
  const page = parseInt(searchParams.page || "1");

  const allData = await getAllSitemapData();

  // Server-side filtering
  const filteredData = allData.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                          item.url.toLowerCase().includes(search.toLowerCase());
    const matchesTab = category === "all" || item.category === category;
    return matchesSearch && matchesTab;
  });

  // Server-side pagination
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header with Server-driven values */}
      <div className="flex items-center justify-between border-b pb-4 border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-orange-50 rounded-lg flex items-center justify-center text-[#FE5300]">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-none">Sitemap Management</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Server-Side Rendered</p>
          </div>
        </div>

        <SitemapControls 
          initialSearch={search} 
          initialCategory={category} 
          categories={Object.keys(CATEGORIES).reduce((acc, key) => {
            acc[key] = { label: CATEGORIES[key].label };
            return acc;
          }, {} as any)} 
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 w-12 text-center">#</th>
              <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Page Title</th>
              <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Type</th>
              <th className="py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">View</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item, idx) => {
                const globalIdx = startIndex + idx + 1;
                const CatInfo = CATEGORIES[item.category] || CATEGORIES.webpage;
                return (
                  <tr key={idx} className="group hover:bg-slate-50/80 border-b border-slate-50 last:border-0 transition-colors">
                    <td className="py-2 px-4 text-[11px] text-slate-300 font-medium text-center">{globalIdx}</td>
                    <td className="py-2 px-4 group-hover:translate-x-1 transition-transform duration-300">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-semibold text-slate-700 leading-tight">{item.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono truncate max-w-[400px] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.url}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-1.5">
                        <CatInfo.icon className={`h-3 w-3 ${CatInfo.color}`} />
                        <span className="text-[11px] font-medium text-slate-500 capitalize">{item.category}</span>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-right">
                      <Link 
                        href={`https://musafirbaba.com${item.url}`} 
                        target="_blank"
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-300 hover:text-[#FE5300] hover:bg-orange-50 transition-all group/icon"
                      >
                        <ExternalLink className="h-4 w-4 opacity-40 group-hover/icon:opacity-100 transition-opacity" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className="py-32 text-center">
                  <div className="flex flex-col items-center gap-2 opacity-50">
                    <Search className="h-8 w-8 text-slate-300" />
                    <p className="text-xs text-slate-400 italic font-medium">No pages found matching your filters</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-2 py-4">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Showing {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, totalItems)} of {totalItems}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg border-slate-200"
              asChild
              disabled={page <= 1}
            >
              <Link href={`?page=${page - 1}${search ? `&search=${search}` : ""}${category !== "all" ? `&category=${category}` : ""}`}>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            
            <div className="flex items-center gap-1 px-4">
               {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                 let pageNum = page;
                 if (totalPages <= 5) pageNum = i + 1;
                 else if (page <= 3) pageNum = i + 1;
                 else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                 else pageNum = page - 2 + i;

                 if (pageNum > totalPages) return null;

                 return (
                   <Button
                     key={pageNum}
                     variant={page === pageNum ? "default" : "ghost"}
                     size="sm"
                     className={`h-8 w-8 p-0 rounded-lg ${page === pageNum ? 'bg-[#FE5300] hover:bg-[#FE5300]' : ''}`}
                     asChild
                   >
                     <Link href={`?page=${pageNum}${search ? `&search=${search}` : ""}${category !== "all" ? `&category=${category}` : ""}`}>
                       {pageNum}
                     </Link>
                   </Button>
                 );
               })}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg border-slate-200"
              asChild
              disabled={page >= totalPages}
            >
              <Link href={`?page=${page + 1}${search ? `&search=${search}` : ""}${category !== "all" ? `&category=${category}` : ""}`}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
