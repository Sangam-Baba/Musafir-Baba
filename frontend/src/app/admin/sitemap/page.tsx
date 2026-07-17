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
  fullUrl: string;
  metaTitle: string;
  metaDescription: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  author: string;
  pageType: string;
  pageCategory: string;
  keywords: string;
}

const ITEMS_PER_PAGE = 10;

import { cache } from "react";
import SitemapTable from "./SitemapTable";

function determinePageCategory(url: string) {
  const parts = url.split('/').filter(Boolean);

  if (parts.length === 0) return "Listing page"; // Home

  const firstPart = parts[0];

  // Blogs, News, and static support pages
  if (["blog", "news", "about-us", "contact-us", "privacy-policy", "terms-and-conditions", "disclaimer"].includes(firstPart)) {
    return "Support page";
  }

  // Visas
  if (firstPart === "visa") {
    if (parts.length === 1) return "Listing page";
    if (parts.length === 2) return "Pillar page"; // Visa Money page
    return "Support page";
  }

  // Holidays
  if (firstPart === "holidays") {
    if (parts.length === 1) return "Listing page";
    
    const isCustomized = parts[1] === "customised-tour-packages";
    if (isCustomized) {
      // /holidays/customised-tour-packages (listing)
      if (parts.length === 2) return "Listing page";
      // /holidays/customised-tour-packages/<slug> (money page)
      return "Pillar page"; 
    } else {
      // /holidays/category (listing)
      if (parts.length === 2) return "Listing page";
      // /holidays/category/destination (listing)
      if (parts.length === 3) return "Listing page";
      // /holidays/category/destination/slug (money page)
      return "Pillar page";
    }
  }

  // Rentals
  if (firstPart === "rental") {
    if (parts.length === 1) return "Listing page";
    if (parts.length === 2) return "Listing page";
    if (parts.length === 3) return "Listing page";
    return "Pillar page"; // money page
  }
  
  // Destinations
  if (firstPart === "destinations") {
    if (parts.length === 1) return "Listing page";
    return "Pillar page";
  }
  
  // Generic Webpages
  // /slug -> Pillar page
  if (parts.length === 1) return "Pillar page";
  
  // /slug/support -> Support page
  return "Support page";
}

function determinePageType(category: string) {
  const map: Record<string, string> = {
    webpage: "Webpage",
    holiday: "Package",
    destination: "Destination",
    visa: "Visa",
    blog: "Blog",
    news: "News",
    customized: "Customise Page",
    vehicle: "Rental",
    seo: "Destination SEO",
    aboutus: "Webpage",
    category: "Category"
  };
  return map[category] || "Webpage";
}

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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://musafirbaba.com";

    const createItem = (title: string, url: string, category: string, data: any = {}) => {
      return {
        title,
        url,
        category,
        fullUrl: `${siteUrl}${url}`,
        metaTitle: data.metaTitle || data.title || title || "",
        metaDescription: data.metaDescription || data.excerpt || "",
        createdAt: data.createdAt ? new Date(data.createdAt).toISOString().split('T')[0] : "",
        updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString().split('T')[0] : "",
        createdBy: data.createdBy?.name || (typeof data.createdBy === 'string' ? data.createdBy : ""),
        author: data.author?.name || (typeof data.author === 'string' ? data.author : ""),
        pageType: determinePageType(category),
        pageCategory: determinePageCategory(url),
        keywords: Array.isArray(data.keywords) ? data.keywords.join(", ") : (data.keywords || "")
      };
    };
    
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
      items.push(createItem(link.title, link.url, link.category));
    });

    webpages.data?.forEach((p: any) => items.push(createItem(p.title, `/${p.fullSlug}`, "webpage", p)));
    blogs.data?.forEach((b: any) => items.push(createItem(b.title, `/blog/${b.slug}`, "blog", b)));
    news.data?.forEach((n: any) => items.push(createItem(n.title, `/news/${n.slug}`, "news", n)));
    catRes.data?.forEach((c: any) => items.push(createItem(c.name, `/holidays/${c.slug}`, "category", c)));
    packages.data?.forEach((p: any) => items.push(createItem(
      p.title, 
      `/holidays/${p.mainCategory?.slug}/${p.destination?.state}/${p.slug}`, 
      "holiday", 
      p
    )));
    destinations.data?.forEach((d: any) => items.push(createItem(d.name, `/destinations/${d.state}`, "destination", d)));
    visas.data?.forEach((v: any) => items.push(createItem(`${v.country} Visa`, `/visa/${v.slug}`, "visa", v)));
    customized.data?.forEach((c: any) => items.push(createItem(c.title, `/holidays/customised-tour-packages/${c.slug}`, "customized", c)));
    seo.data?.forEach((s: any) => {
      if (s.destinationId && s.categoryId) {
        items.push(createItem(
          `${s.destinationId.name} - ${s.categoryId.name} (SEO)`, 
          `/holidays/${s.categoryId.slug}/${s.destinationId.state}`, 
          "seo", 
          s
        ));
      }
    });
    vehicles.data?.forEach((v: any) => {
      const type = v.vehicleType?.toLowerCase() || 'other';
      const dest = v.location?.name?.toLowerCase().replace(/\s+/g, '-') || 'any';
      items.push(createItem(v.title, `/rental/${type}/${dest}/${v.slug}`, "vehicle", v));
    });
    aboutus.data?.forEach((a: any) => items.push(createItem(a.title, `/about-us`, "aboutus", a)));

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
        allFilteredData={filteredData}
        totalItems={totalItems}
        totalPages={totalPages}
        currentPage={page}
        currentSearch={search}
        currentCategory={category}
      />
    </div>
  );
}
