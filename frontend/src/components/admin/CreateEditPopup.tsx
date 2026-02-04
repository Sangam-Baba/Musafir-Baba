"use client";
import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/custom/loader";
import { title } from "process";
import page from "@/app/(user)/destinations/page";
import ImageUploader from "./ImageUploader";

const formSchema = z.object({
  button: z.object({
    title: z.string(),
    url: z.string().url(),
  }),
  title: z.string().optional(),
  description: z.string().optional(),
  coverImage: z.object({
    url: z.string().url(),
    alt: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
  }),
  page: z.enum(["home", "webpage"]).default("home"),
  status: z.enum(["published", "draft"]),
});

type FormData = z.infer<typeof formSchema>;

const createPopup = async (accessToken: string, form: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/popup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(form),
  });
  if (!res.ok) throw new Error("Popup creation failed");
  return res.json();
};

const updatePopup = async (accessToken: string, id: string, form: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/popup/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(form),
  });
  if (!res.ok) throw new Error("Coupan update failed");
  return res.json();
};

const getPopupbyId = async (accessToken: string, id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/popup/id/${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (!res.ok) throw new Error("Failed to fetch popup by Id");
  return res.json();
};

export const CreateEditPopup = ({
  onClose,
  id,
}: {
  onClose: () => void;
  id: string | null;
}) => {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
    defaultValues: {
      button: {
        title: "",
        url: "",
      },
      title: "",
      description: "",
      coverImage: {
        url: "",
        alt: "",
        width: 0,
        height: 0,
      },
      page: "home",
      status: "published",
    },
  });

  const {
    data,
    isLoading: CoupanLoading,
    isError: CoupanError,
  } = useQuery({
    queryKey: ["popup", id],
    queryFn: () => getPopupbyId(accessToken, id as string),
    enabled: !!id,
  });

  const coupan = data?.data;
  useEffect(() => {
    if (id && coupan) {
      form.reset({
        button: {
          title: coupan.button.title,
          url: coupan.button.url,
        },
        title: coupan.title,
        description: coupan.description,
        coverImage: {
          url: coupan.coverImage.url,
          alt: coupan.coverImage.alt,
          width: coupan.coverImage.width,
          height: coupan.coverImage.height,
        },
        page: coupan.page,
        status: coupan.status,
      });
    }
  }, [id, coupan]);

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      id
        ? updatePopup(accessToken, id, values)
        : createPopup(accessToken, values),
    onSuccess: (res) => {
      toast.success(
        id ? "Popup updated successfully!" : "Popup created successfully!",
      );
      queryClient.invalidateQueries({ queryKey: ["all-popups"] });
      onClose();
    },
    onError: (err) => toast.error(err.message || "Failed to create popup"),
  });

  function onSubmit(values: FormData) {
    console.log(values);
    mutation.mutate(values);
  }

  return (
    <div
      className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
        {id ? "Update Review" : "Create Review"}
      </h2>

      {/* <Form {...form}> */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Code and Type and Value */}
        <div className="grid grid-cols-2 gap-5 items-center">
          <FormField
            control={form.control}
            name="button.title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Button Title</FormLabel>
                <FormControl>
                  <Input placeholder="BABA100" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="button.url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Button URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-5 items-center">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Get 10% off on all bookings" {...field} />
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
                  <Input
                    placeholder="Enjoy discount on your order"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="coverImage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image</FormLabel>
              <FormControl>
                <ImageUploader
                  onUpload={(img) => {
                    if (!img) return;
                    form.setValue("coverImage", {
                      url: img?.url,
                      width: img?.width,
                      height: img?.height,
                      alt: img?.alt || "Popup Image",
                    });
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className=" grid grid-cols-2 gap-5">
          <FormField
            control={form.control}
            name="page"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Page</FormLabel>
                <FormControl>
                  <select
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="" disabled>
                      Select Page
                    </option>
                    <option value="home">Home</option>
                    <option value="webpage">Webpage</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <select
                    onChange={(e) => field.onChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="" disabled>
                      Select Status
                    </option>
                    <option value="published">Published</option>
                    <option value="draft">draft</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Submit and Close */}
        <div className="grid grid-cols-2 gap-5">
          <Button type="submit">Submit</Button>
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </form>
      {/* </Form> */}
      {mutation.isError && (
        <p className="text-red-500">{mutation.error.message}</p>
      )}
      {mutation.isSuccess && <p className="text-green-500">Success</p>}
    </div>
  );
};
