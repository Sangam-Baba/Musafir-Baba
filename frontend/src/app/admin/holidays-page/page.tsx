"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Resolver } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { toast } from "sonner";
import dynamic from "next/dynamic";
const BlogEditor = dynamic(() => import("@/components/admin/BlogEditor"), {
  ssr: false,
});
import ImageUploader from "@/components/admin/ImageUploader";
import OpenGraphManager from "@/components/admin/OpenGraphManager";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader } from "@/components/custom/loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formSchema = z.object({
  heroTitle: z.string().optional(),
  heroImage: z
    .object({
      url: z.string().optional(),
      public_id: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      alt: z.string().optional(),
    })
    .optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  content: z.string().optional(),
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

const getHolidaysPage = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/holidays-page`);
  if (!res.ok) throw new Error("Failed to fetch holidays page settings");
  return (await res.json())?.data;
};

const saveHolidaysPage = async (values: FormData, token: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/holidays-page`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error("Failed to save holidays page settings");
  return res.json();
};

export default function HolidaysPageSettings() {
  const token = useAdminAuthStore((state) => state.accessToken) ?? "";
  const permissions = useAdminAuthStore((state) => state.permissions) as string[];
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
    defaultValues: {
      heroTitle: "",
      heroImage: { url: "", public_id: "", alt: "" },
      metaTitle: "",
      metaDescription: "",
      content: "",
      social: { twitter: { inheritOpenGraph: true } },
    },
  });

  const { data: holidaysPage, isLoading } = useQuery({
    queryKey: ["holidays-page"],
    queryFn: getHolidaysPage,
    enabled: permissions?.includes("holidays"),
  });

  useEffect(() => {
    if (holidaysPage) {
      form.reset({
        heroTitle: holidaysPage.heroTitle ?? "",
        heroImage: holidaysPage.heroImage ?? { url: "", public_id: "", alt: "" },
        metaTitle: holidaysPage.metaTitle ?? "",
        metaDescription: holidaysPage.metaDescription ?? "",
        content: holidaysPage.content ?? "",
        social: holidaysPage.social ?? { twitter: { inheritOpenGraph: true } },
      });
    }
  }, [holidaysPage, form]);

  const mutation = useMutation({
    mutationFn: (values: FormData) => saveHolidaysPage(values, token),
    onSuccess: () => {
      toast.success("Holidays page settings saved!");
      queryClient.invalidateQueries({ queryKey: ["holidays-page"] });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    },
  });

  const onSubmit = (values: FormData) => mutation.mutate(values);

  if (!permissions?.includes("holidays"))
    return <h1 className="text-2xl">Access Denied</h1>;

  if (isLoading) return <Loader size="lg" message="Loading..." />;

  return (
    <div className="max-w-5xl mx-auto p-4 min-h-screen bg-slate-50/10">
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-5 md:p-6 space-y-6">
          <div className="space-y-0.5 text-center">
            <h1 className="text-lg font-black text-slate-800 tracking-tight">
              Holidays Landing Page
            </h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">
              Controls /holidays — leave any field blank to keep the current default
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid grid-cols-3 w-full bg-slate-100/50 p-0.5 rounded-lg h-9 mb-6">
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
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">
                    Hero Heading
                  </Label>
                  <Input
                    {...form.register("heroTitle")}
                    placeholder='Leave blank to use "Holidays"'
                    className="h-9 bg-white border-slate-200 rounded-md text-[13px] font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">
                    Content
                  </Label>
                  <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                    <BlogEditor
                      value={form.watch("content")}
                      onChange={(val) => form.setValue("content", val)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Media & SEO Tab */}
              <TabsContent value="seo" forceMount className="space-y-6 data-[state=inactive]:hidden">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">
                    Hero Image
                  </Label>
                  <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <ImageUploader
                      initialImage={holidaysPage?.heroImage?.url ? holidaysPage.heroImage : undefined}
                      onUpload={(img) =>
                        form.setValue("heroImage", {
                          url: img?.url,
                          public_id: img?.public_id,
                          width: img?.width,
                          height: img?.height,
                          alt: img?.alt || form.getValues("heroTitle") || "Holidays",
                        })
                      }
                    />
                    {form.watch("heroImage")?.url && (
                      <Input
                        {...form.register("heroImage.alt")}
                        placeholder="Hero Image Alt Text"
                        className="mt-3 h-8 text-[11px] rounded-md bg-white border-slate-200"
                      />
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">
                      Meta Title
                    </Label>
                    <Input
                      {...form.register("metaTitle")}
                      placeholder="SEO Title"
                      className="h-9 rounded-md text-[13px]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-0.5">
                      Meta Description
                    </Label>
                    <Textarea
                      {...form.register("metaDescription")}
                      placeholder="SEO Description"
                      className="min-h-[36px] rounded-md text-[13px]"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Social (OG) Tab */}
              <TabsContent value="social" forceMount className="data-[state=inactive]:hidden">
                <OpenGraphManager
                  form={form}
                  moduleType="WEBPAGE"
                  baseMetadata={{
                    title: form.watch("metaTitle") || form.watch("heroTitle") || "Holidays",
                    description: form.watch("metaDescription") || "",
                    image: form.watch("heroImage")?.url || "https://musafirbaba.com/homebanner.webp",
                    imageAlt: form.watch("metaTitle") || form.watch("heroTitle") || "Holidays",
                  }}
                />
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-[#FE5300] hover:bg-[#FE5300]/90 text-white font-black uppercase tracking-widest h-9 px-8 rounded-lg shadow-md active:scale-[0.98] transition-all text-[11px]"
              >
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
