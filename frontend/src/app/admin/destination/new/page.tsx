"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { useAuthStore } from "@/store/useAuthStore"
import { toast } from "sonner";
import  ImageUploader  from "@/components/admin/ImageUploader"
import  CloudinaryMediaLibrary  from "@/components/admin/CloudinaryMediaLibrary"
import { Button } from "@/components/ui/button"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().min(2, {
    message: "Description must be at least 2 characters.",
  }),
  country: z.string().min(2, {
    message: "Country must be at least 2 characters.",
  }),
  state: z.string().min(2, {
    message: "State must be at least 2 characters.",
  }),
  city: z.string().min(2, {
    message: "City must be at least 2 characters.",
  }),
  coverImage: z.object({
    url: z.string().url({ message: "Cover image is required" }),
    public_id: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    alt: z.string().optional(),
  }),
  gallery: z.array(z.object({
    url: z.string().url(),
    public_id: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    alt: z.string().optional(),
  })).optional(),
  metaTitle: z.string().min(2, {
    message: "Meta Title must be at least 2 characters.",
  }),
  metaDescription: z.string().min(2, {
    message: "Meta Description must be at least 2 characters.",
  }),
  keywords:  z.preprocess(
    (val) => typeof val === "string" ? val.split(",").map((k) => k.trim()).filter(Boolean) : [],
    z.array(z.string())
  ).optional(),
  popularAttractions:  z.preprocess(
    (val) => typeof val === "string" ? val.split(",").map((k) => k.trim()).filter(Boolean) : [],
    z.array(z.string())
  ).optional(),
  thingsToDo:  z.preprocess(
    (val) => typeof val === "string" ? val.split(",").map((k) => k.trim()).filter(Boolean) : [],
    z.array(z.string())
  ).optional(),
  status: z.enum(["draft", "published", "archived"]),
})
const create=async(values:z.infer<typeof formSchema>, token:string)=>{
    const res=await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/destination`,{
        method:"POST",
        headers:{"Content-Type":"application/json",
        Authorization:`Bearer ${token}`
        },
        credentials:"include",
        body:JSON.stringify(values)
    })    
    if(!res.ok) throw new Error("Failed to create destination")
    return res.json().then((data)=>{
        console.log(data)
    })
}

export default function CreateDestination() {
    const accessToken:string = useAuthStore((state) => state.accessToken) || "";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      country: "",
      state: "",
      city: "",
      coverImage: {
        url: "",
        public_id: "",
        alt: "",
      },
      gallery: [],
      metaTitle: "",
      metaDescription: "",
      keywords: [],
      popularAttractions: [],
      thingsToDo: [],
      status: "draft",
    },
  })
  
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => create(values, accessToken),
    onSuccess: () => {
      form.reset();
      toast.success("Destination created successfully!");
    },
    onError: (error) => {
        toast.error("Failed to create destination");
      console.error(error)
    },
  })
  function onSubmit(values: z.infer<typeof formSchema>) {
     values = {
    ...values,
    country: values.country.toLowerCase(),
    state: values.state.toLowerCase(),
    city: values.city.toLowerCase(),
  };
    mutation.mutate(values)
    console.log(values)
  }
  
    return (
      <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold mb-6">Create Blog</h1>
        <form onSubmit={form.handleSubmit((values) => onSubmit(values))} className="space-y-6">
          <input {...form.register("name")} placeholder="Name" className="w-full border rounded p-2" />
          {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
          <textarea {...form.register("description")} placeholder="Description" className="w-full border rounded p-2" />
          {form.formState.errors.description && <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>}
          <input {...form.register("country")}  placeholder="Country" className="w-full border rounded p-2" />
          {form.formState.errors.country && <p className="text-red-500 text-sm">{form.formState.errors.country.message}</p>}
          <input {...form.register("state")} placeholder="State" className="w-full border rounded p-2" />
          {form.formState.errors.state && <p className="text-red-500 text-sm">{form.formState.errors.state.message}</p>}
          <input {...form.register("city")} placeholder="City" className="w-full border rounded p-2" />
          {form.formState.errors.city && <p className="text-red-500 text-sm">{form.formState.errors.city.message}</p>}
  
          <input {...form.register("popularAttractions")} placeholder="Popular Attractions (comma separated)" className="w-full border rounded p-2" />
          <input {...form.register("thingsToDo")} placeholder="Things to do (comma separated)" className="w-full border rounded p-2" />                         
  
          <input {...form.register("metaTitle")} placeholder="Meta Title" className="w-full border rounded p-2" />
          {form.formState.errors.metaTitle && <p className="text-red-500 text-sm">{form.formState.errors.metaTitle.message}</p>}
          <textarea {...form.register("metaDescription")} placeholder="Meta Description" className="w-full border rounded p-2" />
          {form.formState.errors.metaDescription && <p className="text-red-500 text-sm">{form.formState.errors.metaDescription.message}</p>}
          <input {...form.register("keywords")} placeholder="Keywords (comma separated)" className="w-full border rounded p-2" />
  
  
           <div className="space-y-2">
                <ImageUploader
                  onUpload={(img) =>
                    form.setValue("coverImage", {
                      url: img.url,
                      public_id: img.public_id,
                      width: img.width,
                      height: img.height,
                      alt: form.getValues("name") || "Cover Image",
                    })
                  }
                />
  
                <CloudinaryMediaLibrary
                  onSelect={(img) =>
                    form.setValue("coverImage", {
                      url: img.url,
                      public_id: img.public_id,
                      alt: form.getValues("name") || "Cover Image",
                    })
                  }
                />
                {form.formState.errors.coverImage && <p className="text-red-500 text-sm">{form.formState.errors.coverImage.message}</p>}
            </div>
          <input {...form.register("coverImage.alt")} placeholder="Cover Image Alt" className="w-full border rounded p-2" />
  
          <select {...form.register("status")} className="w-full border rounded p-2">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
  
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Destination"}
          </Button>
        </form>
      </div>
    )
}