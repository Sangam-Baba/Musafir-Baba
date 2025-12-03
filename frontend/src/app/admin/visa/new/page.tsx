"use client";
import React, { useState } from "react";
import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ImageUploader from "@/components/admin/ImageUploader";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import BlogEditor from "@/components/admin/BlogEditor";
import { X } from "lucide-react";
import { CreateReviewsModal } from "@/components/admin/CreateEditReviews";
import { Reviews } from "../../holidays/new/page";
import { getReviewsByIds } from "../../holidays/new/page";
import { deleteReview } from "../../holidays/new/page";
interface Faq {
  question: string;
  answer: string;
}

export interface Visa {
  country: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  schemaType: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  reviews?: string[];
  cost: number;
  visaType: string;
  bannerImage?: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  };
  coverImage?: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  };
  faqs?: Faq[];
  duration: string;
  visaProcessed: number;
}

async function createVisa(values: Visa, accessToken: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(values),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Registration failed");
  }

  return res.json();
}

export default function CreateVisaPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [editReviewsId, setEditReviewsId] = useState<string | null>(null);
  const [reviewsDetails, setReviewsDetails] = useState<Reviews[]>([]);
  const defaultValues: Visa = {
    country: "",
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    schemaType: "",
    metaTitle: "",
    metaDescription: "",
    keywords: [],
    reviews: [],
    cost: 0,
    visaType: "DAC",
    faqs: [
      {
        question: "",
        answer: "",
      },
    ],
    visaProcessed: 0,
    duration: "",
  };

  const form = useForm<Visa>({ defaultValues });

  // ✅ pass variables (values) into mutate
  const mutation = useMutation({
    mutationFn: (values: Visa) => createVisa(values, accessToken),
    onSuccess: (data) => {
      console.log("Registered successfully:", data);
      toast.success("Registration successful!");
      form.reset(defaultValues);
    },
    onError: (error: unknown) => {
      console.error("Registration failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    },
  });

  const faqsArray = useFieldArray({
    control: form.control,
    name: "faqs",
  });
  // const reviewsArray = useFieldArray({
  //   control: form.control,
  //   name: "reviews",
  // });

  const handleReviewsCreated = async (id: string) => {
    const existing = form.getValues("reviews") || [];
    form.setValue("reviews", [...existing, id]); // update form array

    const newReview = await getReviewsByIds(accessToken, [id]);
    setReviewsDetails((prev) => [...prev, ...newReview]);
    setShowReviewsModal(false);
  };

  const handleReviewsEdit = (id: string) => {
    setEditReviewsId(id);
    setShowReviewsModal(true);
  };
  const handleReviewsUpdated = async (id: string) => {
    toast.success("Reviews updated successfully");
    const updated = await getReviewsByIds(accessToken, [id]);
    setReviewsDetails((prev) =>
      prev.map((b) => (b._id === id ? updated[0] : b))
    );
    setShowReviewsModal(false);
    setEditReviewsId(null);
  };
  const handleReviewsRemove = async (id: string, index: number) => {
    await deleteReview(accessToken, id);
    const updatedIds = form.getValues("reviews")?.filter((_, i) => i !== index);
    const updatedDetails = reviewsDetails.filter((_, i) => i !== index);

    form.setValue("reviews", updatedIds);
    setReviewsDetails(updatedDetails);
  };

  const onSubmit: SubmitHandler<Visa> = (values) => {
    mutation.mutate(values);
  };

  return (
    <div className="w-full min-h-screen  bg-gray-50 px-4">
      <div className="w-full max-w-7xl mx-auto rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">Create Visa</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Thailand Visa" {...field} required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* SLug */}
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permalink</FormLabel>
                  <FormControl>
                    <Input placeholder="thailand-visa" {...field} required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <BlogEditor
                      {...field}
                      value={form.getValues("content")}
                      onChange={(val) => form.setValue("content", val)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              {/* COuntry */}
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Thailand" {...field} required />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* cost */}
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100"
                        {...field}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duration */}
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="2 to 7" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* VIsa Processed */}
              <FormField
                control={form.control}
                name="visaProcessed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Visa Processed</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* metaTitle */}
            <FormField
              control={form.control}
              name="metaTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO MetaTitle</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Thailand" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* meta description */}
            <FormField
              control={form.control}
              name="metaDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SEO MetaDescription</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Thailand" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* meta description */}
            <FormField
              control={form.control}
              name="excerpt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Excerpt</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Thailand" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* meta description */}
            <FormField
              control={form.control}
              name="schemaType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schema Type</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Article, Blog" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role */}
            <FormField
              control={form.control}
              name="visaType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visa Type</FormLabel>
                  <FormControl>
                    <select
                      className="w-full rounded-md border border-gray-300 p-2"
                      {...field}
                      required
                    >
                      <option value="" disabled>
                        Select Visa Type
                      </option>
                      <option value="DAC">DAC</option>
                      <option value="E-Visa">E-Visa</option>
                      <option value="ETA">ETA</option>
                      <option value="EVOA">EVOA</option>
                      <option value="PAR">PAR</option>
                      <option value="Sticker">Sticker</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Avatar */}
            <div className="flex flex-col md:flex-row gap-4">
              <FormField
                control={form.control}
                name="coverImage"
                render={() => (
                  <FormItem>
                    <FormLabel>Flag</FormLabel>
                    <FormControl>
                      <ImageUploader
                        initialImage={form.getValues("coverImage")}
                        onUpload={(img) => {
                          if (!img) return;
                          form.setValue("coverImage", {
                            url: img ? img.url : "",
                            alt: form.getValues("country") ?? "",
                          });
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coverImage.alt"
                render={() => (
                  <FormItem>
                    <FormLabel>Flag Alt</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Thailand"
                        {...form.register("coverImage.alt")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* Avatar */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Banner Image */}
              <FormField
                control={form.control}
                name="bannerImage"
                render={() => (
                  <FormItem>
                    <FormLabel>Banner Image</FormLabel>
                    <FormControl>
                      <ImageUploader
                        initialImage={form.getValues("coverImage")}
                        onUpload={(img) => {
                          if (!img) return;
                          form.setValue("bannerImage", {
                            url: img ? img.url : "",
                            alt: form.getValues("country") ?? "",
                          });
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bannerImage.alt"
                render={() => (
                  <FormItem>
                    <FormLabel>Banner Image Alt</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Thailand"
                        {...form.register("bannerImage.alt")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-2">
              <FormLabel className="block text-sm font-medium">
                Keywords
              </FormLabel>
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

            {/* FAQs Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">FAQs</FormLabel>
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
              <FormLabel className="mb-2 text-lg">Reviews</FormLabel>

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
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Creating..." : "Create Visa"}
            </Button>
          </form>
        </Form>

        {mutation.isError && (
          <p className="mt-3 text-center text-sm text-red-500">
            {(mutation.error as Error).message}
          </p>
        )}
        {mutation.isSuccess && (
          <p className="mt-3 text-center text-sm text-green-600">
            Visa Creation successful!
          </p>
        )}
      </div>
    </div>
  );
}
