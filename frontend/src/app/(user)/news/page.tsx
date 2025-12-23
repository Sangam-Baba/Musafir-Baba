import BlogCard from "@/components/custom/BlogCard";
import Hero from "@/components/custom/Hero";
import { Metadata } from "next";
import Breadcrumb from "@/components/common/Breadcrumb";
import PaginationClient from "@/components/common/PaginationClient";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getCollectionSchema } from "@/lib/schema/collection.schema";

export const metadata: Metadata = {
  title: "Travel News & Visa Updates - Stay Informed, Travel Better",
  description:
    "Smart travelers read us first. Get exclusive travel insights, destination news & visa updates that make every trip better.",
  alternates: {
    canonical: "https://musafirbaba.com/news",
  },
};
export interface coverImage {
  url: string;
  public_id: string;
  width?: number;
  height?: number;
  alt: string;
}
export interface News {
  _id: string;
  title: string;
  coverImage: coverImage;
  content: string;
  metaDescription: string;
  slug: string;
  excerpt: string;
  createdAt: string;
  updatedAt: string;
}
export async function getNews(page: number) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/news/?page=${page}&limit=12`,
    {
      next: { revalidate: 60 },
    }
  );

  if (!res.ok) throw new Error("Failed to fetch News");
  const data = await res.json();
  return data;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: { page: number };
}) {
  const page = Number(searchParams.page) || 1;
  const data = await getNews(page);
  const news = data?.data;
  const totalPages = data?.pages;

  const breadcrumb = getBreadcrumbSchema("news");
  const collectionSchema = getCollectionSchema(
    "News",
    "https://musafirbaba.com/blog",
    news.map((news: News) => ({
      url: `https://musafirbaba.com/blog/${news.slug}`,
    }))
  );

  return (
    <section className="w-full ">
      <Hero
        image="https://res.cloudinary.com/dmmsemrty/image/upload/v1763716873/istockphoto-1328182974-640x640_u0562o.jpg"
        title="News"
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      <div className="container max-w-7xl mx-auto py-10 px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((blog: News) => (
          <BlogCard
            key={blog._id}
            type="news"
            title={blog.title}
            coverImage={blog.coverImage.url}
            description={blog.metaDescription}
            slug={blog.slug}
          />
        ))}
      </div>
      <PaginationClient totalPages={totalPages} currentPage={page} />
      <script
        key="collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <script
        key="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </section>
  );
}
