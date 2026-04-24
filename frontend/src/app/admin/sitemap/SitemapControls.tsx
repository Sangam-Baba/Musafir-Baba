"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SitemapControlsProps {
  initialSearch: string;
  initialCategory: string;
  categories: Record<string, { label: string }>;
}

export default function SitemapControls({ 
  initialSearch, 
  initialCategory, 
  categories 
}: SitemapControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearch);

  // Debounce search update to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== initialSearch) {
        updateUrl(search, initialCategory);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const updateUrl = (searchValue: string, categoryValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (searchValue) params.set("search", searchValue);
    else params.delete("search");
    
    if (categoryValue && categoryValue !== "all") params.set("category", categoryValue);
    else params.delete("category");
    
    // Always reset to page 1 on filter change
    params.set("page", "1");

    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const handleCategoryChange = (val: string) => {
    updateUrl(search, val);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors ${isPending ? 'text-[#FE5300] animate-pulse' : 'text-slate-400'}`} />
        <Input 
          placeholder="Search title..." 
          className="pl-8 h-8 w-48 text-xs bg-slate-50 border-none focus:ring-1 focus:ring-orange-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <select 
        className="h-8 text-xs bg-slate-50 border-none rounded-md px-2 text-slate-600 outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
        value={initialCategory}
        onChange={(e) => handleCategoryChange(e.target.value)}
      >
        <option value="all">All Items</option>
        {Object.keys(categories).map(k => (
          <option key={k} value={k}>{categories[k].label}s</option>
        ))}
      </select>
    </div>
  );
}
