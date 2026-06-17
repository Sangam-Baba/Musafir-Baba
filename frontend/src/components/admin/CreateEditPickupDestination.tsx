"use client";
import { useEffect } from "react";
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

export const pickupDestinationSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  city: z.string().optional(),
  state: z.string().optional(),
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

type FormData = z.infer<typeof pickupDestinationSchema>;

const createDestination = async (accessToken: string, form: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/pickup-destination`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(form),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to create destination");
  }
  return res.json();
};

const updateDestination = async (accessToken: string, id: string, form: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/pickup-destination/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(form),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to update destination");
  }
  return res.json();
};

const getDestinationById = async (accessToken: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/pickup-destination/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch destination");
  return res.json();
};

export const CreateEditPickupDestination = ({ id }: { id: string | null }) => {
  const router = useRouter();
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(pickupDestinationSchema) as Resolver<FormData>,
    defaultValues: {
      name: "",
      city: "",
      state: "",
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
    queryKey: ["master-data-destination", id],
    queryFn: () => getDestinationById(accessToken, id as string),
    enabled: !!id,
  });

  const destData = data?.data;

  useEffect(() => {
    if (id && destData) {
      form.reset({
        name: destData.name || "",
        city: destData.city || "",
        state: destData.state || "",
        title: destData.title || "",
        status: destData.status || "active",
        bannerImage: destData.bannerImage || null,
        content: destData.content || "",
        metaTitle: destData.metaTitle || "",
        metaDescription: destData.metaDescription || "",
        canonicalUrl: destData.canonicalUrl || "",
        excerpt: destData.excerpt || "",
        keywords: destData.keywords || [],
      });
    }
  }, [id, destData, form]);

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      id
        ? updateDestination(accessToken, id, values)
        : createDestination(accessToken, values),
    onSuccess: () => {
      toast.success(id ? "Destination updated successfully!" : "Destination created successfully!");
      queryClient.invalidateQueries({ queryKey: ["master-data", "pickup-destination"] });
      router.push("/admin/master-data/pickup-destination");
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
      <h2 className="text-[18px] font-bold mb-6 text-slate-800">
        {id ? "Edit Pickup Destination" : "Create Pickup Destination"}
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid grid-cols-4 w-full mb-6 max-w-3xl bg-slate-100 p-1">
              <TabsTrigger value="general" className="text-[13px] data-[state=active]:bg-white data-[state=active]:text-[#FE5300]">General</TabsTrigger>
              <TabsTrigger value="content" className="text-[13px] data-[state=active]:bg-white data-[state=active]:text-[#FE5300]">Content</TabsTrigger>
              <TabsTrigger value="media" className="text-[13px] data-[state=active]:bg-white data-[state=active]:text-[#FE5300]">Media</TabsTrigger>
              <TabsTrigger value="seo" className="text-[13px] data-[state=active]:bg-white data-[state=active]:text-[#FE5300]">SEO</TabsTrigger>
            </TabsList>

            <TabsContent value="general" forceMount className="space-y-6 data-[state=inactive]:hidden">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-medium text-slate-500 capitalize">Destination Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Delhi" 
                          {...field} 
                          className="h-8 bg-slate-50 border-transparent shadow-none focus-visible:ring-1 focus-visible:ring-[#FE5300] text-[13px]" 
                        />
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
                      <FormLabel className="text-[11px] font-medium text-slate-500 capitalize">Page Title (H1)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Rental Services in Delhi" 
                          {...field} 
                          className="h-8 bg-slate-50 border-transparent shadow-none focus-visible:ring-1 focus-visible:ring-[#FE5300] text-[13px]" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-medium text-slate-500 capitalize">City</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. New Delhi" 
                          {...field} 
                          className="h-8 bg-slate-50 border-transparent shadow-none focus-visible:ring-1 focus-visible:ring-[#FE5300] text-[13px]" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-medium text-slate-500 capitalize">State</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Delhi" 
                          {...field} 
                          className="h-8 bg-slate-50 border-transparent shadow-none focus-visible:ring-1 focus-visible:ring-[#FE5300] text-[13px]" 
                        />
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
                      <FormLabel className="text-[11px] font-medium text-slate-500 capitalize">Status</FormLabel>
                      <FormControl>
                        <select 
                          {...field} 
                          className="w-full rounded-md bg-slate-50 border-transparent shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FE5300] text-[13px] h-8 px-3"
                        >
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
                    <FormLabel className="text-[11px] font-medium text-slate-500 capitalize">Page Content</FormLabel>
                    <FormControl>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
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
                    <FormLabel className="text-[11px] font-medium text-slate-500 capitalize">Banner Image (Recommended 1920x600)</FormLabel>
                    <FormControl>
                      <div className="w-full bg-slate-50 p-4 rounded-lg border border-slate-100">
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
                      <FormLabel className="text-[11px] font-medium text-slate-500 capitalize">Meta Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter SEO Title" 
                          {...field} 
                          className="h-8 bg-slate-50 border-transparent shadow-none focus-visible:ring-1 focus-visible:ring-[#FE5300] text-[13px]" 
                        />
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
                      <FormLabel className="text-[11px] font-medium text-slate-500 capitalize">Canonical URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://musafirbaba.com/rental/..." 
                          {...field} 
                          className="h-8 bg-slate-50 border-transparent shadow-none focus-visible:ring-1 focus-visible:ring-[#FE5300] text-[13px]" 
                        />
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
                      <FormLabel className="text-[11px] font-medium text-slate-500 capitalize">Meta Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter SEO Description" 
                          {...field} 
                          rows={3} 
                          className="bg-slate-50 border-transparent shadow-none focus-visible:ring-1 focus-visible:ring-[#FE5300] text-[13px] resize-none"
                        />
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
                      <FormLabel className="text-[11px] font-medium text-slate-500 capitalize">Excerpt (Short Description)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Short snippet for previews" 
                          {...field} 
                          rows={3} 
                          className="bg-slate-50 border-transparent shadow-none focus-visible:ring-1 focus-visible:ring-[#FE5300] text-[13px] resize-none"
                        />
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
                    <FormLabel className="text-[11px] font-medium text-slate-500 capitalize">Keywords (Comma separated)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. car rentals delhi, cheap cars" 
                        value={keywordsString || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-8 bg-slate-50 border-transparent shadow-none focus-visible:ring-1 focus-visible:ring-[#FE5300] text-[13px]" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 border-t pt-5 mt-8">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push("/admin/master-data/pickup-destination")}
              className="h-8 px-4 text-[13px] font-medium text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-none"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={mutation.isPending} 
              className="h-8 px-6 text-[13px] font-medium bg-[#FE5300] hover:bg-[#e14a00] text-white shadow-none transition-colors"
            >
              {mutation.isPending ? "Saving..." : "Save Destination"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
