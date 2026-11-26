"use client";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { ExternalLink, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader } from "@/components/custom/loader";
import ImageUploader from "./ImageUploader";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { FleetPage } from "@/components/admin/fleet/FleetUI";
import { AdminSaveBar, CompactBlogEditor } from "@/components/admin/AdminFormUI";
import { dInput, dTextarea } from "@/components/admin/destination/FormBits";
import {
  CityTypeTabPanel,
  CityTypeTabsList,
  RentalPageHeader,
  rLabel,
  rPrimaryBtn,
  rSecondaryBtn,
} from "@/components/admin/rental/RentalAdminUI";
import LocationAutocompleteInput from "@/components/mbgo/LocationAutocompleteInput";
import { getAllAuthors } from "@/app/admin/webpage/new/page";
import { useRouter } from "next/navigation";
import { rentalSlug } from "@/lib/rentalUrl";

// "Special Page": /rental/{city}/{special-type} (permalink empty = landing
// page) or /rental/{city}/{special-type}/{permalink}. One banner, the MBGo
// ride search (start point + where to set here) and content.

const LIST_PATH = "/admin/rental-special-pages";
const DEFAULT_FROM = "Delhi";

const pointSchema = z.object({
  address: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const schema = z.object({
  location: z.string().min(1, "Please select a city"),
  specialType: z.string().min(1, "Please select a special type"),
  slug: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  title: z.string().optional(),
  searchFrom: pointSchema,
  searchTo: pointSchema,
  author: z.string().optional(),
  bannerImage: z.object({ url: z.string().url("Invalid image URL"), alt: z.string().optional() }).optional().nullable(),
  content: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  keywords: z.any().optional(), // array, or comma-separated string while typing
  faqs: z
    .array(z.object({ question: z.string().min(1, "FAQ question required"), answer: z.string().min(1, "FAQ answer required") }))
    .optional(),
});

type FormData = z.infer<typeof schema>;

interface Option {
  _id: string;
  name: string;
  slug?: string;
  status?: string;
}

const authFetch = async (accessToken: string, path: string, init: RequestInit = {}) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || "Request failed");
  return body;
};

const slugOf = (o?: Option) => rentalSlug(o?.slug) || rentalSlug(o?.name);
const toPoint = (p?: { address?: string; lat?: number; lng?: number }) => ({
  address: p?.address || "",
  ...(typeof p?.lat === "number" && typeof p?.lng === "number" ? { lat: p.lat, lng: p.lng } : {}),
});

const EMPTY: FormData = {
  location: "",
  specialType: "",
  slug: "",
  status: "active",
  title: "",
  searchFrom: { address: DEFAULT_FROM },
  searchTo: { address: "" },
  author: "",
  bannerImage: null,
  content: "",
  metaTitle: "",
  metaDescription: "",
  keywords: [],
  faqs: [],
};

