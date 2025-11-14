"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Resolver } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import dynamic from "next/dynamic";
const BlogEditor = dynamic(() => import("@/components/admin/BlogEditor"), {
  ssr: false,
});
import ImageUploader from "@/components/admin/ImageUploader";
import React from "react";
import CloudinaryMediaLibrary from "@/components/admin/CloudinaryMediaLibrary";

const formSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  slug: z.string().min(2, { message: "Slug must be at least 2 characters." }),
  content: z
    .string()
    .min(2, { message: "Content must be at least 2 characters." }),
  author: z.string().min(2, { message: "Author is required." }),
  metaTitle: z.string().min(2, { message: "Meta title is required." }),
  metaDescription: z
    .string()
    .min(2, { message: "Meta description is required." }),
  keywords: z.preprocess(
    (val) =>
      typeof val === "string"
        ? val
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean)
        : [],
    z.array(z.string())
  ),
  canonicalUrl: z.string().optional(),
  schemaType: z.string().optional(),
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
});

interface Author {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
const createNews = async (
  values: z.infer<typeof formSchema>,
  token: string
) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/news/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error("Failed to create news");
  return res.json();
};

export default function CreateNews() {
  const token = useAuthStore((state) => state.accessToken) ?? "";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as Resolver<z.infer<typeof formSchema>>,
    defaultValues: {
      title: "",
      content: "",
      author: "",
      metaTitle: "",
      metaDescription: "",
      keywords: [],
      canonicalUrl: "",
      schemaType: "",
      tags: [],
      coverImage: {
        url: "",
        public_id: "",
        alt: "",
      },
      gallery: [],
      status: "draft",
      excerpt: "",
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
      const data = await res.json();
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) =>
      createNews(values, token),
    onSuccess: () => {
      toast.success("News created successfully!");
      form.reset();
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

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-6">Create News</h1>
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

        <select
          {...form.register("author")}
          className="w-full border rounded p-2"
        >
          <option value="">Select Author</option>
          {users?.data.map((user: Author) => (
            <option key={user?._id} value={user._id}>
              {user.name}
            </option>
          ))}
        </select>

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
          {...form.register("canonicalUrl")}
          placeholder="Canonical URL"
          className="w-full border rounded p-2"
        />
        <input
          {...form.register("schemaType")}
          placeholder="Schema Type"
          className="w-full border rounded p-2"
        />
        <input
          {...form.register("keywords")}
          placeholder="Keywords (comma separated)"
          className="w-full border rounded p-2"
        />

        <div className="space-y-2">
          <ImageUploader
            onUpload={(img) => {
              if (!img) return null;
              form.setValue("coverImage", {
                url: img ? img.url : "",
                public_id: img ? img.public_id : "",
                width: img ? img.width : 1200,
                height: img ? img.height : 400,
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

        <select
          {...form.register("status")}
          className="w-full border rounded p-2"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Create News"}
        </Button>
      </form>
      {mutation.isError && (
        <p className="text-red-500 text-sm">Something went wrong</p>
      )}
      {mutation.isSuccess && (
        <p className="text-green-500 text-sm">News created successfully!</p>
      )}
    </div>
  );
}
