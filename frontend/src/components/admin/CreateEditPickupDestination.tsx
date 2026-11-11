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
import { Loader } from "@/components/custom/loader";
import ImageUploader from "./ImageUploader";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MapPin } from "lucide-react";
import { FleetPage } from "@/components/admin/fleet/FleetUI";
import { AdminSaveBar, CompactBlogEditor } from "@/components/admin/AdminFormUI";
import { dInput, dTextarea } from "@/components/admin/destination/FormBits";
import {
  CityTabPanel,
  CityTabsList,
  RentalPageHeader,
  rLabel,
  rPrimaryBtn,
  rSecondaryBtn,
} from "@/components/admin/rental/RentalAdminUI";
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
    <FleetPage className="gap-4">
      <RentalPageHeader
        icon={MapPin}
        title={id ? "Edit City" : "Create City"}
        description="A pickup city. Its page (e.g. /rental/delhi) lists every vehicle there; each city + type page gets its own content under City + Type Pages."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Tabs defaultValue="general" className="w-full gap-4">
            <CityTabsList />

            <TabsContent value="general" forceMount className="data-[state=inactive]:hidden">
              <CityTabPanel tab="general">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={rLabel}>City name *</FormLabel>
                      <FormControl>
                        <input placeholder="e.g. Delhi" {...field} className={dInput} />
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
                      <FormLabel className={rLabel}>Page heading (H1)</FormLabel>
                      <FormControl>
                        <input placeholder="e.g. Car & Traveller Rental in Delhi" {...field} className={dInput} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={rLabel}>City</FormLabel>
                      <FormControl>
                        <input placeholder="e.g. New Delhi" {...field} className={dInput} />
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
                      <FormLabel className={rLabel}>State</FormLabel>
                      <FormControl>
                        <input placeholder="e.g. Delhi" {...field} className={dInput} />
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
                      <FormLabel className={rLabel}>Status</FormLabel>
                      <FormControl>
                        <select {...field} className={dInput}>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              </CityTabPanel>
            </TabsContent>

            <TabsContent value="content" forceMount className="data-[state=inactive]:hidden">
              <CityTabPanel tab="content">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <CompactBlogEditor value={field.value || ""} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CityTabPanel>
            </TabsContent>

            <TabsContent value="media" forceMount className="data-[state=inactive]:hidden">
              <CityTabPanel tab="media">
                <FormField
                  control={form.control}
                  name="bannerImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={rLabel}>Banner image (recommended 1920×600)</FormLabel>
                      <FormControl>
                        <div className="w-full rounded-lg border border-slate-200/80 bg-slate-50/60 p-4">
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
              </CityTabPanel>
            </TabsContent>

            <TabsContent value="seo" forceMount className="data-[state=inactive]:hidden">
              <CityTabPanel tab="seo">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={rLabel}>Meta title</FormLabel>
                      <FormControl>
                        <input placeholder="Enter SEO title" {...field} className={dInput} />
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
                      <FormLabel className={rLabel}>Canonical URL</FormLabel>
                      <FormControl>
                        <input placeholder="https://musafirbaba.com/rental/..." {...field} className={dInput} />
                      </FormControl>
                      <p className="text-[11px] text-slate-400">Optional. The city page currently uses its own address as canonical.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="metaDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={rLabel}>Meta description</FormLabel>
                      <FormControl>
                        <textarea placeholder="Enter SEO description" {...field} rows={3} className={dTextarea} />
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
                      <FormLabel className={rLabel}>Excerpt (short description)</FormLabel>
                      <FormControl>
                        <textarea placeholder="Short snippet for previews" {...field} rows={3} className={dTextarea} />
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
                      <FormLabel className={rLabel}>Keywords (comma separated)</FormLabel>
                      <FormControl>
                        <input
                          placeholder="e.g. car rentals delhi, cheap cars"
                          value={keywordsString || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          className={dInput}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CityTabPanel>
            </TabsContent>
          </Tabs>

          <AdminSaveBar hint="Changes show on this city's page within a minute.">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/master-data/pickup-destination")}
              className={rSecondaryBtn}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className={rPrimaryBtn}>
              {mutation.isPending ? "Saving..." : id ? "Save changes" : "Create city"}
            </Button>
          </AdminSaveBar>
        </form>
      </Form>
    </FleetPage>
  );
};
