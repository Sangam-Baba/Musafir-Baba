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
    <div>
      <p>👀 {counter + 1000} Views</p>
    </div>
  );
}

export default BlogViewTracker;
