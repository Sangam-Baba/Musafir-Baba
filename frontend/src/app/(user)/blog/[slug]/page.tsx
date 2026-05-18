import Image from "next/image";
import { BlogContent } from "@/components/custom/BlogContent";
import Link from "next/link";
import NotFoundPage from "@/components/common/Not-Found";
import CategorySidebar from "@/components/custom/CategorySidebar";
import BlogViewTracker from "@/components/custom/BlogViewTracker";
// import BlogLikes from "@/components/custom/BlogLikes";
import { BlogComments } from "@/components/custom/BuildCommentTree";
import SocialShare from "@/components/custom/SocialSharing";
import Script from "next/script";
import Breadcrumb from "@/components/common/Breadcrumb";
import { readingTime } from "@/utils/readingTime";
import { Clock, Folders, Share2, User, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getBlogSchema } from "@/lib/schema/blog.schema";
import { notFound } from "next/navigation";
import HelpfulResources from "@/components/custom/HelpfulResources";
import LatestBlog from "@/components/common/LatestBlog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommentDailog } from "@/components/custom/CommentDailog";
import { TableOfContents } from "@/components/custom/TableOfContents";
import { extractHeadings, addIdsToHeadings } from "@/utils/blogUtils";
import ReadingProgressBar from "@/components/custom/ReadingProgressBar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
// Fetch blog by slug
async function getBlog(slug: string, token?: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/blogs/${slug}?token=${token}`,
    {
      cache: "no-cache",
    },
  );

  if (!res.ok) return notFound();
  const data = await res.json();
  return data?.data;
}

async function getLatestBlog() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data;
}

async function getTrandingBlogs() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/blogs/tranding`,
    {
      next: { revalidate: 60 },
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data;
}

// SEO Metadata
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;
  const { blog } = await getBlog(slug, token);

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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;
  console.log("Preview Token:", token);
  const { blog, comments } = await getBlog(slug, token);
  if (!blog) return <NotFoundPage />;
  const readTime = readingTime(blog.content || "");

  const latestBlogs = await getLatestBlog();
  const trandingBlogs = await getTrandingBlogs();
  const filteredLatestBlog = latestBlogs.filter(
    (blog: any) => blog.slug !== slug,
  );
  const filteredTrandingBlogs = trandingBlogs.filter(
    (blog: any) => blog.slug !== slug,
  );

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

  const headings = extractHeadings(blog.content || "");
  const contentWithIds = addIdsToHeadings(blog.content || "");

  return (
    <div className="bg-white min-h-screen">
      <ReadingProgressBar />
      
      {/* Premium Split Hero Section */}
      <header className="w-full bg-white pt-8 pb-8 md:pt-12 md:pb-10 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          
          {/* Breadcrumbs Top Bar */}
          <div className="mb-12">
            <Breadcrumb title={blog.title} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Content */}
            <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-left duration-700">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-[#FE5300] text-white hover:bg-[#FE5300]/90 border-none px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-full shadow-sm">
                    {blog.category.name}
                  </Badge>
                  {(blog.tags || []).map((tag: string) => (
                    <span
                      key={tag}
                      className="text-gray-400 font-bold text-[11px] uppercase tracking-[0.2em] px-2 py-1 transition-all hover:text-[#FE5300]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                
                <h1 className="text-3xl md:text-5xl lg:text-5xl font-black text-gray-900 leading-[1.1] tracking-tight">
                  {blog.title}
                </h1>
              </div>

              <div className="flex flex-col gap-2 pt-4 pb-2">
                {/* First Line: Read Time and Views */}
                <div className="flex items-center flex-wrap gap-4 md:gap-6 text-[11px] md:text-[12px] font-bold text-gray-500 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-[#FE5300]" />
                    <span>{readTime} Min Read</span>
                  </div>
                  <Separator orientation="vertical" className="h-4 bg-gray-200" />
                  <div>
                    <BlogViewTracker id={blog?._id} view={blog.views} type="blog" />
                  </div>
                </div>
                
                {/* Second Line: Published Date */}
                <div className="text-[10px] md:text-[11px] font-normal text-gray-400 tracking-wide">
                  Published {new Date(blog.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Ultra-Wide Featured Image */}
            <div className="lg:col-span-8 relative animate-in fade-in slide-in-from-right duration-1000">
              <div className="w-full overflow-hidden rounded-3xl shadow-2xl group">
                <img
                  src={blog.coverImage.url}
                  alt={blog.title}
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              {/* Refined Ambient Glow */}
              <div className="absolute -z-10 -bottom-16 -right-16 w-64 h-64 bg-[#FE5300]/10 rounded-full blur-3xl opacity-55" />
              <div className="absolute -z-10 -top-16 -left-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl opacity-55" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content & Sidebar Grid */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 relative font-sans">
          
          {/* Left Sidebar: Author & TOC (Desktop Only) */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-12 h-fit space-y-2">
            
            {/* Written By Section */}
            <div className="space-y-6">
              <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-widest border-b pb-4">
                Written by
              </h3>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full border-2 border-white shadow-md overflow-hidden bg-[#FE5300] flex items-center justify-center shrink-0 relative">
                  <Image 
                    src={blog.author?.avatar?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${blog.author?.name}`} 
                    alt={blog.author?.name || "Author"}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <Link href={`/author/${blog.author?.slug}`} className="font-bold text-lg text-gray-900 hover:text-[#FE5300] transition-colors leading-tight">
                    {blog.author?.name}
                  </Link>
                  <span className="text-xs text-gray-500 font-medium mb-1.5">Senior Travel Expert</span>
                  {blog.author?.socialLinks && blog.author.socialLinks.length > 0 && (
                    <div className="flex items-center gap-2.5">
                      {blog.author.socialLinks.map((social: any, idx: number) => {
                        const platform = social.platform.toLowerCase();
                        let Icon = null;
                        if (platform === 'facebook') Icon = Facebook;
                        if (platform === 'twitter') Icon = Twitter;
                        if (platform === 'instagram') Icon = Instagram;
                        if (platform === 'linkedin') Icon = Linkedin;
                        if (!Icon) return null;
                        return (
                          <a key={idx} href={social.link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#FE5300] transition-colors bg-gray-50 p-1.5 rounded-full border border-gray-100">
                            <Icon size={12} strokeWidth={2.5} />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Table of Contents */}
            <TableOfContents headings={headings} />
            
            {/* Social Share (Vertical) */}
            <div className="pt-6 border-t">
               <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">Share this article</h3>
               <SocialShare
                url={`https://musafirbaba.com/blog/${blog.slug}`}
                title={blog.title}
                type="vertical"
              />
            </div>
          </aside>

          {/* Center Column: Main Article */}
          <main className="lg:col-span-9 xl:col-span-9 2xl:col-span-9">
            <article>
              
              {/* Summary Box (Excerpt Transformation) */}
              <div className="relative py-6 px-6 md:px-8 mb-12 bg-[#e7f6ed] rounded-2xl border border-green-100 overflow-hidden shadow-sm group">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-bold text-green-800 tracking-widest uppercase">
                    Quick Summary
                  </span>
                </div>
                <p className="text-base md:text-lg font-normal leading-relaxed text-green-900/90 text-justify">
                  {blog.excerpt}
                </p>
              </div>

              {/* Mobile Table of Contents */}
              <div className="lg:hidden mb-12">
                <TableOfContents headings={headings} />
              </div>

              {/* Main Content Body */}
              <section className="prose prose-lg md:prose-xl max-w-none 
                prose-headings:text-gray-900 prose-headings:font-black prose-headings:tracking-tight
                prose-p:text-gray-700/90 prose-p:leading-[1.8] prose-p:mb-8
                prose-a:text-[#FE5300] prose-a:no-underline hover:prose-a:underline
                prose-img:rounded-[2rem] prose-img:shadow-2xl prose-img:my-16
                prose-strong:text-gray-900
                prose-ul:list-disc prose-ul:pl-6
                prose-li:text-gray-700/90 prose-li:mb-2 text-justify">
                <BlogContent html={contentWithIds} />
              </section>

              {/* Footer Metadata */}
              <div className="mt-20 py-12 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8">
                 <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Status Tracking</span>
                    <BlogViewTracker id={blog?._id} view={blog.views} type="blog" />
                 </div>
                 <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <SocialShare
                      url={`https://musafirbaba.com/blog/${blog.slug}`}
                      title={blog.title}
                    />
                  </div>
                </div>
              </div>

              {/* Resources */}
              {blog.footerLinks && blog.footerLinks.length > 0 && (
                <div className="mt-8">
                  <HelpfulResources data={blog.footerLinks ?? []} />
                </div>
              )}
              {/* Trending Categories Hashtags */}
              <div className="mt-16 pt-16 border-t border-gray-100">
                <div className="flex flex-col gap-6">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Explore Categories</h3>
                  <div className="-mx-3">
                    <CategorySidebar />
                  </div>
                </div>
              </div>
            </article>

            {/* Widgets Section */}
            <section className="mt-24 space-y-12">
              <Separator className="bg-gray-100" />
              <div className="flex flex-col gap-10">
                <Tabs defaultValue="latest" className="w-full">
                  <TabsList className="bg-gray-50 border p-1 rounded-xl mb-10 inline-flex">
                    <TabsTrigger
                      value="latest"
                      className="rounded-lg px-8 py-2.5 data-[state=active]:bg-white data-[state=active]:text-[#FE5300] data-[state=active]:shadow-sm font-bold transition-all text-sm"
                    >
                      Latest Blog
                    </TabsTrigger>
                    <TabsTrigger
                      value="trending"
                      className="rounded-lg px-8 py-2.5 data-[state=active]:bg-white data-[state=active]:text-[#FE5300] data-[state=active]:shadow-sm font-bold transition-all text-sm"
                    >
                      Trending Articles
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="latest" className="animate-in fade-in zoom-in-95 duration-500">
                    <LatestBlog blogs={filteredLatestBlog} title="Latest Blog" type="latest" url="blog" />
                  </TabsContent>
                  <TabsContent value="trending" className="animate-in fade-in zoom-in-95 duration-500">
                    <LatestBlog blogs={filteredTrandingBlogs} title="Trending Blog" type="trending" url="blog" />
                  </TabsContent>
                </Tabs>
              </div>
            </section>

            {/* Comments Section */}
            <section className="mt-24 pt-16 border-t border-gray-100">
              <div className="max-w-3xl">
                <h3 className="text-4xl font-black mb-4 text-gray-900 tracking-tight">Community Insights</h3>
                <p className="text-gray-500 mb-12 text-lg">Have a question or a story to share? Join the conversation below.</p>
                <CommentDailog blogId={blog._id} initialComments={comments} type="blog" />
              </div>
            </section>
          </main>
      </div>
    </div>

      <Script
        id="blog-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </div>
  );
}
