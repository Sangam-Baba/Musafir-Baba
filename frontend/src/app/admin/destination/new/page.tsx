"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Resolver } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { toast } from "sonner";
import ImageUploader from "@/components/admin/ImageUploader";
import { Button } from "@/components/ui/button";
import { schemaTypes } from "@/lib/schemaTypes";
import BlogEditor from "@/components/admin/BlogEditor";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

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
      status: "draft",
    },
  });

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

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-6">Create Destination</h1>
      <form
        onSubmit={form.handleSubmit((values) => onSubmit(values))}
        className="space-y-6"
      >
        <div className="space-y-2">
          <label htmlFor="name">Name</label>
          <input
            {...form.register("name")}
            placeholder="Name"
            className="w-full border rounded p-2"
          />

          {form.formState.errors.name && (
            <p className="text-red-500 text-sm">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="description">Description</label>
          <textarea
            {...form.register("description")}
            placeholder="Description"
            className="w-full border rounded p-2"
          />
          {form.formState.errors.description && (
            <p className="text-red-500 text-sm">
              {form.formState.errors.description.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="content">Content</label>
          <div className="border rounded p-2">
            <BlogEditor
              value={form.getValues("content")}
              onChange={(val) => form.setValue("content", val)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="country">Country</label>
          <input
            {...form.register("country")}
            placeholder="Country"
            className="w-full border rounded p-2"
          />
          {form.formState.errors.country && (
            <p className="text-red-500 text-sm">
              {form.formState.errors.country.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="state">State</label>
          <input
            {...form.register("state")}
            placeholder="State"
            className="w-full border rounded p-2"
          />
          {form.formState.errors.state && (
            <p className="text-red-500 text-sm">
              {form.formState.errors.state.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="city">City</label>
          <input
            {...form.register("city")}
            placeholder="City"
            className="w-full border rounded p-2"
          />
          {form.formState.errors.city && (
            <p className="text-red-500 text-sm">
              {form.formState.errors.city.message}
            </p>
          )}
        </div>
        {/* PopularAttractions */}
        <div className="space-y-2">
          <Label className="block text-sm font-medium">
            Popular Attraction
          </Label>
          <div className="flex flex-wrap gap-2 border rounded p-2">
            {form.watch("popularAttractions")?.map((kw, i) => (
              <span
                key={i}
                className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full text-sm"
              >
                {kw}
                <button
                  type="button"
                  onClick={() => {
                    const newKeywords = form
                      .getValues("popularAttractions")
                      ?.filter((_, idx) => idx !== i);
                    form.setValue("popularAttractions", newKeywords);
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
                  form.setValue("popularAttractions", [
                    ...(form.getValues("popularAttractions") || []),
                    ...arr,
                  ]);
                  e.target.value = "";
                }
              }}
            />
          </div>
        </div>
        {/* Things to DO */}
        <div className="space-y-2">
          <Label className="block text-sm font-medium">Things to Do</Label>
          <div className="flex flex-wrap gap-2 border rounded p-2">
            {form.watch("thingsToDo")?.map((kw, i) => (
              <span
                key={i}
                className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full text-sm"
              >
                {kw}
                <button
                  type="button"
                  onClick={() => {
                    const newKeywords = form
                      .getValues("thingsToDo")
                      ?.filter((_, idx) => idx !== i);
                    form.setValue("thingsToDo", newKeywords);
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
                  form.setValue("thingsToDo", [
                    ...(form.getValues("thingsToDo") || []),
                    ...arr,
                  ]);
                  e.target.value = "";
                }
              }}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="description">Meta Title</label>
          <input
            {...form.register("metaTitle")}
            placeholder="Meta Title"
            className="w-full border rounded p-2"
          />
          {form.formState.errors.metaTitle && (
            <p className="text-red-500 text-sm">
              {form.formState.errors.metaTitle.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="description">Meta Description</label>
          <textarea
            {...form.register("metaDescription")}
            placeholder="Meta Description"
            className="w-full border rounded p-2"
          />
          {form.formState.errors.metaDescription && (
            <p className="text-red-500 text-sm">
              {form.formState.errors.metaDescription.message}
            </p>
          )}
        </div>
        <div>
          <label className="font-semibold">Schema Type</label>
          <select
            multiple
            {...form.register("schemaType")}
            className="w-full border rounded-lg p-2"
          >
            {schemaTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        {/* keywords */}
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
        <div className="space-y-2">
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
          {form.formState.errors.coverImage && (
            <p className="text-red-500 text-sm">
              {form.formState.errors.coverImage.message}
            </p>
          )}
        </div>
        <input
          {...form.register("coverImage.alt")}
          placeholder="Cover Image Alt"
          className="w-full border rounded p-2"
        />
        <select
          {...form.register("status")}
          className="w-full border rounded p-2"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creating..." : "Create Destination"}
        </Button>
      </form>
      {mutation.isError && (
        <p className="text-red-500 text-sm">{mutation.error.message}</p>
      )}
      {mutation.isSuccess && (
        <p className="text-green-500 text-sm">
          Destination created successfully!
        </p>
      )}
    </div>
  );
}
