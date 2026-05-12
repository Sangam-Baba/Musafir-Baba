"use client";
import { useEffect, useState } from "react";

const updateBlogView = async (id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/blogs/view/${id}`,
    { method: "PATCH" }
  );
};
const updateNewsView = async (id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/news/view/${id}`,
    { method: "PATCH" }
  );
};
function BlogViewTracker({
  id,
  view,
  type,
}: {
  id: string;
  view: number;
  type: string;
}) {
  const [counter, setCounter] = useState(view);

  useEffect(() => {
    if (type === "blog") updateBlogView(id);
    if (type === "news") updateNewsView(id);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#FE5300]">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span>{counter + 1000} Views</span>
    </div>
  );
}

export default BlogViewTracker;
