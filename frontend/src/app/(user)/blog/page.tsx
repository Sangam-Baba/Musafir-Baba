import BlogCard from "@/components/custom/BlogCard";
import Hero from "@/components/custom/Hero";
import { Metadata } from "next";
import Breadcrumb from "@/components/common/Breadcrumb";
import PaginationClient from "@/components/common/PaginationClient";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getCollectionSchema } from "@/lib/schema/collection.schema";

export const metadata: Metadata = {
  title: "Travel Blog - Guides, Tips & Travel Inspiration",
  description:
    "Travel Blog - Guides, Tips & Travel Inspiration!Discover travel secrets on our blog! Get complete guides, visa assistance, amazing tours, money-saving tips, and inspiration for incredible adventures.",
  alternates: {
    canonical: "https://musafirbaba.com/blog",
  },
};
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
}
async function getBlogs(page: number, category?: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/blogs?category=${category}&page=${page}&limit=12`,
    {
      next: { revalidate: 60 }, // ISR: revalidate every 1 minute
    }
  );

  if (!res.ok) throw new Error("Failed to fetch blogs");
  const data = await res.json();
  return data;
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category: string; page: number }>;
}) {
  const { category } = await searchParams;
  const { page } = (await searchParams) || 1;
  const CurrPage = Number(page);
  const data = await getBlogs(CurrPage, category);
  const blogs = data?.data;
  const totalPages = data?.pages;

  const breadcrumb = getBreadcrumbSchema("blog");
  const collectionSchema = getCollectionSchema(
    "Blog",
    "https://musafirbaba.com/blog",
    blogs.map((blog: blog) => ({
      url: `https://musafirbaba.com/blog/${blog.slug}`,
    }))
  );

  return (
    <section className="w-full ">
      <Hero image="/Heroimg.jpg" title="Blog" overlayOpacity={100} />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      <div className="container max-w-7xl mx-auto py-10 px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogs.map((blog: blog) => (
          <BlogCard
            key={blog._id}
            type="blog"
            title={blog.title}
            coverImage={blog.coverImage.url}
            description={blog.metaDescription}
            slug={blog.slug}
          />
        ))}
      </div>
      <PaginationClient totalPages={totalPages} currentPage={CurrPage} />

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
