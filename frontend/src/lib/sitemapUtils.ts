// Shared between the admin Sitemap Management server page
// (app/admin/sitemap/page.tsx, which renders the current page of results)
// and its client table (app/admin/sitemap/SitemapTable.tsx, which fetches
// this same source data again on-demand only when "Export to Excel" is
// clicked, instead of the full list being shipped to the browser on every
// page load/search/filter change). Keeping the merge/derivation logic in
// one place guarantees the table and the export always agree.

export interface SitemapItem {
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

export function determinePageCategory(url: string) {
  const parts = url.split("/").filter(Boolean);

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

export function determinePageType(category: string) {
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
    category: "Category",
  };
  return map[category] || "Webpage";
}

// Merges the raw `{ blogs, news, catRes, packages, destinations, webpages,
// visas, customized, seo, vehicles, aboutus }` shape returned by
// `GET /admin/sitemap-source` into the flat SitemapItem[] the table/export
// both consume. Identical to the logic that used to live inline in
// page.tsx.
export function buildSitemapItems(source: any): SitemapItem[] {
  const items: SitemapItem[] = [];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://musafirbaba.com";

  const createItem = (title: string, url: string, category: string, data: any = {}): SitemapItem => {
    return {
      title,
      url,
      category,
      fullUrl: `${siteUrl}${url}`,
      metaTitle: data.metaTitle || data.title || title || "",
      metaDescription: data.metaDescription || data.excerpt || "",
      createdAt: data.createdAt ? new Date(data.createdAt).toISOString().split("T")[0] : "",
      updatedAt: data.updatedAt ? new Date(data.updatedAt).toISOString().split("T")[0] : "",
      createdBy: data.createdBy?.name || (typeof data.createdBy === "string" ? data.createdBy : ""),
      author: data.author?.name || (typeof data.author === "string" ? data.author : ""),
      pageType: determinePageType(category),
      pageCategory: determinePageCategory(url),
      keywords: Array.isArray(data.keywords) ? data.keywords.join(", ") : data.keywords || "",
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

  staticLinks.forEach((link) => {
    items.push(createItem(link.title, link.url, link.category));
  });

  const { blogs, news, catRes, packages, destinations, webpages, visas, customized, seo, vehicles, aboutus } = source;

  webpages?.data?.forEach((p: any) => items.push(createItem(p.title, `/${p.fullSlug}`, "webpage", p)));
  blogs?.data?.forEach((b: any) => items.push(createItem(b.title, `/blog/${b.slug}`, "blog", b)));
  news?.data?.forEach((n: any) => items.push(createItem(n.title, `/news/${n.slug}`, "news", n)));
  catRes?.data?.forEach((c: any) => items.push(createItem(c.name, `/holidays/${c.slug}`, "category", c)));
  packages?.data?.forEach((p: any) =>
    items.push(createItem(p.title, `/holidays/${p.mainCategory?.slug}/${p.destination?.state}/${p.slug}`, "holiday", p)),
  );
  destinations?.data?.forEach((d: any) => items.push(createItem(d.name, `/destinations/${d.state}`, "destination", d)));
  visas?.data?.forEach((v: any) => items.push(createItem(`${v.country} Visa`, `/visa/${v.slug}`, "visa", v)));
  customized?.data?.forEach((c: any) =>
    items.push(createItem(c.title, `/holidays/customised-tour-packages/${c.slug}`, "customized", c)),
  );
  seo?.data?.forEach((s: any) => {
    if (s.destinationId && s.categoryId) {
      items.push(
        createItem(
          `${s.destinationId.name} - ${s.categoryId.name} (SEO)`,
          `/holidays/${s.categoryId.slug}/${s.destinationId.state}`,
          "seo",
          s,
        ),
      );
    }
  });
  vehicles?.data?.forEach((v: any) => {
    const type = v.vehicleType?.toLowerCase() || "other";
    const dest = v.location?.name?.toLowerCase().replace(/\s+/g, "-") || "any";
    items.push(createItem(v.title, `/rental/${type}/${dest}/${v.slug}`, "vehicle", v));
  });
  aboutus?.data?.forEach((a: any) => items.push(createItem(a.title, `/about-us`, "aboutus", a)));

  return items;
}

export function filterSitemapItems(items: SitemapItem[], search: string, category: string) {
  return items.filter((item) => {
    const matchesSearch = !search || item.title.toLowerCase().includes(search.toLowerCase());
    const matchesTab = category === "all" || item.category === category;
    return matchesSearch && matchesTab;
  });
}
