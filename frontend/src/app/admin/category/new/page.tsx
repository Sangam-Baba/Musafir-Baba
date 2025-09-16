"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm , Controller } from "react-hook-form"
import { z } from "zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useAuthStore } from "@/store/useAuthStore"
import { toast } from "sonner";
import  ImageUploader  from "@/components/admin/ImageUploader"
import  CloudinaryMediaLibrary  from "@/components/admin/CloudinaryMediaLibrary"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/custom/loader"

interface Package{
    _id:string,
    price:number,
    title:string,
    description:string,
    slug:string
}


const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().min(2, {
    message: "Description must be at least 2 characters.",
  }),
  coverImage: z.object({
    url: z.string().url().optional(),
    public_id: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    alt: z.string().optional(),
  }).optional(),
  packages: z.string().array().optional(),
  isActive: z.boolean(),
})
const create=async(values:z.infer<typeof formSchema>, token:string)=>{
    const res=await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`,{
        method:"POST",
        headers:{"Content-Type":"application/json",
        Authorization:`Bearer ${token}`
        },
        credentials:"include",
        body:JSON.stringify(values)
    })    
    if(!res.ok) throw new Error("Failed to create category")
    return res.json().then((data)=>{
        console.log(data)
    })
}

const getPackages = async () => {
    const  res=await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/packages/all`,{
        method:"GET",
        headers:{"Content-Type":"application/json"},
        credentials:"include",
    })
    if(!res.ok) throw new Error("Failed to fetch packages");
    const data=await res.json();
    return data?.data.packages;
}
export default function CreateCategory() {
    const accessToken:string = useAuthStore((state) => state.accessToken) || "";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      coverImage: undefined,
      packages: [],
      isActive: true,
    },
  })
  
  const { data : packages,isLoading, isError, error}= useQuery({
      queryKey: ["packages"],
      queryFn: getPackages,
  })
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => create(values, accessToken),
    onSuccess: () => {
      form.reset();
      toast.success("Category created successfully!");
    },
    onError: (error) => {
        toast.error("Failed to create Category");
      console.error(error)
    },
  })
  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values)
    console.log(values)
  }
  if( isLoading) return <Loader size="lg" message="Loading..." />
  if(isError) return <p>Error: {error?.message}</p>
    return (
      <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold mb-6">Create Category</h1>
        <form onSubmit={form.handleSubmit((values) => onSubmit(values))} className="space-y-6">
          <input {...form.register("name")} placeholder="Name" className="w-full border rounded p-2" />
          {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
          <textarea {...form.register("description")} placeholder="Description" className="w-full border rounded p-2" />
          {form.formState.errors.description && <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>}  

<Controller
  name="packages"
  control={form.control}
  render={({ field }) => (
<div className="space-y-2">
  {packages?.map((p: Package) => (
    <label key={p._id} className="flex items-center space-x-2">
      <input
        type="checkbox"
        value={p._id}
        checked={field.value?.includes(p._id)}
        onChange={(e) => {
          if (e.target.checked) {
            field.onChange([...(field.value || []), p._id])
          } else {
            field.onChange(field.value?.filter((id) => id !== p._id))
          }
        }}
      />
      <span>{p.title}</span>
    </label>
  ))}
</div>

  )}
/>
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
  
          <select value={form.watch("isActive") ? "true" : "false"} onChange={(e) => form.setValue("isActive", e.target.value === "true")} className="w-full border rounded p-2">
            <option value="false">Draft</option>
            <option value="true">Published</option>   
          </select>
  
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Category"}
          </Button>
        </form>
      </div>
    )
}