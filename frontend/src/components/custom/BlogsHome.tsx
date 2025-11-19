import { MoveRightIcon } from "lucide-react";
import React from "react";
import Link from "next/link";
import { Card, CardContent } from "../ui/card";
import Image from "next/image";

interface Blog {
  _id: string;
  title: string;
  content: string;
  excerpt: string;
  coverImage: {
    url: string;
    public_id: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  slug: string;
  updatedAt: string;
  createdAt: string;
}

const getBlogs = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs`, {
    next: { revalidate: 3600 },
  });
  const data = await res.json();
  return data.data;
};

async function BlogsHome() {
  const blogs = await getBlogs();

  if (!blogs.length) return null;

  const [featured, ...rest] = blogs;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-20 py-8 md:py-16">
      {/* Header */}
      <div className="flex w-full justify-between gap-2 items-center mb-10">
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold">
            Latest Travel Trends & Tips
          </h2>
          <p className="w-20 h-1 bg-[#FE5300] mt-2"></p>
          <p>Read travel guides, insights, and expert tips.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Link href="/blog" className="text-[#FE5300] font-semibold">
            View all articles
          </Link>
          <MoveRightIcon className="w-4 h-4 text-[#FE5300]" />
        </div>
      </div>

      <div className="w-full flex flex-col-reverse md:flex-row gap-6 justify-between items-center">
        <div className="md:w-1/2 flex flex-col gap-4">
          {rest.slice(0, 4).map((blog: Blog) => (
            <Card
              key={blog._id}
              className="flex flex-row items-center px-2 py-2 gap-2 rounded-xl shadow hover:shadow-lg transition"
            >
              <Image
                src={blog.coverImage.url}
                alt={blog.coverImage.alt || blog.title}
                width={120}
                height={80}
                className="rounded-md object-cover"
              />
              <CardContent className="p-2">
                <Link
                  href={`/blog/${blog.slug}`}
                  className="font-semibold text-sm line-clamp-2 hover:text-[#FE5300]"
                >
                  {blog.title}
                </Link>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(blog.createdAt).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  • 6 MIN READ
                </p>
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                  {blog.excerpt}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex md:w-1/2">
          <Card className="flex  justify-center ietms-center rounded-xl shadow hover:shadow-lg transition py-2 px-2 ">
            <Image
              src={featured.coverImage.url}
              alt={featured.coverImage.alt || featured.title}
              width={480}
              height={200}
              className="rounded-xl object-cover w-full h-full"
            />
            <CardContent className="">
              <Link
                href={`/blog/${featured.slug}`}
                className="text-lg md:text-xl font-semibold hover:text-[#FE5300]"
              >
                {featured.title}
              </Link>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(featured.createdAt).toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}{" "}
                • 6 MIN READ
              </p>
              <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                {featured.excerpt}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default BlogsHome;
