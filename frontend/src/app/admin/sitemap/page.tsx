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
  Filter,
  Car
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

const ITEMS_PER_PAGE = 10;

import { cache } from "react";
import SitemapTable from "./SitemapTable";

const getAllSitemapData = cache(async () => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    const [blogs, news, catRes, packages, destinations, webpages, visas, customized, seo, vehicles, aboutus] = await Promise.all([
      fetch(`${baseUrl}/blogs/?limit=10000`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${baseUrl}/news/?limit=10000`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${baseUrl}/category?limit=10000&all=true`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${baseUrl}/packages/?limit=10000&status=all`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${baseUrl}/destination?limit=10000`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${baseUrl}/webpage/?limit=10000`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${baseUrl}/visa?limit=10000`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${baseUrl}/customizedtourpackage?limit=10000`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${baseUrl}/destinationseo?limit=10000`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${baseUrl}/vehicle?limit=10000`, { next: { revalidate: 60 } }).then(r => r.json()),
      fetch(`${baseUrl}/aboutus?limit=10000`, { next: { revalidate: 60 } }).then(r => r.json()),
    ]);

    const items: SitemapItem[] = [];
    
    const staticLinks = [
      { title: "Home Page", url: "/", category: "webpage" },
      { title: "Holidays Listing", url: "/holidays", category: "holiday" },
      { title: "Destinations", url: "/destinations", category: "destination" },
      { title: "Visa Services", url: "/visa", category: "visa" },
      { title: "Travel Blog", url: "/blog", category: "blog" },
      { title: "Latest News", url: "/news", category: "news" },
      { title: "About Us", url: "/about-us", category: "webpage" },
    ];

    staticLinks.forEach(link => {
      items.push(link);
    });

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
    customized.data?.forEach((c: any) => items.push({ title: c.title, url: `/holidays/customised-tour-packages/${c.slug}`, category: "customized" }));
    seo.data?.forEach((s: any) => {
      if (s.destinationId && s.categoryId) {
        items.push({ 
          title: `${s.destinationId.name} - ${s.categoryId.name} (SEO)`, 
          url: `/holidays/${s.categoryId.slug}/${s.destinationId.state}`, 
          category: "seo" 
        });
      }
    });
    vehicles.data?.forEach((v: any) => {
      const type = v.vehicleType?.toLowerCase() || 'other';
      const dest = v.location?.name?.toLowerCase().replace(/\s+/g, '-') || 'any';
      items.push({ title: v.title, url: `/rental/${type}/${dest}/${v.slug}`, category: "vehicle" });
    });
    aboutus.data?.forEach((a: any) => items.push({ title: a.title, url: `/about-us`, category: "aboutus" }));

    return items;
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
  const filteredData = allData.filter(item => {
    const matchesSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
    const matchesTab = category === "all" || item.category === category;
    return matchesSearch && matchesTab;
  });

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
