"use client"

import { useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { useEffect } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import dynamic from "next/dynamic"
import ImageUploader from "@/components/admin/ImageUploader"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/custom/loader"
import CloudinaryMediaLibrary from "@/components/admin/CloudinaryMediaLibrary"

const BlogEditor = dynamic(() => import("@/components/admin/BlogEditor"), { ssr: false })

const formSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  slug: z.string().min(2, { message: "Slug must be at least 2 characters." }),
  content: z.string().min(2, { message: "Content must be at least 2 characters." }),
  category: z.string().min(2, { message: "Category is required." }),
  author: z.string().min(2, { message: "Author is required." }),
  metaTitle: z.string().min(2, { message: "Meta title is required." }),
  metaDescription: z.string().min(2, { message: "Meta description is required." }),
  keywords: z.preprocess(
    (val) =>
      typeof val === "string"
        ? val.split(",").map((k) => k.trim()).filter(Boolean)
        : [],
    z.array(z.string())
  ),
  canonicalUrl: z.string().optional(),
  schemaType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  coverImage: z.object({
    url: z.string().url(),
    public_id: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    alt: z.string().optional(),
  }),
  gallery: z.array(z.any()).optional(),
  status: z.enum(["draft", "published", "archived"]),
  excerpt: z.string().min(2, { message: "Excerpt must be at least 2 characters." }),
})

export interface Category {
  _id: string;
  name: string;
  description: string;
  image: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  slug: string;
  __v: number;
}

export interface CategoryApiResponse {
  success: boolean;
  count: number;
  data: Category[];
}

interface Author{
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
type FormValues = z.infer<typeof formSchema>


const updateBlog = async (values: FormValues, token: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify(values),
  })
  if (!res.ok) throw new Error("Failed to update blog")
  return res.json()
}

export default function EditBlog() {
  const { slug } = useParams() as { slug: string }
  const token = useAuthStore((state) => state.accessToken) ?? ""

  const { data: blog, isLoading } = useQuery({
    queryKey: ["blog", slug],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs/${slug}`)
      const data = await res.json()
      return data?.data?.blog
    },
  })

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`)
      return res.json()
    },
  })

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/authors`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.json()
    },
  })


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      category: "",
      author: "",
      metaTitle: "",
      metaDescription: "",
      keywords: [],
      canonicalUrl: "",
      schemaType: "",
      tags: [],
      coverImage: { url: "", public_id: "" , alt: ""},
      gallery: [],
      status: "draft",
      excerpt: "",
    },
  })


  useEffect(() => {
    if (blog) {
      form.reset({
        title: blog.title,
        slug: blog.slug,
        content: blog.content,
        category: blog.category?._id ?? "",
        author: blog.author?._id ?? "",
        metaTitle: blog.metaTitle,
        metaDescription: blog.metaDescription,
        keywords: blog.keywords,
        canonicalUrl: blog.canonicalUrl,
        schemaType: blog.schemaType,
        tags: blog.tags,
        coverImage: blog.coverImage,
        gallery: blog.gallery,
        status: blog.status ?? "draft",
        excerpt: blog.excerpt,
      })
    }
  }, [blog, form])

  // ✅ mutation
  const mutation = useMutation({
    mutationFn: (values: FormValues) => updateBlog(values, token, blog._id),
    onSuccess: (data) => {
      console.log(data)
      toast.success("Blog updated successfully!")
    },
  onError: (error: unknown) => {
    if (error instanceof Error) {
      toast.error(error.message)
    } else {
      toast.error("Something went wrong")
    }
  },
  })

   const onSubmit = (data: FormValues) => mutation.mutate(data)



  if (isLoading) return <Loader size="lg" message="Loading blog..." />

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-6">Update Blog</h1>
     <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <input {...form.register("title")} placeholder="Title" className="w-full border rounded p-2" />
        {form.formState.errors.title && <p className="text-red-500">{form.formState.errors.title.message}</p>}
        <input {...form.register("slug")} placeholder="Parma Link" className="w-full border rounded p-2" /> 
        {form.formState.errors.slug && <p className="text-red-500">{form.formState.errors.slug.message}</p>}
        <div className="border rounded p-2">
          <BlogEditor
            value={form.watch("content")}
            onChange={(val) => form.setValue("content", val)}
          />
        </div>

        <select {...form.register("category")} className="w-full border rounded p-2">
          <option value="">Select Category</option>
          {categories?.data?.map((cat:Category) => (
            <option key={cat._id} value={cat._id}>
              {cat.name}
            </option>
          ))}
        </select>

        <select {...form.register("author")} className="w-full border rounded p-2">
          <option value="">Select Author</option>
            {users?.data.map((user:Author) => <option key={user?._id} value={user._id}>{user.name}</option>)}
        </select>

        <input {...form.register("metaTitle")} placeholder="Meta Title" className="w-full border rounded p-2" />
        <textarea {...form.register("metaDescription")} placeholder="Meta Description" className="w-full border rounded p-2" />
        <textarea {...form.register("excerpt")} placeholder="Excerpt" className="w-full border rounded p-2" />

        <input {...form.register("canonicalUrl")} placeholder="Canonical URL" className="w-full border rounded p-2" />
        <input {...form.register("schemaType")} placeholder="Schema Type" className="w-full border rounded p-2" />
        <input {...form.register("keywords")} placeholder="Keywords (comma separated)" className="w-full border rounded p-2" />

<div className="space-y-2">
  <ImageUploader
    onUpload={(img) =>
      form.setValue("coverImage", {
        url: img.url,
        public_id: img.public_id,
        width: img.width,
        height: img.height,
        alt: form.getValues("title") || "Cover Image",
      })
    }
  />

  <CloudinaryMediaLibrary
    onSelect={(img) =>
      form.setValue("coverImage", {
        url: img.url,
        public_id: img.public_id,
        alt: form.getValues("title") || "Cover Image",
      })
    }
  />
</div>
        <input {...form.register("coverImage.alt")} placeholder="Cover Image Alt" className="w-full border rounded p-2" />

        <select {...form.register("status")} className="w-full border rounded p-2">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Updating..." : "Update Blog"}
        </Button>
      </form>
      {mutation.isError && <p className="text-red-500">Somethings went wrong</p>}
      {mutation.isSuccess && <p className="text-green-500">Blog updated successfully</p>}
    </div>
  )
}