export const CreateEditRentalSpecialPage = ({ id }: { id: string | null }) => {
  const router = useRouter();
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();

  const form = useForm<FormData>({ resolver: zodResolver(schema) as Resolver<FormData>, defaultValues: EMPTY });
  const faqs = useFieldArray({ control: form.control, name: "faqs" });

  const { data: destinationsRes } = useQuery<{ data: Option[] }>({
    queryKey: ["master-data", "pickup-destination", "all"],
    queryFn: () => authFetch(accessToken, "/master-data/pickup-destination?all=true"),
  });
  const { data: typesRes } = useQuery<{ data: Option[] }>({
    queryKey: ["rental-special-type", "all"],
    queryFn: () => authFetch(accessToken, "/rental-special/types?all=true"),
  });
  const { data: authors } = useQuery<Option[]>({ queryKey: ["authors"], queryFn: getAllAuthors });
  const destinations = destinationsRes?.data ?? [];
  const types = typesRes?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["rental-special-page", id],
    queryFn: () => authFetch(accessToken, `/rental-special/pages/${id}`),
    enabled: !!id,
  });
  const pageData = data?.data;

  useEffect(() => {
    if (id && pageData) {
      form.reset({
        location: String(pageData.location ?? ""),
        specialType: String(pageData.specialType ?? ""),
        slug: pageData.slug || "",
        status: pageData.status || "active",
        title: pageData.title || "",
        searchFrom: toPoint(pageData.searchFrom),
        searchTo: toPoint(pageData.searchTo),
        author: pageData.author ? String(pageData.author) : "",
        bannerImage: pageData.bannerImage?.url ? pageData.bannerImage : null,
        content: pageData.content || "",
        metaTitle: pageData.metaTitle || "",
        metaDescription: pageData.metaDescription || "",
        keywords: pageData.keywords || [],
        faqs: (pageData.faqs || []).map((f: { question?: string; answer?: string }) => ({
          question: f.question || "",
          answer: f.answer || "",
        })),
      });
    }
  }, [id, pageData, form]);

  const mutation = useMutation({
    mutationFn: (values: Record<string, unknown>) =>
      id
        ? authFetch(accessToken, `/rental-special/pages/${id}`, { method: "PATCH", body: JSON.stringify(values) })
        : authFetch(accessToken, "/rental-special/pages", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      toast.success(id ? "Special page updated" : "Special page created");
      queryClient.invalidateQueries({ queryKey: ["rental-special-page"] });
      router.push(LIST_PATH);
    },
    onError: (err) => toast.error(err.message || "Failed to save"),
  });

  if (isLoading && id) return <Loader size="lg" />;

  function onSubmit(values: FormData) {
    mutation.mutate({
      ...values,
      slug: rentalSlug(values.slug),
      // "No author" is sent as null (an empty string can't be stored as an author id)
      author: values.author ? values.author : null,
      keywords:
        typeof values.keywords === "string"
          ? (values.keywords as string).split(",").map((k) => k.trim()).filter(Boolean)
          : values.keywords,
    });
  }

  const keywordsValue = form.watch("keywords");
  const keywordsString = Array.isArray(keywordsValue) ? keywordsValue.join(", ") : keywordsValue;

  const selectedLoc = destinations.find((d) => d._id === form.watch("location"));
  const selectedType = types.find((t) => t._id === form.watch("specialType"));
  const permalink = rentalSlug(form.watch("slug"));
  const previewPath =
    selectedLoc && selectedType
      ? `/rental/${slugOf(selectedLoc)}/${slugOf(selectedType)}${permalink ? `/${permalink}` : ""}`
      : null;

  const pointField = (name: "searchFrom" | "searchTo", label: string, placeholder: string, hint: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={rLabel}>{label}</FormLabel>
          <FormControl>
            <div className={`${dInput} flex items-center`}>
              <LocationAutocompleteInput
                value={field.value?.address || ""}
                onChange={(address, coords) => field.onChange({ address, ...(coords || {}) })}
                placeholder={placeholder}
                className="w-full bg-transparent text-sm focus:outline-none"
              />
            </div>
          </FormControl>
          <p className="text-[11px] text-slate-400">{hint}</p>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <FleetPage className="gap-4">
      <RentalPageHeader
        icon={Sparkles}
        title={id ? "Edit Special Page" : "Create Special Page"}
        description={
          previewPath ? (
            <>
              Content for{" "}
              <a href={previewPath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[#FE5300] hover:underline">
                {previewPath}
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          ) : (
            "Pick a city and a special type: one banner, the ride search, content, SEO and FAQs."
          )
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Tabs defaultValue="general" className="w-full gap-4">
            <CityTypeTabsList />

            <TabsContent value="general" forceMount className="data-[state=inactive]:hidden">
              <CityTypeTabPanel tab="general">
                <div className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={rLabel}>City *</FormLabel>
                        <FormControl>
                          <select {...field} className={dInput}>
                            <option value="" disabled>Select city</option>
                            {destinations.map((d) => (
                              <option key={d._id} value={d._id}>
                                {d.name}{d.status === "inactive" ? " (inactive)" : ""}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="specialType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={rLabel}>Special type *</FormLabel>
                        <FormControl>
                          <select {...field} className={dInput}>
                            <option value="" disabled>Select special type</option>
                            {types.map((t) => (
                              <option key={t._id} value={t._id}>
                                {t.name}{t.status === "inactive" ? " (inactive)" : ""}
                              </option>
                            ))}
                          </select>
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
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={rLabel}>Permalink</FormLabel>
                        <FormControl>
                          <input placeholder="e.g. delhi-to-agra" {...field} className={dInput} />
                        </FormControl>
                        <p className="text-[11px] text-slate-400">
                          Leave empty for the landing page /rental/city/special-type.
                        </p>
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
                          <input
                            placeholder={
                              selectedLoc && selectedType ? `Automatic: ${selectedType.name} in ${selectedLoc.name}` : "e.g. Wedding Car in Delhi"
                            }
                            {...field}
                            className={dInput}
                          />
                        </FormControl>
                        <p className="text-[11px] text-slate-400">Leave empty to use the automatic heading.</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {pointField("searchFrom", "Search: starting point", "Enter starting point", `Shown in the search box; default ${DEFAULT_FROM}. Visitors can change it.`)}
                  {pointField("searchTo", "Search: where to", "Where to?", "Shown in the search box. Visitors can change it.")}
                </div>
                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={rLabel}>Author</FormLabel>
                      <FormControl>
                        <select {...field} value={field.value || ""} className={dInput}>
                          <option value="">No author selected (shows Abhishek Rai)</option>
                          {authors?.map((a) => (
                            <option key={a._id} value={a._id}>{a.name}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CityTypeTabPanel>
            </TabsContent>

            <TabsContent value="content" forceMount className="data-[state=inactive]:hidden">
              <CityTypeTabPanel tab="content">
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
              </CityTypeTabPanel>
            </TabsContent>

            <TabsContent value="media" forceMount className="data-[state=inactive]:hidden">
              <CityTypeTabPanel tab="media">
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
                              field.onChange({ url: img.url, alt: img.alt || form.getValues("title") || "" });
                            }}
                            className="aspect-[3/1]"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CityTypeTabPanel>
            </TabsContent>

            <TabsContent value="faqs" forceMount className="data-[state=inactive]:hidden">
              <CityTypeTabPanel tab="faqs">
                {faqs.fields.length === 0 && <p className="text-[12px] text-slate-500">No FAQs yet.</p>}
                {faqs.fields.map((f, index) => (
                  <div key={f.id} className="space-y-3 rounded-lg border border-slate-200/80 bg-slate-50/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-500">FAQ {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-red-500"
                        onClick={() => faqs.remove(index)}
                        aria-label={`Remove FAQ ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <FormField
                      control={form.control}
                      name={`faqs.${index}.question`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={rLabel}>Question</FormLabel>
                          <FormControl>
                            <input {...field} className={dInput} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`faqs.${index}.answer`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={rLabel}>Answer</FormLabel>
                          <FormControl>
                            <textarea {...field} rows={3} className={dTextarea} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => faqs.append({ question: "", answer: "" })}
                  className={`${rSecondaryBtn} gap-1.5`}
                >
                  <Plus className="h-3.5 w-3.5" /> Add FAQ
                </Button>
              </CityTypeTabPanel>
            </TabsContent>

            <TabsContent value="seo" forceMount className="data-[state=inactive]:hidden">
              <CityTypeTabPanel tab="seo">
                <FormField
                  control={form.control}
                  name="metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={rLabel}>Meta title</FormLabel>
                      <FormControl>
                        <input placeholder="Defaults to the page heading" {...field} className={dInput} />
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
                      <FormLabel className={rLabel}>Meta description</FormLabel>
                      <FormControl>
                        <textarea placeholder="Short summary shown in search results" {...field} rows={3} className={dTextarea} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="keywords"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={rLabel}>Keywords (comma separated)</FormLabel>
                      <FormControl>
                        <input
                          placeholder="e.g. wedding car rental delhi"
                          value={keywordsString || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          className={dInput}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CityTypeTabPanel>
            </TabsContent>
          </Tabs>

          <AdminSaveBar hint={previewPath ? `Saves the content of ${previewPath}` : "Pick a city and a special type to continue."}>
            <Button type="button" variant="outline" className={rSecondaryBtn} onClick={() => router.push(LIST_PATH)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className={rPrimaryBtn}>
              {mutation.isPending ? "Saving..." : id ? "Save changes" : "Create page"}
            </Button>
          </AdminSaveBar>
        </form>
      </Form>
    </FleetPage>
  );
};
