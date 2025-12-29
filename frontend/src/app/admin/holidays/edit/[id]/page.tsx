"use client";

import React, { useState } from "react";
import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Loader } from "@/components/custom/loader";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { CreateBatchModal } from "@/components/admin/Newbatch";
import BlogEditor from "@/components/admin/BlogEditor";
import { CreateReviewsModal } from "@/components/admin/CreateEditReviews";
import { AddOns, Reviews } from "../../new/page";
import { deleteReview } from "../../new/page";
import { getReviewsByIds } from "../../new/page";
import { X } from "lucide-react";
import { duplicateBatch } from "../../new/page";
import { schemaTypes } from "@/lib/schemaTypes";
import { AddOnItems } from "../../new/AddOnItems";
interface Image {
  url: string;
  alt: string;
  public_id?: string;
  width?: number;
  height?: number;
}
interface Faq {
  question: string;
  answer: string;
}
interface Itinerary {
  title: string;
  description: string;
}

interface Batch {
  name: string;
  startDate: string;
  endDate: string;
  quad: number;
  triple: number;
  double: number;
  child: number;
  quadDiscount: number;
  tripleDiscount: number;
  doubleDiscount: number;
  childDiscount: number;
  _id: string;
  status: string;
}
interface PackageFormValues {
  title: string;
  description: string;
  batch: string[];
  reviews?: Reviews[];
  slug: string;
  destination: string;
  mainCategory: string;
  otherCategory: string[];
  addOns?: AddOns[];
  coverImage: Image;
  gallery?: Image[];
  duration: { days: number; nights: number };
  metaTitle: string;
  metaDescription: string;
  schemaType: string[];
  keywords?: string[];
  maxPeople?: number;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  itinerary: Itinerary[];
  itineraryDownload?: Image;
  faqs: Faq[];
  isFeatured?: boolean;
  isBestSeller?: boolean;
  status: "draft" | "published";
}

interface Destination {
  _id: string;
  name: string;
  country: string;
  state: string;
  city: string;
  coverImage?: {
    url: string;
    public_id: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  slug: string;
}
interface Category {
  _id: string;
  name: string;
}
async function updatePackage(
  values: PackageFormValues,
  accessToken: string,
  id: string
) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/packages/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(values),
    }
  );

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Package Creation failed");
  }

  return res.json();
}

const getDestination = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/destination`);
  if (!res.ok) throw new Error("Failed to get destination");
  const data = await res.json();
  return data?.data;
};

const getPackage = async (id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/packages/id/${id}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("Failed to fetch packages");
  const data = await res.json();
  return data?.data;
};
const deleteBatch = async (accessToken: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/batch/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to delete batch");
  return res.json();
};

const getBatchByIds = async (accessToken: string, ids: string[]) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/batch/ids`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Failed to get batch");
  const data = await res.json();
  return data?.data;
};

