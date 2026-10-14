"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Resolver } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { toast } from "sonner";
import ImageUploader from "@/components/admin/ImageUploader";
import { Button } from "@/components/ui/button";
import { schemaTypes } from "@/lib/schemaTypes";
import BlogEditor from "@/components/admin/BlogEditor";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Image as ImageIcon, Info, Loader2, Save, Search, Sparkles } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { FleetPage, FleetPanel, fleetSelectClass } from "@/components/admin/fleet/FleetUI";
import { DestinationHubHeader } from "@/components/admin/destination/DestinationHub";
import {
  FaqEditor,
  Field,
  FormTabsList,
  TagInput,
  dInput,
  dSelectMultiple,
  dTextarea,
  firstErrorTab,
} from "@/components/admin/destination/FormBits";
import {
  DESTINATION_FIELD_TABS,
  DESTINATION_TAB_ORDER,
  DESTINATION_TABS,
  type DestinationFormTab,
} from "@/components/admin/destination/destinationFormTabs";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().min(2, {
    message: "Description must be at least 2 characters.",
  }),
  content: z.string().optional(),
  country: z.string().min(2, {
    message: "Country must be at least 2 characters.",
  }),
  state: z.string().min(2, {
    message: "State must be at least 2 characters.",
  }),
  city: z.string().min(2, {
    message: "City must be at least 2 characters.",
  }),
  coverImage: z
    .object({
      url: z.string().url().optional(),
      public_id: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      alt: z.string().optional(),
    })
    .optional(),
  gallery: z
    .array(
      z.object({
        url: z.string().url().optional(),
        public_id: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
        alt: z.string().optional(),
      })
    )
    .optional(),
  metaTitle: z.string().min(2, {
    message: "Meta Title must be at least 2 characters.",
  }),
  metaDescription: z.string().min(2, {
    message: "Meta Description must be at least 2 characters.",
  }),
  schemaType: z.array(z.string()).optional(),
  keywords: z
    .array(z.string())

    .optional(),
  popularAttractions: z.array(z.string()).optional(),
  thingsToDo: z
    .array(z.string())

    .optional(),
  faqSchema: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .optional(),
  status: z.enum(["draft", "published", "archived"]),
});
const create = async (values: z.infer<typeof formSchema>, token: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/destination`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error("Failed to create destination");
  return res.json().then((data) => {
    console.log(data);
  });
};

export default function CreateDestination() {
  const accessToken: string =
    useAdminAuthStore((state) => state.accessToken) || "";
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as Resolver<z.infer<typeof formSchema>>,
    defaultValues: {
      name: "",
      description: "",
      content: "",
      country: "",
      state: "",
      city: "",
      gallery: [],
      metaTitle: "",
      metaDescription: "",
      schemaType: [],
      keywords: [],
      popularAttractions: [],
      thingsToDo: [],
      faqSchema: [],
      status: "draft",
    },
  });
  const faqArray = useFieldArray({ control: form.control, name: "faqSchema" });

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) =>
      create(values, accessToken),
    onSuccess: () => {
      form.reset();
      toast.success("Destination created successfully!");
    },
    onError: (error) => {
      toast.error("Failed to create destination");
      console.error(error);
    },
  });
  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!values.coverImage?.url) {
      delete values.coverImage;
    }
    mutation.mutate(values);
  }

  // UI only: when validation fails, jump to the first tab with an error.
  const [tab, setTab] = useState<DestinationFormTab>("basic");
  const errors = form.formState.errors;
  const onInvalid = (errs: Record<string, unknown>) => {
    const target = firstErrorTab(errs, DESTINATION_FIELD_TABS, DESTINATION_TAB_ORDER);
    if (target) setTab(target as DestinationFormTab);
    toast.error("Please fix the highlighted fields");
  };

  return (
    <FleetPage>
      <DestinationHubHeader
        active="destinations"
        title="Create Destination"
        description="Add a new destination. It powers /destinations/{slug} and appears in package forms once published."
        hideTabs
        actions={
          <Button variant="outline" onClick={() => router.push("/admin/destination")} className="h-8 text-[12px]">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to destinations
          </Button>
        }
      />
      <form onSubmit={form.handleSubmit((values) => onSubmit(values), onInvalid)}>
        <Tabs value={tab} onValueChange={(v) => setTab(v as DestinationFormTab)} className="w-full min-w-0 gap-4">
          <FormTabsList
            tabs={DESTINATION_TABS.map((t) => ({
              ...t,
              hasError: Object.keys(errors).some((k) => DESTINATION_FIELD_TABS[k] === t.value),
            }))}
          />

          {/* Basic Detail */}
          <TabsContent value="basic" forceMount className="data-[state=inactive]:hidden">
            <FleetPanel title="Basic details" description="Name, location and the main page copy." icon={Info} bodyClassName="space-y-4 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name" error={errors.name?.message}>
                  <input {...form.register("name")} placeholder="Name" className={dInput} />
                </Field>
                <Field label="Status">
                  <select {...form.register("status")} className={`${fleetSelectClass} h-9 w-full`}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </Field>
                <Field label="Country" error={errors.country?.message}>
                  <input {...form.register("country")} placeholder="Country" className={dInput} />
                </Field>
                <Field label="State" hint="Also used as the page URL slug." error={errors.state?.message}>
                  <input {...form.register("state")} placeholder="State" className={dInput} />
                </Field>
                <Field label="City" error={errors.city?.message}>
                  <input {...form.register("city")} placeholder="City" className={dInput} />
                </Field>
              </div>
              <Field label="Description" hint="Shown under the page heading." error={errors.description?.message}>
                <textarea {...form.register("description")} placeholder="Description" className={dTextarea} />
              </Field>
              <Field label="Content">
                <div className="rounded-md border border-slate-200 p-2">
                  <BlogEditor
                    value={form.getValues("content")}
                    onChange={(val) => form.setValue("content", val)}
                  />
                </div>
              </Field>
            </FleetPanel>
          </TabsContent>

          {/* Highlights */}
          <TabsContent value="highlights" forceMount className="data-[state=inactive]:hidden">
            <FleetPanel title="Highlights" description="Popular attractions and things to do." icon={Sparkles} bodyClassName="space-y-4 p-4">
              <Field label="Popular Attractions">
                <TagInput
                  values={form.watch("popularAttractions")}
                  onChange={(v) => form.setValue("popularAttractions", v)}
                />
              </Field>
              <Field label="Things to Do">
                <TagInput values={form.watch("thingsToDo")} onChange={(v) => form.setValue("thingsToDo", v)} />
              </Field>
            </FleetPanel>
          </TabsContent>

          {/* Media & SEO */}
          <TabsContent value="seo" forceMount className="data-[state=inactive]:hidden">
            <div className="grid gap-4 lg:grid-cols-2">
              <FleetPanel title="Cover image" description="Banner shown on the destination page." icon={ImageIcon} bodyClassName="space-y-4 p-4">
                <ImageUploader
                  onUpload={(img) =>
                    form.setValue(
                      "coverImage",
                      img
                        ? {
                            url: img.url,
                            public_id: img.public_id,
                            width: img.width,
                            height: img.height,
                            alt: img.alt ?? form.getValues("name"),
                          }
                        : undefined
                    )
                  }
                />
                {errors.coverImage && (
                  <p className="text-[11px] font-medium text-red-600">{errors.coverImage.message}</p>
                )}
                <Field label="Cover Image Alt">
                  <input {...form.register("coverImage.alt")} placeholder="Cover Image Alt" className={dInput} />
                </Field>
              </FleetPanel>
              <FleetPanel title="Search engine" description="Meta tags for /destinations/{slug}." icon={Search} bodyClassName="space-y-4 p-4">
                <Field label="Meta Title" error={errors.metaTitle?.message}>
                  <input {...form.register("metaTitle")} placeholder="Meta Title" className={dInput} />
                </Field>
                <Field label="Meta Description" error={errors.metaDescription?.message}>
                  <textarea {...form.register("metaDescription")} placeholder="Meta Description" className={dTextarea} />
                </Field>
                <Field label="Keywords">
                  <TagInput values={form.watch("keywords")} onChange={(v) => form.setValue("keywords", v)} />
                </Field>
                <Field label="Schema Type" hint="Hold Cmd/Ctrl to select multiple.">
                  <select multiple {...form.register("schemaType")} className={dSelectMultiple}>
                    {schemaTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
              </FleetPanel>
            </div>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq" forceMount className="data-[state=inactive]:hidden">
            <FaqEditor
              fields={faqArray.fields}
              onAdd={() => faqArray.append({ question: "", answer: "" })}
              onRemove={(i) => faqArray.remove(i)}
              questionProps={(i) => form.register(`faqSchema.${i}.question`)}
              answerProps={(i) => form.register(`faqSchema.${i}.answer`)}
            />
          </TabsContent>
        </Tabs>

        <div className="mt-4 flex flex-col-reverse gap-2 rounded-lg border border-slate-200/80 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[12px]">
            {mutation.isError && <p className="text-red-600">{mutation.error.message}</p>}
            {mutation.isSuccess && <p className="text-emerald-600">Destination created successfully!</p>}
          </div>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="h-9 bg-[#FE5300] text-[12px] hover:bg-[#e54b00]"
          >
            {mutation.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            {mutation.isPending ? "Creating..." : "Create Destination"}
          </Button>
        </div>
      </form>
    </FleetPage>
  );
}
