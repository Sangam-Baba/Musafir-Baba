"use client";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { Reviews } from "@/app/admin/holidays/new/page";

const createReviews = async (accessToken: string, form: Reviews) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(form),
  });
  if (!res.ok) throw new Error("Reviews creation failed");
  return res.json();
};

const updateReviews = async (
  accessToken: string,
  id: string,
  form: Reviews
) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/reviews/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(form),
  });
  if (!res.ok) throw new Error("Reviews update failed");
  return res.json();
};

const getReviews = async (accessToken: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/reviews/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch batch");
  return res.json();
};

export const CreateReviewsModal = ({
  onReviewsCreated,
  onReviewsUpdated,
  onClose,
  existingReviews,
  type,
}: {
  onReviewsCreated: (batchId: string) => void;
  onReviewsUpdated: (batchId: string) => void;
  onClose: () => void;
  existingReviews: string | null;
  type?: string;
}) => {
  const accessToken = useAuthStore((state) => state.accessToken) as string;

  const [form, setForm] = useState<Reviews>({
    name: "",
    location: "",
    rating: 0,
    comment: "",
    type: type || "",
  });

  const { data } = useQuery({
    queryKey: ["reviews", existingReviews],
    queryFn: () => getReviews(accessToken, existingReviews as string),
    enabled: !!existingReviews,
  });

  const review = data?.data;
  useEffect(() => {
    if (existingReviews && review) {
      setForm({
        name: review.name,
        location: review.location,
        rating: review.rating,
        comment: review.comment,
        type: review.type,
      });
    }
  }, [existingReviews, review]);

  const mutation = useMutation({
    mutationFn: () =>
      existingReviews
        ? updateReviews(accessToken, existingReviews, form)
        : createReviews(accessToken, form),
    onSuccess: (res) => {
      toast.success(
        existingReviews
          ? "Batch updated successfully!"
          : "Batch created successfully!"
      );
      if (existingReviews) onReviewsUpdated?.(existingReviews);
      else onReviewsCreated(res?.data?._id || res?._id);
      onClose();
    },
    onError: (err) => toast.error(err.message || "Failed to create reviews"),
  });

  const handleChange = (key: keyof Reviews, value: string) => {
    if (["rating"].includes(key))
      setForm((prev) => ({ ...prev, [key]: Number(value) }));
    else setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div
      className="bg-white rounded-xl shadow-2xl w-[420px] max-h-[90vh] overflow-y-auto p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
        {existingReviews ? "Update Review" : "Create Review"}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Basic Info */}
        <div className="space-y-2">
          <label className="text-gray-600 font-medium">Name</label>
          <input
            type="text"
            placeholder="Enter batch name"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-md p-2 w-full"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-gray-600 font-medium">Comment</label>
            <input
              type="text"
              value={form.comment}
              onChange={(e) => handleChange("comment", e.target.value)}
              className="border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-md p-2 w-full"
              required
            />
          </div>
          <div>
            <label className="text-gray-600 font-medium">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
              className="border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-md p-2 w-full"
            />
          </div>
          <div>
            <label className="text-gray-600 font-medium">Rating</label>
            <input
              type="number"
              value={form.rating}
              onChange={(e) => handleChange("rating", e.target.value)}
              className="border border-gray-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-md p-2 w-full"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition disabled:opacity-50"
          >
            {mutation.isPending
              ? existingReviews
                ? "Updating..."
                : "Creating..."
              : existingReviews
              ? "Update Review"
              : "Create Review"}
          </button>
        </div>
      </form>
    </div>
  );
};
