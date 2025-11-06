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
import { useAuthStore } from "@/store/useAuthStore";
import { Loader } from "@/components/custom/loader";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { CreateBatchModal } from "@/components/admin/Newbatch";
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
  slug: string;
  destination: string;
  coverImage: Image;
  gallery?: Image[];
  duration: { days: number; nights: number };
  metaTitle: string;
  metaDescription: string;
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
export default function CreatePackagePage() {
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editBatchId, setEditBatchId] = useState<string | null>(null);
  const [batchDetails, setBatchDetails] = useState<Batch[]>([]);
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const params = useParams();
  const id = params.id as string;

  const defaultValues: PackageFormValues = {
    title: "",
    description: "",
    metaTitle: "",
    metaDescription: "",
    status: "draft",
    keywords: [],
    coverImage: { url: "", alt: "", public_id: "" },
    gallery: [],
    batch: [],
    destination: "",
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
  const form = useForm<PackageFormValues>({
    defaultValues,
    shouldUnregister: false,
  });

  const handleBatchCreated = async (id: string) => {
    const newBatch = await getBatchByIds(accessToken, [id]);
    batchArray.append(id);
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
  const batchArray = useFieldArray({ control: form.control, name: "batch" });
  useEffect(() => {
    if (pkg) {
      const batchIds = pkg.batch?.map((b: string) => b) || [];
      form.reset({
        ...pkg,
        destination: pkg.destination?._id.toString() || "",
        batch: batchIds,
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
      // console.log("Package Batch: ", pkg?.batch);
    }
  }, [pkg, form, accessToken]);
  // console.log("Batch Details: ", batchDetails);
  // console.log("Batch Array Fields: ", batchArray.fields);
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
                    <Textarea placeholder="Describe the package" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Batch Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">Batch *</FormLabel>
              {batchArray.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-2 gap-2 mb-2">
                  {/* Batch Content */}
                  <div className="flex  items-center text-left gap-2">
                    <span className="font-medium">
                      {batchDetails[index]?.name || `Batch ${index + 1}`}
                    </span>
                    <span className="text-xs text-gray-500">
                      {batchDetails[index]?.startDate
                        ? `${new Date(
                            batchDetails[index].startDate
                          ).toLocaleDateString()} → ${new Date(
                            batchDetails[index].endDate
                          ).toLocaleDateString()}`
                        : "No date info"}
                    </span>
                  </div>

                  {/* Batch Actions */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        batchArray.remove(index);
                        setBatchDetails((prev) =>
                          prev.filter((_, i) => i !== index)
                        );
                      }}
                    >
                      Remove
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      onClick={() =>
                        handleBatchEdit(form.getValues(`batch.${index}`))
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={async () => {
                        const batchId = form.getValues(`batch.${index}`);
                        const res = await deleteBatch(accessToken, batchId);
                        if (res) {
                          batchArray.remove(index);
                          setBatchDetails((prev) =>
                            prev.filter((_, i) => i !== index)
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

            {/* Cover Image */}
            <FormField
              control={form.control}
              name="coverImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Image</FormLabel>
                  <FormControl>
                    <ImageUploader
                      initialImage={form.watch("coverImage")}
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
            {/* Itinary Download */}
            <FormField
              control={form.control}
              name="itineraryDownload"
              render={() => (
                <FormItem>
                  <FormLabel>Itinerary PDF Upload</FormLabel>
                  <FormControl>
                    <ImageUploader
                      initialImage={form.watch("itineraryDownload")}
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

            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Keywords (comma separated)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      onChange={(e) =>
                        field.onChange(e.target.value.split(","))
                      }
                      placeholder="Enter SEO Meta Keywords"
                    />
                  </FormControl>
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
