"use client";
import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import SmallEditor from "@/components/admin/SmallEditor";
import { Textarea } from "@/components/ui/textarea";

export interface WebpageFormData {
  title: string;
  content: string;
  slug: string;
  parent?: string;
  isParent: boolean;
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  keywords?: string[];
  reviews?: string[];
  schemaType?: string[];
  howToSchema?: string;
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
  footerLinks?: { title: string; url: string }[];
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
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));

    throw new Error(
      errorData.error || errorData.message || "Failed to create page",
    );
  }

  return res.json();
};

export const getParents = async (token: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/webpage/all-parents`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));

    throw new Error(
      errorData.error || errorData.message || "Failed to get parents",
    );
  }
  const data = await res.json();

  return data?.data;
};

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout, Search, Settings, MessageSquarePlus } from "lucide-react";

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
    isParent: false,
    metaTitle: "",
    metaDescription: "",
    canonicalUrl: "",
    keywords: [],
    reviews: [],
    schemaType: [],
    howToSchema: "",
    status: "published",
    excerpt: "",
    faqs: [],
    footerLinks: [],
  };

  const form = useForm<WebpageFormData>({
    defaultValues,
  });

  const faqsArray = useFieldArray({ control: form.control, name: "faqs" });
  const footerLinksArray = useFieldArray({
    control: form.control,
    name: "footerLinks",
  });
  const { data: allparents, isLoading } = useQuery({
    queryKey: ["all-parents"],
    queryFn: () => getParents(token),
  });
  const mutation = useMutation({
    mutationFn: (values: WebpageFormData) => createPage(values, token),
    onSuccess: () => {
      toast.success("Page created successfully!");
      form.reset();
      router.refresh();
      router.push("/admin/webpage");
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
      prev.map((b) => (b._id === id ? updated[0] : b)),
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
    mutation.mutate({ ...values });
  }

  const schemaTypes = ["FAQ", "Webpage", "Review"];
  return (
    <div className="max-w-6xl mx-auto p-4 min-h-screen bg-slate-50/10">
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-5 md:p-6 space-y-6">
          <div className="space-y-0.5 text-center">
            <h1 className="text-lg font-black text-slate-800 tracking-tight">Create Webpage</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Sitemap Management</p>
          </div>
          
          <form
            onSubmit={form.handleSubmit((values) => onSubmit(values))}
            className="space-y-6"
          >
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid grid-cols-4 w-full bg-slate-100/50 p-0.5 rounded-lg h-9 mb-6">
                <TabsTrigger value="content" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#FE5300]">
                  Basic Detail
                </TabsTrigger>
                <TabsTrigger value="seo" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#FE5300]">
                  Media & SEO
                </TabsTrigger>
                <TabsTrigger value="org" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#FE5300]">
                  Organization
                </TabsTrigger>
                <TabsTrigger value="interactive" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#FE5300]">
                  Interactivity
                </TabsTrigger>
              </TabsList>

              <div className="min-h-[300px]">
                {/* Basic Detail Tab */}
                <TabsContent value="content" className="mt-0 space-y-4 animate-in fade-in-50 duration-200">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Title</Label>
                      <Input
                        {...form.register("title")}
                        placeholder="Enter page title"
                        className="h-9 bg-white border-slate-200 focus:border-[#FE5300] focus:ring-1 focus:ring-[#FE5300]/10 rounded-md text-[13px] font-medium"
                      />
                      {form.formState.errors.title && (
                        <p className="text-red-500 text-[9px] font-bold uppercase ml-0.5">{form.formState.errors.title.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Permalink</Label>
                      <Input
                        {...form.register("slug")}
                        placeholder="page-slug-example"
                        className="h-9 bg-white border-slate-200 focus:border-[#FE5300] focus:ring-1 focus:ring-[#FE5300]/10 rounded-md text-[13px] font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Page Content</Label>
                    <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                      <BlogEditor
                        value={form.getValues("content")}
                        onChange={(val) => form.setValue("content", val)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Excerpt</Label>
                    <Textarea
                      {...form.register("excerpt")}
                      placeholder="Brief summary..."
                      className="min-h-[80px] bg-white border-slate-200 focus:border-[#FE5300] focus:ring-1 focus:ring-[#FE5300]/10 rounded-md text-[13px]"
                    />
                  </div>
                </TabsContent>

                {/* Media & SEO Tab */}
                <TabsContent value="seo" className="mt-0 space-y-6 animate-in fade-in-50 duration-200">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Meta Title</Label>
                        <Input {...form.register("metaTitle")} placeholder="SEO Title" className="h-9 rounded-md text-[13px]" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Meta Description</Label>
                        <Textarea {...form.register("metaDescription")} placeholder="SEO Description" className="min-h-[80px] rounded-md text-[13px]" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Canonical URL</Label>
                        <Input {...form.register("canonicalUrl")} placeholder="https://..." className="h-9 rounded-md text-[13px]" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Cover Image</Label>
                        <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50">
                          <ImageUploader
                            onUpload={(img) => {
                              if (!img) return null;
                              form.setValue("coverImage", {
                                url: img.url,
                                public_id: img.public_id,
                                width: img.width,
                                height: img.height,
                                alt: img?.alt || "Cover Image",
                              });
                            }}
                          />
                          <Input
                            {...form.register("coverImage.alt")}
                            placeholder="Alt Text"
                            className="mt-3 h-8 text-[11px] rounded-md bg-white border-slate-200"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Keywords</Label>
                        <div className="flex flex-wrap gap-1.5 border border-slate-200 bg-white p-2 rounded-md min-h-[36px]">
                          {form.watch("keywords")?.map((kw, i) => (
                            <span key={i} className="flex items-center gap-1 bg-orange-50 text-[#FE5300] px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border border-orange-100">
                              {kw}
                              <button type="button" onClick={() => form.setValue("keywords", form.getValues("keywords")?.filter((_, idx) => idx !== i))} className="hover:text-red-500">
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                          <input
                            className="flex-1 min-w-[100px] text-[13px] focus:outline-none bg-transparent"
                            placeholder="Add tag..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = e.currentTarget.value.trim();
                                if (val) {
                                  form.setValue("keywords", [...(form.getValues("keywords") || []), val]);
                                  e.currentTarget.value = "";
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Schema Types</Label>
                      <select
                        multiple
                        {...form.register("schemaType")}
                        className="w-full border border-slate-200 rounded-lg p-2 text-[12px] h-24 bg-white"
                      >
                        {schemaTypes.map((type) => (
                          <option key={type} value={type} className="px-2 py-0.5 rounded mb-0.5">{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">How-to Schema</Label>
                      <Textarea
                        {...form.register("howToSchema")}
                        placeholder='{ ... }'
                        className="min-h-[96px] text-[11px] font-mono bg-slate-50 border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Organization Tab */}
                <TabsContent value="org" className="mt-0 space-y-6 animate-in fade-in-50 duration-200 max-w-xl mx-auto">
                   <div className="grid gap-4 py-2">
                    <div className="flex items-center justify-between p-4 bg-orange-50/20 rounded-xl border border-orange-100 shadow-sm">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-black text-slate-700 uppercase tracking-tight">Parent Page</Label>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Enable Hierarchy</p>
                      </div>
                      <input
                        type="checkbox"
                        {...form.register("isParent")}
                        className="h-5 w-5 rounded border-slate-300 text-[#FE5300] focus:ring-[#FE5300]/10 accent-[#FE5300] cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Relationship</Label>
                      <select
                        {...form.register("parent", { setValueAs: (v) => v || undefined })}
                        className="w-full border border-slate-200 rounded-lg p-3 text-[13px] font-medium bg-white"
                      >
                        <option value="">No Parent (Root)</option>
                        {allparents?.map((parent: any, i: number) => (
                          <option key={i} value={parent._id}>{parent.title}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Status</Label>
                      <select
                        {...form.register("status")}
                        className="w-full border border-slate-200 rounded-lg p-3 text-[13px] font-medium bg-white"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                  </div>
                </TabsContent>

                {/* Interactivity Tab */}
                <TabsContent value="interactive" className="mt-0 space-y-8 animate-in fade-in-50 duration-200">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">FAQs</Label>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => faqsArray.append({ question: "", answer: "" })}
                        className="text-[9px] font-black uppercase h-7 px-3 bg-slate-50 text-slate-500 hover:bg-slate-100"
                      >
                        + New FAQ
                      </Button>
                    </div>
                    <div className="grid gap-3">
                      {faqsArray.fields.map((field, index) => (
                        <div key={field.id} className="group relative bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                          <div className="grid gap-3">
                            <Input {...form.register(`faqs.${index}.question`)} placeholder="Question" className="h-8 text-[13px] font-semibold border-none bg-slate-50 px-2" />
                            <div className="rounded-md border border-slate-50 overflow-hidden">
                              <SmallEditor
                                value={form.getValues(`faqs.${index}.answer`)}
                                onChange={(val) => form.setValue(`faqs.${index}.answer`, val)}
                              />
                            </div>
                          </div>
                          <button type="button" onClick={() => faqsArray.remove(index)} className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-50 text-red-400 rounded-full flex items-center justify-center border border-red-50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Testimonials</Label>
                      <Button type="button" variant="secondary" size="sm" onClick={() => setShowReviewsModal(true)} className="text-[9px] font-black uppercase h-7 px-3 bg-slate-50 text-slate-500 hover:bg-slate-100">+ Add</Button>
                    </div>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {reviewsDetails.map((review, index) => (
                        <div key={review._id} className="flex justify-between items-center bg-slate-50/50 px-3 py-2 rounded-lg border border-slate-100">
                          <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight truncate">{review.name}</span>
                          <button type="button" onClick={() => handleReviewsRemove(review._id as string, index)} className="text-slate-300 hover:text-red-400 ml-2">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">Resource Links</Label>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => footerLinksArray.append({ title: "", url: "" })}
                        className="text-[9px] font-black uppercase h-7 px-3 bg-slate-50 text-slate-500 hover:bg-slate-100"
                      >
                        + Add
                      </Button>
                    </div>
                    <div className="grid gap-2">
                      {footerLinksArray.fields.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-center">
                          <Input {...form.register(`footerLinks.${index}.title`)} placeholder="Title" className="h-9 rounded-md text-[13px]" />
                          <Input {...form.register(`footerLinks.${index}.url`)} placeholder="URL" className="h-9 rounded-md text-[13px]" />
                          <Button type="button" variant="ghost" size="icon" onClick={() => footerLinksArray.remove(index)} className="text-slate-300 hover:text-red-400 h-8 w-8">
                            <X size={16} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => router.push("/admin/webpage")}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
              >
                Discard
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                className="bg-[#FE5300] hover:bg-[#FE5300]/90 text-white font-black uppercase tracking-widest h-9 px-8 rounded-lg shadow-md active:scale-[0.98] transition-all text-[11px]"
              >
                {mutation.isPending ? "Saving..." : "Create Webpage"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {showReviewsModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xl transform animate-in zoom-in-95 duration-200">
            <CreateReviewsModal
              onReviewsCreated={handleReviewsCreated}
              onClose={() => { setShowReviewsModal(false); setEditReviewsId(null); }}
              onReviewsUpdated={handleReviewsUpdated}
              existingReviews={editReviewsId}
              type="package"
            />
          </div>
        </div>
      )}
    </div>
  );
}
