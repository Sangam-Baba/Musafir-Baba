import Image from "next/image";
import { BlogContent } from "@/components/custom/BlogContent";
import Link from "next/link";
import NotFoundPage from "@/components/common/Not-Found";
import QueryForm from "@/components/custom/QueryForm";
import BlogViewTracker from "@/components/custom/BlogViewTracker";
import BlogLikes from "@/components/custom/BlogLikes";
import { BlogComments } from "@/components/custom/BuildCommentTree";
import SocialShare from "@/components/custom/SocialSharing";
import LatestNewsSidebar from "@/components/custom/LatestNewsSidebar";
import TrandingNewsSidebar from "@/components/custom/TrandingNewsSidebar";
import Script from "next/script";
import Breadcrumb from "@/components/common/Breadcrumb";
import { readingTime } from "@/utils/readingTime";
import { Clock, User, Share2 } from "lucide-react";
import { notFound } from "next/navigation";
// Fetch blog by slug
async function getNews(slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/news/${slug}`, {
    cache: "no-cache",
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.data;
}

// SEO Metadata
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const { news } = await getNews(params.slug);

  if (!news) {
    return {
      title: "News Not Found | Musafir Baba",
      description: "The requested news could not be found.",
    };
  }

  const title = news.metaTitle || news.title;
  const description =
    news.metaDescription ||
    news.excerpt ||
    news.content?.slice(0, 160) ||
    "Read this travel blog on Musafir Baba.";
  const image =
    news.coverImage?.url || "https://musafirbaba.com/default-og.jpg";
  const url = `https://musafirbaba.com/news/${news.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    keywords: news.keywords?.length
      ? news.keywords.join(", ")
      : news.tags?.join(", "),
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
export default async function NewsDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { news, comments } = await getNews(params.slug);
  if (!news) return notFound();
  const readTime = readingTime(news.content || "");
  const schema = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: news.title,
    description: news.metaDescription || news.excerpt,
    image: news.coverImage?.url || "https://musafirbaba.com/logo.svg",
    datePublished: news.createdAt,
    dateModified: news.updatedAt || news.createdAt,
    author: {
      "@type": "Person",
      name: news.author?.name || "Musafir Baba",
    },
    publisher: {
      "@type": "Organization",
      name: "Musafir Baba",
      logo: {
        "@type": "ImageObject",
        url: "https://musafirbaba.com/logo.svg",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://musafirbaba.com/news/${news.slug}`,
    },
  };

  return (
    <div>
      <div className="flex flex-col mx-auto max-w-7xl px-12 mt-5">
        <Breadcrumb />
      </div>
      <div className="flex flex-col lg:flex-row gap-8 mx-auto max-w-7xl py-4 px-12">
        <article className="lg:w-6/9  ">
          {/* Cover Image */}

          <div className="relative w-full h-80 md:h-96 rounded-2xl overflow-hidden shadow-lg">
            <Image
              src={news.coverImage.url}
              alt={news.title}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Title & Meta */}
          <header className="mt-6 space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold ">{news.title}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 items-center">
              <span className="flex items-center gap-2 ">
                <User size={16} />
                <Link href={`/author/${news.author?.slug}`}>
                  {news.author?.name}
                </Link>
              </span>
              <span>📅 {new Date(news.createdAt).toLocaleDateString()}</span>
              <span>
                <BlogViewTracker id={news._id} view={news?.views} type="news" />
              </span>
              <span>
                <BlogLikes id={news._id} initialLikes={news.likes} />
              </span>
              <span className="flex items-center gap-2 ">
                <Clock size={16} />
                {readTime} Min Read
              </span>
              <span className="relative group inline-block">
                {/* Social buttons (hidden until hover) */}
                <div className="absolute hidden group-hover:flex">
                  <SocialShare
                    url={`https://musafirbaba.com/news/${news.slug}`}
                    title={news.title}
                  />
                </div>

                {/* Share icon */}
                <Share2 className="cursor-pointer" />
              </span>
            </div>
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-2">
              {news.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </header>

          {/* Blog Content */}
          <section className="prose prose-lg max-w-none mt-6">
            <BlogContent html={news.content} />
          </section>

          {/* Comments Section */}
          <section className="mt-10 w-full">
            <BlogComments
              blogId={news._id}
              initialComments={comments}
              type="news"
            />
          </section>
        </article>
        <div className="lg:w-3/9">
          <QueryForm />
          <LatestNewsSidebar currentId={news?._id} />
          <TrandingNewsSidebar currentId={news?._id} />
        </div>
        {/* ✅ JSON-LD Schema */}
        <Script id="blog-schema" type="application/ld+json">
          {JSON.stringify(schema)}
        </Script>
      </div>
    </div>
  );
}
