"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Resolver, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { toast } from "sonner";
import dynamic from "next/dynamic";
const BlogEditor = dynamic(() => import("@/components/admin/BlogEditor"), {
  ssr: false,
});
import ImageUploader from "@/components/admin/ImageUploader";
import { X, Layout, Search, Settings, Link } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  slug: z.string().min(2, { message: "Slug must be at least 2 characters." }),
  content: z
    .string()
    .min(2, { message: "Content must be at least 2 characters." }),
  category: z.string().min(2, { message: "Category is required." }),
  author: z.string().min(2, { message: "Author is required." }),
  metaTitle: z.string().min(2, { message: "Meta title is required." }),
  metaDescription: z
    .string()
    .min(2, { message: "Meta description is required." }),
  schemaType: z.array(z.string()).optional(),
  canonicalUrl: z.string().optional(),
  keywords: z.array(z.string()),
  tags: z.array(z.string()).optional(),
  coverImage: z.object({
    url: z.string().url(),
    public_id: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    alt: z.string().optional(),
  }),
  gallery: z.array(z.any()).optional(),
  status: z.enum(["draft", "published", "archived"]),
  excerpt: z
    .string()
    .min(2, { message: "Excerpt must be at least 2 characters." }),
  footerLinks: z
    .array(
      z.object({
        title: z.string(),
        url: z.string(),
      }),
    )
    .optional(),
});

export interface Category {
  _id: string;
  name: string;
  description: string;
  image: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  slug: string;
  __v: number;
}

interface Author {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const createBlog = async (
  values: z.infer<typeof formSchema>,
  token: string,
) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error("Failed to create blog");
  return res.json();
};

export default function CreateBlog() {
  const token = useAdminAuthStore((state) => state.accessToken) ?? "";
  const router = useRouter();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as Resolver<z.infer<typeof formSchema>>,
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      category: "",
      author: "",
      metaTitle: "",
      metaDescription: "",
      canonicalUrl: "",
      schemaType: [],
      keywords: [],
      tags: [],
      coverImage: {
        url: "",
        public_id: "",
        alt: "",
      },
      gallery: [],
      status: "draft",
      excerpt: "",
      footerLinks: [],
    },
  });

  const footerLinksArray = useFieldArray({
    control: form.control,
    name: "footerLinks",
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`);
      return res.json();
    },
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/authors`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) =>
      createBlog(values, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blogs"] });
      toast.success("Blog created successfully!");
      form.reset();
      router.push("/admin/blogs");
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Something went wrong");
      }
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }

  const schemaTypes = ["Blog", "Article", "NewsArticle"];

  return (
    <div className="max-w-6xl mx-auto p-4 min-h-screen bg-slate-50/10">
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-5 md:p-6 space-y-6">
          <div className="space-y-0.5 text-center">
            <h1 className="text-lg font-black text-slate-800 tracking-tight">Create Blog Post</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Content Management</p>
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid grid-cols-3 w-full bg-slate-100/50 p-0.5 rounded-lg h-9 mb-6">
                <TabsTrigger value="content" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#FE5300]">
                  Basic Detail
                </TabsTrigger>
                <TabsTrigger value="seo" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#FE5300]">
                  Media & SEO
                </TabsTrigger>
                <TabsTrigger value="org" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#FE5300]">
                  Organization
                </TabsTrigger>
              </TabsList>

              <div className="min-h-[400px]">
                {/* Basic Detail Tab */}
                <TabsContent value="content" className="mt-0 space-y-4 animate-in fade-in-50 duration-200">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Title</Label>
                      <Input
                        {...form.register("title")}
                        placeholder="Enter blog title"
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
                        placeholder="blog-post-slug"
                        className="h-9 bg-white border-slate-200 focus:border-[#FE5300] focus:ring-1 focus:ring-[#FE5300]/10 rounded-md text-[13px] font-mono"
                      />
                      {form.formState.errors.slug && (
                        <p className="text-red-500 text-[9px] font-bold uppercase ml-0.5">{form.formState.errors.slug.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Content</Label>
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
                      placeholder="Brief summary for list views..."
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
                                alt: img?.alt || form.getValues("title"),
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
                            placeholder="Add keyword..."
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

                  <div className="space-y-1.5 max-w-md">
                    <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Schema Type</Label>
                    <div className="flex gap-4">
                      <select
                        multiple
                        {...form.register("schemaType")}
                        className="w-full border border-slate-200 rounded-lg p-2 text-[12px] h-24 bg-white"
                      >
                        {schemaTypes.map((type) => (
                          <option key={type} value={type} className="px-2 py-0.5 rounded mb-0.5">{type}</option>
                        ))}
                      </select>
                      <div className="flex flex-wrap gap-2 content-start w-full">
                        {form.watch("schemaType")?.map((option) => (
                          <span key={option} className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">
                            {option}
                            <X
                              size={10}
                              className="cursor-pointer hover:text-red-500"
                              onClick={() =>
                                form.setValue(
                                  "schemaType",
                                  form.getValues("schemaType")?.filter((item) => item !== option),
                                )
                              }
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Organization Tab */}
                <TabsContent value="org" className="mt-0 space-y-6 animate-in fade-in-50 duration-200 max-w-2xl mx-auto">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Category</Label>
                      <select
                        {...form.register("category")}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-[13px] font-medium bg-white"
                      >
                        <option value="">Select Category</option>
                        {categories?.data?.map((cat: Category) => (
                          <option key={cat._id} value={cat._id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Author</Label>
                      <select
                        {...form.register("author")}
                        className="w-full border border-slate-200 rounded-lg p-2.5 text-[13px] font-medium bg-white"
                      >
                        <option value="">Select Author</option>
                        {users?.data.map((user: Author) => (
                          <option key={user?._id} value={user._id}>{user.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Status</Label>
                    <select
                      {...form.register("status")}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-[13px] font-medium bg-white"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">Helpful Resources</Label>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => footerLinksArray.append({ title: "", url: "" })}
                        className="text-[9px] font-black uppercase h-7 px-3 bg-slate-50 text-slate-500 hover:bg-slate-100"
                      >
                        + Add Resource
                      </Button>
                    </div>
                    <div className="grid gap-2">
                      {footerLinksArray.fields.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-center bg-slate-50/50 p-2 rounded-lg border border-slate-100 group">
                          <Input {...form.register(`footerLinks.${index}.title`)} placeholder="Title" className="h-8 text-[12px] bg-white border-slate-200" />
                          <Input {...form.register(`footerLinks.${index}.url`)} placeholder="URL" className="h-8 text-[12px] bg-white border-slate-200" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => footerLinksArray.remove(index)}
                            className="text-slate-300 hover:text-red-400 h-8 w-8 shrink-0"
                          >
                            <X size={14} />
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
                onClick={() => router.push("/admin/blogs")}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
              >
                Discard
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                className="bg-[#FE5300] hover:bg-[#FE5300]/90 text-white font-black uppercase tracking-widest h-9 px-8 rounded-lg shadow-md active:scale-[0.98] transition-all text-[11px]"
              >
                {mutation.isPending ? "Creating..." : "Create Blog Post"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
