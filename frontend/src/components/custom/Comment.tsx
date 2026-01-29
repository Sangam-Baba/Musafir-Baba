"use client";

import React, { useState } from "react";
import { toast } from "sonner";
function CommentPage({
  id,
  parentId,
  onSuccess,
}: {
  id: string;
  parentId?: string;
  onSuccess?: () => void;
}) {
  const [comment, setComment] = useState({
    blogId: id,
    parentId: parentId || null,
    name: "",
    email: "",
    text: "",
    rating: 0,
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setComment({
      ...comment,
      [name]: name === "rating" ? Number(value) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(comment),
      });
      if (!res.ok) throw new Error("Failed to create comment");
      const data = await res.json();
      toast.success("Thank you for your comment!");
      console.log("Comment saved:", data);
      setComment({
        blogId: id,
        parentId: parentId || null,
        name: "",
        email: "",
        text: "",
        rating: 0,
      });
    } catch (error) {
      console.error(error);
      toast.error("Could not submit comment");
    }
  };

  return (
    <div className="w-full flex  ">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full">
        <div className="flex flex-col">
          <label htmlFor="rating" className="text-sm font-medium mb-1">
            Give Rating:
          </label>
          <select
            name="rating"
            value={comment.rating}
            onChange={handleChange}
            className="border rounded-lg p-2"
          >
            <option value={0}>Select Rating</option>
            <option value={1}>⭐ 1 Star</option>
            <option value={2}>⭐⭐ 2 Stars</option>
            <option value={3}>⭐⭐⭐ 3 Stars</option>
            <option value={4}>⭐⭐⭐⭐ 4 Stars</option>
            <option value={5}>⭐⭐⭐⭐⭐ 5 Stars</option>
          </select>
        </div>

        <input
          name="name"
          value={comment.name}
          onChange={handleChange}
          type="text"
          placeholder="Name"
          className="border rounded-lg p-2 w-full"
          required
        />
        <input
          name="email"
          value={comment.email}
          onChange={handleChange}
          type="email"
          placeholder="Email"
          className="border rounded-lg p-2 w-full"
          required
        />
        <textarea
          name="text"
          value={comment.text}
          onChange={handleChange}
          placeholder="Write a comment..."
          className="border rounded-lg p-2 w-full h-24 resize-none"
          required
        />

        <button
          type="submit"
          className="bg-[#FE5300] text-white py-2 px-4 rounded-lg hover:bg-[#e44900] transition"
        >
          Submit Comment
        </button>
      </form>
    </div>
  );
}

export default CommentPage;
