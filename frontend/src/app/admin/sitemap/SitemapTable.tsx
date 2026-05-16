"use client";

import React, { useState, useEffect, useTransition } from "react";
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
  Car
} from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

interface SitemapItem {
  title: string;
  url: string;
  category: string;
}

const categories: Record<string, { label: string; icon: any; color: string }> = {
  webpage: { label: "Web Page", icon: Layout, color: "text-blue-500" },
  holiday: { label: "Package", icon: Plane, color: "text-orange-500" },
  destination: { label: "Destination", icon: MapPin, color: "text-green-500" },
  category: { label: "Category", icon: MapPin, color: "text-slate-400" },
  visa: { label: "Visa", icon: Hash, color: "text-indigo-500" },
  blog: { label: "Blog", icon: Newspaper, color: "text-pink-500" },
  news: { label: "News", icon: Newspaper, color: "text-red-500" },
  customized: { label: "Customized Package", icon: Plane, color: "text-amber-500" },
  seo: { label: "Destinations Meta", icon: MapPin, color: "text-purple-500" },
  vehicle: { label: "Vehicle", icon: Car, color: "text-blue-400" },
  aboutus: { label: "About Us", icon: Layout, color: "text-emerald-500" },
};

interface SitemapTableProps {
  data: SitemapItem[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  currentSearch: string;
  currentCategory: string;
}

const ITEMS_PER_PAGE = 10;

export default function SitemapTable({ 
  data, 
  totalItems, 
  totalPages, 
  currentPage, 
  currentSearch, 
  currentCategory 
}: SitemapTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState(currentSearch);

  // Sync internal search term with URL search param
  useEffect(() => {
    setSearchTerm(currentSearch);
  }, [currentSearch]);

  const updateUrl = (searchValue: string, categoryValue: string, pageValue: number = 1) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (searchValue) params.set("search", searchValue);
    else params.delete("search");
    
    if (categoryValue && categoryValue !== "all") params.set("category", categoryValue);
    else params.delete("category");
    
    params.set("page", pageValue.toString());

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  // Debounce search update to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== currentSearch) {
        updateUrl(searchTerm, currentCategory);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex items-center justify-between border-b pb-4 border-slate-100">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-orange-50 rounded-lg flex items-center justify-center text-[#FE5300]">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-none">Sitemap Management</h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 transition-colors ${isPending ? 'text-[#FE5300] animate-pulse' : 'text-slate-400'}`}>
              {isPending ? 'Searching Server...' : 'Server-Side Search'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors ${isPending ? 'text-[#FE5300]' : 'text-slate-400'}`} />
            <Input 
              placeholder="Search title..." 
              className="pl-8 h-8 w-64 text-xs bg-slate-50 border-none focus:ring-1 focus:ring-orange-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="h-8 text-xs bg-slate-50 border-none rounded-md px-2 text-slate-600 outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
            value={currentCategory}
            onChange={(e) => updateUrl(searchTerm, e.target.value)}
          >
            <option value="all">All Items</option>
            {Object.keys(categories).map(k => (
              <option key={k} value={k}>{categories[k].label}s</option>
            ))}
          </select>
        </div>
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
          <tbody className={isPending ? 'opacity-50 grayscale transition-all' : 'transition-all'}>
            {data.length > 0 ? (
              data.map((item, idx) => {
                const globalIdx = startIndex + idx + 1;
                const CatInfo = categories[item.category] || categories.webpage;
                return (
                  <tr key={`${item.url}-${idx}`} className="group hover:bg-slate-50/80 border-b border-slate-50 last:border-0 transition-colors">
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
                        href={item.url} 
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
          Showing {totalItems > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + 10, totalItems)} of {totalItems}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg border-slate-200"
              onClick={() => updateUrl(searchTerm, currentCategory, currentPage - 1)}
              disabled={currentPage <= 1 || isPending}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1 px-4">
               {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                 let pageNum = currentPage;
                 if (totalPages <= 5) pageNum = i + 1;
                 else if (currentPage <= 3) pageNum = i + 1;
                 else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                 else pageNum = currentPage - 2 + i;

                 if (pageNum > totalPages) return null;

                 return (
                   <Button
                     key={pageNum}
                     variant={currentPage === pageNum ? "default" : "ghost"}
                     size="sm"
                     className={`h-8 w-8 p-0 rounded-lg ${currentPage === pageNum ? 'bg-[#FE5300] hover:bg-[#FE5300]' : ''}`}
                     onClick={() => updateUrl(searchTerm, currentCategory, pageNum)}
                     disabled={isPending}
                   >
                     {pageNum}
                   </Button>
                 );
               })}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-lg border-slate-200"
              onClick={() => updateUrl(searchTerm, currentCategory, currentPage + 1)}
              disabled={currentPage >= totalPages || isPending}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
