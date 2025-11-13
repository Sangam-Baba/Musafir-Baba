"use client";
import React, { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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

const getDestinations = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/destination`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch destinations");
  const data = await res.json();
  return data?.data;
};

const getCategories = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch categories");
  const data = await res.json();
  return data?.data;
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
const getDestinationSeo = async (accessToken: string, id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/destinationseo/${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch destination seo");
  const data = await res.json();
  return data?.data;
};
function DestinationSeo({ id }: { id?: string }) {
  const accessToken = useAuthStore((state) => state.accessToken) as string;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
    defaultValues: {
      metaTitle: "",
      metaDescription: "",
      keywords: [],
      destinationId: "",
      categoryId: "",
    },
  });

  const {
    data: destinationSeo,
    isLoading: destinationSeoLoading,
    isError: destinationSeoError,
    error: destinationSeoErrorMessage,
  } = useQuery({
    queryKey: ["destinationSeo"],
    queryFn: () => getDestinationSeo(accessToken, id as string),
    enabled: !!id,
  });

  useEffect(() => {
    if (destinationSeo) {
      form.setValue("metaTitle", destinationSeo.metaTitle);
      form.setValue("metaDescription", destinationSeo.metaDescription);
      form.setValue("keywords", destinationSeo.keywords);
      form.setValue("destinationId", destinationSeo.destinationId);
      form.setValue("categoryId", destinationSeo.categoryId);
    }
  }, [destinationSeo, form, id]);
  const {
    data: Category,
    isLoading: categoryLoading,
    isError: categoryError,
    error: categoryErrorMessage,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: () => getCategories(accessToken),
  });
  const {
    data: Destination,
    isLoading: destinationLoading,
    isError: destinationError,
    error: destinationErrorMessage,
  } = useQuery({
    queryKey: ["destinations"],
    queryFn: () => getDestinations(accessToken),
  });
  const mutation = useMutation({
    mutationFn: (values: FormData) => createDestinationSeo(accessToken, values),
    onSuccess: () => {
      return toast.success("Destination Seo created successfully!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (values: FormData) => {
    mutation.mutate(values);
  };
  if (categoryError || destinationError || destinationSeoError)
    return (
      <p>
        {categoryErrorMessage?.message ||
          destinationErrorMessage?.message ||
          destinationSeoErrorMessage?.message}
      </p>
    );
  return (
    <div className="flex flex-col max-w-4xl items-center justify-center bg-gray-50 px-4 py-6 sm:px-6 lg:px-8 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">
        {id ? "Update" : "Create"} Destination Seo
      </h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Category and Destination SELECTION */}
          <div className="grid md:grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded-md border p-2"
                      onChange={(e) => {
                        form.setValue("categoryId", e.target.value);
                      }}
                    >
                      <option value="">Select Package</option>
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
                      onChange={(e) => {
                        form.setValue("destinationId", e.target.value);
                      }}
                    >
                      <option value="">Select Destination</option>
                      {Destination?.map((cat: Destination) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.state}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* titile */}
          <FormField
            control={form.control}
            name="metaTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Meta Title</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    {...field}
                    placeholder="This is Meta Title"
                  />
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
                  <Input
                    type="text"
                    {...field}
                    placeholder="This is Meta Title"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* keywords */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Keywords</label>
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
          {/* SUBMIT */}
          <Button
            type="submit"
            disabled={
              mutation.isPending || categoryLoading || destinationLoading
            }
            className="w-full mt-4 bg-[#FE5300] hover:bg-[#FE5300]/80"
          >
            {mutation.isPending ? "Submitting..." : "Submit"}
          </Button>
        </form>
      </Form>

      {mutation.isSuccess && (
        <p className="text-green-600 mt-2 text-center">✅ Meta Data Created</p>
      )}
      {mutation.isError && (
        <p className="text-red-600 mt-2 text-center">
          ❌ {mutation.error?.message}
        </p>
      )}
    </div>
  );
}

export default DestinationSeo;
