import BlogCard from "@/components/custom/BlogCard";
import Hero from "@/components/custom/Hero";
import { Metadata } from "next";
import Breadcrumb from "@/components/common/Breadcrumb";
import PaginationClient from "@/components/common/PaginationClient";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getCollectionSchema } from "@/lib/schema/collection.schema";
import Script from "next/script";
import ReadMore from "@/components/common/ReadMore";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Travel Blog - Guides, Tips & Travel Inspiration",
  description:
    "Travel Blog - Guides, Tips & Travel Inspiration!Discover travel secrets on our blog! Get complete guides, visa assistance, amazing tours, money-saving tips, and inspiration for incredible adventures.",
  alternates: {
    canonical: "https://musafirbaba.com/blog",
  },
  openGraph: {
    title: "Travel Blog - Guides, Tips & Travel Inspiration",
    description:
      "Travel Blog - Guides, Tips & Travel Inspiration!Discover travel secrets on our blog! Get complete guides, visa assistance, amazing tours, money-saving tips, and inspiration for incredible adventures.",
    url: "https://musafirbaba.com/blog",
    type: "website",
    images: "https://musafirbaba.com/homebanner.webp",
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
    `${process.env.NEXT_PUBLIC_BASE_URL}/blogs?category=${category}&page=${page}&limit=28`,
    {
      next: { revalidate: 60 }, // ISR: revalidate every 1 minute
    },
  );

  if (!res.ok) throw new Error("Failed to fetch blogs");
  const data = await res.json();
  return data;
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category: string; page: string }>;
}) {
  const { category } = await searchParams;
  const { page = "1" } = (await searchParams) || "1";
  const CurrPage = Number(page);
  const data = await getBlogs(CurrPage, category);
  const blogs = data?.data;
  const totalPages = data?.pages;

  const mainBlogs = blogs.length > 4 ? blogs.slice(0, 4) : null;
  const restBlogs = blogs.length > 4 ? blogs.slice(4) : blogs;

  const breadcrumb = getBreadcrumbSchema("blog");
  const collectionSchema = getCollectionSchema(
    "Blog",
    "https://musafirbaba.com/blog",
    blogs.map((blog: blog) => ({
      url: `https://musafirbaba.com/blog/${blog.slug}`,
    })),
  );
  const content = `
<p>
  Travel is not just about reaching a destination—it’s about making informed
  decisions, planning smartly, and experiencing places the right way.
  The MusafirBaba Travel Blog is designed for travelers who want
  <strong>clarity, confidence, and credible information</strong> before they pack their bags.
</p>

<p>
  Whether you’re planning a weekend getaway, a family holiday, a honeymoon,
  or an international trip, our blog brings together
  <strong>real travel insights, destination knowledge, and up-to-date travel news</strong>
  to help you travel better.
</p>

<h3>Why Follow the MusafirBaba Travel Blog?</h3>

<p>
  With years of hands-on experience in planning domestic and international tours,
  our travel experts understand the
  <strong>real questions travelers face</strong>—from choosing the right season to
  understanding visa rules, budgeting wisely, and avoiding common mistakes.
</p>

<p>This blog is built to:</p>

<ul>
  <li>Simplify trip planning</li>
  <li>Provide practical, experience-backed advice</li>
  <li>Cover destinations beyond surface-level recommendations</li>
  <li>Keep travelers informed about policy changes and travel trends</li>
</ul>

<p>
  Our content is written by travel professionals who work closely with destinations,
  suppliers, and real travelers every day.
</p>

<h3>What You’ll Find on Our Travel Blog</h3>

<h4>Destination Guides</h4>

<p>
  Explore detailed guides covering India and international destinations. These include:
</p>

<ul>
  <li>Best places to visit</li>
  <li>Ideal trip durations</li>
  <li>Seasonal travel advice</li>
  <li>Culture, food, and local experiences</li>
</ul>

<p>
  Each guide is written to help you decide where to go and how to plan,
  not just what to see.
</p>

<h4>Travel News &amp; Updates</h4>

<p>
  Travel rules change frequently—especially visas, entry regulations,
  airline policies, and tourism advisories.
  Our blog keeps you updated with:
</p>

<ul>
  <li>Visa rule changes</li>
  <li>Tourism policy announcements</li>
  <li>Airline and airport updates</li>
  <li>Festival and event travel alerts</li>
</ul>

<p>
  This is especially useful for international travelers and pilgrims planning
  time-sensitive journeys.
</p>

<h4>Smart Travel Tips</h4>

<p>
  From saving money to traveling responsibly, we cover practical tips such as:
</p>

<ul>
  <li>Budget planning for trips</li>
  <li>Packing essentials</li>
  <li>Avoiding tourist traps</li>
  <li>Choosing the right accommodation and transport</li>
</ul>

<p>
  These insights come from real planning scenarios handled by our travel experts.
</p>

<h4>Travel Inspiration &amp; Experiences</h4>

<p>
  Some journeys are about discovery and emotion. Our blog also features:
</p>

<ul>
  <li>Offbeat destinations</li>
  <li>Seasonal travel inspiration</li>
  <li>Nature, culture, and adventure stories</li>
  <li>Wellness, slow travel, and spiritual journeys</li>
</ul>

<p>
  This content helps travelers discover ideas they may not have considered earlier.
</p>

<h3>Who Is This Blog For?</h3>

<p>The MusafirBaba blog is ideal for:</p>

<ul>
  <li>First-time travelers looking for guidance</li>
  <li>Families planning safe and comfortable trips</li>
  <li>Couples searching for meaningful honeymoon destinations</li>
  <li>Backpackers and explorers</li>
  <li>Pilgrims and spiritual travelers</li>
  <li>International tourists seeking India-focused insights</li>
</ul>

<p>
  Whether you travel occasionally or frequently, the blog adapts to your planning needs.
</p>

<h3>How Our Blog Supports Better Trip Planning</h3>

<p>
  We don’t believe in generic advice. Every article is structured to help you:
</p>

<ul>
  <li>Compare destinations</li>
  <li>Understand travel feasibility</li>
  <li>Plan durations correctly</li>
  <li>Align budgets with expectations</li>
</ul>

<p>
  Many of our blog posts also connect directly to destination pages and tour categories,
  allowing readers to move naturally from research to planning.
</p>

<h3>Trust, Accuracy &amp; Experience</h3>

<p>All information shared on this blog is:</p>

<ul>
  <li>Based on real travel planning experience</li>
  <li>Updated regularly to reflect current conditions</li>
  <li>Written in simple, easy-to-understand language</li>
  <li>Designed to answer genuine traveler questions</li>
</ul>

<p>
  We avoid exaggerated claims and focus on honest, useful travel knowledge.
</p>
`;
  return (
    <section className="w-full space-y-5 ">
      {/* <Hero image="/Heroimg.jpg" title="Blog" overlayOpacity={100} /> */}
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <h1 className="text-2xl md:text-4xl font-semibold">Blog</h1>
      </div>
      {/* SHow description */}
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-8 lg:px-10 ">
        <ReadMore content={content} />
      </div>
      {mainBlogs && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-10 mt-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* LEFT BIG IMAGE */}
            <Link
              href={`/blog/${mainBlogs[0].slug}`}
              className="relative h-[520px] overflow-hidden group rounded-3xl shadow-2xl transition-all duration-500 hover:shadow-[#FE5300]/10"
            >
              {/* High-Vibrancy Mirror Atmosphere */}
              <div className="absolute inset-0 z-0">
                <Image
                  src={mainBlogs[0].coverImage.url}
                  alt=""
                  fill
                  className="object-cover blur-3xl scale-150 saturate-[2] brightness-[0.6] transition-transform duration-700 group-hover:scale-125"
                />
                <div className="absolute inset-0 bg-slate-950/10" />
              </div>

              {/* Main Image (Framed - Floats on atmosphere) */}
              <div className="absolute inset-0 flex items-center justify-center p-4 md:p-12 z-10 transition-transform duration-700 group-hover:scale-105">
                <Image
                  src={mainBlogs[0].coverImage.url}
                  alt={mainBlogs[0].title}
                  width={800}
                  height={600}
                  className="w-full h-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                  priority
                />
              </div>

              {/* Glassmorphism Text Panel */}
              <div className="absolute bottom-6 left-6 right-6 z-20">
                <div className="backdrop-blur-xl bg-black/30 p-6 md:p-8 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <h2 className="text-xl md:text-3xl font-bold leading-tight text-white group-hover:text-[#FE5300] transition-colors relative z-10">
                    {mainBlogs[0].title}
                  </h2>
                  <div className="flex items-center gap-3 text-sm mt-4 text-gray-200 font-medium relative z-10">
                    {mainBlogs[0].author?.name && (
                      <span className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#FE5300] flex items-center justify-center text-[11px] font-bold text-white uppercase border border-white/20">
                          {mainBlogs[0].author.name.charAt(0)}
                        </div>
                        {mainBlogs[0].author.name}
                      </span>
                    )}
                    <span className="opacity-40">•</span>
                    <span className="opacity-80">
                      {new Date(mainBlogs[0].createdAt).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </Link>

            {/* RIGHT COLUMN */}
            <div className="grid grid-rows-2 gap-2 h-[520px]">
              {/* TOP RIGHT */}
              <Link href={`/blog/${mainBlogs[1].slug}`} className="relative overflow-hidden group rounded-2xl shadow-xl">
                {/* High-Vibrancy Mirror Atmosphere */}
                <div className="absolute inset-0 z-0">
                  <Image
                    src={mainBlogs[1].coverImage.url}
                    alt=""
                    fill
                    className="object-cover blur-3xl scale-150 saturate-[2] brightness-[0.6]"
                  />
                  <div className="absolute inset-0 bg-slate-950/10" />
                </div>

                <div className="absolute inset-0 flex items-center justify-center p-6 z-10 transition-transform duration-700 group-hover:scale-110">
                  <Image
                    src={mainBlogs[1].coverImage.url}
                    alt={mainBlogs[1].title}
                    width={500}
                    height={300}
                    className="w-full h-full object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.7)]"
                  />
                </div>

                {/* Glassmorphism Text Overlay */}
                <div className="absolute bottom-4 left-4 right-4 z-20">
                  <div className="backdrop-blur-lg bg-black/40 p-4 rounded-xl border border-white/10">
                    <h3 className="text-lg md:text-xl font-bold leading-tight text-white group-hover:text-[#FE5300] transition-colors line-clamp-2">
                      {mainBlogs[1].title}
                    </h3>
                  </div>
                </div>
              </Link>

              {/* BOTTOM RIGHT (2 SMALL CARDS) */}
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/blog/${mainBlogs[2].slug}`} className="relative overflow-hidden group rounded-2xl shadow-lg">
                  {/* High-Vibrancy Mirror Atmosphere */}
                  <div className="absolute inset-0 z-0">
                    <Image
                      src={mainBlogs[2].coverImage.url}
                      alt=""
                      fill
                      className="object-cover blur-3xl scale-150 saturate-[2] brightness-[0.6]"
                    />
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center p-4 z-10 transition-transform duration-700 group-hover:scale-110">
                    <Image
                      src={mainBlogs[2].coverImage.url}
                      alt={mainBlogs[2].title}
                      width={300}
                      height={200}
                      className="w-full h-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]"
                    />
                  </div>

                  {/* Glassmorphism Text Overlay */}
                  <div className="absolute bottom-2 left-2 right-2 z-20">
                    <div className="backdrop-blur-md bg-black/40 p-3 rounded-xl border border-white/10">
                      <h4 className="text-sm font-bold leading-tight text-white group-hover:text-[#FE5300] transition-colors line-clamp-2">
                        {mainBlogs[2].title}
                      </h4>
                    </div>
                  </div>
                </Link>

                <Link href={`/blog/${mainBlogs[3].slug}`} className="relative overflow-hidden group rounded-2xl shadow-lg">
                  {/* High-Vibrancy Mirror Atmosphere */}
                  <div className="absolute inset-0 z-0">
                    <Image
                      src={mainBlogs[3].coverImage.url}
                      alt=""
                      fill
                      className="object-cover blur-3xl scale-150 saturate-[2] brightness-[0.6]"
                    />
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center p-4 z-10 transition-transform duration-700 group-hover:scale-110">
                    <Image
                      src={mainBlogs[3].coverImage.url}
                      alt={mainBlogs[3].title}
                      width={300}
                      height={200}
                      className="w-full h-full object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.6)]"
                    />
                  </div>

                  {/* Glassmorphism Text Overlay */}
                  <div className="absolute bottom-2 left-2 right-2 z-20">
                    <div className="backdrop-blur-md bg-black/40 p-3 rounded-xl border border-white/10">
                      <h4 className="text-sm font-bold leading-tight text-white group-hover:text-[#FE5300] transition-colors line-clamp-2">
                        {mainBlogs[3].title}
                      </h4>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container max-w-7xl mx-auto py-10 px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {restBlogs.map((blog: blog) => (
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

      <Script
        key="collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <Script
        key="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </section>
  );
}
