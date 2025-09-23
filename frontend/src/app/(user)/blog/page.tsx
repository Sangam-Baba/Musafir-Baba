import BlogCard from "@/components/custom/BlogCard";
import Hero from "@/components/custom/Hero";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Travel Blog - Guides, Tips & Travel Inspiration",
  description: "Travel Blog - Guides, Tips & Travel Inspiration!Discover travel secrets on our blog! Get complete guides, visa assistance, amazing tours, money-saving tips, and inspiration for incredible adventures.",
  alternates: {
    canonical: "https://www.musafirbaba.com/blog",
  },
};
interface coverImage{
  url: string,
  public_id: string,
  width: number,
  height: number
  alt: string
}
interface blog{
  _id: string;
  title: string;
  coverImage: coverImage;
  content: string;
  metaDescription: string;
  slug: string;
}
interface blogs{
  blogs: blog[]
}
async function getBlogs() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs/`, {
    next: { revalidate: 60 }, // ISR: revalidate every 1 minute
  });

  if (!res.ok) throw new Error("Failed to fetch blogs");
  const data=await res.json();
  // console.log(data);
  return data.data;
}

export default async function BlogPage() {
  const blogs = await getBlogs();

  return (
    <section className="w-full ">
      <Hero
       image="/Heroimg.jpg" 
       title="Blog" 
       />
    <div className="container max-w-7xl mx-auto py-10 px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {blogs.map((blog: blog) => (
        <BlogCard
          key={blog._id}
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
