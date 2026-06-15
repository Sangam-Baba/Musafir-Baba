import Image from "next/image";
import { BlogContent } from "@/components/custom/BlogContent";
import Link from "next/link";
import NotFoundPage from "@/components/common/Not-Found";
import CategorySidebar from "@/components/custom/CategorySidebar";
import dynamic from "next/dynamic";

const BlogViewTracker = dynamic(() => import("@/components/custom/BlogViewTracker"));
const SocialShare = dynamic(() => import("@/components/custom/SocialSharing"));

// import BlogLikes from "@/components/custom/BlogLikes";
import { BlogComments } from "@/components/custom/BuildCommentTree";
import Script from "next/script";
import Breadcrumb from "@/components/common/Breadcrumb";
import { readingTime } from "@/utils/readingTime";
import { Clock, Folders, Share2, User, Facebook, Twitter, Instagram, Linkedin, Trophy, Medal, Star } from "lucide-react";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getBlogSchema } from "@/lib/schema/blog.schema";
import { notFound } from "next/navigation";
import HelpfulResources from "@/components/custom/HelpfulResources";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const LatestBlog = dynamic(() => import("@/components/common/LatestBlog"));
const CommentDailog = dynamic(() => import("@/components/custom/CommentDailog").then(mod => mod.CommentDailog));
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
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs?limit=5`, {
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

  const [latestBlogsResponse, trandingBlogsResponse] = await Promise.all([
    getLatestBlog(),
    getTrandingBlogs()
  ]);

  const latestBlogs = latestBlogsResponse || [];
  const trandingBlogs = trandingBlogsResponse || [];
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
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
                
                <h1 className="text-3xl  font-black text-gray-900 leading-[1.2] tracking-tight">
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
              <div className="w-full overflow-hidden rounded-3xl group">
                <Image
                  src={blog.coverImage.url}
                  alt={blog.title}
                  width={1200}
                  height={800}
                  priority
                  fetchPriority="high"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 66vw"
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
      <div className="max-w-[1400px] mx-auto px-6 lg:px-16 xl:px-24 2xl:px-32 py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 relative font-sans">
          
          {/* Left Sidebar: Author & TOC (Desktop Only) */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-12 h-fit space-y-2">
            
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
                  <span className="text-xs text-gray-500 font-medium mb-1.5">Author</span>
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
                        const validUrl = social.link?.startsWith('http') ? social.link : `https://${social.link}`;
                        return (
                          <a key={idx} href={validUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#FE5300] transition-colors bg-gray-50 p-1.5 rounded-full border border-gray-100">
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
            
            {/* Trusted Badges */}
            <div className="pt-6 border-t space-y-3">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Why Choose Us</h3>
              
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/30 border border-orange-100/50 shadow-sm group hover:shadow-md transition-all duration-300">
                <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Trophy className="w-5 h-5 text-[#FE5300]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#FE5300] uppercase tracking-widest leading-none mb-1">Award Winning</span>
                  <span className="text-[13px] font-bold text-gray-800 leading-tight">Top Rated Travel Experts</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/30 border border-blue-100/50 shadow-sm group hover:shadow-md transition-all duration-300">
                <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Medal className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none mb-1">100% Authentic</span>
                  <span className="text-[13px] font-bold text-gray-800 leading-tight">India's Most Trusted Tours</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/30 border border-emerald-100/50 shadow-sm group hover:shadow-md transition-all duration-300">
                <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Star className="w-5 h-5 text-emerald-500 fill-emerald-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none mb-1">5 Star Rated</span>
                  <span className="text-[13px] font-bold text-gray-800 leading-tight">Loved by 10k+ Explorers</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Center Column: Main Article */}
          <main className="lg:col-span-8 xl:col-span-8 2xl:col-span-8">
            <article>
              
              {/* Summary Box (Excerpt Transformation) */}
              <div className="mb-14 pl-5 md:pl-6 border-l-4 border-[#FE5300] py-1">
                <p className="text-base font-normal leading-[1.8] text-gray-700 italic">
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
                prose-p:text-gray-700/90 prose-p:leading-[1.8] prose-p:mb-4
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
