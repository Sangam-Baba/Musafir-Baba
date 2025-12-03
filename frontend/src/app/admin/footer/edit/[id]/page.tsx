"use client";
import React, { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { Loader } from "@/components/custom/loader";

const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  content: z.array(
    z.object({
      text: z
        .string()
        .min(2, {
          message: "Content must be at least 2 characters.",
        })
        .optional(),
      url: z
        .string()
        .min(2, {
          message: "Url must be at least 2 characters.",
        })
        .optional(),
    })
  ),
});

type FormValues = z.infer<typeof formSchema>;

const getFooterById = async (id: string, token: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/footer/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to get footer");
  const data = await res.json();
  return data?.data;
};
const editFooter = async (values: FormValues, token: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/footer/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error("Failed to update footer");
  return res.json();
};
function UpdateFooter() {
  const id = useParams().id as string;
  const token = useAdminAuthStore((state) => state.accessToken) as string;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: [],
    },
  });

  const {
    data: footer,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["footer", id],
    queryFn: () => getFooterById(id as string, token),
  });

  useEffect(() => {
    if (footer) {
      form.setValue("title", footer.title);
      form.setValue("content", footer.content);
    }
  }, [footer, form]);

  const ContentArray = useFieldArray({
    control: form.control,
    name: "content",
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => editFooter(values, token, id),
    onSuccess: () => {
      toast.success("Footer updayted successfully");
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) return <Loader size="lg" message="Loading footer..." />;
  if (isError) return <h1>Failed to fetch footer</h1>;

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    mutation.mutate(data);
  };
  return (
    <div className="flex  items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">
          Update a Footer Item
        </h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Footer Title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel className="mb-2 text-lg">Items</FormLabel>
              {ContentArray.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-2 gap-2 mb-2">
                  <Input
                    {...form.register(`content.${index}.text`)}
                    placeholder="Text"
                  />
                  <Input
                    {...form.register(`content.${index}.url`)}
                    placeholder="Url"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => ContentArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() => ContentArray.append({ text: "", url: "" })}
              >
                Add Item
              </Button>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Creating..." : "Update Footer Item"}
            </Button>
          </form>
        </Form>
        {mutation.isError && (
          <p className="text-red-500">Somethings went wrong!</p>
        )}
        {mutation.isSuccess && (
          <p className="text-green-500">Item Updated successfully!</p>
        )}
      </div>
    </div>
  );
}

export default UpdateFooter;
