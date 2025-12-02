"use client";
import React, { useState, useEffect } from "react";
import { Loader } from "@/components/custom/loader";
import { toast } from "sonner";
import ListBlogSidebar from "./ListBlogSidebar";

interface News {
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

function LatestNewsSidebar({ currentId }: { currentId: string }) {
  const [blogs, setBlogs] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/news`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (data.success) {
        const filteredBlogs = data.data?.filter(
          (blog: News) => blog._id !== currentId
        );
        setBlogs(filteredBlogs);
      } else {
        toast.error(data.message || "Failed to fetch news");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong fetching news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  if (loading) return <Loader size="lg" />;

  if (!blogs.length) return null;
  const title = "Recent News";

  return (
    <ListBlogSidebar blogs={blogs} title={title} type="latest" url="news" />
  );
}

export default LatestNewsSidebar;
