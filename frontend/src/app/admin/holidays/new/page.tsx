"use client";
import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { CreateBatchModal } from "@/components/admin/Newbatch";
import BlogEditor from "@/components/admin/BlogEditor";
import { CreateReviewsModal } from "@/components/admin/CreateEditReviews";
import { X } from "lucide-react";
import { AddOnItems } from "./AddOnItems";
import SmallEditor from "@/components/admin/SmallEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OpenGraphManager from "@/components/admin/OpenGraphManager";
import { getAllAuthors } from "../../webpage/new/page";

interface Image {
  url: string;
  alt: string;
  public_id?: string;
  width?: number;
  height?: number;
}
export interface AddOns {
  title: string;
  items: {
    title: string;
    price: number;
  }[];
}
interface Faq {
  question: string;
  answer: string;
}
interface Itinerary {
  title: string;
  description: string;
  locationImage?: Image;
  tip?: string;
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
export interface Reviews {
  name: string;
  comment: string;
  rating: number;
  type: string;
  _id?: string;
  location: string;
}
interface PackageFormValues {
  title: string;
  author?: string;
  description?: string;
  batch: string[];
  slug: string;
  destination: string;
  mainCategory: string;
  otherCategory: string[];
  reviews?: string[];
  coverImage?: Image;
  coverImages?: Image[];
  gallery?: Image[];
  duration: { days: number; nights: number };
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  schemaType?: string[];
  keywords?: string[];
  maxPeople?: number;
  highlights?: string[];
  inclusions?: string[];
  exclusions?: string[];
  itinerary?: Itinerary[];
  addOns?: AddOns[];
  itineraryDownload?: Image;
  faqs?: Faq[];
  isFeatured?: boolean;
  isBestSeller?: boolean;
  packageEssentials?: string;
  packageAtAGlance?: string;
  whyChooseThisPackage?: string;
  hotelsAndAccommodation?: string;
  helpfulResources?: { title: string; url: string }[];
  packagePercent: number;
  status: "draft" | "published";
  social?: {
    openGraph?: {
      title?: string;
      description?: string;
      image?: string;
      imageAlt?: string;
      type?: string;
    };
    twitter?: {
      inheritOpenGraph?: boolean;
      title?: string;
      description?: string;
      image?: string;
      card?: string;
    };
  };
}

interface Category {
  _id: string;
  name: string;
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
async function CreatePackage(values: PackageFormValues, accessToken: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/packages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(values),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Package Creation failed");
  }

