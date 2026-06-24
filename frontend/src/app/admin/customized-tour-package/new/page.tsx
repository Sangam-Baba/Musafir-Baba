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
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { CreateReviewsModal } from "@/components/admin/CreateEditReviews";
import {
  deleteReview,
  getReviewsByIds,
  Reviews,
} from "../../holidays/new/page";
import SmallEditor from "@/components/admin/SmallEditor";
import BlogEditor from "@/components/admin/BlogEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAllAuthors } from "../../webpage/new/page";

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
interface Plans {
  title: string;
  include: string;
  price: number;
}
interface Highlight {
  title: string;
}
export interface CustomizedPackageValues {
  title: string;
  author?: string;
  description?: string;
  slug: string;
  plans: Plans[];
  reviews?: string[];
  destination: string;
  coverImage?: Image;
  coverImages?: Image[];
  gallery?: Image[];
  duration: { days: number; nights: number };
  time?: { startTime: string; endTime: string };
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  keywords?: string[];
  highlight?: Highlight[];
  itinerary?: Itinerary[];
  faqs?: Faq[];
  status: "draft" | "published";
  experienceAtAGlance?: string;
  aboutThisExperience?: string;
  placesCovered?: string;
  whoIsThisExperienceFor?: string;
  inclusions?: string[];
  exclusions?: string[];
  customizationOptions?: string;
  helpfulResources?: { title: string; url: string }[];
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
async function CreatePackage(
  values: CustomizedPackageValues,
  accessToken: string,
) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(values),
    },
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
export default function CreatePackagePage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [editReviewsId, setEditReviewsId] = useState<string | null>(null);
  const [reviewsDetails, setReviewsDetails] = useState<Reviews[]>([]);
  const defaultValues: CustomizedPackageValues = {
    title: "",
    author: "",
    description: "",
    metaTitle: "",
    metaDescription: "",
    canonicalUrl: "",
    keywords: [],

    plans: [
      {
        title: "",
        include: "",
        price: 0,
      },
    ],
    reviews: [],
    destination: "",
    duration: { days: 0, nights: 0 },
    highlight: [],
    itinerary: [],
    faqs: [],
    slug: "",
    status: "draft",
    experienceAtAGlance: "",
    aboutThisExperience: "",
    placesCovered: "",
    whoIsThisExperienceFor: "",
    inclusions: [],
    exclusions: [],
    customizationOptions: "",
    helpfulResources: [],
  };

  const {
    data: destination,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["destination"],
    queryFn: getDestination,
  });
  const { data: allauthors } = useQuery({
    queryKey: ["authors"],
    queryFn: getAllAuthors,
  });
  const form = useForm<CustomizedPackageValues>({ defaultValues });

  const coverImageArray = useFieldArray({
    control: form.control,
    name: "gallery",
  });
  const coverImagesArray = useFieldArray({
    control: form.control,
    name: "coverImages",
  });
  const highlightsArray = useFieldArray({
    control: form.control,
    name: "highlight",
  });
  const plansArray = useFieldArray({ control: form.control, name: "plans" });
  const faqsArray = useFieldArray({ control: form.control, name: "faqs" });
  const itineraryArray = useFieldArray({
    control: form.control,
    name: "itinerary",
  });
  const inclusionsArray = useFieldArray({
    control: form.control,
    name: "inclusions",
  });
  const exclusionsArray = useFieldArray({
    control: form.control,
    name: "exclusions",
  });
  const helpfulResourcesArray = useFieldArray({
    control: form.control,
    name: "helpfulResources",
  });

  const mutation = useMutation({
    mutationFn: (values: CustomizedPackageValues) =>
      CreatePackage(values, accessToken),
    onSuccess: () => {
      toast.success("Package Created successfully");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    },
  });

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
      prev.map((b) => (b._id === id ? updated[0] : b)),
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

  const onSubmit: SubmitHandler<CustomizedPackageValues> = (values) => {
    mutation.mutate(values);
  };

  if (isLoading) return <Loader size="lg" message="Loading destinations..." />;
  if (isError) return <h1>{error.message}</h1>;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">
          Create a Package
        </h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-8 rounded-md p-0.5 mb-2 bg-gray-100">
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="basic">Basic Detail</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="media">Media</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="content">Content</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="seo">SEO & Reviews</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Title *</FormLabel><FormControl><Input className="h-7 text-xs px-2 rounded-sm" placeholder="Enter Package Title" {...field} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="slug" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Permalink *</FormLabel><FormControl><Input className="h-7 text-xs px-2 rounded-sm" placeholder="Enter Permalink..." {...field} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="destination" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Destination *</FormLabel><FormControl><select {...field} onChange={(e) => field.onChange(e.target.value)} className="w-full rounded-sm border border-gray-300 px-2 h-7 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary" value={field.value || ""}><option value="" disabled>Select a destination</option>{destination?.map((dest: Destination) => (<option key={dest._id} value={dest._id}>{dest.state.toLocaleUpperCase()}</option>))}</select></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="author" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Author</FormLabel><FormControl><select {...field} onChange={(e) => field.onChange(e.target.value)} className="w-full rounded-sm border border-gray-300 px-2 h-7 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary" value={field.value || ""}><option value="">No Author Assigned</option>{allauthors?.map((author: any) => (<option key={author._id} value={author._id}>{author.name}</option>))}</select></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="duration.days" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Days *</FormLabel><FormControl><Input className="h-7 text-xs px-2 rounded-sm" type="number" placeholder="Enter Days Duration" {...field} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="duration.nights" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Nights *</FormLabel><FormControl><Input className="h-7 text-xs px-2 rounded-sm" type="number" placeholder="Enter Nights Duration" {...field} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="time.startTime" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Start Time *</FormLabel><FormControl><Input className="h-7 text-xs px-2 rounded-sm" type="time" value={field.value || ""} onChange={(e) => field.onChange(e.target.value)} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="time.endTime" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">End Time</FormLabel><FormControl><Input className="h-7 text-xs px-2 rounded-sm" type="time" value={field.value || ""} onChange={(e) => field.onChange(e.target.value)} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 border rounded-md shadow-sm space-y-3">
                    <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Cover Images</FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {coverImagesArray.fields.map((field, index) => (
                        <div key={field.id} className="flex flex-col items-center gap-2 p-2 border rounded bg-gray-50">
                          <ImageUploader onUpload={(img) => { if (!img) return null; form.setValue(`coverImages.${index}`, { url: img.url, public_id: img.public_id, alt: img.alt ?? form.getValues("title"), width: img.width, height: img.height }); }} />
                          <Button type="button" variant="destructive" size="sm" className="h-7 text-[10px] w-full" onClick={() => coverImagesArray.remove(index)}>Remove</Button>
                        </div>
                      ))}
                    </div>
                    <Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => coverImagesArray.append({ url: "", public_id: "", width: 0, height: 0, alt: "" })}>Add Cover Image</Button>
                  </div>
                </div>
                <div className="bg-white p-3 border rounded-md shadow-sm space-y-3">
                  <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Image Gallery</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {coverImageArray.fields.map((field, index) => (
                      <div key={field.id} className="flex flex-col items-center gap-2 p-2 border rounded bg-gray-50">
                        <ImageUploader onUpload={(img) => { if (!img) return null; form.setValue(`gallery.${index}`, { url: img.url, public_id: img.public_id, alt: img.alt ?? form.getValues("title"), width: img.width, height: img.height }); }} />
                        <Button type="button" variant="destructive" size="sm" className="h-7 text-[10px] w-full" onClick={() => coverImageArray.remove(index)}>Remove</Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => coverImageArray.append({ url: "", public_id: "", width: 0, height: 0, alt: "" })}>Add Image to Gallery</Button>
                </div>
              </TabsContent>

              <TabsContent value="content" className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <FormField control={form.control} name="experienceAtAGlance" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Experience At A Glance</FormLabel><FormControl><BlogEditor value={field.value} onChange={field.onChange} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="aboutThisExperience" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">About This Experience</FormLabel><FormControl><BlogEditor value={field.value} onChange={field.onChange} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="placesCovered" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Places Covered</FormLabel><FormControl><BlogEditor value={field.value} onChange={field.onChange} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="whoIsThisExperienceFor" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Who Is This Experience For</FormLabel><FormControl><BlogEditor value={field.value} onChange={field.onChange} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 border rounded-md shadow-sm space-y-3"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Inclusions</FormLabel>{inclusionsArray.fields.map((field, index) => (<div key={field.id} className="flex gap-2"><Input className="h-7 text-xs px-2 rounded-sm" {...form.register(`inclusions.${index}` as const)} placeholder="Enter inclusion" /><Button type="button" variant="destructive" size="sm" className="h-7 px-2" onClick={() => inclusionsArray.remove(index)}>Remove</Button></div>))}<Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => inclusionsArray.append("")}>Add Inclusion</Button></div>
                  <div className="bg-white p-3 border rounded-md shadow-sm space-y-3"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Exclusions</FormLabel>{exclusionsArray.fields.map((field, index) => (<div key={field.id} className="flex gap-2"><Input className="h-7 text-xs px-2 rounded-sm" {...form.register(`exclusions.${index}` as const)} placeholder="Enter exclusion" /><Button type="button" variant="destructive" size="sm" className="h-7 px-2" onClick={() => exclusionsArray.remove(index)}>Remove</Button></div>))}<Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => exclusionsArray.append("")}>Add Exclusion</Button></div>
                </div>
                <div className="bg-white p-3 border rounded-md shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Helpful Resources</FormLabel>
                    <Button type="button" variant="secondary" size="sm" onClick={() => helpfulResourcesArray.append({ title: "", url: "" })} className="text-[9px] font-black uppercase h-7 px-3 bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200">
                      + Add Resource
                    </Button>
                  </div>
                  {helpfulResourcesArray.fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <Input className="h-7 text-xs px-2 rounded-sm flex-1" {...form.register(`helpfulResources.${index}.title` as const)} placeholder="Resource Title" />
                      <Input className="h-7 text-xs px-2 rounded-sm flex-1" {...form.register(`helpfulResources.${index}.url` as const)} placeholder="Resource URL" />
                      <Button type="button" variant="destructive" size="sm" className="h-7 px-2" onClick={() => helpfulResourcesArray.remove(index)}>X</Button>
                    </div>
                  ))}
                </div>

            {/* Highlights Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">Highlights</FormLabel>
              {highlightsArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mb-2">
                  <Input
                    {...form.register(`highlight.${index}.title`)}
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
              <Button
                type="button"
                onClick={() => highlightsArray.append({ title: "" })}
              >
                Add Highlight
              </Button>
            </div>

            {/* Plans */}
            <div>
              <FormLabel className="mb-2 text-lg">Plans</FormLabel>
              {plansArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mb-2">
                  <Input
                    {...form.register(`plans.${index}.title`)}
                    placeholder="Enter Plan Title"
                  />
                  <Textarea
                    {...form.register(`plans.${index}.include`)}
                    placeholder="Enter Includes"
                  />
                  <Input
                    {...form.register(`plans.${index}.price`)}
                    placeholder="Enter Plan Price"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => plansArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() =>
                  plansArray.append({ title: "", include: "", price: 0 })
                }
              >
                Add Highlight
              </Button>
            </div>

            {/* FAQs Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">FAQs</FormLabel>
              {faqsArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <div key={field.id} className="grid gap-2 mb-2">
                    <Input
                      {...form.register(`faqs.${index}.question`)}
                      placeholder="Question"
                    />
                    <div className="border rounded p-2">
                      <SmallEditor
                        value={form.getValues(`faqs.${index}.answer`)}
                        onChange={(val) =>
                          form.setValue(`faqs.${index}.answer`, val)
                        }
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => faqsArray.remove(index)}
                  >
                    X
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
              </TabsContent>

              <TabsContent value="seo" className="space-y-6">
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
              name="canonicalUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Canonical URL</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Enter Canonical URL"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
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
              </TabsContent>
            </Tabs>

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
              {mutation.isPending ? "Creating..." : "Create Package"}
            </Button>
          </form>
        </Form>
        {mutation.isError && (
          <p className="text-red-500">Somethings went wrong!</p>
        )}
        {mutation.isSuccess && (
          <p className="text-green-500">Package created successfully!</p>
        )}
      </div>
    </div>
  );
}
