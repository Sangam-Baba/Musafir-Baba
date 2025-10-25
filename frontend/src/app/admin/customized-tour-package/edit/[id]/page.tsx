"use client";

import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ImageUploader from "@/components/admin/ImageUploader";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader } from "@/components/custom/loader";
import { Textarea } from "@/components/ui/textarea";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { X } from "lucide-react";

interface Image {
  url: string;
  alt: string;
  public_id?: string;
  width?: number;
  height?: number;
}
interface Faq {
  question: string;
  answer: string;
}
interface Itinerary {
  title: string;
  description: string;
}
interface Plans {
  title: string;
  include: string;
  price: number;
}
interface Highlight {
  title: string;
}
interface PackageFormValues {
  title: string;
  description?: string;
  slug: string;
  plans: Plans[];
  destination: string;
  coverImage?: Image;
  gallery?: Image[];
  duration: { days: number; nights: number };
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  highlight?: Highlight[];
  itinerary?: Itinerary[];
  faqs?: Faq[];
  status: "draft" | "published";
}

interface Destination {
  _id: string;
  name: string;
  country: string;
  state: string;
  city: string;
  coverImage?: {
    url: string;
    public_id: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  slug: string;
}
async function UpdatePackage(
  values: PackageFormValues,
  accessToken: string,
  id: string
) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(values),
    }
  );

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Package Updation failed");
  }

  return res.json();
}

