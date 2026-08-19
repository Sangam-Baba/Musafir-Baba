import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Newspaper } from "lucide-react";
import type { News } from "@/app/(user)/news/page";

// Homepage-only replacement for the shared BlogsHome component
// (components/custom/BlogsHome.tsx) — that file stays untouched since it's
// also used on about-us/page.tsx.
//
// Fetches the dedicated /blogs and /news/ endpoints directly (same ones
// src/app/(user)/blog/page.tsx and news/page.tsx already use) instead of
// /dashboard/combined-news-blog — that combined feed only ever returns a
// handful of "latest mixed" items (5 total the day this was built: 3 blogs,
// 2 news), which can't guarantee 3 of each. The dedicated endpoints have a
// full 10 real items each, so pulling a pool of 4 per type guarantees a
// real 3-item baseline, growing to 4 on wider screens — always a single
// row, never wrapping. Capped at 4 (not 5): within this section's shared
// max-w-7xl width (same as every other homepage section), 5-across felt
// visibly cramped — 4 leaves each card room to breathe.
const POOL_SIZE = 4;
const BASE_COUNT = 3;

interface FeedItem extends News {
  type: "blog" | "news";
}

async function getBlogs(): Promise<FeedItem[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs?category=&page=1&limit=${POOL_SIZE}`, {
      next: { revalidate: 360 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data ?? []).map((b: News) => ({ ...b, type: "blog" as const }));
  } catch {
    return [];
  }
}

async function getNews(): Promise<FeedItem[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/news/?page=1&limit=${POOL_SIZE}`, {
      next: { revalidate: 360 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data ?? []).map((n: News) => ({ ...n, type: "news" as const }));
  } catch {
    return [];
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

// Genuine estimate from the real excerpt word count (~200wpm), not an
// invented number — omitted entirely if there's no excerpt to derive it from.
function readTime(excerpt?: string) {
  if (!excerpt) return null;
  const words = excerpt.trim().split(/\s+/).filter(Boolean).length;
  if (!words) return null;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function Card({ item, badge, badgeColor }: { item: FeedItem; badge: string; badgeColor: string }) {
  const rt = readTime(item.excerpt);
  return (
    <Link href={`/${item.type}/${item.slug}`} className="group flex flex-col">
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 mb-2">
        {item.coverImage?.url ? (
          <Image
            src={item.coverImage.url}
            alt={item.coverImage.alt || item.title}
            fill
            sizes="200px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Newspaper className="w-6 h-6 text-gray-300" />
          </div>
        )}
        <span className={`absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-full text-white ${badgeColor}`}>
          {badge}
        </span>
      </div>
      <p className="text-[12.5px] font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-[#FE5300] transition-colors">
        {item.title}
      </p>
      <p className="text-[10.5px] text-gray-400 mt-1">
        {formatDate(item.createdAt)}
        {rt ? ` • ${rt}` : ""}
      </p>
    </Link>
  );
}

function Panel({
  title,
  items,
  viewAllHref,
  viewAllLabel,
  badge,
  badgeColor,
}: {
  title: string;
  items: FeedItem[];
  viewAllHref: string;
  viewAllLabel: string;
  badge: string;
  badgeColor: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="bg-[#FAFAFB] border border-gray-100 rounded-2xl p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-semibold text-gray-900">{title}</h3>
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-[11px] font-semibold text-gray-700 border border-gray-200 rounded-full px-3 py-1.5 hover:border-[#FE5300] hover:text-[#FE5300] transition-colors flex-shrink-0"
        >
          {viewAllLabel} <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {/* flex-nowrap — always exactly one row, count grows with width
          instead of wrapping to a second row. 3 always visible; the 4th
          reveals at xl once there's genuinely enough width for it to
          breathe rather than cramming in earlier. */}
      <div className="flex flex-nowrap gap-4 overflow-hidden">
        {items.map((item, i) => (
          <div
            key={item._id}
            className={`flex-1 min-w-0 ${i === 3 ? "hidden xl:block" : ""}`}
          >
            <Card item={item} badge={badge} badgeColor={badgeColor} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function TravelStoriesNewsSection() {
  const [blogs, news] = await Promise.all([getBlogs(), getNews()]);

  if (blogs.length === 0 && news.length === 0) return null;

  return (
    <section className="w-full px-4 md:px-10 py-8 md:py-10">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-5">
        <Panel
          title="Travel Stories & Tips"
          items={blogs}
          viewAllHref="/blog"
          viewAllLabel="View All Blogs"
          badge="Blog"
          badgeColor="bg-[#FE5300]"
        />
        <Panel
          title="Travel News & Updates"
          items={news}
          viewAllHref="/news"
          viewAllLabel="View All News"
          badge="News"
          badgeColor="bg-blue-600"
        />
      </div>
    </section>
  );
}
