"use client";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { ExternalLink, Layers, Plus, Trash2 } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { rentalSlug } from "@/lib/rentalUrl";

// "City + Type Page": content for /rental/{city}/{type}, e.g.
// /rental/delhi/traveller. Built on the shared admin form UI (Packages style).

const LIST_PATH = "/admin/rental-city-pages";

export const rentalCityPageSchema = z.object({
  location: z.string().min(1, "Please select a destination"),
  vehicleType: z.string().min(1, "Please select a vehicle type"),
  status: z.enum(["active", "inactive"]).default("active"),
  title: z.string().optional(),
  bannerImage: z
    .object({
      url: z.string().url("Invalid image URL"),
      alt: z.string().optional(),
    })
    .optional()
    .nullable(),
  content: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  keywords: z.any().optional(), // array, or comma-separated string while typing
  faqs: z
    .array(
      z.object({
        question: z.string().min(1, "FAQ question required"),
        answer: z.string().min(1, "FAQ answer required"),
      }),
    )
    .optional(),
});

type FormData = z.infer<typeof rentalCityPageSchema>;

interface Option {
  _id: string;
  name: string;
  slug?: string;
  status?: string;
}


const authFetch = async (accessToken: string, path: string, init: RequestInit = {}) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.message || "Request failed");
  return body;
};

// Same slug rule as the public URLs
const slugOf = (o?: Option) => rentalSlug(o?.slug) || rentalSlug(o?.name);

export const CreateEditRentalCityPage = ({ id }: { id: string | null }) => {
  const router = useRouter();
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(rentalCityPageSchema) as Resolver<FormData>,
    defaultValues: {
      location: "",
      vehicleType: "",
      status: "active",
      title: "",
      bannerImage: null,
      content: "",
      metaTitle: "",
      metaDescription: "",
      keywords: [],
      faqs: [],
    },
  });
  const faqs = useFieldArray({ control: form.control, name: "faqs" });

  const { data: destinationsRes } = useQuery<{ data: Option[] }>({
    queryKey: ["master-data", "pickup-destination", "all"],
    queryFn: () => authFetch(accessToken, "/master-data/pickup-destination?all=true"),
  });
  const { data: typesRes } = useQuery<{ data: Option[] }>({
    queryKey: ["master-data", "type", "all"],
    queryFn: () => authFetch(accessToken, "/master-data/type?all=true"),
  });
  const destinations = destinationsRes?.data ?? [];
  const types = typesRes?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ["rental-city-page", id],
    queryFn: () => authFetch(accessToken, `/rental-city-page/${id}`),
    enabled: !!id,
  });
  const pageData = data?.data;

  useEffect(() => {
    if (id && pageData) {
      form.reset({
        location: String(pageData.location ?? ""),
        vehicleType: String(pageData.vehicleType ?? ""),
        status: pageData.status || "active",
        title: pageData.title || "",
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
    mutationFn: (values: FormData) =>
      id
        ? authFetch(accessToken, `/rental-city-page/${id}`, { method: "PATCH", body: JSON.stringify(values) })
        : authFetch(accessToken, "/rental-city-page", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      toast.success(id ? "City + type page updated" : "City + type page created");
      queryClient.invalidateQueries({ queryKey: ["rental-city-page"] });
      router.push(LIST_PATH);
    },
    onError: (err) => toast.error(err.message || "Failed to save"),
  });

  if (isLoading && id) return <Loader size="lg" />;

  function onSubmit(values: FormData) {
    mutation.mutate({
      ...values,
      keywords:
        typeof values.keywords === "string"
          ? (values.keywords as string).split(",").map((k) => k.trim()).filter(Boolean)
          : values.keywords,
    });
  }

  const keywordsValue = form.watch("keywords");
  const keywordsString = Array.isArray(keywordsValue) ? keywordsValue.join(", ") : keywordsValue;

  // Live preview of the page this edits
  const selectedLoc = destinations.find((d) => d._id === form.watch("location"));
  const selectedType = types.find((t) => t._id === form.watch("vehicleType"));
  const previewPath =
    selectedLoc && selectedType ? `/rental/${slugOf(selectedLoc)}/${slugOf(selectedType)}` : null;

  return (
    <FleetPage className="gap-4">
      <RentalPageHeader
        icon={Layers}
        title={id ? "Edit City + Type Page" : "Create City + Type Page"}
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
            "Pick a city and a vehicle type: this page's heading, text, banner, SEO and FAQs."
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
                    name="vehicleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={rLabel}>Vehicle type *</FormLabel>
                        <FormControl>
                          <select {...field} className={dInput}>
                            <option value="" disabled>Select vehicle type</option>
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
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={rLabel}>Page heading (H1)</FormLabel>
                      <FormControl>
                        <input
                          placeholder={
                            selectedLoc && selectedType
                              ? `Automatic: ${selectedType.name} Rental in ${selectedLoc.name}`
                              : "e.g. Traveller Rental in Delhi"
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
                              field.onChange({
                                url: img.url,
                                alt: img.alt || form.getValues("title") || "",
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
              </CityTypeTabPanel>
            </TabsContent>

            <TabsContent value="faqs" forceMount className="data-[state=inactive]:hidden">
              <CityTypeTabPanel tab="faqs">
                {faqs.fields.length === 0 && (
                  <p className="text-[12px] text-slate-500">No FAQs yet.</p>
                )}
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
                          placeholder="e.g. tempo traveller rental delhi"
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

          <AdminSaveBar hint={previewPath ? `Saves the content of ${previewPath}` : "Pick a city and a vehicle type to continue."}>
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
