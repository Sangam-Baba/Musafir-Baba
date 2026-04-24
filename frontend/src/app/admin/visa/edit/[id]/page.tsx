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
import { useParams } from "next/navigation";
import { Loader } from "@/components/custom/loader";
import { useEffect } from "react";
import BlogEditor from "@/components/admin/BlogEditor";
import { X } from "lucide-react";
import { CreateReviewsModal } from "@/components/admin/CreateEditReviews";
import { Reviews } from "@/app/admin/holidays/new/page";
import { deleteReview } from "@/app/admin/holidays/new/page";
import { getReviewsByIds } from "@/app/admin/holidays/new/page";
import { Visa } from "../../new/page";
import { Label } from "@/components/ui/label";
import SmallEditor from "@/components/admin/SmallEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

async function updateVisa(values: Visa, accessToken: string, id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(values),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Updation failed");
  }

  return res.json();
}

async function getVisa(id: string, accessToken: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch Visa");
  const data = await res.json();
  return data?.data;
}
export default function CreateVisaPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const { id } = useParams() as { id: string };
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [editReviewsId, setEditReviewsId] = useState<string | null>(null);
  const [reviewsDetails, setReviewsDetails] = useState<Reviews[]>([]);

  const defaultValues: Visa = {
    country: "",
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    schemaType: [],
    metaTitle: "",
    metaDescription: "",
    canonicalUrl: "",
    keywords: [],
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
    necessaryDocuments: ["Photo", "Passport"],
    process: [],
  };
  const form = useForm<Visa>({ defaultValues });
  const { data, isLoading, isError, error } = useQuery<Visa>({
    queryKey: ["visa", id],
    queryFn: () => getVisa(id, accessToken),
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  const faqsArray = useFieldArray({
    control: form.control,
    name: "faqs",
  });

  useEffect(() => {
    if (data) {
      const reviewsIds = data.reviews?.map((b: string) => b) || [];
      form.reset({
        ...data,
        reviews: reviewsIds,
      });
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
  }, [data, form, accessToken]);

  // ✅ pass variables (values) into mutate
  const mutation = useMutation({
    mutationFn: (values: Visa) => updateVisa(values, accessToken, id),
    onSuccess: () => {
      toast.success("Updated successful!");
    },
    onError: (error: unknown) => {
      console.error("Updation failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
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

  const schemaTypes = ["FAQ", "Webpage", "Review"];

  if (isLoading) return <Loader size="lg" message="Loading Visa..." />;
  if (isError) return <h1>{(error as Error).message}</h1>;

  return (
    <div className="w-full bg-gray-50/30 p-2 lg:p-4">
      <div className="w-full rounded-md bg-white p-4 shadow border border-gray-100">
        <h1 className="mb-3 text-center text-lg font-extrabold text-gray-800 tracking-tight">Edit Visa</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-8 rounded-md p-0.5 mb-2 bg-gray-100">
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="basic">Basic Detail</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="content">Content</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="media">Media</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="seo">SEO & Docs</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="faqs">FAQs & Review</TabsTrigger>
              </TabsList>

              {/* TAB 1: BASIC INFO */}
              <TabsContent value="basic" className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Name */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Title</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 rounded-sm" placeholder="Thailand Visa" {...field} required />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  {/* SLug */}
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Permalink</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 rounded-sm" placeholder="thailand-visa" {...field} required />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  {/* country */}
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Country</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 rounded-sm" placeholder="Thailand" {...field} required />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {/* Role */}
                  <FormField
                    control={form.control}
                    name="visaType"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Visa Type</FormLabel>
                        <FormControl>
                          <select
                            className="w-full rounded-sm border border-gray-300 px-2 h-7 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                            {...field}
                            required
                          >
                            <option value="" disabled>Select Visa Type</option>
                            <option value="DAC">DAC</option>
                            <option value="E-Visa">E-Visa</option>
                            <option value="ETA">ETA</option>
                            <option value="EVOA">EVOA</option>
                            <option value="PAR">PAR</option>
                            <option value="Sticker">Sticker</option>
                          </select>
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {/* Fee */}
                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Fee</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 rounded-sm" type="number" placeholder="100" {...field} required />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {/* Processed */}
                  <FormField
                    control={form.control}
                    name="visaProcessed"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Total Processed</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 rounded-sm" type="number" placeholder="100" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {/* Duration */}
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Duration</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 rounded-sm" type="text" placeholder="2 to 7" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* TAB 2: CONTENT */}
              <TabsContent value="content" className="space-y-3">
                {/* Content */}
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem className="space-y-0.5">
                      <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Content</FormLabel>
                      <FormControl className="text-xs">
                        <BlogEditor value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
                
                {/* excerpt*/}
                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem className="space-y-0.5">
                      <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Excerpt</FormLabel>
                      <FormControl>
                        <Input className="h-7 text-xs px-2 rounded-sm" type="text" placeholder="Short description" {...field} />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* TAB 3: MEDIA */}
              <TabsContent value="media" className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 items-start gap-3">
                  {/* Avatar */}
                  <div className="space-y-2 p-2 border rounded bg-gray-50/50">
                    <FormField
                      control={form.control}
                      name="coverImage"
                      render={() => (
                        <FormItem className="space-y-0.5">
                          <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Avatar</FormLabel>
                          <FormControl>
                            <div className="max-w-[160px] mx-auto w-full">
                              <ImageUploader
                                initialImage={data?.coverImage}
                                onUpload={(img) => {
                                  if (!img) return;
                                  form.setValue("coverImage", {
                                    url: img ? img.url : "",
                                    alt: img.alt ?? form.getValues("country"),
                                  });
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    <Input
                      className="h-7 text-xs px-2 rounded-sm mt-1"
                      placeholder="Cover alt"
                      value={form.watch("coverImage")?.alt ?? ""}
                      onChange={(e) =>
                        form.setValue("coverImage.alt", e.target.value ?? form.getValues("country"))
                      }
                    />
                  </div>

                  {/* Banner Image */}
                  <div className="space-y-2 p-2 border rounded bg-gray-50/50">
                    <FormField
                      control={form.control}
                      name="bannerImage"
                      render={() => (
                        <FormItem className="space-y-0.5">
                          <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Banner Image</FormLabel>
                          <FormControl>
                            <div className="max-w-[160px] mx-auto w-full">
                              <ImageUploader
                                initialImage={data?.bannerImage}
                                onUpload={(img) => {
                                  if (!img) return;
                                  form.setValue("bannerImage", {
                                    url: img ? img.url : "",
                                    alt: img.alt ?? form.getValues("country"),
                                  });
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    <Input
                      className="h-7 text-xs px-2 rounded-sm mt-1"
                      placeholder="Banner alt"
                      value={form.watch("bannerImage")?.alt ?? ""}
                      onChange={(e) =>
                        form.setValue("bannerImage.alt", e.target.value ?? form.getValues("country"))
                      }
                    />
                  </div>
                </div>
              </TabsContent>

              {/* TAB 4: SEO & DOCS */}
              <TabsContent value="seo" className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* metaTitle */}
                  <FormField
                    control={form.control}
                    name="metaTitle"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">SEO MetaTitle</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 rounded-sm" type="text" placeholder="Title for SEO" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {/* meta description */}
                  <FormField
                    control={form.control}
                    name="metaDescription"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">SEO MetaDescription</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 rounded-sm" type="text" placeholder="Description for SEO" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {/* canonicalUrl */}
                  <FormField
                    control={form.control}
                    name="canonicalUrl"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Canonical Url</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 rounded-sm" type="text" placeholder="Canonical Url" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  
                  {/* Schema Type */}
                  <FormField
                    control={form.control}
                    name="schemaType"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Schema Type</FormLabel>
                        <FormControl>
                          <select
                            className="w-full rounded-sm border border-gray-300 p-1 text-[11px] h-16 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                            value={field.value || []}
                            onChange={(e) => {
                              const value = Array.from(e.target.selectedOptions, (option) => option.value);
                              field.onChange(value);
                            }}
                            multiple
                          >
                            {schemaTypes.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </FormControl>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {form.watch("schemaType")?.map((option) => (
                            <span key={option} className="flex items-center gap-0.5 bg-gray-100 rounded px-1.5 py-0.5 text-[10px] border">
                              {option}
                              <X
                                size={10}
                                className="cursor-pointer hover:text-red-500"
                                onClick={() => form.setValue("schemaType", form.getValues("schemaType")?.filter((item) => item !== option))}
                              />
                            </span>
                          ))}
                        </div>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                  {/* keywords */}
                  <div className="space-y-1">
                    <Label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest">Keywords</Label>
                    <div className="flex flex-wrap gap-1 border border-gray-300 rounded-sm p-1 min-h-[30px] bg-white">
                      {form.watch("keywords")?.map((kw, i) => (
                        <span key={i} className="flex items-center gap-0.5 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] border">
                          {kw}
                          <button
                            type="button"
                            onClick={() => form.setValue("keywords", form.getValues("keywords")?.filter((_, idx) => idx !== i))}
                            className="text-gray-500 hover:text-red-500"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}

                      <input
                        type="text"
                        className="flex-1 min-w-[100px] border-none focus:ring-0 focus:outline-none bg-transparent text-[11px] px-1 h-5"
                        placeholder="Type & Enter..."
                        onBlur={(e) => {
                          const arr = e.target.value.split(",").map((v) => v.trim()).filter(Boolean);
                          if (arr.length > 0) {
                            form.setValue("keywords", [...(form.getValues("keywords") || []), ...arr]);
                            e.target.value = "";
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const arr = (e.target as HTMLInputElement).value.split(",").map((v) => v.trim()).filter(Boolean);
                            if (arr.length > 0) {
                              form.setValue("keywords", [...(form.getValues("keywords") || []), ...arr]);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* necessaryDocuments */}
                  <div className="space-y-1">
                    <Label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest">Necessary Documents</Label>
                    <div className="flex flex-wrap gap-1 border border-gray-300 rounded-sm p-1 min-h-[30px] bg-white">
                      {form.watch("necessaryDocuments")?.map((doc, i) => (
                        <span key={i} className="flex items-center gap-0.5 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] border border-blue-100">
                          {doc}
                          <button
                            type="button"
                            onClick={() => form.setValue("necessaryDocuments", form.getValues("necessaryDocuments")?.filter((_, idx) => idx !== i))}
                            className="text-blue-500 hover:text-red-500"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}

                      <input
                        type="text"
                        className="flex-1 min-w-[100px] border-none focus:ring-0 focus:outline-none bg-transparent text-[11px] px-1 h-5"
                        placeholder="Type & Enter..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val) {
                              form.setValue("necessaryDocuments", [...(form.getValues("necessaryDocuments") || []), val]);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* process */}
                  <div className="space-y-1">
                    <Label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest">Process Steps</Label>
                    <div className="flex flex-wrap gap-1 border border-gray-300 rounded-sm p-1 min-h-[30px] bg-white">
                      {form.watch("process")?.map((step, i) => (
                        <span key={i} className="flex items-center gap-0.5 bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-[10px] border border-green-100">
                          {i + 1}. {step}
                          <button
                            type="button"
                            onClick={() => form.setValue("process", form.getValues("process")?.filter((_, idx) => idx !== i))}
                            className="text-green-500 hover:text-red-500"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}

                      <input
                        type="text"
                        className="flex-1 min-w-[100px] border-none focus:ring-0 focus:outline-none bg-transparent text-[11px] px-1 h-5"
                        placeholder="Type & Enter..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val) {
                              form.setValue("process", [...(form.getValues("process") || []), val]);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 5: FAQS & REVIEWS */}
              <TabsContent value="faqs" className="space-y-4">
                {/* FAQs Dynamic */}
                <div className="bg-gray-50/50 p-3 rounded border">
                  <FormLabel className="mb-2 block text-[11px] font-bold text-gray-600 uppercase tracking-widest">Frequently Asked Questions (FAQs)</FormLabel>
                  <div className="space-y-2">
                    {faqsArray.fields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 p-2 bg-white rounded border shadow-sm relative group">
                        <div className="w-full space-y-1.5">
                          <Input className="h-7 text-xs font-medium rounded-sm px-2" {...form.register(`faqs.${index}.question`)} placeholder="Question" />
                          <div className="border rounded-sm overflow-hidden text-xs">
                            <SmallEditor
                              value={form.getValues(`faqs.${index}.answer`)}
                              onChange={(val) => form.setValue(`faqs.${index}.answer`, val)}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="shrink-0 h-7 w-7 p-0 rounded-sm"
                          onClick={() => faqsArray.remove(index)}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" type="button" variant="outline" className="mt-2 w-full md:w-auto h-7 text-[11px] font-semibold rounded-sm tracking-wide" onClick={() => faqsArray.append({ question: "", answer: "" })}>
                    + Add FAQ
                  </Button>
                </div>

                {/* Reviews */}
                <div className="bg-gray-50/50 p-3 rounded border">
                  <FormLabel className="mb-2 block text-[11px] font-bold text-gray-600 uppercase tracking-widest">Attached Reviews</FormLabel>
                  
                  {reviewsDetails.length === 0 ? (
                    <div className="text-center py-4 text-[11px] text-gray-500 border border-dashed rounded bg-white">
                      No reviews attached to this visa yet.
                    </div>
                  ) : (
                    <div className="space-y-1.5 mb-2">
                      {reviewsDetails.map((review, index) => (
                        <div key={review._id} className="flex justify-between items-center p-1.5 bg-white rounded border shadow-sm">
                          <div>
                            <span className="font-semibold text-xs block leading-none mb-0.5">{review.name}</span>
                            <span className="text-[10px] text-gray-500 line-clamp-1">{review.review}</span>
                          </div>
                          <div className="flex gap-1 shrink-0 ml-2">
                            <Button type="button" variant="secondary" size="sm" className="h-6 text-[10px] px-1.5 rounded-sm" onClick={() => handleReviewsEdit(review._id as string)}>
                              Edit
                            </Button>
                            <Button type="button" variant="destructive" size="sm" className="h-6 text-[10px] px-1.5 rounded-sm" onClick={() => handleReviewsRemove(review._id as string, index)}>
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button size="sm" type="button" className="h-7 text-[11px] font-semibold rounded-sm tracking-wide" onClick={() => setShowReviewsModal(true)}>
                    + Add Review
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

            <div className="pt-3 border-t mt-4 flex justify-end">
              <Button size="sm" type="submit" className="w-full md:w-auto px-6 h-8 text-[11px] font-bold uppercase tracking-widest rounded shadow-sm" disabled={mutation.isPending}>
                {mutation.isPending ? "Updating..." : "Update Visa"}
              </Button>
            </div>
          </form>
        </Form>

        {mutation.isError && (
          <p className="mt-3 text-center text-sm text-red-500">
            {(mutation.error as Error).message}
          </p>
        )}
        {mutation.isSuccess && (
          <p className="mt-3 text-center text-sm text-green-600">
            Visa Updated successful!
          </p>
        )}
      </div>
    </div>
  );
}
