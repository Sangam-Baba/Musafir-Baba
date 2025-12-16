"use client";

import React, { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import ImageUploaderClient from "../custom/ImageUploaderClient";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  media: z.object({
    url: z.string().url(),
    public_id: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    alt: z.string().optional(),
  }),
});

type FormData = z.infer<typeof formSchema>;
const createDoc = async (accessToken: string, values: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/document`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      AUthorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(values),
  });

  if (!res.ok) throw new Error("Registration failed");
  return res.json();
};

const updateDoc = async (accessToken: string, values: FormData, id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/document/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        AUthorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(values),
    }
  );
  if (!res.ok) throw new Error("Registration failed");
  return res.json();
};

const getDocById = async (accessToken: string, id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/document/${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        AUthorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Registration failed");
  const data = await res.json();
  return data?.data;
};
function AddEditDoc({
  id,
  onClose,
}: {
  id?: string | null;
  onClose: () => void;
}) {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      media: {
        url: "",
        public_id: "",
        width: 0,
        height: 0,
        alt: "",
      },
    },
  });

  const { data } = useQuery({
    queryKey: ["doc", id],
    queryFn: () => id && getDocById(accessToken, id),
    enabled: !!id,
  });

  useEffect(() => {
    if (id && data) {
      form.setValue("name", data.name);
      form.setValue("media", data.media);
    }
  }, [data, form, id]);
  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      id ? updateDoc(accessToken, values, id) : createDoc(accessToken, values),
    onSuccess: () => {
      toast.success("Document created successfully");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      onClose();
    },
    onError: () => {
      toast.error("Failed to create document");
    },
  });
  function onSubmit(values: FormData) {
    {
      mutation.mutate(values);
    }
    console.log(values);
  }
  return (
    <div className="w-full mx-auto bg-white  max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-xl px-10 py-8 gap-5">
      <h1 className="text-2xl font-semibold">{id ? "Edit" : "Add"} Doucment</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document Name</FormLabel>
                <FormControl>
                  <select
                    onChange={field.onChange}
                    value={field.value}
                    className="block w-full rounded-md border border-gray-300 bg-white py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="" disabled>
                      Select Document
                    </option>
                    <option value="Adhar-card">Adhar Card</option>
                    <option value="Pan-card">Pan Card</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="media"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document (pdf or jpg)</FormLabel>
                <FormControl>
                  <ImageUploaderClient
                    initialImage={form.getValues("media") ?? null}
                    type="pdf"
                    onUpload={(img) => {
                      if (!img) return;
                      form.setValue("media", {
                        url: img.url,
                        public_id: img?.public_id,
                        width: img?.width,
                        height: img?.height,
                      });
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-center justify-around gap-4">
            <Button type="submit">{id ? "Update" : "Create"}</Button>
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          </div>
        </form>
        {mutation.isSuccess && (
          <p className="text-green-500">
            {id
              ? "Document updated successfully"
              : "Document created successfully"}
          </p>
        )}
        {mutation.isError && (
          <p className="text-red-500">
            {id ? "Failed to update document" : "Failed to create document"}
          </p>
        )}
      </Form>
    </div>
  );
}

export default AddEditDoc;
