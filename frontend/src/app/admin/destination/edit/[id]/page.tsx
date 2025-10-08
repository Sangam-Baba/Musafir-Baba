"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import ImageUploader from "@/components/admin/ImageUploader";
import CloudinaryMediaLibrary from "@/components/admin/CloudinaryMediaLibrary";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import { useEffect } from "react";

interface Destination {
  name: string;
  description: string;
  country: string;
  state: string;
  city: string;
  coverImage: {
    url: string;
    public_id: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  gallery: {
    url: string;
    public_id: string;
    width?: number;
    height?: number;
    alt?: string;
  }[];
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  status: "draft" | "published" | "archived";
  popularAttractions: string[];
  thingsToDo: string[];
}

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  description: z
    .string()
    .min(2, { message: "Description must be at least 2 characters." }),
  country: z
    .string()
    .min(2, { message: "Country must be at least 2 characters." }),
  state: z.string().min(2, { message: "State must be at least 2 characters." }),
  city: z.string().min(2, { message: "City must be at least 2 characters." }),
  coverImage: z
    .object({
      url: z.string().url(),
      public_id: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      alt: z.string().optional(),
    })
    .optional(),
  gallery: z
    .array(
      z.object({
        url: z.string().url(),
        public_id: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
        alt: z.string().optional(),
      })
    )
    .optional(),
  metaTitle: z
    .string()
    .min(2, { message: "Meta Title must be at least 2 characters." }),
  metaDescription: z
    .string()
    .min(2, { message: "Meta Description must be at least 2 characters." }),
  keywords: z
    .preprocess(
      (val) =>
        typeof val === "string"
          ? val
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
          : [],
      z.array(z.string())
    )
    .optional(),
  popularAttractions: z
    .preprocess(
      (val) =>
        typeof val === "string"
          ? val
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
          : [],
      z.array(z.string())
    )
    .optional(),
  thingsToDo: z
    .preprocess(
      (val) =>
        typeof val === "string"
          ? val
              .split(",")
              .map((k) => k.trim())
              .filter(Boolean)
          : [],
      z.array(z.string())
    )
    .optional(),
  status: z.enum(["draft", "published", "archived"]),
});

const update = async (
  values: z.infer<typeof formSchema>,
  token: string,
  id: string
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/destination/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
      body: JSON.stringify(values),
    }
  );
  if (!res.ok) throw new Error("Failed to update destination");
  return res.json();
};

const getDestination = async (
  token: string,
  id: string
): Promise<Destination> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/destination/${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("Failed to get destination");
  const data = await res.json();
  return data?.data.destination;
};

export default function EditDestination() {
  const accessToken: string = useAuthStore((state) => state.accessToken) || "";
  const { id } = useParams() as { id: string };

  const { data: destination, isLoading } = useQuery<Destination>({
    queryKey: ["destination", id],
    queryFn: () => getDestination(accessToken, id),
    staleTime: 1000 * 60,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      country: "",
      state: "",
      city: "",
      metaTitle: "",
      metaDescription: "",
      keywords: [],
      popularAttractions: [],
      thingsToDo: [],
      status: "draft",
    },
  });

  useEffect(() => {
    if (destination) {
      form.reset(destination); // simpler than calling setValue for each field
    }
  }, [destination, form]);

  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) =>
      update(values, accessToken, id),
    onSuccess: () => {
      toast.success("Destination updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update destination");
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!values.coverImage?.url) {
      delete values.coverImage;
    }
    mutation.mutate(values);
  }

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="max-w-5xl mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md">
      <h1 className="text-2xl font-bold mb-6">Edit Destination</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* name, description, country, etc */}
        <label className="block font-medium mb-2">Name</label>
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
        <label className="block font-medium mb-2">Description</label>
        <textarea
          {...form.register("description")}
          placeholder="Description"
          className="w-full border rounded p-2"
        />
        <label className="block font-medium mb-2">Country Name</label>
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
        <label className="block font-medium mb-2">State</label>
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
        <label className="block font-medium mb-2">City</label>
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
        <label className="block font-medium mb-2">Popular Attractions</label>
        <input
          {...form.register("popularAttractions")}
          placeholder="Popular Attractions (comma separated)"
          className="w-full border rounded p-2"
        />
        <label className="block font-medium mb-2">Things to do</label>
        <input
          {...form.register("thingsToDo")}
          placeholder="Things to do (comma separated)"
          className="w-full border rounded p-2"
        />
        <label className="block font-medium mb-2">Meta Title</label>
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
        <label className="block font-medium mb-2">Meta Description</label>
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
        <label className="block font-medium mb-2">Keywords</label>
        <input
          {...form.register("keywords")}
          placeholder="Keywords (comma separated)"
          className="w-full border rounded p-2"
        />

        <div className="space-y-2">
          <ImageUploader
            initialImage={form.getValues("coverImage")}
            onUpload={(img) =>
              form.setValue(
                "coverImage",
                img
                  ? {
                      url: img.url,
                      public_id: img.public_id,
                      width: img.width,
                      height: img.height,
                      alt: form.getValues("name") || "Cover Image",
                    }
                  : undefined
              )
            }
          />

          <CloudinaryMediaLibrary
            onSelect={(img) =>
              form.setValue("coverImage", {
                url: img.url,
                public_id: img.public_id,
                alt: form.getValues("name") || "Cover Image",
              })
            }
          />
        </div>
        <label className="block font-medium mb-2">Image Alt tag</label>
        <input
          {...form.register("coverImage.alt")}
          placeholder="Cover Image Alt"
          className="w-full border rounded p-2"
        />
        <label className="block font-medium mb-2">Status</label>
        <select
          {...form.register("status")}
          className="w-full border rounded p-2"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>

        <Button type="submit">
          {mutation.isPending ? "Updating..." : "Update Destination"}
        </Button>
      </form>
      {mutation.isError && (
        <p className="text-red-500">{mutation.error.message}</p>
      )}
      {mutation.isSuccess && (
        <p className="text-green-500">Destination updated successfully!</p>
      )}
    </div>
  );
}