  return res.json();
}

export const getDestination = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/destination`);
  if (!res.ok) throw new Error("Failed to get destination");
  const data = await res.json();
  return data?.data;
};

const getCategory = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`);
  if (!res.ok) throw new Error("Failed to get category");
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
export const getBatchByIds = async (accessToken: string, ids: string[]) => {
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

export const duplicateBatch = async (accessToken: string, id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/batch/duplicate/${id}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (!res.ok) throw new Error("Failed to duplicate batch");
  const data = await res.json();
  return data?.data;
};
export const getReviewsByIds = async (accessToken: string, ids: string[]) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/reviews/ids`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) throw new Error("Failed to get reviews");
  const data = await res.json();
  return data?.data;
};

export const deleteReview = async (accessToken: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/reviews/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to delete review");
  return res.json();
};
export default function CreatePackagePage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editBatchId, setEditBatchId] = useState<string | null>(null);
  const [batchDetails, setBatchDetails] = useState<Batch[]>([]);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [editReviewsId, setEditReviewsId] = useState<string | null>(null);
  const [reviewsDetails, setReviewsDetails] = useState<Reviews[]>([]);
  const defaultValues: PackageFormValues = {
    title: "",
    author: "",
    description: "",
    metaTitle: "",
    metaDescription: "",
    canonicalUrl: "",
    schemaType: [],
    status: "draft",
    keywords: [],
    coverImage: { url: "", alt: "", public_id: "" },
    coverImages: [],
    gallery: [],
    batch: [],
    reviews: [],
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
    packageEssentials: "",
    packageAtAGlance: "",
    whyChooseThisPackage: "",
    hotelsAndAccommodation: "",
    helpfulResources: [],
    packagePercent: 0,
    social: { twitter: { inheritOpenGraph: true } }
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
  const {
    data: category,
    isLoading: categoryLoading,
    isError: categoryError,
  } = useQuery({
    queryKey: ["category"],
    queryFn: getCategory,
  });
  const { data: allauthors } = useQuery({
    queryKey: ["authors"],
    queryFn: getAllAuthors,
  });
  const form = useForm<PackageFormValues>({ defaultValues });

  const addOnsArray = useFieldArray({ control: form.control, name: "addOns" });
  const helpfulResourcesArray = useFieldArray({ control: form.control, name: "helpfulResources" });
  // const batchArray = useFieldArray({ control: form.control, name: "batch" });
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
  const reviewsArray = useFieldArray({
    control: form.control,
    name: "reviews",
  });
  const bannerTextArray = useFieldArray({
    control: form.control,
    name: "banner_text" as any,
  });

  const mutation = useMutation({
    mutationFn: (values: PackageFormValues) =>
      CreatePackage(values, accessToken),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      toast.success("Package Created successfully");
      // router.refresh();
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    },
  });

  const handleBatchCreated = async (idOrIds: string | string[]) => {
    const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
    form.setValue("batch", [...form.getValues("batch"), ...ids]);
    const newBatches = await getBatchByIds(accessToken, ids);
    setBatchDetails((prev) => [...prev, ...newBatches]);
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
    form.setValue("reviews", [...(form.getValues("reviews") || []), id]);
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
      prev.map((b) => (b._id === id ? updated[0] : b)),
    );
    setShowReviewsModal(false);
    setEditReviewsId(null);
  };

  useEffect(() => {
    if (form.watch("batch").length > 0) {
      const batchIds = form.getValues("batch");
      getBatchByIds(accessToken, batchIds).then((res) => {
        setBatchDetails(res);
      });
    }
  }, [form]);

  const onSubmit: SubmitHandler<PackageFormValues> = (values) => {
    mutation.mutate(values);
  };
  const schemaTypes = ["Collection", "Product", "FAQ", "Review"];

  if (isLoading) return <Loader size="lg" message="Loading destinations..." />;
  if (isError) return <h1>{error.message}</h1>;
  return (
        <div className="w-full bg-gray-50/30 p-2 lg:p-4">
      <div className="w-full rounded-md bg-white p-4 shadow border border-gray-100">
        <h1 className="mb-3 text-center text-lg font-extrabold text-gray-800 tracking-tight">Create a Package</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 h-8 rounded-md p-0.5 mb-2 bg-gray-100">
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="basic">Basic Detail</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="content">Content</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="batch">Batch & Pricing</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="media">Media</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="seo">SEO</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="faqs">FAQs & Review</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="social">Social (OG)</TabsTrigger>
              </TabsList>

              {/* TAB 1: BASIC INFO */}
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
                  <FormField control={form.control} name="mainCategory" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Main Category *</FormLabel><FormControl><select {...field} onChange={(e) => field.onChange(e.target.value)} className="w-full rounded-sm border border-gray-300 px-2 h-7 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary" value={field.value || ""}><option value="" disabled>Select a category</option>{category?.map((cat: Category) => (<option key={cat._id} value={cat._id}>{cat.name.toLocaleUpperCase()}</option>))}</select></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="duration.days" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Days *</FormLabel><FormControl><Input className="h-7 text-xs px-2 rounded-sm" type="number" placeholder="Enter Days Duration" {...field} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="duration.nights" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Nights *</FormLabel><FormControl><Input className="h-7 text-xs px-2 rounded-sm" type="number" placeholder="Enter Nights Duration" {...field} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="isFeatured" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Featured</FormLabel><FormControl><select onChange={(e) => field.onChange(e.target.value === "true")} className="w-full rounded-sm border border-gray-300 px-2 h-7 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"><option value="" disabled>Select</option><option value="true">True</option><option value="false">False</option></select></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="isBestSeller" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Best Seller</FormLabel><FormControl><select onChange={(e) => field.onChange(e.target.value === "true")} className="w-full rounded-sm border border-gray-300 px-2 h-7 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"><option value="" disabled>Select</option><option value="true">True</option><option value="false">False</option></select></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="packagePercent" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Package Percent (%)</FormLabel><FormControl><Input className="h-7 text-xs px-2 rounded-sm" type="number" step="0.01" min="0" max="100" placeholder="0-100" {...field} onChange={(e) => field.onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Status</FormLabel><FormControl><select {...field} className="w-full rounded-sm border border-gray-300 px-2 h-7 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"><option value="draft">Draft</option><option value="published">Published</option></select></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="author" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Author</FormLabel><FormControl><select {...field} onChange={(e) => field.onChange(e.target.value)} className="w-full rounded-sm border border-gray-300 px-2 h-7 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary" value={field.value || ""}><option value="">No Author Assigned</option>{allauthors?.map((author: any) => (<option key={author._id} value={author._id}>{author.name}</option>))}</select></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="otherCategory" render={({ field }) => (
                  <FormItem className="space-y-0.5 mt-3"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Other Category</FormLabel><div className="flex flex-wrap gap-2 mt-1">{category?.map((cat: Category) => (<label key={cat._id} className="flex items-center space-x-2 border rounded-md p-2 bg-slate-50 hover:bg-slate-100 transition-colors"><input type="checkbox" value={cat._id} checked={field.value?.includes(cat._id)} onChange={(e) => { if (e.target.checked) { field.onChange([...(field.value || []), cat._id]); } else { field.onChange(field.value?.filter((id) => id !== cat._id)); } }} className="mt-0.5" /><span className="text-[11px] font-semibold text-slate-800 cursor-pointer">{cat.name}</span></label>))}</div><FormMessage className="text-[10px]" /></FormItem>
                )} />
              </TabsContent>

              {/* TAB 2: CONTENT */}
              <TabsContent value="content" className="space-y-5">
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Description</FormLabel><FormControl><BlogEditor value={field.value} onChange={field.onChange} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 border rounded-md shadow-sm space-y-3"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Highlights</FormLabel>{highlightsArray.fields.map((field, index) => (<div key={field.id} className="flex gap-2"><Input className="h-7 text-xs px-2 rounded-sm" {...form.register(`highlights.${index}`)} placeholder="Enter highlight" /><Button type="button" variant="destructive" size="sm" className="h-7 px-2" onClick={() => highlightsArray.remove(index)}>Remove</Button></div>))}<Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => highlightsArray.append("")}>Add Highlight</Button></div>
                  <div className="bg-white p-3 border rounded-md shadow-sm space-y-3"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Inclusions</FormLabel>{inclusionsArray.fields.map((field, index) => (<div key={field.id} className="flex gap-2"><Input className="h-7 text-xs px-2 rounded-sm" {...form.register(`inclusions.${index}`)} placeholder="Enter inclusion" /><Button type="button" variant="destructive" size="sm" className="h-7 px-2" onClick={() => inclusionsArray.remove(index)}>Remove</Button></div>))}<Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => inclusionsArray.append("")}>Add Inclusion</Button></div>
                  <div className="bg-white p-3 border rounded-md shadow-sm space-y-3"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Exclusions</FormLabel>{exclusionsArray.fields.map((field, index) => (<div key={field.id} className="flex gap-2"><Input className="h-7 text-xs px-2 rounded-sm" {...form.register(`exclusions.${index}`)} placeholder="Enter exclusion" /><Button type="button" variant="destructive" size="sm" className="h-7 px-2" onClick={() => exclusionsArray.remove(index)}>Remove</Button></div>))}<Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => exclusionsArray.append("")}>Add Exclusion</Button></div>
                </div>
                <div className="bg-white p-3 border rounded-md shadow-sm space-y-3"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Itinerary</FormLabel>{itineraryArray.fields.map((field, index) => (<div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2 p-3 bg-gray-50 border rounded-md"><div className="flex flex-col gap-2"><Input className="h-7 text-xs px-2 rounded-sm" {...form.register(`itinerary.${index}.title` as const)} placeholder="Day Title" /><Textarea className="text-xs p-2 min-h-[60px]" {...form.register(`itinerary.${index}.description` as const)} placeholder="Day Description" /><Input className="h-7 text-xs px-2 rounded-sm" {...form.register(`itinerary.${index}.tip` as const)} placeholder="Day Tip (Optional)" /></div><div className="flex flex-col gap-2 justify-between"><div><FormLabel className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Location Image (Optional)</FormLabel><ImageUploader onUpload={(img) => { if (!img) return null; form.setValue(`itinerary.${index}.locationImage` as const, { url: img.url, public_id: img.public_id, alt: img.alt ?? "Itinerary Image" }); }} /></div><Button type="button" variant="destructive" size="sm" className="self-end h-7 text-[10px] w-full mt-2" onClick={() => itineraryArray.remove(index)}>Remove Step</Button></div></div>))}<Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => itineraryArray.append({ title: "", description: "" })}>Add Itinerary Step</Button></div>
                <div className="bg-white p-3 border rounded-md shadow-sm space-y-3">
                {/* Additional Content Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="packageEssentials" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Package Essentials</FormLabel><FormControl><BlogEditor value={field.value} onChange={field.onChange} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="packageAtAGlance" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Package At A Glance</FormLabel><FormControl><BlogEditor value={field.value} onChange={field.onChange} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="whyChooseThisPackage" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Why Choose This Package</FormLabel><FormControl><BlogEditor value={field.value} onChange={field.onChange} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="hotelsAndAccommodation" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Hotels & Accommodation</FormLabel><FormControl><BlogEditor value={field.value} onChange={field.onChange} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                  <FormField control={form.control} name="cta" render={({ field }) => (
                    <FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">CTA</FormLabel><FormControl><BlogEditor value={field.value} onChange={field.onChange} /></FormControl><FormMessage className="text-[10px]" /></FormItem>
                  )} />
                </div>
                
                <div className="bg-white p-3 border rounded-md shadow-sm space-y-3">
                  <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Banner Text Rows</FormLabel>
                  {bannerTextArray.fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <Input className="h-7 text-xs px-2 rounded-sm" {...form.register(`banner_text.${index}` as const)} placeholder="Enter banner text row" />
                      <Button type="button" variant="destructive" size="sm" className="h-7 px-2" onClick={() => bannerTextArray.remove(index)}>Remove</Button>
                    </div>
                  ))}
                  <Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => bannerTextArray.append("")}>Add Banner Row</Button>
                </div>

                {/* Helpful Resources */}
                <div className="bg-white p-3 border rounded-md shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Helpful Resources</FormLabel>
                    <Button type="button" variant="secondary" size="sm" onClick={() => helpfulResourcesArray.append({ title: "", url: "" })} className="text-[9px] font-black uppercase h-7 px-3 bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200">
                      + Add Resource
                    </Button>
                  </div>
                  {helpfulResourcesArray.fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <Input className="h-7 text-xs px-2 rounded-sm flex-1" {...form.register(`helpfulResources.${index}.title`)} placeholder="Resource Title" />
                      <Input className="h-7 text-xs px-2 rounded-sm flex-1" {...form.register(`helpfulResources.${index}.url`)} placeholder="Resource URL" />
                      <Button type="button" variant="destructive" size="sm" className="h-7 px-2" onClick={() => helpfulResourcesArray.remove(index)}>X</Button>
                    </div>
                  ))}
                </div>

                  <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Add Ons</FormLabel>{addOnsArray.fields.map((field, index) => (<AddOnItems key={field.id} index={index} form={form} removeAddOn={() => addOnsArray.remove(index)} />))}<Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => addOnsArray.append({ title: "", items: [{ title: "", price: 0 }] })}>+ Add Add-On</Button></div>
              </TabsContent>

              {/* TAB 3: BATCH & PRICING */}
              <TabsContent value="batch" className="space-y-3">
                <div className="bg-white p-3 border rounded-md shadow-sm space-y-3">
                  <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Batch & Pricing</FormLabel>
                  {batchDetails.map((field, index) => (<div key={field._id} className="flex justify-between items-center p-2 bg-gray-50 border rounded-md mb-2"><div className="flex items-center text-left gap-2"><span className="font-medium text-xs">{field?.name || `Batch ${index + 1}`}</span><span className="text-[10px] text-gray-500">{field?.startDate ? `${new Date(field?.startDate).toLocaleDateString()} → ${new Date(field?.endDate).toLocaleDateString()}` : "No date info"}</span></div><div className="flex gap-2"><Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={() => handleBatchDuplicate(field._id)}>Duplicate</Button><Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={() => handleBatchEdit(field._id)}>Edit</Button><Button type="button" variant="destructive" size="sm" className="h-7 px-2 text-[10px]" onClick={async () => { if (!window.confirm("Are you sure you want to delete this batch?")) return; const res = await deleteBatch(accessToken, field._id); if (res) { form.setValue("batch", form.getValues("batch").filter((id) => id !== field._id)); setBatchDetails((prev) => prev.filter((item) => item._id !== field._id)); } }}>Delete</Button></div></div>))}
                  <Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => setShowBatchModal(true)}>+ Add New Batch</Button>
                </div>
              </TabsContent>

              {/* TAB 4: MEDIA */}
              <TabsContent value="media" className="space-y-3">
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 border rounded-md shadow-sm space-y-2"><FormField control={form.control} name="itineraryDownload" render={() => (<FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Itinerary PDF Upload</FormLabel><FormControl><ImageUploader onUpload={(img) => { if (!img) return null; form.setValue("itineraryDownload", { url: img.url, public_id: img.public_id, alt: img.alt ?? form.getValues("title") }); }} /></FormControl><FormMessage className="text-[10px]" /></FormItem>)} /></div>
                </div>
                <div className="bg-white p-3 border rounded-md shadow-sm space-y-3"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Image Gallery</FormLabel><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{coverImageArray.fields.map((field, index) => (<div key={field.id} className="flex flex-col items-center gap-2 p-2 border rounded bg-gray-50"><ImageUploader onUpload={(img) => { if (!img) return null; form.setValue(`gallery.${index}`, { url: img.url, public_id: img.public_id, alt: img.alt ?? form.getValues("title"), width: img.width, height: img.height }); }} /><Button type="button" variant="destructive" size="sm" className="h-7 text-[10px] w-full" onClick={() => coverImageArray.remove(index)}>Remove</Button></div>))}</div><Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => coverImageArray.append({ url: "", public_id: "", width: 0, height: 0, alt: "" })}>Add Image to Gallery</Button></div>
              </TabsContent>

              {/* TAB 5: SEO */}
              <TabsContent value="seo" className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField control={form.control} name="metaTitle" render={({ field }) => (<FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Meta Title</FormLabel><FormControl><Input className="h-7 text-xs px-2 rounded-sm" type="text" placeholder="Enter SEO Meta Title" {...field} /></FormControl><FormMessage className="text-[10px]" /></FormItem>)} />
                  <FormField control={form.control} name="metaDescription" render={({ field }) => (<FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Meta Description</FormLabel><FormControl><Input className="h-7 text-xs px-2 rounded-sm" type="text" placeholder="Enter SEO Meta Description" {...field} /></FormControl><FormMessage className="text-[10px]" /></FormItem>)} />
                  <FormField control={form.control} name="canonicalUrl" render={({ field }) => (<FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Canonical URL</FormLabel><FormControl><Input className="h-7 text-xs px-2 rounded-sm" type="text" placeholder="Enter Canonical URL" {...field} /></FormControl><FormMessage className="text-[10px]" /></FormItem>)} />
                  <FormField control={form.control} name="schemaType" render={({ field }) => (<FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Schema Type</FormLabel><FormControl><select multiple value={field.value || []} onChange={(e) => { const values = Array.from(e.target.selectedOptions, (option) => option.value); field.onChange(values); }} className="w-full p-2 border rounded text-xs focus:ring-1 focus:ring-primary">{schemaTypes.map((schema) => (<option key={schema} value={schema}>{schema}</option>))}</select></FormControl><FormMessage className="text-[10px]" /></FormItem>)} />
                </div>
                <div className="flex gap-2">{form.watch("schemaType")?.map((option) => (<div key={option} className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1 text-xs">{option}<X className="w-3 h-3 cursor-pointer hover:text-red-500" onClick={() => form.setValue("schemaType", form.getValues("schemaType")?.filter((item) => item !== option))} /></div>))}</div>
                <FormField control={form.control} name="keywords" render={({ field }) => (<FormItem className="space-y-0.5"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Target Keywords (comma separated)</FormLabel><div className="flex flex-wrap gap-2 border border-gray-300 rounded-sm p-2 bg-white">{form.watch("keywords")?.map((kw, i) => (<span key={i} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs">{kw}<button type="button" onClick={() => { const newKeywords = form.getValues("keywords")?.filter((_, idx) => idx !== i); form.setValue("keywords", newKeywords); }} className="text-gray-600 hover:text-red-500"><X size={12} /></button></span>))}<FormControl className="flex-1 min-w-[120px]"><Input type="text" className="h-7 text-xs px-2 border-none shadow-none focus-visible:ring-0 w-full" onBlur={(e) => { const arr = e.target.value.split(",").map((item) => item.trim()).filter(Boolean); form.setValue("keywords", [...(form.getValues("keywords") || []), ...arr]); e.target.value = ""; }} placeholder="Enter keywords" /></FormControl></div><FormMessage className="text-[10px]" /></FormItem>)} />
              </TabsContent>

              {/* TAB 6: FAQS & REVIEWS */}
              <TabsContent value="faqs" className="space-y-5">
                <div className="bg-white p-3 border rounded-md shadow-sm space-y-3"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">FAQs</FormLabel>{faqsArray.fields.map((field, index) => (<div key={field.id} className="flex gap-2"><div className="grid gap-2 mb-2 flex-1 border border-gray-100 p-2 rounded bg-gray-50"><Input className="h-7 text-xs px-2 rounded-sm bg-white" {...form.register(`faqs.${index}.question`)} placeholder="Question" /><div className="border border-gray-200 rounded p-2 bg-white"><SmallEditor value={form.getValues(`faqs.${index}.answer`)} onChange={(val) => form.setValue(`faqs.${index}.answer`, val)} /></div></div><Button type="button" variant="destructive" size="sm" className="h-7 px-2 mt-2" onClick={() => faqsArray.remove(index)}>X</Button></div>))}<Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => faqsArray.append({ question: "", answer: "" })}>Add FAQ</Button></div>
                <div className="bg-white p-3 border rounded-md shadow-sm space-y-3"><FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Reviews</FormLabel>{reviewsArray.fields.map((field, index) => (<div key={field.id} className="flex justify-between items-center p-2 bg-gray-50 border rounded-md mb-2"><span className="font-medium text-xs">{reviewsDetails[index]?.name || `Review ${index + 1}`}</span><div className="flex gap-2"><Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[10px]" onClick={() => handleReviewsEdit(form.getValues(`reviews.${index}`))}>Edit</Button><Button type="button" variant="destructive" size="sm" className="h-7 px-2 text-[10px]" onClick={async () => { const res = await deleteReview(accessToken, form.getValues(`reviews.${index}`)); if (res) reviewsArray.remove(index); }}>Delete</Button><Button type="button" variant="destructive" size="sm" className="h-7 px-2 text-[10px]" onClick={() => reviewsArray.remove(index)}>Remove Link</Button></div></div>))}<Button type="button" size="sm" className="h-7 text-[11px]" onClick={() => setShowReviewsModal(true)}>+ Add New Review</Button></div>
              </TabsContent>

              {/* TAB 7: SOCIAL (OG) */}
              <TabsContent value="social" className="space-y-3">
                <OpenGraphManager 
                  form={form} 
                  moduleType="PACKAGE" 
                  baseMetadata={{
                    title: form.watch("metaTitle") || form.watch("title") || "",
                    description: form.watch("metaDescription") || form.watch("description") || "",
                    image: form.watch("coverImage.url") || "https://musafirbaba.com/homebanner1.jpg",
                    imageAlt: form.watch("metaTitle") || form.watch("title") || ""
                  }} 
                />
              </TabsContent>
            </Tabs>

            <div className="pt-4 flex justify-end">
              <Button type="submit" className="w-full md:w-auto h-9 text-xs px-6 font-bold" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating..." : "Create Package"}
              </Button>
            </div>
          </form>
        </Form>
        {showBatchModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><CreateBatchModal onBatchCreated={handleBatchCreated} onClose={() => { setShowBatchModal(false); setEditBatchId(null); }} onBatchUpdated={handleBatchUpdated} existingBatch={editBatchId} packageDuration={form.watch("duration.days") || 0} /></div>)}
        {showReviewsModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><CreateReviewsModal onReviewsCreated={handleReviewsCreated} onClose={() => { setShowReviewsModal(false); setEditReviewsId(null); }} onReviewsUpdated={handleReviewsUpdated} existingReviews={editReviewsId} type="package" /></div>)}
        {mutation.isError && <p className="text-red-500 text-xs mt-2 text-center">Something went wrong!</p>}
        {mutation.isSuccess && <p className="text-green-500 text-xs mt-2 text-center">Package created successfully!</p>}
      </div>
    </div>
  );
}
