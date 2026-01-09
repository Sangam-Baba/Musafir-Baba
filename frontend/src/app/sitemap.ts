import { MetadataRoute } from "next";
import { Category } from "./admin/blogs/new/page";
// export const dynamic = "force-dynamic";
interface coverImage {
  url: string;
  public_id: string;
  width: number;
  height: number;
  alt: string;
}
interface blog {
  _id: string;
  title: string;
  coverImage: coverImage;
  content: string;
  metaDescription: string;
  slug: string;
  updatedAt: string;
}
export interface Batch {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  quad: number;
  triple: number;
  double: number;
  child: number;
  quadDiscount: number;
  tripleDiscount: number;
  doubleDiscount: number;
  childDiscount: number;
}
export interface Package {
  _id: string;
  title: string;
  description: string;
  mainCategory: Category;
  batch: Batch[];
  slug: string;
  coverImage: {
    url: string;
    public_id: string;
    alt: string;
    width?: number;
    height?: number;
  };
  gallery: coverImage[];
  duration: {
    days: number;
    nights: number;
  };
  destination?: Destination;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  maxPeople?: number;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  itinerary: string[];
  faqs: string[];
  createdAt: string;
  updatedAt: string;
  isFeatured: boolean;
  status: "draft" | "published";
  image: string;
}
interface Destination {
  _id: string;
  name: string;
  slug: string;
  country: string;
  state: string;
  city?: string;
  coverImage: {
    url: string;
    public_id: string;
    alt: string;
    width?: number;
    height?: number;
  };
  updatedAt: string;
}
interface Webpage {
  _id: string;
  title: string;
  slug: string;
  status: string;
  parent: string;
  fullSlug: string;
  updatedAt: string;
}
interface Visa {
  _id: string;
  title: string;
  slug: string;
  updatedAt: string;
}

// Example: Fetch blog slugs from your DB or API
async function getBlogs() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs/`);
  if (!res.ok) throw new Error("Failed to fetch blogs");
  const data = await res.json();
  return data.data;
}
async function getNews() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/news/`);
  if (!res.ok) throw new Error("Failed to fetch news");
  const data = await res.json();
  return data.data;
}

async function getCategory() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
}
async function getPackages() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/packages/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch packages");
  const data = await res.json();
  return data?.data;
}

async function getDestination() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/destination`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Failed to fetch posts");
  const data = await res.json();
  return data?.data ?? [];
}

const getAllWebPage = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/webpage/?status=published`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch webpages");
  const data = await res.json();
  return data?.data ?? [];
};

const getAllVisa = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa`);
  if (!res.ok) throw new Error("Failed to fetch Visa");
  const data = await res.json();
  return data?.data ?? [];
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const blogs = await getBlogs();
  const news = await getNews();
  const category = await getCategory();
  const categories = category?.data ?? [];
  const packages = await getPackages();
  const destinations = await getDestination();
  const webpages = await getAllWebPage();

  const visas = await getAllVisa();

  const uniqueDestinations = [];

  const seenDestinations = new Set();

  for (const pkg of packages) {
    const destId = pkg.destination?._id?.toString();
    if (destId && !seenDestinations.has(destId)) {
      seenDestinations.add(destId);
      uniqueDestinations.push(pkg);
    }
  }
  return [
    {
      url: "https://musafirbaba.com/",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://musafirbaba.com/blog",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://musafirbaba.com/news",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://musafirbaba.com/visa",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://musafirbaba.com/holidays",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://musafirbaba.com/destinations",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://musafirbaba.com/privacy-policy",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },

    {
      url: "https://musafirbaba.com/about-us",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...blogs.map((blog: blog) => ({
      url: `https://musafirbaba.com/blog/${blog.slug}`,
      lastModified: new Date(blog.updatedAt),
      changeFrequency: "daily",
      priority: 0.8,
    })),
    ...news.map((news: blog) => ({
      url: `https://musafirbaba.com/news/${news.slug}`,
      lastModified: new Date(news.updatedAt),
      changeFrequency: "daily",
      priority: 0.8,
    })),
    ...categories.map((cat: blog) => ({
      url: `https://musafirbaba.com/holidays/${cat.slug}`,
      lastModified: new Date(cat.updatedAt),
      changeFrequency: "daily",
      priority: 0.8,
    })),
    ...packages.map((pkg: Package) => ({
      url: `https://musafirbaba.com/holidays/${pkg.mainCategory?.slug}/${pkg.destination?.state}/${pkg.slug}`,
      lastModified: new Date(pkg.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    })),
    ...uniqueDestinations.map((dest: Package) => ({
      url: `https://musafirbaba.com/holidays/${dest.mainCategory?.slug}/${dest.destination?.state}`,
      lastModified: new Date(dest.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    })),
    ...destinations.map((cat: Destination) => ({
      url: `https://musafirbaba.com/destinations/${cat.state}`,
      lastModified: new Date(cat.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    })),
    ...webpages.map((page: Webpage) => ({
      url: `https://musafirbaba.com/${page?.fullSlug}`,
      lastModified: new Date(page.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    })),
    ...visas.map((page: Visa) => ({
      url: `https://musafirbaba.com/visa/${page?.slug}`,
      lastModified: new Date(page.updatedAt),
      changeFrequency: "weekly",
      priority: 0.7,
    })),
  ];
}
