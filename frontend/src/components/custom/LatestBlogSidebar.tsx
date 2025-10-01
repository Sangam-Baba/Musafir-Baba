"use client";
import React, { useState, useEffect } from "react";
import { Loader } from "@/components/custom/loader";
import { toast } from "sonner";
import ListBlogSidebar from "./ListBlogSidebar";

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
  views: number;
}

function LatestBlogSidebar() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs`, {
        cache: "no-store",
      });
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

  if (loading) return <Loader size="lg" />;

  if (!blogs.length) return null;
  const title = "Recent Blogs";

  return (
    <ListBlogSidebar blogs={blogs} title={title} type="latest" url="blog" />
  );
}

export default LatestBlogSidebar;
