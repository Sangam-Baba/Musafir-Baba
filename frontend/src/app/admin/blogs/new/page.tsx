"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

const formSchema = z.object({
  title: z.string().min(2, {
    message: "title must be at least 2 characters.",
  }),
  content: z.string().min(2, {
    message: "content must be at least 2 characters.",
  }),
  category: z.string().min(2, {
    message: "category must be at least 2 characters.",
  }),
  author: z.string().min(2, {
    message: "author must be at least 2 characters.",
  }),
  metaTitle: z.string().min(2, {
    message: "metaTitle must be at least 2 characters.",
  }),
  metaDescription: z.string().min(2, {
    message: "metaDescription must be at least 2 characters.",
  }),
  keywords: z.string().min(2, {
    message: "keywords must be at least 2 characters.",
  }),
  tags: z.array(z.string()),
  coverImage: z.object({
    url: z.string(),
    alt: z.string(),
    public_id: z.string(),
    width: z.number(),
    height: z.number(),
  }),
  gallery: z.array(
    z.object({
      url: z.string(),
      alt: z.string(),
      public_id: z.string(),
      width: z.number(),
      height: z.number(),
    })
  ),
  status: z.enum(["draft", "published", "archived"]),
  publishedAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export function CreateBlog() {
  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  })

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values)
  }
}