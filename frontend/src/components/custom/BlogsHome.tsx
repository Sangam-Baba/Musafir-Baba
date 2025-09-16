"use client"
import { MoveRightIcon } from "lucide-react";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "../ui/card";
import { Loader } from "@/components/custom/loader";
import Image from "next/image";
import { toast } from "sonner";

interface Blog {
  _id: string;
  title: string;
  content: string;
  metaDescription: string;
  coverImage: {
    url: string;
    public_id: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  slug: string;
  updatedAt: string;
}

function BlogsHome() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/blogs`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (data.success) {
        setBlogs(data.data);
      } else {
        toast.error(data.message || "Failed to fetch blogs");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong fetching blogs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  if (loading) return <Loader />;

  if (!blogs.length) return null;

 
  const [featured, ...rest] = blogs;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 lg:px-20 py-16">
      {/* Header */}
      <div className="flex w-full justify-between gap-2 items-center mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Latest Travel Trends</h1>
          <div className="w-20 h-1 bg-[#FE5300] mt-2"></div>
        </div>
        <div className="flex gap-2 items-center">
          <Link href="/blog" className="text-[#FE5300] font-semibold">
            View all articles
          </Link>
          <MoveRightIcon className="w-4 h-4 text-[#FE5300]" />
        </div>
      </div>

     
      <div className="w-full flex flex-col md:flex-row gap-6 justify-between items-center">
        {/* Left side - smaller blog list */}
        <div className="md:w-1/2 flex flex-col gap-4">
          {rest.slice(0, 4).map((blog) => (
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
                  {new Date(blog.updatedAt).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  • 6 MIN READ
                </p>
                <p>{blog.metaDescription}</p>
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
              className="rounded-xl "
            />
            <CardContent className="">
              <Link
                href={`/blog/${featured.slug}`}
                className="text-lg md:text-xl font-semibold hover:text-[#FE5300]"
              >
                {featured.title}
              </Link>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(featured.updatedAt).toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}{" "}
                • 6 MIN READ
              </p>
              <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                {featured.metaDescription}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default BlogsHome;
