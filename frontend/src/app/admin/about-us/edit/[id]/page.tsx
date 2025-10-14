"use client";

import React, { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import ImageUploader from "@/components/admin/ImageUploader"; // ✅ your existing uploader
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface Image {
  url: string;
  alt: string;
  public_id?: string;
  width?: number;
  height?: number;
}

interface Content {
  title: string;
  description: string;
  image: Image;
}

interface FormValues {
  title: string;
  description: string;
  upperImage: Image[];
  lowerImage: Image[];
  coverImage: Image;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  h2title: string;
  h2description: string;
  h2content: Content[];
}

// ----------------- API CALL -----------------
const updateAboutUs = async (
  values: FormValues,
  accessToken: string,
  id: string
) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/aboutus/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error("Failed to create About Us");
  return res.json();
};

const getAboutUs = async (id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/aboutus/${id}`);
  if (!res.ok) throw new Error("Failed to get about us");
  const data = await res.json();
  return data?.data;
};

// ----------------- MAIN COMPONENT -----------------
function CreateAboutUsPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const accessToken = useAuthStore((state) => state.accessToken) as string;

  const defaultValues: FormValues = {
    title: "",
    description: "",
    upperImage: [],
    lowerImage: [],
    coverImage: { url: "", alt: "" },
    metaTitle: "",
    metaDescription: "",
    keywords: [],
    h2title: "",
    h2description: "",
    h2content: [],
  };

  const form = useForm<FormValues>({ defaultValues });

  const upperImageArray = useFieldArray({
    control: form.control,
    name: "upperImage",
  });
  const lowerImageArray = useFieldArray({
    control: form.control,
    name: "lowerImage",
  });
  const h2contentArray = useFieldArray({
    control: form.control,
    name: "h2content",
  });
  const { data } = useQuery({
    queryKey: ["aboutus", id],
    queryFn: () => getAboutUs(id),
  });

  useEffect(() => {
    if (data) {
      form.setValue("title", data.title);
      form.setValue("description", data.description);
      form.setValue("upperImage", data.upperImage);
      form.setValue("lowerImage", data.lowerImage);
      form.setValue("coverImage", data.coverImage);
      form.setValue("metaTitle", data.metaTitle);
      form.setValue("metaDescription", data.metaDescription);
      form.setValue("keywords", data.keywords);
      form.setValue("h2title", data.h2title);
      form.setValue("h2description", data.h2description);
      form.setValue("h2content", data.h2content);
    }
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => updateAboutUs(values, accessToken, id),
    onSuccess: () => {
      toast.success("About Us created successfully!");
    },
    onError: () => {
      toast.error("Something went wrong");
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">Edit About Us</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* TITLE */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter page title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* DESCRIPTION */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description*</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter main description"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* UPPER IMAGES */}
            <div>
              <FormLabel>Upper Images</FormLabel>
              {upperImageArray.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border rounded-md p-3 mb-3 space-y-2"
                >
                  <ImageUploader
                    initialImage={data?.upperImage[index]}
                    onUpload={(img) => {
                      if (!img) return;
                      form.setValue(`upperImage.${index}`, {
                        url: img.url,
                        public_id: img.public_id,
                        alt: form.getValues("title") ?? "",
                        width: img.width,
                        height: img.height,
                      });
                    }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => upperImageArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() => upperImageArray.append({ url: "", alt: "" })}
              >
                Add Upper Image
              </Button>
            </div>

            {/* LOWER IMAGES */}
            <div>
              <FormLabel>Lower Images</FormLabel>
              {lowerImageArray.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border rounded-md p-3 mb-3 space-y-2"
                >
                  <ImageUploader
                    initialImage={data?.lowerImage[index]}
                    onUpload={(img) => {
                      if (!img) return;
                      form.setValue(`lowerImage.${index}`, {
                        url: img.url,
                        public_id: img.public_id,
                        alt: form.getValues("title") ?? "",
                        width: img.width,
                        height: img.height,
                      });
                    }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => lowerImageArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() => lowerImageArray.append({ url: "", alt: "" })}
              >
                Add Lower Image
              </Button>
            </div>

            {/* COVER IMAGE */}
            <FormItem>
              <FormLabel>Cover Image</FormLabel>
              <FormControl>
                <ImageUploader
                  key={data?.coverImage?.url || "cover"}
                  initialImage={data?.coverImage}
                  onUpload={(img) => {
                    if (!img) return;
                    form.setValue("coverImage", {
                      url: img.url,
                      public_id: img.public_id,
                      alt: form.getValues("title") ?? "",
                      width: img.width,
                      height: img.height,
                    });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>

            {/* META DATA */}
            <FormField
              control={form.control}
              name="metaTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter meta title" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="Enter meta description" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      const value = e.currentTarget.value.trim();
                      if (value) {
                        const current = form.getValues("keywords") || [];
                        if (!current.includes(value)) {
                          form.setValue("keywords", [...current, value]);
                        }
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* H2 TITLE & DESCRIPTION */}
            <FormField
              control={form.control}
              name="h2title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>H2 Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter H2 title" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="h2description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>H2 Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter H2 description" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* H2 CONTENT BLOCKS */}
            <div>
              <FormLabel>H2 Content Blocks</FormLabel>
              {h2contentArray.fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border rounded-md p-4 mb-4 space-y-2"
                >
                  <Input
                    placeholder="Title"
                    {...form.register(`h2content.${index}.title`)}
                  />
                  <Textarea
                    placeholder="Description"
                    {...form.register(`h2content.${index}.description`)}
                  />
                  <ImageUploader
                    initialImage={data?.h2content?.[index]?.image}
                    onUpload={(img) => {
                      if (!img) return;
                      form.setValue(`h2content.${index}.image`, {
                        url: img.url,
                        public_id: img.public_id,
                        alt: form.getValues("title") ?? "",
                        width: img.width,
                        height: img.height,
                      });
                    }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => h2contentArray.remove(index)}
                  >
                    Remove Block
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() =>
                  h2contentArray.append({
                    title: "",
                    description: "",
                    image: { url: "", alt: "" },
                  })
                }
              >
                Add Content Block
              </Button>
            </div>

            <Button
              type="submit"
              className="w-full mt-4"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Creating..." : "Create About Us"}
            </Button>
          </form>
        </Form>

        {mutation.isError && (
          <p className="text-red-500 mt-3">Something went wrong!</p>
        )}
        {mutation.isSuccess && (
          <p className="text-green-500 mt-3">About Us updated successfully!</p>
        )}
      </div>
    </div>
  );
}

export default CreateAboutUsPage;
