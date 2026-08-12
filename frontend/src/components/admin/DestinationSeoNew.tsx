"use client";
import React, { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { toast } from "sonner";
import type { Resolver } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Loader } from "@/components/custom/loader";
import { schemaTypes } from "@/lib/schemaTypes";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import BlogEditor from "./BlogEditor";
import ImageUploader from "./ImageUploader";
import OpenGraphManager from "./OpenGraphManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Category {
  _id: string;
  name: string;
}

interface Destination {
  _id: string;
  name: string;
  state: string;
}

const formSchema = z.object({
  metaTitle: z.string().min(2, { message: "Meta title is required." }),
  metaDescription: z
    .string()
    .min(2, { message: "Meta description is required." }),
  keywords: z.array(z.string()).optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  schemaType: z.array(z.string()).optional(),
  destinationId: z.string().min(2, { message: "Destination is required." }),
  categoryId: z.string().min(2, { message: "Category is required." }),
  pageTitle: z.string().optional(),
  coverImage: z
    .object({
      url: z.string().optional(),
      public_id: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      alt: z.string().optional(),
    })
    .optional(),
  social: z
    .object({
      openGraph: z
        .object({
          title: z.string().optional(),
          description: z.string().optional(),
          image: z.string().optional(),
          imageAlt: z.string().optional(),
          type: z.string().optional(),
        })
        .optional(),
      twitter: z
        .object({
          inheritOpenGraph: z.boolean().optional(),
          title: z.string().optional(),
          description: z.string().optional(),
          image: z.string().optional(),
          card: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
});

type FormData = z.infer<typeof formSchema>;

const getDestinations = async (accessToken: string, id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/destination/category/${id}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch destinations");
  return (await res.json())?.data;
};

const getCategories = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch categories");
  return (await res.json())?.data;
};

const createDestinationSeo = async (accessToken: string, values: FormData) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/destinationseo`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(values),
    }
  );
  if (!res.ok) throw new Error("Failed to create destination seo");
  return res.json();
};

const updateDestinationSeo = async (
  accessToken: string,
  values: FormData,
  id: string
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/destinationseo/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(values),
    }
  );
  if (!res.ok) throw new Error("Failed to update destination seo");
  return res.json();
};

export const getDestinationSeo = async (accessToken: string, id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/destinationseo/id/${id}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error("Failed to fetch destination seo");
  return (await res.json())?.data;
};

function DestinationSeoNew({
  id,
  onClose,
  onSuccess,
}: {
  id?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
    defaultValues: {
      metaTitle: "",
      metaDescription: "",
      excerpt: "",
      content: "",
      keywords: [],
      schemaType: [],
      destinationId: "",
      categoryId: "",
      pageTitle: "",
      coverImage: { url: "", public_id: "", alt: "" },
      social: { twitter: { inheritOpenGraph: true } },
    },
  });

  const {
    data: destinationSeo,
    isLoading: destinationSeoLoading,
    isError: destinationSeoError,
  } = useQuery({
    queryKey: ["destinationSeo", id],
    queryFn: () => getDestinationSeo(accessToken, id as string),
    enabled: !!id,
  });

  useEffect(() => {
    if (destinationSeo) {
      form.reset({
        metaTitle: destinationSeo.metaTitle,
        metaDescription: destinationSeo.metaDescription,
        keywords: destinationSeo.keywords || [],
        schemaType: destinationSeo.schemaType || [],
        destinationId: destinationSeo.destinationId,
        categoryId: destinationSeo.categoryId,
        excerpt: destinationSeo.excerpt,
        content: destinationSeo.content,
        pageTitle: destinationSeo.pageTitle ?? "",
        coverImage: destinationSeo.coverImage ?? { url: "", public_id: "", alt: "" },
        social: destinationSeo.social ?? { twitter: { inheritOpenGraph: true } },
      });
    }
  }, [destinationSeo, form]);

  const {
    data: Category,
    isLoading: categoryLoading,
    isError: categoryError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(accessToken),
  });

  const {
    data: Destination,
    isLoading: destinationLoading,
    isError: destinationError,
  } = useQuery({
    queryKey: ["destinations", form.watch("categoryId")],
    queryFn: () => getDestinations(accessToken, form.watch("categoryId")),
    enabled: !!form.watch("categoryId"),
  });

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      id
        ? updateDestinationSeo(accessToken, values, id)
        : createDestinationSeo(accessToken, values),
    onSuccess: () => {
      toast.success(
        id
          ? "Destination SEO updated successfully!"
          : "Destination SEO created successfully!"
      );
      queryClient.invalidateQueries({ queryKey: ["all-destinationSeo"] });
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Something went wrong");
    },
  });

  const onSubmit = (values: FormData) => mutation.mutate(values);

  if (destinationSeoLoading || categoryLoading || destinationLoading)
    return <Loader size="lg" />;
  if (destinationError || categoryError || destinationSeoError)
    return <p>Something went wrong</p>;

  return (
    <div className="flex flex-col w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-50 px-4 py-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">
        {id ? "Update" : "Create"} Destination Meta
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Selects */}
          <div className="grid md:grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={field.value || ""}
                      className="w-full rounded-md border p-2"
                    >
                      <option value="">Select Category</option>
                      {Category?.map((cat: Category) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch("categoryId") && (
              <FormField
                control={form.control}
                name="destinationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full rounded-md border p-2"
                      >
                        <option value="">Select Destination</option>
                        {Destination?.map((d: Destination) => (
                          <option key={d._id} value={d._id}>
                            {d.state}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid grid-cols-3 w-full bg-slate-100/50 p-0.5 rounded-lg h-9 mb-4">
              <TabsTrigger value="basic" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#FE5300]">
                Basic Detail
              </TabsTrigger>
              <TabsTrigger value="seo" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#FE5300]">
                Media & SEO
              </TabsTrigger>
              <TabsTrigger value="social" className="text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[#FE5300]">
                Social (OG)
              </TabsTrigger>
            </TabsList>

            {/* Basic Detail Tab */}
            <TabsContent value="basic" forceMount className="space-y-6 data-[state=inactive]:hidden">
              <FormField
                control={form.control}
                name="pageTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Page Heading (on-page title shown to visitors)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder='Leave blank to use "Explore Packages in {Destination}"' />
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
                    <FormLabel>Excerpt</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Excerpt..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <label htmlFor="content">Content</label>
                <div className="border rounded p-2">
                  <BlogEditor
                    value={form.getValues("content")}
                    onChange={(val) => form.setValue("content", val)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Media & SEO Tab */}
            <TabsContent value="seo" forceMount className="space-y-6 data-[state=inactive]:hidden">
              <FormField
                control={form.control}
                name="metaTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Meta title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="metaDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Meta description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <Label className="block text-sm font-medium">Cover Image (banner shown on this page)</Label>
                <div className="border rounded p-2">
                  <ImageUploader
                    initialImage={destinationSeo?.coverImage?.url ? destinationSeo.coverImage : undefined}
                    onUpload={(img) =>
                      form.setValue("coverImage", {
                        url: img?.url,
                        public_id: img?.public_id,
                        width: img?.width,
                        height: img?.height,
                        alt: img?.alt || form.getValues("pageTitle") || form.getValues("metaTitle"),
                      })
                    }
                  />
                </div>
                {form.watch("coverImage")?.url && (
                  <Input
                    {...form.register("coverImage.alt")}
                    placeholder="Cover Image Alt Text"
                  />
                )}
              </div>
              <FormField
                control={form.control}
                name="schemaType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schema Type</FormLabel>
                    <FormControl>
                      <select
                        multiple
                        value={field.value || []}
                        onChange={(e) => {
                          const value = Array.from(
                            e.target.selectedOptions,
                            (option) => option.value
                          );
                          field.onChange(value);
                        }}
                      >
                        {schemaTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Keywords input */}
              <div className="space-y-2">
                <Label className="block text-sm font-medium">Keywords</Label>
                <div className="flex flex-wrap gap-2 border rounded p-2">
                  {form.watch("keywords")?.map((kw, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full text-sm"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => {
                          const newKeywords = form
                            .getValues("keywords")
                            ?.filter((_, idx) => idx !== i);
                          form.setValue("keywords", newKeywords);
                        }}
                        className="text-gray-600 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}

                  <input
                    type=" text"
                    className="flex-1 min-w-[120px] border-none focus:ring-0 focus:outline-none"
                    placeholder="Type keyword and press Enter"
                    onBlur={(e) => {
                      const arr = e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean);
                      if (arr.length > 0) {
                        form.setValue("keywords", [
                          ...(form.getValues("keywords") || []),
                          ...arr,
                        ]);
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Social (OG) Tab */}
            <TabsContent value="social" forceMount className="data-[state=inactive]:hidden">
              <OpenGraphManager
                form={form}
                moduleType="DESTINATION"
                baseMetadata={{
                  title: form.watch("pageTitle") || form.watch("metaTitle") || "",
                  description: form.watch("metaDescription") || form.watch("excerpt") || "",
                  image: form.watch("coverImage")?.url || "https://musafirbaba.com/homebanner.webp",
                  imageAlt: form.watch("pageTitle") || form.watch("metaTitle") || "",
                }}
              />
            </TabsContent>
          </Tabs>

          {/* Buttons */}
          <div className="flex items-center justify-between gap-3">
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-[#FE5300] hover:bg-[#FE5300]/80"
            >
              {mutation.isPending ? "Submitting..." : "Submit"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-400"
            >
              Close
            </Button>
          </div>
        </form>
      </Form>
      {mutation.isError && toast.error(mutation.error.message)}
      {mutation.isSuccess && toast.success("Destination Meta created")}
    </div>
  );
}

export default DestinationSeoNew;
