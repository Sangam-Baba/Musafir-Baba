import BlogCard from "@/components/custom/BlogCard";
import Hero from "@/components/custom/Hero";
import { Metadata } from "next";
import Breadcrumb from "@/components/common/Breadcrumb";
import PaginationClient from "@/components/common/PaginationClient";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getCollectionSchema } from "@/lib/schema/collection.schema";
import ReadMore from "@/components/common/ReadMore";

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
  searchParams: Promise<{ page: string }>;
}) {
  const { page = "1" } = (await searchParams) ?? "1";
  const currPage = Number(page);
  const data = await getNews(currPage);
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

  const content = `

<p>
  The travel industry moves fast. Visa rules change, destinations rise and fall, airlines open new routes, and travel trends evolve every season. The MusafirBaba Travel News page brings together verified, relevant, and easy-to-understand travel updates that matter to Indian travellers.
</p>

<p>
  From tourism announcements and destination trends to visa updates and global travel movements, this page helps you stay informed before you plan your next trip.
</p>

<h2>Why Travel News Matters More Than Ever</h2>

<p>
  Travel today is influenced by more than just destinations. Decisions are shaped by:
</p>

<ul>
  <li>Visa policy changes</li>
  <li>Tourism infrastructure upgrades</li>
  <li>Crowd patterns and seasonal trends</li>
  <li>Airline connectivity and routes</li>
  <li>Safety, sustainability, and regulations</li>
</ul>

<p>
  Following reliable travel news helps travellers make smarter, timely, and safer travel decisions.
</p>

<h2>What You’ll Find On MusafirBaba News</h2>

<p>
  This page curates travel-focused news from India and across the world, simplified for easy reading and real-world relevance.
</p>

<h3>Visa &amp; Immigration Updates</h3>

<p>
  Visa rules directly impact travel plans. Our news coverage includes:
</p>

<ul>
  <li>Visa-free and visa-on-arrival announcements</li>
  <li>Changes in processing times and fees</li>
  <li>New digital or e-visa systems</li>
  <li>Long-term and special visa categories</li>
</ul>

<p>
  These updates are especially useful for international travellers and frequent flyers.
</p>

<h3>Destination &amp; Tourism News</h3>

<p>
  Destinations evolve constantly. We track:
</p>

<ul>
  <li>New tourist hotspots</li>
  <li>Cities and states entering global travel rankings</li>
  <li>Infrastructure developments (airports, rail, highways)</li>
  <li>Seasonal travel advisories</li>
</ul>

<p>
  This helps travellers discover places before they become overcrowded.
</p>

<h3>Transport &amp; Connectivity Updates</h3>

<p>
  Better connectivity changes travel possibilities. Coverage includes:
</p>

<ul>
  <li>New flight routes from India</li>
  <li>Rail upgrades and premium train launches</li>
  <li>Airport expansions and terminal openings</li>
  <li>Cruise and ferry developments</li>
</ul>

<p>
  These updates help reduce travel time and improve planning efficiency.
</p>

<h3>Travel Trends &amp; Industry Insights</h3>

<p>
  Understanding trends helps travellers stay ahead. We publish insights on:
</p>

<ul>
  <li>Emerging travel habits</li>
  <li>Budget vs luxury travel shifts</li>
  <li>Digital travel tools and platforms</li>
  <li>Changing preferences among Indian travellers</li>
</ul>

<p>
  These stories explain why people are travelling differently, not just where.
</p>

<h3>Responsible &amp; Practical Travel News</h3>

<p>
  Travel news also includes:
</p>

<ul>
  <li>Safety advisories</li>
  <li>Environmental and sustainability initiatives</li>
  <li>Crowd control and regulation updates</li>
  <li>Cultural and heritage preservation stories</li>
</ul>

<p>
  These help travellers travel responsibly and respectfully.
</p>

<h2>How MusafirBaba Curates Travel News</h2>

<p>
  Our travel news is curated with:
</p>

<ul>
  <li>Verified sources</li>
  <li>Clear summaries</li>
  <li>Practical relevance</li>
  <li>Indian traveller perspective</li>
</ul>

<p>
  We avoid unnecessary sensationalism and focus on what actually affects travel decisions.
</p>

<h2>Who Should Follow This Page?</h2>

<p>
  The MusafirBaba News section is ideal for:
</p>

<ul>
  <li>Indian international travellers</li>
  <li>Domestic explorers</li>
  <li>Honeymoon planners</li>
  <li>Business and corporate travellers</li>
  <li>Travel professionals and planners</li>
</ul>

<p>
  If travel is part of your lifestyle or work, staying updated gives you an advantage.
</p>

<h2>How This News Helps You Plan Better</h2>

<p>
  By following travel news regularly, you can:
</p>

<ul>
  <li>Avoid last-minute surprises</li>
  <li>Choose destinations at the right time</li>
  <li>Understand visa timelines early</li>
  <li>Discover new travel opportunities</li>
  <li>Plan trips with confidence</li>
</ul>

<p>
  Good travel decisions start with good information.
</p>

<h2>Updated Regularly With What Matters</h2>

<p>
  The MusafirBaba News page is updated frequently to reflect:
</p>

<ul>
  <li>Latest tourism announcements</li>
  <li>Breaking travel updates</li>
  <li>Policy changes impacting travellers</li>
  <li>New destination highlights</li>
</ul>

<p>
  Each update is chosen for relevance—not noise.
</p>

<h2>Trusted Travel Information, All In One Place</h2>

<p>
  With so much information online, clarity matters. This page acts as a single, trusted destination for travel news, keeping things:
</p>

<ul>
  <li>Simple</li>
  <li>Accurate</li>
  <li>Actionable</li>
</ul>

<p>
  Whether you’re planning your next holiday or tracking global travel shifts, this page keeps you informed.
</p>
`;

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
      {/* SHow description */}

      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-8 lg:px-10 mt-10">
        <ReadMore content={content} />
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
      <PaginationClient totalPages={totalPages} currentPage={currPage} />
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