async function getPackage(id: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/${id}`
  );
  if (!res.ok) throw new Error("Failed to fetch packages");
  const data = await res.json();
  return data?.data;
}

const getDestination = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/destination`);
  if (!res.ok) throw new Error("Failed to get destination");
  const data = await res.json();
  return data?.data;
};
export default function CreatePackagePage() {
  const { id } = useParams() as { id: string };
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const defaultValues: PackageFormValues = {
    title: "",
    description: "",
    metaTitle: "",
    metaDescription: "",

    keywords: [],

    plans: [
      {
        title: "",
        include: "",
        price: 0,
      },
    ],
    destination: "",
    duration: { days: 0, nights: 0 },
    highlight: [],
    itinerary: [],
    faqs: [],
    slug: "",
    status: "draft",
  };

  const {
    data: destination,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["destination"],
    queryFn: getDestination,
  });

  const { data: packageData, isLoading: packageLoading } = useQuery({
    queryKey: ["package", id],
    queryFn: () => getPackage(id as string),
  });
  const form = useForm<PackageFormValues>({ defaultValues });

  useEffect(() => {
    if (packageData) {
      form.reset({
        ...packageData,
        destination: packageData.destination._id,
      });
    }
  }, [packageData, form]);

  const coverImageArray = useFieldArray({
    control: form.control,
    name: "gallery",
  });
  const highlightsArray = useFieldArray({
    control: form.control,
    name: "highlight",
  });
  const plansArray = useFieldArray({ control: form.control, name: "plans" });
  const faqsArray = useFieldArray({ control: form.control, name: "faqs" });
  const itineraryArray = useFieldArray({
    control: form.control,
    name: "itinerary",
  });

  const mutation = useMutation({
    mutationFn: (values: PackageFormValues) =>
      UpdatePackage(values, accessToken, id),
    onSuccess: () => {
      toast.success("Package Updated successfully");
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    },
  });

  const onSubmit: SubmitHandler<PackageFormValues> = (values) => {
    mutation.mutate(values);
  };

  if (isLoading || packageLoading)
    return <Loader size="lg" message="Loading ..." />;
  if (isError) return <h1>{error.message}</h1>;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">
          Edit Customized Package
        </h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Package Title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Parmalink */}
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permalink *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Permalink..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the package" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duration */}
            <div className="flex justify-between gap-4">
              <FormField
                control={form.control}
                name="duration.days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter Days Duration"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration.nights"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nights *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter Nights Duration"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Destination */}
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination *</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="w-full rounded-md border border-gray-300 p-2"
                      value={field.value || ""}
                    >
                      <option value="" disabled>
                        Select a destination
                      </option>
                      {destination?.map((dest: Destination) => (
                        <option key={dest._id} value={dest._id}>
                          {dest.state.toLocaleUpperCase()}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cover Image */}
            <FormField
              control={form.control}
              name="coverImage"
              render={() => (
                <FormItem>
                  <FormLabel>Cover Image</FormLabel>
                  <FormControl>
                    <ImageUploader
                      onUpload={(img) => {
                        if (!img) return null;
                        form.setValue("coverImage", {
                          url: img.url,
                          public_id: img.public_id,
                          alt: form.getValues("title") ?? "",
                          width: img.width,
                          height: img.height,
                        });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Gallery Dynamic */}
            <div className="mb-4">
              <FormLabel className="mb-2 text-lg">Image Gallery</FormLabel>
              {coverImageArray.fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2 mb-2">
                  <ImageUploader
                    onUpload={(img) => {
                      if (!img) return null;
                      form.setValue(`gallery.${index}`, {
                        url: img.url,
                        public_id: img.public_id,
                        alt: form.getValues("title") ?? "",
                        width: img.width,
                        height: img.height,
                      });
                    }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => coverImageArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() =>
                  coverImageArray.append({
                    url: "",
                    public_id: "",
                    width: 0,
                    height: 0,
                    alt: "",
                  })
                }
              >
                Add Image Gallery
              </Button>
            </div>

            {/* Highlights Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">Highlights</FormLabel>
              {highlightsArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mb-2">
                  <Input
                    {...form.register(`highlight.${index}.title`)}
                    placeholder="Enter highlight"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => highlightsArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() => highlightsArray.append({ title: "" })}
              >
                Add Highlight
              </Button>
            </div>

            {/* Plans */}
            <div>
              <FormLabel className="mb-2 text-lg">Plans</FormLabel>
              {plansArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mb-2">
                  <Input
                    {...form.register(`plans.${index}.title`)}
                    placeholder="Enter Plan Title"
                  />
                  <Textarea
                    {...form.register(`plans.${index}.include`)}
                    placeholder="Enter Includes"
                  />
                  <Input
                    {...form.register(`plans.${index}.price`)}
                    placeholder="Enter Plan Price"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => plansArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() =>
                  plansArray.append({ title: "", include: "", price: 0 })
                }
              >
                Add Plans
              </Button>
            </div>

            {/* FAQs Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">FAQs</FormLabel>
              {faqsArray.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-2 gap-2 mb-2">
                  <Input
                    {...form.register(`faqs.${index}.question`)}
                    placeholder="Question"
                  />
                  <Input
                    {...form.register(`faqs.${index}.answer`)}
                    placeholder="Answer"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => faqsArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() => faqsArray.append({ question: "", answer: "" })}
              >
                Add FAQ
              </Button>
            </div>

            {/* Itinerary Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">Itinerary</FormLabel>
              {itineraryArray.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-2 gap-2 mb-2 ">
                  <Input
                    {...form.register(`itinerary.${index}.title`)}
                    placeholder="Day Title"
                  />
                  <Textarea
                    {...form.register(`itinerary.${index}.description`)}
                    placeholder="Day Description"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => itineraryArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() =>
                  itineraryArray.append({ title: "", description: "" })
                }
              >
                Add Itinerary Step
              </Button>
            </div>

            <FormField
              control={form.control}
              name="metaTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Title</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Enter SEO Meta Title"
                      {...field}
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
                      placeholder="Enter SEO Meta Description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Target Keywords (comma separated)</FormLabel>
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

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full rounded-md border p-2">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Updating..." : "Update Package"}
            </Button>
          </form>
        </Form>
        {mutation.isError && (
          <p className="text-red-500">Somethings went wrong!</p>
        )}
        {mutation.isSuccess && (
          <p className="text-green-500">Package Updated successfully!</p>
        )}
      </div>
    </div>
  );
}
