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
import { X } from "lucide-react";
import { Loader } from "@/components/custom/loader";

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
  destinationId: z.string().min(2, { message: "Destination is required." }),
  categoryId: z.string().min(2, { message: "Category is required." }),
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

const getDestinationSeo = async (accessToken: string, id: string) => {
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
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
    defaultValues: {
      metaTitle: "",
      metaDescription: "",
      keywords: [],
      destinationId: "",
      categoryId: "",
    },
  });

  const { data: destinationSeo, isLoading: destinationSeoLoading } = useQuery({
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
        destinationId: destinationSeo.destinationId,
        categoryId: destinationSeo.categoryId,
      });
    }
  }, [destinationSeo, form]);

  const { data: Category, isLoading: categoryLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(accessToken),
  });

  const { data: Destination, isLoading: destinationLoading } = useQuery({
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

  if (destinationSeoLoading || categoryLoading || destinationLoading)
    return <Loader size="lg" />;

  return (
    <div className="flex flex-col max-w-4xl items-center justify-center bg-gray-50 px-4 py-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">
        {id ? "Update" : "Create"} Destination Meta
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Selects */}
          <div className="grid md:grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full rounded-md border p-2">
                      <option value="">Select Category</option>
                      {Category?.map((cat: Category) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch("categoryId") && (
              <FormField
                control={form.control}
                name="destinationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full rounded-md border p-2"
                      >
                        <option value="">Select Destination</option>
                        {Destination?.map((d: Destination) => (
                          <option key={d._id} value={d._id}>
                            {d.state}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Inputs */}
          <FormField
            control={form.control}
            name="metaTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meta Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Meta title" />
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
                <FormLabel>Meta Description</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Meta description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Keywords input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Keywords</label>
            <div className="flex flex-wrap gap-2 border rounded p-2">
              {form.watch("keywords")?.map((kw, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 bg-gray-200 px-2 py-1 rounded-full text-sm"
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
                type="text"
                className="flex-1 min-w-[120px] border-none focus:ring-0 focus:outline-none"
                placeholder="Press Enter to add keyword"
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

          {/* Buttons */}
          <div className="flex flex-col gap-3">
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
      {mutation.isSuccess && toast.success("Destination Meta created")}
    </div>
  );
}

export default DestinationSeoNew;
