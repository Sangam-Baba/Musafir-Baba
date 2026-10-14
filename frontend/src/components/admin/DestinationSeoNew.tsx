"use client";
import React, { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { HelpCircle, Image as ImageIcon, Info, Loader2, MapPinPenIcon, Save, Search, Share2, X } from "lucide-react";
import { Loader } from "@/components/custom/loader";
import { schemaTypes } from "@/lib/schemaTypes";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import BlogEditor from "./BlogEditor";
import ImageUploader from "./ImageUploader";
import OpenGraphManager from "./OpenGraphManager";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { FleetPanel, fleetSelectClass } from "./fleet/FleetUI";
import { FaqEditor, FormTabsList, TagInput, dSelectMultiple, firstErrorTab } from "./destination/FormBits";
import type { FormTab } from "./destination/FormBits";

// Sub-tab layout (UI only).
const SEO_TABS: FormTab[] = [
  { value: "basic", label: "Basic Detail", icon: Info },
  { value: "seo", label: "Media & SEO", icon: Search },
  { value: "faq", label: "FAQ", icon: HelpCircle },
  { value: "social", label: "Social (OG)", icon: Share2 },
];
const SEO_TAB_ORDER = SEO_TABS.map((t) => t.value);
const SEO_FIELD_TABS: Record<string, string> = {
  pageTitle: "basic",
  excerpt: "basic",
  content: "basic",
  metaTitle: "seo",
  metaDescription: "seo",
  keywords: "seo",
  schemaType: "seo",
  coverImage: "seo",
  faqSchema: "faq",
  social: "social",
};

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
  faqSchema: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .optional(),
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
      faqSchema: [],
      coverImage: { url: "", public_id: "", alt: "" },
      social: { twitter: { inheritOpenGraph: true } },
    },
  });
  const faqArray = useFieldArray({ control: form.control, name: "faqSchema" });

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
        faqSchema: destinationSeo.faqSchema ?? [],
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

  // UI only: when validation fails, jump to the first tab with an error.
  const [tab, setTab] = React.useState<string>("basic");
  const onInvalid = (errs: Record<string, unknown>) => {
    const target = firstErrorTab(errs, SEO_FIELD_TABS, SEO_TAB_ORDER);
    if (target) setTab(target);
    toast.error("Please fix the highlighted fields");
  };

  if (destinationSeoLoading || categoryLoading || destinationLoading)
    return <Loader size="lg" />;
  if (destinationError || categoryError || destinationSeoError)
    return <p>Something went wrong</p>;

  return (
    <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
            <MapPinPenIcon size={16} className="text-[#FE5300]" />
            {id ? "Update" : "Create"} Category SEO Page
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            SEO and content for /holidays/{"{category}"}/{"{destination}"}. Pick the category first; only destinations with packages in it are listed.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-5 py-4">
            {/* Selects */}
            <div className="grid gap-3 rounded-lg border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:grid-cols-2">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12px] font-medium text-slate-700">Category</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        value={field.value || ""}
                        className={`${fleetSelectClass} h-9 w-full`}
                      >
                        <option value="">Select Category</option>
                        {Category?.map((cat: Category) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />
              {form.watch("categoryId") && (
                <FormField
                  control={form.control}
                  name="destinationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[12px] font-medium text-slate-700">Destination</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className={`${fleetSelectClass} h-9 w-full`}
                        >
                          <option value="">Select Destination</option>
                          {Destination?.map((d: Destination) => (
                            <option key={d._id} value={d._id}>
                              {d.state}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <Tabs value={tab} onValueChange={setTab} className="w-full min-w-0 gap-4">
              <FormTabsList
                tabs={SEO_TABS.map((t) => ({
                  ...t,
                  hasError: Object.keys(form.formState.errors).some((k) => SEO_FIELD_TABS[k] === t.value),
                }))}
              />

              {/* Basic Detail Tab */}
              <TabsContent value="basic" forceMount className="data-[state=inactive]:hidden">
                <FleetPanel title="Page content" description="Heading, intro and body shown on the listing page." icon={Info} bodyClassName="space-y-4 p-4">
                  <FormField
                    control={form.control}
                    name="pageTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[12px] font-medium text-slate-700">Page Heading (on-page title shown to visitors)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder='Leave blank to use "Explore Packages in {Destination}"' className="h-9 text-[13px]" />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="excerpt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[12px] font-medium text-slate-700">Excerpt</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Excerpt..." className="text-[13px]" />
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-1.5">
                    <label htmlFor="content" className="block text-[12px] font-medium text-slate-700">Content</label>
                    <div className="rounded-md border border-slate-200 p-2">
                      <BlogEditor
                        value={form.getValues("content")}
                        onChange={(val) => form.setValue("content", val)}
                      />
                    </div>
                  </div>
                </FleetPanel>
              </TabsContent>

              {/* Media & SEO Tab */}
              <TabsContent value="seo" forceMount className="data-[state=inactive]:hidden">
                <div className="grid gap-4 lg:grid-cols-2">
                  <FleetPanel title="Search engine" description="Meta tags for this listing page." icon={Search} bodyClassName="space-y-4 p-4">
                    <FormField
                      control={form.control}
                      name="metaTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[12px] font-medium text-slate-700">Meta Title</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Meta title" className="h-9 text-[13px]" />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="metaDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[12px] font-medium text-slate-700">Meta Description</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Meta description" className="h-9 text-[13px]" />
                          </FormControl>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-1.5">
                      <Label className="block text-[12px] font-medium text-slate-700">Keywords</Label>
                      <TagInput values={form.watch("keywords")} onChange={(v) => form.setValue("keywords", v)} />
                    </div>
                    <FormField
                      control={form.control}
                      name="schemaType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[12px] font-medium text-slate-700">Schema Type</FormLabel>
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
                              className={dSelectMultiple}
                            >
                              {schemaTypes.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <p className="text-[11px] text-slate-400">Hold Cmd/Ctrl to select multiple.</p>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />
                  </FleetPanel>
                  <FleetPanel title="Cover image" description="Banner shown on this page." icon={ImageIcon} bodyClassName="space-y-4 p-4">
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
                    {form.watch("coverImage")?.url && (
                      <Input
                        {...form.register("coverImage.alt")}
                        placeholder="Cover Image Alt Text"
                        className="h-9 text-[13px]"
                      />
                    )}
                  </FleetPanel>
                </div>
              </TabsContent>

              {/* FAQ Tab */}
              <TabsContent value="faq" forceMount className="data-[state=inactive]:hidden">
                <FaqEditor
                  fields={faqArray.fields}
                  onAdd={() => faqArray.append({ question: "", answer: "" })}
                  onRemove={(i) => faqArray.remove(i)}
                  questionProps={(i) => form.register(`faqSchema.${i}.question`)}
                  answerProps={(i) => form.register(`faqSchema.${i}.answer`)}
                />
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
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 text-[12px]"
            >
              Close
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="h-9 bg-[#FE5300] text-[12px] hover:bg-[#e54b00]"
            >
              {mutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              {mutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default DestinationSeoNew;