const getCategory = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`);
  if (!res.ok) throw new Error("Failed to get category");
  const data = await res.json();
  return data?.data;
};
export default function CreatePackagePage() {
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editBatchId, setEditBatchId] = useState<string | null>(null);
  const [batchDetails, setBatchDetails] = useState<Batch[]>([]);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [editReviewsId, setEditReviewsId] = useState<string | null>(null);
  const [reviewsDetails, setReviewsDetails] = useState<Reviews[]>([]);
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const params = useParams();
  const id = params.id as string;

  const defaultValues: PackageFormValues = {
    title: "",
    description: "",
    metaTitle: "",
    metaDescription: "",
    schemaType: [],
    status: "draft",
    keywords: [],
    coverImage: { url: "", alt: "", public_id: "" },
    gallery: [],
    batch: [],
    destination: "",
    mainCategory: "",
    otherCategory: [],
    duration: { days: 0, nights: 0 },
    maxPeople: 0,
    highlights: [],
    inclusions: [],
    exclusions: [],
    itinerary: [],
    itineraryDownload: { url: "", alt: "", public_id: "" },
    faqs: [],
    isFeatured: false,
    isBestSeller: false,
    slug: "",
  };

  const {
    data: pkg,
    isLoading: isLoadingPackage,
    isError: isErrorPackage,
    error: errorPackage,
  } = useQuery({
    queryKey: ["packages", id],
    queryFn: () => getPackage(id),
  });
  const {
    data: destination,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["destination"],
    queryFn: getDestination,
  });

  const {
    data: category,
    isLoading: categoryLoading,
    isError: categoryError,
  } = useQuery({
    queryKey: ["category"],
    queryFn: getCategory,
  });

  const form = useForm<PackageFormValues>({
    defaultValues,
    shouldUnregister: false,
  });

  const reviewsArray = useFieldArray({
    control: form.control,
    name: "reviews",
  });
  const handleBatchCreated = async (id: string) => {
    const newBatch = await getBatchByIds(accessToken, [id]);
    form.setValue("batch", [...form.getValues("batch"), id]);
    setBatchDetails((prev) => [...prev, newBatch[0]]);
    setShowBatchModal(false);
  };

  const handleBatchEdit = (id: string) => {
    setEditBatchId(id);
    setShowBatchModal(true);
  };
  const handleBatchUpdated = async (id: string) => {
    toast.success("Batch updated successfully");
    const updated = await getBatchByIds(accessToken, [id]);
    setBatchDetails((prev) => prev.map((b) => (b._id === id ? updated[0] : b)));
    setShowBatchModal(false);
    setEditBatchId(null);
  };

  const handleBatchDuplicate = async (id: string) => {
    const res = await duplicateBatch(accessToken, id);
    form.setValue("batch", [...form.getValues("batch"), res._id]);
    const newBatch = await getBatchByIds(accessToken, [res._id]);
    setBatchDetails((prev) => [...prev, ...newBatch]);
    setShowBatchModal(false);
  };
  const handleReviewsCreated = async (id: string) => {
    reviewsArray.append(id);
    const newBatch = await getReviewsByIds(accessToken, [id]);
    setReviewsDetails((prev) => [...prev, ...newBatch]);
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
  // const batchArray = useFieldArray({ control: form.control, name: "batch" });
  useEffect(() => {
    if (pkg) {
      const batchIds = pkg.batch?.map((b: Batch) => b._id) || [];
      const reviewsIds = pkg.reviews?.map((b: string) => b) || [];
      form.reset({
        ...pkg,
        destination: pkg.destination?._id.toString() || "",
        batch: batchIds,
        reviews: reviewsIds,
      });
      if (batchIds.length > 0) {
        getBatchByIds(accessToken, batchIds)
          .then((data) => {
            // Reorder results to match batchIds order
            const ordered = batchIds
              .map((id: string) => data.find((b: Batch) => b._id === id))
              .filter(Boolean);
            setBatchDetails(ordered as Batch[]);
          })
          .catch((err) => console.error("Failed to fetch batch info:", err));
      }
      if (reviewsIds.length > 0) {
        getReviewsByIds(accessToken, reviewsIds)
          .then((data) => {
            // Reorder results to match batchIds order
            const ordered = reviewsIds
              .map((id: string) => data.find((b: Reviews) => b._id === id))
              .filter(Boolean);
            setReviewsDetails(ordered as Reviews[]);
          })
          .catch((err) => console.error("Failed to fetch review info:", err));
      }
    }
  }, [pkg, form, accessToken]);
  const addOnsArray = useFieldArray({ control: form.control, name: "addOns" });
  const coverImageArray = useFieldArray({
    control: form.control,
    name: "gallery",
  });
  const highlightsArray = useFieldArray({
    control: form.control,
    name: "highlights",
  });
  const inclusionsArray = useFieldArray({
    control: form.control,
    name: "inclusions",
  });
  const exclusionsArray = useFieldArray({
    control: form.control,
    name: "exclusions",
  });
  const faqsArray = useFieldArray({ control: form.control, name: "faqs" });
  const itineraryArray = useFieldArray({
    control: form.control,
    name: "itinerary",
  });

  const mutation = useMutation({
    mutationFn: (values: PackageFormValues) =>
      updatePackage(values, accessToken, id),
    onSuccess: (data) => {
      toast.success("Package Updated successfully");
      // form.reset(defaultValues)
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    },
  });

  const onSubmit: SubmitHandler<PackageFormValues> = (values) => {
    mutation.mutate(values);
  };

  if (isLoading && isLoadingPackage)
    return <Loader size="lg" message="Loading destinations..." />;
  if (isError) return <h1>{error.message}</h1>;
  if (isErrorPackage) return <h1>{errorPackage.message}</h1>;

  const schemaTypes = ["Collection", "Product", "FAQ", "Review"];
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">Edit Package</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Package Title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Permalink */}
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permalink *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Permalink..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <BlogEditor value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Batch Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">Batch *</FormLabel>
              {batchDetails.map((field, index) => (
                <div key={field._id} className="grid grid-cols-2 gap-2 mb-2">
                  {/* Batch Content */}
                  <div className="flex  items-center text-left gap-2">
                    <span className="font-medium">
                      {field?.name || `Batch ${index + 1}`}
                    </span>
                    <span className="text-xs text-gray-500">
                      {field?.startDate
                        ? `${new Date(
                            field.startDate
                          ).toLocaleDateString()} → ${new Date(
                            field.endDate
                          ).toLocaleDateString()}`
                        : "No date info"}
                    </span>
                  </div>

                  {/* Batch Actions */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="default"
                      onClick={() => {
                        handleBatchDuplicate(field._id);
                      }}
                    >
                      Duplicate
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      onClick={() => handleBatchEdit(field._id)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={async () => {
                        // const batchId = form.getValues(`batch.${index}`);
                        const res = await deleteBatch(accessToken, field._id);
                        if (res) {
                          form.setValue(
                            "batch",
                            form
                              .getValues("batch")
                              .filter((id, i) => id !== field._id)
                          );
                          setBatchDetails((prev) =>
                            prev.filter((item, i) => item._id !== field._id)
                          );
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}

              <Button type="button" onClick={() => setShowBatchModal(true)}>
                + Add New Batch
              </Button>
              {showBatchModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <CreateBatchModal
                    onBatchCreated={handleBatchCreated}
                    onClose={() => {
                      setShowBatchModal(false);
                      setEditBatchId(null);
                    }}
                    onBatchUpdated={handleBatchUpdated}
                    existingBatch={editBatchId}
                  />
                </div>
              )}
            </div>

            {/* Duration */}
            <div className="flex justify-between gap-4">
              <FormField
                control={form.control}
                name="duration.days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter Days Duration"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration.nights"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nights</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter Nights Duration"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Destination */}
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="w-full rounded-md border border-gray-300 p-2"
                      value={field.value || ""}
                    >
                      <option value="" disabled>
                        Select a destination
                      </option>
                      {destination?.map((dest: Destination) => (
                        <option key={dest._id} value={dest._id}>
                          {dest.state.toLocaleUpperCase()}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Main Categpry */}
            <FormField
              control={form.control}
              name="mainCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Main Category *</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="w-full rounded-md border border-gray-300 p-2"
                      value={field.value || ""}
                    >
                      <option value="" disabled>
                        Select a category
                      </option>
                      {category?.map((cat: Category) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name.toLocaleUpperCase()}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Other Category */}
            <FormField
              control={form.control}
              name="otherCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Other Category</FormLabel>
                  <div className="flex flex-wrap space-y-2 gap-2 mt-2">
                    {category?.map((cat: Category) => (
                      <label
                        key={cat._id}
                        className="flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          value={cat._id}
                          checked={field.value?.includes(cat._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              field.onChange([...(field.value || []), cat._id]);
                            } else {
                              field.onChange(
                                field.value?.filter((id) => id !== cat._id)
                              );
                            }
                          }}
                        />
                        <span>{cat.name}</span>
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cover Image */}
            <FormField
              control={form.control}
              name="coverImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Image</FormLabel>
                  <FormControl>
                    <ImageUploader
                      initialImage={pkg?.coverImage}
                      onUpload={(img) => {
                        if (!img) return;
                        const newImg = {
                          url: img.url,
                          public_id: img.public_id,
                          alt: form.getValues("title") ?? "",
                          width: img.width,
                          height: img.height,
                        };
                        form.setValue("coverImage", newImg, {
                          shouldDirty: true,
                        });
                        field.onChange(newImg);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch("coverImage") && (
              <FormField
                control={form.control}
                name="coverImage.alt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CoverImage Alt</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        defaultValue={form.watch("title")}
                        type="text"
                        placeholder="Cover Image Alt"
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {/* Itinary Download */}
            <FormField
              control={form.control}
              name="itineraryDownload"
              render={() => (
                <FormItem>
                  <FormLabel>Itinerary PDF Upload</FormLabel>
                  <FormControl>
                    <ImageUploader
                      initialImage={pkg?.itineraryDownload}
                      onUpload={(img) => {
                        if (!img) return;
                        form.setValue("itineraryDownload", {
                          url: img.url,
                          public_id: img.public_id,
                          alt: form.getValues("title") ?? "",
                        });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Gallery Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">Image Gallery</FormLabel>
              {coverImageArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mb-2">
                  <ImageUploader
                    initialImage={form.watch(`gallery.${index}`)}
                    onUpload={(img) => {
                      if (!img) return;
                      form.setValue(`gallery.${index}`, {
                        url: img.url,
                        public_id: img.public_id,
                        alt: form.getValues("title") ?? "",
                        width: img.width,
                        height: img.height,
                      });
                    }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => coverImageArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() =>
                  coverImageArray.append({
                    url: "",
                    public_id: "",
                    width: 0,
                    height: 0,
                    alt: "",
                  })
                }
              >
                Add Image Gallery
              </Button>
            </div>
            {/* Highlights Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">Highlights</FormLabel>
              {highlightsArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mb-2">
                  <Input
                    {...form.register(`highlights.${index}`)}
                    placeholder="Enter highlight"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => highlightsArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={() => highlightsArray.append("")}>
                Add Highlight
              </Button>
            </div>

            {/* Inclusions Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">Inclusions</FormLabel>
              {inclusionsArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mb-2">
                  <Input
                    {...form.register(`inclusions.${index}`)}
                    placeholder="Enter inclusion"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => inclusionsArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={() => inclusionsArray.append("")}>
                Add Inclusion
              </Button>
            </div>

            {/* Exclusions Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">Exclusions</FormLabel>
              {exclusionsArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mb-2">
                  <Input
                    {...form.register(`exclusions.${index}`)}
                    placeholder="Enter exclusion"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => exclusionsArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={() => exclusionsArray.append("")}>
                Add Exclusion
              </Button>
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
              {reviewsArray.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-2 gap-2 mb-2">
                  {/* REVIEW Content */}
                  <div className="flex  items-center text-left gap-2">
                    <span className="font-medium">
                      {reviewsDetails[index]?.name || `Reviews ${index + 1}`}
                    </span>
                  </div>

                  {/* Batch Actions */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => reviewsArray.remove(index)}
                    >
                      Remove
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      onClick={() =>
                        handleReviewsEdit(form.getValues(`reviews.${index}`))
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={async () => {
                        const res = await deleteReview(
                          accessToken,
                          form.getValues(`reviews.${index}`)
                        );
                        if (res) reviewsArray.remove(index);
                      }}
                    >
                      Delete
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
            {/* Itinerary Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">Itinerary</FormLabel>
              {itineraryArray.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-2 gap-2 mb-2 ">
                  <Input
                    {...form.register(`itinerary.${index}.title`)}
                    placeholder="Day Title"
                  />
                  <Textarea
                    {...form.register(`itinerary.${index}.description`)}
                    placeholder="Day Description"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => itineraryArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() =>
                  itineraryArray.append({ title: "", description: "" })
                }
              >
                Add Itinerary Step
              </Button>
            </div>

            {/* Add Ons */}
            <div>
              <label className="mb-2 block text-lg font-medium">Add Ons</label>

              {addOnsArray.fields.map((field, index) => (
                <AddOnItems
                  key={field.id}
                  index={index}
                  form={form}
                  removeAddOn={() => addOnsArray.remove(index)}
                />
              ))}

              <Button
                type="button"
                variant="default"
                onClick={() =>
                  addOnsArray.append({
                    title: "",
                    items: [{ title: "", price: 0 }],
                  })
                }
              >
                + Add
              </Button>
            </div>

            <FormField
              control={form.control}
              name="metaTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Title</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Enter SEO Meta Title"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="metaDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Description</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Enter SEO Meta Description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Schema Type */}
            <FormField
              control={form.control}
              name="schemaType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Schema Type</FormLabel>
                  <FormControl>
                    <select
                      multiple
                      value={field.value || []}
                      onChange={(e) => {
                        const values = Array.from(
                          e.target.selectedOptions,
                          (option) => option.value
                        );
                        field.onChange(values);
                      }}
                      className="w-full p-2 border rounded"
                    >
                      {schemaTypes.map((schema) => (
                        <option key={schema} value={schema}>
                          {schema}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              {form.watch("schemaType")?.map((option) => (
                <p
                  key={option}
                  className="bg-gray-100 rounded-lg  p-2 w-[150px]"
                >
                  {option}
                  <X
                    className="float-right cursor-pointer hover:text-red-500"
                    onClick={() =>
                      form.setValue(
                        "schemaType",
                        form
                          .getValues("schemaType")
                          ?.filter((item) => item !== option)
                      )
                    }
                  />
                </p>
              ))}
            </div>

            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Keywords (comma separated)</FormLabel>
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
                          <X size={14} />
                        </button>
                      </span>
                    ))}
                    <FormControl className="flex-1 min-w-[120px]">
                      <Input
                        type="text"
                        className="border-none shadow-none focus-visible:ring-0 w-full"
                        onBlur={(e) => {
                          const arr = e.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean);
                          form.setValue("keywords", [
                            ...(form.getValues("keywords") || []),
                            ...arr,
                          ]);
                          e.target.value = "";
                        }}
                        placeholder="Enter SEO Meta Keywords"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Featured</FormLabel>
                  <FormControl>
                    <select
                      onChange={(e) =>
                        field.onChange(e.target.value === "true")
                      }
                      className="w-full rounded-md border p-2"
                    >
                      <option value="">Select</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isBestSeller"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Best Seller</FormLabel>
                  <FormControl>
                    <select
                      onChange={(e) =>
                        field.onChange(e.target.value === "true")
                      }
                      className="w-full rounded-md border p-2"
                    >
                      <option value="">Select</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full rounded-md border p-2">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Updating..." : "Upate Package"}
            </Button>
          </form>
        </Form>
        {mutation.isError && (
          <p className="text-red-500">Somethings went wrong!</p>
        )}
        {mutation.isSuccess && (
          <p className="text-green-500">Package updated successfully!</p>
        )}
      </div>
    </div>
  );
}
