"use client"

import { useForm , useFieldArray } from "react-hook-form"
import { useMutation , useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/useAuthStore"
import { toast } from "sonner"
import dynamic from "next/dynamic"
const BlogEditor = dynamic(() => import("@/components/admin/BlogEditor"), { ssr: false })
import ImageUploader from "@/components/admin/ImageUploader"
import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@radix-ui/react-dropdown-menu"
import { useParams } from "next/navigation"
import { Loader } from "@/components/custom/loader"

interface FormData{
    title: string
    content: string
    slug: string
    parent: string
    metaTitle?: string
    metaDescription?: string
    keywords?: string[]
    schemaType?: string
    coverImage?: {
        url?: string
        public_id?: string
        alt?: string
        width?: number
        height?: number
    }
    status: string
    excerpt?: string
    faqs?: {
        question: string
        answer: string
    }[]
}

const getWebpage= async (id: string)=>{
    const res= await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/webpage/id/${id}`);
    if(!res.ok) throw new Error("Failed to fetch visas");
    const data=await res.json();
    return data?.data;
}
const updatePage = async (values: FormData, token: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/webpage/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(values),
  })
  if (!res.ok) throw new Error("Failed to update page")
  return res.json()
}

export default function UpdateWebpage() {
  const token = useAuthStore((state) => state.accessToken) ?? ""
  const router = useRouter();
  const {id}= useParams();

  const { data: webpage  , isLoading, isError} = useQuery({
    queryKey: ["webpage", id],
    queryFn: () => getWebpage(id as string),
  })


  const  defaultValues: FormData = {
      title: "",
      content: "",
      slug: "",
      parent: "visa",
      metaTitle: "",
      metaDescription: "",
      keywords: [],
      schemaType: "",
      coverImage: {
       url: "",
       public_id: "",
       alt: "",
      },
      status: "published",
      excerpt: "",
      faqs: [],
    }

  const form = useForm<FormData>({
    defaultValues,
  })
  
  useEffect(()=>{
    if(webpage){
      form.setValue("title", webpage.title);
      form.setValue("content", webpage.content);
      form.setValue("slug", webpage.slug);
      form.setValue("parent", webpage.parent);
      form.setValue("metaTitle", webpage.metaTitle);
      form.setValue("metaDescription", webpage.metaDescription);
      form.setValue("keywords", webpage.keywords);
      form.setValue("schemaType", webpage.schemaType);
      form.setValue("coverImage", webpage.coverImage);
      form.setValue("status", webpage.status);
      form.setValue("excerpt", webpage.excerpt);
      form.setValue("faqs", webpage.faqs);
    }
  },[webpage, form])

    
    const faqsArray = useFieldArray({ control: form.control, name: "faqs" })
    
  const mutation = useMutation({
    mutationFn: (values: FormData) => updatePage(values, token, id as string),
    onSuccess: () => {
      toast.success("Page updated successfully!")
      form.reset();
      router.refresh();
    },
  onError: (error: unknown) => {
    if (error instanceof Error) {
      toast.error(error.message)
    } else {
      toast.error("Something went wrong")
    }
  },
  })


  function onSubmit(values: FormData) {
    mutation.mutate(values)
  }
  if( isLoading) return <Loader size={"lg"} />
  if(isError) return <p>Something went wrong</p>

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-6">Edit Page</h1>
      <form onSubmit={form.handleSubmit((values) => onSubmit(values))} className="space-y-6">
        <input {...form.register("title")} placeholder="Title" className="w-full border rounded p-2" />
        {form.formState.errors.title && <p className="text-red-500 text-sm">{form.formState.errors.title.message}</p>}
         <input {...form.register("slug")} placeholder="ParmaLink" className="w-full border rounded p-2" />
        {form.formState.errors.slug && <p className="text-red-500 text-sm">{form.formState.errors.slug.message}</p>}

        <div className="border rounded p-2">
          <BlogEditor
           value={form.getValues("content")}
           onChange={(val) => form.setValue("content", val)}
          />
        </div>

        <input {...form.register("metaTitle")} placeholder="Meta Title" className="w-full border rounded p-2" />
        <textarea {...form.register("metaDescription")} placeholder="Meta Description" className="w-full border rounded p-2" />
        <textarea {...form.register("excerpt")} placeholder="Excerpt" className="w-full border rounded p-2" />
        <input {...form.register("schemaType")} placeholder="Schema Type" className="w-full border rounded p-2" />


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

</div>
            {/* keywords */}
                  <input placeholder="Comma separated keywords" {...form.register("keywords")}
                    className="w-full border rounded p-2"
                    onChange={(e) => { const value = e.target.value.split(",").map((k) => k.trim()).filter(Boolean);
                    form.setValue("keywords", value);
                  }}
                 />
            {/* Faqs */}
            <div>
              <Label>FAQs</Label>
              {faqsArray.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-2 gap-2 mb-2">
                  <Input {...form.register(`faqs.${index}.question`)} placeholder="Question" />
                  <Input {...form.register(`faqs.${index}.answer`)} placeholder="Answer" />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => faqsArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={() => faqsArray.append({ question: "", answer: "" })}>
                Add FAQ
              </Button>
            </div>
        <input {...form.register("coverImage.alt")} placeholder="Cover Image Alt" className="w-full border rounded p-2" />
        <select {...form.register("parent")} className="w-full border rounded p-2">
            <option value="" disabled>Select Parent</option>
          <option value="visa">Visa</option>
          <option value="bookings">Bookings</option>
        </select>

        <select {...form.register("status")} className="w-full border rounded p-2">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Updating..." : "Update Page"}
        </Button>
      </form>
      {mutation.isError && <p className="text-red-500 text-sm">Something went wrong</p>}
      {mutation.isSuccess && <p className="text-green-500 text-sm">Page Updated successfully!</p>}
    </div>
  )
}
