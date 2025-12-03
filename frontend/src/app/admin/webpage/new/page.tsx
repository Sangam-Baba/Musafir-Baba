"use client";
import React, { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { toast } from "sonner";
import dynamic from "next/dynamic";
const BlogEditor = dynamic(() => import("@/components/admin/BlogEditor"), {
  ssr: false,
});
import ImageUploader from "@/components/admin/ImageUploader";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-dropdown-menu";
import { X } from "lucide-react";
import { getReviewsByIds, Reviews } from "../../holidays/new/page";
import { deleteReview } from "../../holidays/new/page";
import { CreateReviewsModal } from "@/components/admin/CreateEditReviews";

export interface WebpageFormData {
  title: string;
  content: string;
  slug: string;
  parent: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  reviews?: string[];
  schemaType?: string;
  coverImage?: {
    url?: string;
    public_id?: string;
    alt?: string;
    width?: number;
    height?: number;
  };
  status: string;
  excerpt?: string;
  faqs?: {
    question: string;
    answer: string;
  }[];
}

const createPage = async (values: WebpageFormData, token: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/webpage/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error("Failed to create page");
  return res.json();
};

export default function CreateWebpage() {
  const token = useAdminAuthStore((state) => state.accessToken) ?? "";
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [editReviewsId, setEditReviewsId] = useState<string | null>(null);
  const [reviewsDetails, setReviewsDetails] = useState<Reviews[]>([]);
  const router = useRouter();

  const defaultValues: WebpageFormData = {
    title: "",
    content: "",
    slug: "",
    parent: "visa",
    metaTitle: "",
    metaDescription: "",
    keywords: [],
    reviews: [],
    schemaType: "",
    status: "published",
    excerpt: "",
    faqs: [],
  };

  const form = useForm<WebpageFormData>({
    defaultValues,
  });

  const faqsArray = useFieldArray({ control: form.control, name: "faqs" });

  const mutation = useMutation({
    mutationFn: (values: WebpageFormData) => createPage(values, token),
    onSuccess: () => {
      toast.success("Page created successfully!");
      form.reset();
      router.refresh();
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Something went wrong");
      }
    },
  });

  const handleReviewsCreated = async (id: string) => {
    const existing = form.getValues("reviews") || [];
    form.setValue("reviews", [...existing, id]); // update form array

    const newReview = await getReviewsByIds(token, [id]);
    setReviewsDetails((prev) => [...prev, ...newReview]);
    setShowReviewsModal(false);
  };

  const handleReviewsEdit = (id: string) => {
    setEditReviewsId(id);
    setShowReviewsModal(true);
  };
  const handleReviewsUpdated = async (id: string) => {
    toast.success("Reviews updated successfully");
    const updated = await getReviewsByIds(token, [id]);
    setReviewsDetails((prev) =>
      prev.map((b) => (b._id === id ? updated[0] : b))
    );
    setShowReviewsModal(false);
    setEditReviewsId(null);
  };
  const handleReviewsRemove = async (id: string, index: number) => {
    await deleteReview(token, id);
    const updatedIds = form.getValues("reviews")?.filter((_, i) => i !== index);
    const updatedDetails = reviewsDetails.filter((_, i) => i !== index);

    form.setValue("reviews", updatedIds);
    setReviewsDetails(updatedDetails);
  };
  function onSubmit(values: WebpageFormData) {
    mutation.mutate(values);
  }

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-6">Create Page</h1>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit(values))}
        className="space-y-6"
      >
        <input
          {...form.register("title")}
          placeholder="Title"
          className="w-full border rounded p-2"
        />
        {form.formState.errors.title && (
          <p className="text-red-500 text-sm">
            {form.formState.errors.title.message}
          </p>
        )}
        <input
          {...form.register("slug")}
          placeholder="ParmaLink"
          className="w-full border rounded p-2"
        />
        {form.formState.errors.slug && (
          <p className="text-red-500 text-sm">
            {form.formState.errors.slug.message}
          </p>
        )}

        <div className="border rounded p-2">
          <BlogEditor
            value={form.getValues("content")}
            onChange={(val) => form.setValue("content", val)}
          />
        </div>

        <input
          {...form.register("metaTitle")}
          placeholder="Meta Title"
          className="w-full border rounded p-2"
        />
        <textarea
          {...form.register("metaDescription")}
          placeholder="Meta Description"
          className="w-full border rounded p-2"
        />
        <textarea
          {...form.register("excerpt")}
          placeholder="Excerpt"
          className="w-full border rounded p-2"
        />
        <input
          {...form.register("schemaType")}
          placeholder="Schema Type"
          className="w-full border rounded p-2"
        />

        <div className="space-y-2">
          <ImageUploader
            onUpload={(img) => {
              if (!img) return null;
              form.setValue("coverImage", {
                url: img ? img.url : "",
                public_id: img ? img.public_id : "",
                width: img ? img.width : 0,
                height: img ? img.height : 0,
                alt: form.getValues("title") || "Cover Image",
              });
            }}
          />
          {form.watch("coverImage") && (
            <input
              {...form.register("coverImage.alt")}
              placeholder="Cover Image Alt"
              className="w-full border rounded p-2"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label className="block text-sm font-medium">Keywords</Label>
          <div className="flex flex-wrap gap-2 border rounded p-2">
            {form.watch("keywords")?.map((kw, i) => (
              <span
                key={i}
                className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full text-sm"
              >
                {kw}
                <button
                  type="button"
                  onClick={() => {
                    const newKeywords = form
                      .getValues("keywords")
                      ?.filter((_, idx) => idx !== i);
                    form.setValue("keywords", newKeywords);
                  }}
                  className="text-gray-600 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}

            <input
              type=" text"
              className="flex-1 min-w-[120px] border-none focus:ring-0 focus:outline-none"
              placeholder="Type keyword and press Enter"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  const value = e.currentTarget.value.trim();
                  if (value) {
                    const current = form.getValues("keywords") || [];
                    if (!current.includes(value)) {
                      form.setValue("keywords", [...current, value]);
                    }
                    e.currentTarget.value = "";
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Faqs */}
        <div>
          <Label>FAQs</Label>
          {faqsArray.fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-2 gap-2 mb-2">
              <Input
                {...form.register(`faqs.${index}.question`)}
                placeholder="Question"
              />
              <Input
                {...form.register(`faqs.${index}.answer`)}
                placeholder="Answer"
              />
              <Button
                type="button"
                variant="destructive"
                onClick={() => faqsArray.remove(index)}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            onClick={() => faqsArray.append({ question: "", answer: "" })}
          >
            Add FAQ
          </Button>
        </div>

        {/* Reviews */}
        <div>
          <Label className="mb-2 text-lg">Reviews</Label>

          {reviewsDetails.map((review, index) => (
            <div
              key={review._id}
              className="flex justify-between items-center mb-2"
            >
              <span>{review.name}</span>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="default"
                  onClick={() => handleReviewsEdit(review._id as string)}
                >
                  Edit
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() =>
                    handleReviewsRemove(review._id as string, index)
                  }
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}

          <Button type="button" onClick={() => setShowReviewsModal(true)}>
            + Add New Review
          </Button>

          {showReviewsModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <CreateReviewsModal
                onReviewsCreated={handleReviewsCreated}
                onClose={() => {
                  setShowReviewsModal(false);
                  setEditReviewsId(null);
                }}
                onReviewsUpdated={handleReviewsUpdated}
                existingReviews={editReviewsId}
                type="package"
              />
            </div>
          )}
        </div>
        <select
          {...form.register("parent")}
          className="w-full border rounded p-2"
        >
          <option value="" disabled>
            Select Parent
          </option>
          <option value="noparent">No-Parent</option>
          <option value="bookings">Bookings</option>
        </select>

        <select
          {...form.register("status")}
          className="w-full border rounded p-2"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Create Page"}
        </Button>
      </form>
      {mutation.isError && (
        <p className="text-red-500 text-sm">Something went wrong</p>
      )}
      {mutation.isSuccess && (
        <p className="text-green-500 text-sm">Page created successfully!</p>
      )}
    </div>
  );
}
