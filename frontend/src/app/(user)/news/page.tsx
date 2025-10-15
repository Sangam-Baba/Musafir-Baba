import BlogCard from "@/components/custom/BlogCard";
import Hero from "@/components/custom/Hero";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Travel News & Visa Updates - Stay Informed, Travel Better",
  description:
    "Smart travelers read us first. Get exclusive travel insights, destination news & visa updates that make every trip better.",
  alternates: {
    canonical: "https://musafirbaba.com/news",
  },
};
interface coverImage {
  url: string;
  public_id: string;
  width: number;
  height: number;
  alt: string;
}
interface news {
  _id: string;
  title: string;
  coverImage: coverImage;
  content: string;
  metaDescription: string;
  slug: string;
}
async function getNews() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/news/`, {
    next: { revalidate: 60 }, // ISR: revalidate every 1 minute
  });

  if (!res.ok) throw new Error("Failed to fetch News");
  const data = await res.json();
  // console.log(data);
  return data.data;
}

export default async function NewsPage() {
  const news = await getNews();

  return (
    <section className="w-full ">
      <Hero image="/Heroimg.jpg" title="News" />
      <div className="container max-w-7xl mx-auto py-10 px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {news.map((blog: news) => (
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
    </section>
  );
}
