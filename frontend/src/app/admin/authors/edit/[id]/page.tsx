"use client";

import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Loader, Plus, Trash2 } from "lucide-react";
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
  socialLinks?: {
    platform: string;
    link: string;
  }[];
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
  const queryClient = useQueryClient();

  const defaultValues: AuthorFormValues = {
    _id: id,
    name: "",
    email: "",
    about: "",
    avatar: undefined,
    role: "author",
    socialLinks: [],
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
      if (author.socialLinks) {
        form.setValue("socialLinks", author.socialLinks);
      }
    }
  }, [author, form]);

  const { fields: socialFields, append: appendSocial, remove: removeSocial } = useFieldArray({
    control: form.control,
    name: "socialLinks",
  });
  const mutation = useMutation({
    mutationFn: (values: AuthorFormValues) => updateAuthor(values, accessToken),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["authors"] });
      queryClient.invalidateQueries({ queryKey: ["author", id] });
      console.log("Updated successfully:", data);
      toast.success("Update successful!");
    },
    onError: (error: unknown) => {
      console.error("Update failed:", error);
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

            {/* Social Links */}
            <div className="space-y-4 rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Social Links</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendSocial({ platform: "Facebook", link: "" })}
                  className="flex items-center gap-1 text-[12px] h-8"
                >
                  <Plus className="h-3 w-3" /> Add Link
                </Button>
              </div>
              
              {socialFields.map((item, index) => (
                <div key={item.id} className="flex items-start gap-3">
                  <FormField
                    control={form.control}
                    name={`socialLinks.${index}.platform`}
                    render={({ field }) => (
                      <FormItem className="w-1/3">
                        <FormControl>
                          <select
                            className="w-full rounded-md border border-gray-300 p-2 text-sm"
                            {...field}
                          >
                            <option value="Facebook">Facebook</option>
                            <option value="Linkedin">Linkedin</option>
                            <option value="instagram">Instagram</option>
                            <option value="twitter">Twitter</option>
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`socialLinks.${index}.link`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            placeholder="https://"
                            className="text-sm h-[38px]"
                            {...field}
                            required
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSocial(index)}
                    className="h-[38px] w-[38px] text-red-500 hover:bg-red-50 hover:text-red-600 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

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
