"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "@/components/custom/loader";
import ListBlogSidebar from "./ListBlogSidebar";

const getTrandingNews = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/news/tranding`);
  if (!res.ok) throw new Error("Failed to fetch tranding blogs");
  const data = await res.json();
  return data?.data;
};
function TrandingNewsSidebar({ currentId }: { currentId: string }) {
  const {
    data: blogs,
    isLoading,
    isError,
  } = useQuery({ queryKey: ["trandingNews"], queryFn: getTrandingNews });

  if (isLoading) return <Loader size="lg" message="Loading tranding news..." />;
  if (isError) return <h3>Failed to fetch trending news</h3>;
  return (
    <ListBlogSidebar
      blogs={blogs.filter((blog: { _id: string }) => blog._id !== currentId)}
      title="Trending News"
      type="trending"
      url="news"
    />
  );
}

export default TrandingNewsSidebar;
