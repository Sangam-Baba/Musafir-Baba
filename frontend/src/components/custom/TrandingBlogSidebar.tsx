"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "@/components/custom/loader";
import ListBlogSidebar from "./ListBlogSidebar";

const getTrandingBlogs = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs/tranding`);
  if (!res.ok) throw new Error("Failed to fetch tranding blogs");
  const data = await res.json();
  return data?.data;
};
function TrandingBlogSidebar({ currentId }: { currentId: string }) {
  const {
    data: blogs,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["trandingBlogs"], queryFn: getTrandingBlogs });

  if (isLoading)
    return <Loader size="lg" message="Loading tranding blogs..." />;
  if (isError) return <h1>Failed to fetch trending blogs</h1>;
  return (
    <ListBlogSidebar
      blogs={blogs.filter((blog: { _id: string }) => blog._id !== currentId)}
      title="Trending Blogs"
      type="trending"
      url="blog"
    />
  );
}

export default TrandingBlogSidebar;
