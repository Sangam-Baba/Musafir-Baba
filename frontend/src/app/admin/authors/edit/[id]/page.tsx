"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { toast } from "sonner";
import ImageUploader from "@/components/admin/ImageUploader";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { useParams } from "next/navigation";
import { Loader } from "lucide-react";
import { useEffect } from "react";

interface AuthorFormValues {
  _id: string;
  name: string;
  email: string;
  about?: string;
  role: "author" | "editor";
  avatar?: {
    url: string;
    public_id: string;
    alt: string;
  };
}

const getAuthor = async (id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/authors/id/${id}`
  );
  const data = await res.json();
  return data?.data;
};

async function updateAuthor(values: AuthorFormValues, accessToken: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/authors/${values._id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(values),
    }
  );

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Update failed");
  }

  return res.json();
}

export default function UpdateAuthorPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const { id } = useParams() as { id: string };

  const defaultValues: AuthorFormValues = {
    _id: id,
    name: "",
    email: "",
    about: "",
    avatar: undefined,
    role: "author",
  };

  const form = useForm<AuthorFormValues>({ defaultValues });

  const {
    data: author,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["author", id],
    queryFn: () => getAuthor(id),
  });
  useEffect(() => {
    if (author) {
      form.setValue("name", author.name);
      form.setValue("email", author.email);
      form.setValue("about", author.about);
      form.setValue("avatar", author.avatar);
      form.setValue("role", author.role);
    }
  }, [author, form]);
  const mutation = useMutation({
    mutationFn: (values: AuthorFormValues) => updateAuthor(values, accessToken),
    onSuccess: (data) => {
      console.log("Registered successfully:", data);
      toast.success("Registration successful!");
      form.reset(defaultValues);
    },
    onError: (error: unknown) => {
      console.error("Registration failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    },
  });

  if (isLoading) return <Loader size="lg" className="h-6 w-6 animate-spin" />;
  if (isError) return <h1>{error.message}</h1>;
  const onSubmit: SubmitHandler<AuthorFormValues> = (values) => {
    mutation.mutate(values);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">Edit Author</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="johndoe" {...field} required />
                  </FormControl>
                  <FormDescription>
                    This will be your public display name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* About */}
            <FormField
              control={form.control}
              name="about"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>About</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Describe yourself"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <select
                      className="w-full rounded-md border border-gray-300 p-2"
                      {...field}
                      required
                    >
                      <option value="author">Author</option>
                      <option value="editor">Editor</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Avatar */}
            <FormField
              control={form.control}
              name="avatar"
              render={() => (
                <FormItem>
                  <FormLabel>Avatar</FormLabel>
                  <FormControl>
                    <ImageUploader
                      initialImage={form.getValues("avatar")}
                      onUpload={(img) =>
                        form.setValue("avatar", {
                          url: img?.url ?? "",
                          public_id: img?.public_id ?? "",
                          alt: form.getValues("name") ?? "",
                        })
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Updating..." : "Update"}
            </Button>
          </form>
        </Form>

        {mutation.isError && (
          <p className="mt-3 text-center text-sm text-red-500">
            {(mutation.error as Error).message}
          </p>
        )}
        {mutation.isSuccess && (
          <p className="mt-3 text-center text-sm text-green-600">
            Update successful!
          </p>
        )}
      </div>
    </div>
  );
}
