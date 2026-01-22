import Image from "next/image";
import { BlogContent } from "@/components/custom/BlogContent";
import Link from "next/link";
import NotFoundPage from "@/components/common/Not-Found";
import QueryForm from "@/components/custom/QueryForm";
import CategorySidebar from "@/components/custom/CategorySidebar";
import LatestBlogSidebar from "@/components/custom/LatestBlogSidebar";
import BlogViewTracker from "@/components/custom/BlogViewTracker";
import TrandingBlogSidebar from "@/components/custom/TrandingBlogSidebar";
import BlogLikes from "@/components/custom/BlogLikes";
import { BlogComments } from "@/components/custom/BuildCommentTree";
import SocialShare from "@/components/custom/SocialSharing";
import Script from "next/script";
import Breadcrumb from "@/components/common/Breadcrumb";
import { readingTime } from "@/utils/readingTime";
import { Clock, Share2, User } from "lucide-react";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getBlogSchema } from "@/lib/schema/blog.schema";
import { notFound } from "next/navigation";
import HelpfulResources from "@/components/custom/HelpfulResources";
// Fetch blog by slug
async function getBlog(slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs/${slug}`, {
    cache: "no-cache",
  });

  if (!res.ok) return notFound();
  const data = await res.json();
  return data?.data;
}

// SEO Metadata
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { blog } = await getBlog(slug);

  if (!blog) {
    return {
      title: "Blog Not Found | Musafir Baba",
      description: "The requested blog could not be found.",
    };
  }

  const title = blog.metaTitle || blog.title;
  const description =
    blog.metaDescription ||
    blog.excerpt ||
    blog.content?.slice(0, 160) ||
    "Read this travel blog on Musafir Baba.";
  const image =
    blog.coverImage?.url || "https://musafirbaba.com/default-og.jpg";
  const url = blog?.canonicalUrl
    ? `https://musafirbaba.com${blog.canonicalUrl}`
    : `https://musafirbaba.com/blog/${blog.slug}`;

  return {
    title,
    description,
    keywords: blog.keywords?.length
      ? blog.keywords.join(", ")
      : blog.tags?.join(", "),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Musafir Baba",
      type: "article",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

// Blog Detail Page
export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { blog, comments } = await getBlog(slug);
  if (!blog) return <NotFoundPage />;
  const readTime = readingTime(blog.content || "");

  const breadcrumbSchema = getBreadcrumbSchema("blog/" + blog.slug);
  const blogSchema = getBlogSchema(
    blog.title,
    blog.description,
    blog.slug,
    blog.coverImage?.url,
    blog.createdAt,
    blog.updatedAt,
    blog.author?.name,
  );

  return (
    <div>
      <div className="flex flex-col mx-auto max-w-7xl px-12 mt-5">
        <Breadcrumb />
      </div>
      <div className="flex flex-col lg:flex-row gap-8 mx-auto max-w-7xl py-4 px-12">
        <article className="lg:w-6/9 space-y-5 ">
          {/* Title & Meta */}
          <header className="my-6 space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold">{blog.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-2 ">
                <User size={16} />
                <Link href={`/author/${blog.author?.slug}`}>
                  {blog.author?.name}
                </Link>
              </span>
              <span>Category: {blog.category.name}</span>
              <span>
                📅{" "}
                {new Date(blog.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span>
                <BlogViewTracker id={blog?._id} view={blog.views} type="blog" />
              </span>
              {/* <span>
                <BlogLikes id={blog._id} initialLikes={blog.likes} />
              </span> */}
              <span className="flex gap-2 items-center">
                <Clock size={16} /> {readTime} Min Read
              </span>
            </div>
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-2">
              {blog.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </header>
          {/* Cover Image */}
          <div className="relative w-full h-80 md:h-96 rounded-2xl overflow-hidden shadow-lg">
            <Image
              src={blog.coverImage.url}
              alt={blog.title}
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="border border-gray-400 px-4 py-8 flex gap-6 w-full rounded-md bg-gray-50">
            <p className="bg-[#FE5300] w-1 md:h-15 h:40 rounded-lg"></p>
            <p className="italic text-gray-500">{blog.excerpt}</p>
          </div>

          {/* Blog Content */}
          <section className="prose prose-lg max-w-none mt-6">
            <BlogContent html={blog.content} />
          </section>
          {blog.footerLinks && blog.footerLinks.length > 0 && (
            <div className="mt-8 md:mt-10">
              <HelpfulResources data={blog.footerLinks ?? []} />
            </div>
          )}
          <div className="flex gap-3 mt-5">
            <p className="font-semibold ">
              Last Updated:{" "}
              <span className="text-gray-600">
                {new Date(blog.updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </p>
            <span className="relative group inline-block">
              {/* Social buttons (hidden until hover) */}
              <div className="absolute hidden group-hover:flex">
                <SocialShare
                  url={`https://musafirbaba.com/blog/${blog.slug}`}
                  title={blog.title}
                />
              </div>

              {/* Share icon */}
              <Share2 className="cursor-pointer" />
            </span>
          </div>

          {/* Comments Section */}
          <section className="mt-10 w-full">
            <BlogComments
              blogId={blog._id}
              initialComments={comments}
              type="blog"
            />
          </section>
        </article>
        <div className="lg:w-3/9 space-y-10">
          {/* <QueryForm /> */}
          <CategorySidebar />
          <LatestBlogSidebar currentId={blog._id} />
          <TrandingBlogSidebar currentId={blog._id} />
        </div>
        {/* ✅ JSON-LD Schema */}
        {/* {blog.schemaType?.includes("Blog") && ( */}
        <Script
          id="blog-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
        />
        {/* )} */}

        <Script
          id="breadcrumb-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema),
          }}
        />
      </div>
    </div>
  );
}
