"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import { z } from "zod";
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
import { Loader } from "@/components/custom/loader";
import { Textarea } from "../ui/textarea";
import BlogEditor from "./BlogEditor";
import ImageUploader from "./ImageUploader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";

export const vehicleTypeSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  title: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  bannerImage: z.object({
    url: z.string().url("Invalid image URL"),
    alt: z.string().optional(),
  }).optional().nullable(),
  content: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  canonicalUrl: z.string().optional(),
  excerpt: z.string().optional(),
  keywords: z.any().optional(), // Can be array or string temporarily
});

type FormData = z.infer<typeof vehicleTypeSchema>;

const createVehicleType = async (accessToken: string, form: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/type`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(form),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to create vehicle type");
  }
  return res.json();
};

const updateVehicleType = async (accessToken: string, id: string, form: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/type/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(form),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to update vehicle type");
  }
  return res.json();
};

const getVehicleTypeById = async (accessToken: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/type/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch vehicle type");
  return res.json();
};

export const CreateEditVehicleType = ({ id }: { id: string | null }) => {
  const router = useRouter();
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(vehicleTypeSchema) as Resolver<FormData>,
    defaultValues: {
      name: "",
      title: "",
      status: "active",
      bannerImage: null,
      content: "",
      metaTitle: "",
      metaDescription: "",
      canonicalUrl: "",
      excerpt: "",
      keywords: [],
    },
  });

  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: ["master-data-type", id],
    queryFn: () => getVehicleTypeById(accessToken, id as string),
    enabled: !!id,
  });

  const typeData = data?.data;

  useEffect(() => {
    if (id && typeData) {
      form.reset({
        name: typeData.name || "",
        title: typeData.title || "",
        status: typeData.status || "active",
        bannerImage: typeData.bannerImage || null,
        content: typeData.content || "",
        metaTitle: typeData.metaTitle || "",
        metaDescription: typeData.metaDescription || "",
        canonicalUrl: typeData.canonicalUrl || "",
        excerpt: typeData.excerpt || "",
        keywords: typeData.keywords || [],
      });
    }
  }, [id, typeData, form]);

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      id
        ? updateVehicleType(accessToken, id, values)
        : createVehicleType(accessToken, values),
    onSuccess: () => {
      toast.success(id ? "Vehicle Type updated successfully!" : "Vehicle Type created successfully!");
      queryClient.invalidateQueries({ queryKey: ["master-data", "type"] });
      router.push("/admin/master-data/type");
    },
    onError: (err) => toast.error(err.message || "Failed to save"),
  });

  if (isLoading && id) return <Loader size="lg" />;

  function onSubmit(values: FormData) {
    const finalValues = {
      ...values,
      keywords: typeof values.keywords === "string" 
        ? (values.keywords as string).split(",").map((k) => k.trim()).filter(Boolean) 
        : values.keywords,
    };
    mutation.mutate(finalValues as any);
  }

  const keywordsString = Array.isArray(form.watch("keywords")) 
    ? form.watch("keywords").join(", ") 
    : form.watch("keywords");

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 w-full max-w-full">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        {id ? "Edit Vehicle Type" : "Create Vehicle Type"}
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid grid-cols-4 w-full mb-6 max-w-3xl">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>

            <TabsContent value="general" forceMount className="space-y-6 data-[state=inactive]:hidden">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Car Rentals" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page Title (H1)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Premium Car Rentals in Delhi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <select {...field} className="w-full rounded-md border border-gray-300 p-2 text-sm h-10">
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </TabsContent>

            <TabsContent value="content" forceMount className="space-y-6 data-[state=inactive]:hidden">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Page Content</FormLabel>
                    <FormControl>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <BlogEditor value={field.value || ""} onChange={field.onChange} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="media" forceMount className="space-y-6 data-[state=inactive]:hidden">
              <FormField
                control={form.control}
                name="bannerImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banner Image (Recommended 1920x600)</FormLabel>
                    <FormControl>
                      <div className="w-full">
                        <ImageUploader
                          initialImage={field.value}
                          onUpload={(img) => {
                            if (!img) {
                              field.onChange(null);
                              return;
                            }
                            field.onChange({
                              url: img.url,
                              alt: img.alt || form.getValues("title") || form.getValues("name"),
                            });
                          }}
                          className="aspect-[3/1]"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            <TabsContent value="seo" forceMount className="space-y-6 data-[state=inactive]:hidden">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter SEO Title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="canonicalUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canonical URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://musafirbaba.com/rental/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="metaDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter SEO Description" {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Excerpt (Short Description)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Short snippet for previews" {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keywords (Comma separated)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. car rentals, cheap cars, rent a car" 
                        value={keywordsString || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4 border-t pt-6">
            <Button type="button" variant="outline" onClick={() => router.push("/admin/master-data/type")}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-[#FE5300] hover:bg-[#e14a00] text-white px-8">
              {mutation.isPending ? "Saving..." : "Save Vehicle Type"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
