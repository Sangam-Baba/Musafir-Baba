"use client"
import { useEffect } from 'react'

function BlogViewTracker({ id }: { id: string }) {
    const blogId = id
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs/view/${blogId}`, { method: "PATCH" });
  }, [blogId]);
  return null;
}

export default BlogViewTracker