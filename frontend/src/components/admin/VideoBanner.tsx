"use client";
import React, { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/store/useAuthStore";
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
import { Loader } from "@/components/custom/loader";
import ImageUploader, { UploadedFile } from "./ImageUploader";

const formSchema = z.object({
  media: z.object({
    url: z.string(),
    public_id: z.string().optional(),
    alt: z.string().optional(),
    resource_type: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    thumbnail_url: z.string().optional(),
  }),
  link: z.string().min(2, { message: "Link is required." }),
  title: z.string().optional(),
  description: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  related: z.enum(["tour", "visa", "about"]),
  type: z.enum(["video", "image"]),
});

type FormData = z.infer<typeof formSchema>;

const getVideoBanner = async (accessToken: string, id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/videobanner/${id}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch video banner");
  return (await res.json())?.data;
};

const createVideoBanner = async (accessToken: string, values: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/videobanner`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error("Failed to create video banner");
  return res.json();
};

const updateVideoBanner = async (
  accessToken: string,
  values: FormData,
  id: string
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/videobanner/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(values),
    }
  );
  if (!res.ok) throw new Error("Failed to update video banner");
  return res.json();
};

function VideoBanner({
  id,
  onClose,
  onSuccess,
}: {
  id?: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
    defaultValues: {
      media: {
        url: "",
        public_id: "",
        alt: "",
        width: 0,
        height: 0,
        thumbnail_url: "",
        resource_type: "video",
      },
      link: "",
      metaTitle: "",
      metaDescription: "",
      related: "tour",
      type: "video",
    },
  });

  const { data: videoBanner, isLoading: videoBannerLoading } = useQuery({
    queryKey: ["videoBanner", id],
    queryFn: () => getVideoBanner(accessToken, id as string),
    enabled: !!id,
  });

  useEffect(() => {
    if (videoBanner) {
      form.reset({
        media: {
          url: videoBanner.media.url,
          alt: videoBanner.media.alt,
          public_id: videoBanner.media.public_id,
          width: videoBanner.media.width,
          height: videoBanner.media.height,
          thumbnail_url: videoBanner.media.thumbnail_url || null,
          resource_type: videoBanner.media.resource_type || "video",
        },
        link: videoBanner.link,
        title: videoBanner.title,
        description: videoBanner.description,
        metaTitle: videoBanner.metaTitle,
        metaDescription: videoBanner.metaDescription,
        related: videoBanner.related,
        type: videoBanner.type,
      });
    }
  }, [videoBanner, form]);

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      id
        ? updateVideoBanner(accessToken, values, id)
        : createVideoBanner(accessToken, values),
    onSuccess: () => {
      toast.success(
        id
          ? "Video Banner updated successfully!"
          : "Video Banner  created successfully!"
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

  if (videoBannerLoading) return <Loader size="lg" />;

  return (
    <div className="flex flex-col max-w-4xl items-center justify-center bg-gray-50 px-4 py-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">
        {id ? "Update" : "Create"} Video Banner
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar */}
          <div className="flex flex-col md:flex-row gap-4">
            <FormField
              control={form.control}
              name="media"
              render={() => (
                <FormItem>
                  <FormLabel>Media</FormLabel>
                  <FormControl>
                    <ImageUploader
                      initialImage={form.getValues("media") as UploadedFile}
                      onUpload={(img) => {
                        if (!img) return;
                        form.setValue("media", {
                          url: img ? img.url : "",
                          public_id: img ? img.public_id : "",
                          width: img ? img.width : 0,
                          resource_type: img.resource_type ?? "image",
                          height: img ? img.height : 0,
                          thumbnail_url: img.thumbnail_url ?? "",
                          alt:
                            form.getValues("media.alt") ??
                            "Musafirbaba Tour Packgaes",
                        });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="media.alt"
              render={() => (
                <FormItem>
                  <FormLabel>Media Alt</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Media Alt"
                      {...form.register("media.alt")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="link"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Link</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Link" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Inputs */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-5">
            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full rounded-md border p-2">
                      <option value="">Select Type</option>

                      <option key="video" value="video">
                        Video
                      </option>
                      <option key="image" value="image">
                        Image
                      </option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Related */}
            <FormField
              control={form.control}
              name="related"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full rounded-md border p-2">
                      <option value="">Select Related</option>

                      <option key="tour" value="tour">
                        Tour
                      </option>
                      <option key="visa" value="visa">
                        Visa
                      </option>
                      <option key="about" value="about">
                        About
                      </option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-5">
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-[#FE5300] hover:bg-[#FE5300]/80"
            >
              {mutation.isPending ? "Submitting..." : "Submit"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-gray-400"
            >
              Close
            </Button>
          </div>
        </form>
      </Form>
      {mutation.isError && toast.error(mutation.error.message)}
      {mutation.isSuccess && toast.success("Video Banner created")}
    </div>
  );
}

export default VideoBanner;
