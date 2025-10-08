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
import { useRouter } from "next/navigation";

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
interface Batch {
  startDate: string;
  endDate: string;
  quad: number;
  triple: number;
  double: number;
  child: number;
  quadDiscount: number;
  tripleDiscount: number;
  doubleDiscount: number;
  childDiscount: number;
}

interface PackageFormValues {
  title: string;
  description?: string;
  batch: Batch[];
  slug: string;
  destination: string;
  coverImage?: Image;
  gallery?: Image[];
  duration: { days: number; nights: number };
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  maxPeople?: number;
  highlights?: string[];
  inclusions?: string[];
  exclusions?: string[];
  itinerary?: Itinerary[];
  itineraryDownload?: Image;
  faqs?: Faq[];
  isFeatured?: boolean;
  isBestSeller?: boolean;
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
async function CreatePackage(values: PackageFormValues, accessToken: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/packages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(values),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Package Creation failed");
  }

  return res.json();
}

const getDestination = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/destination`);
  if (!res.ok) throw new Error("Failed to get destination");
  const data = await res.json();
  return data?.data;
};
export default function CreatePackagePage() {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const router = useRouter();
  const defaultValues: PackageFormValues = {
    title: "",
    description: "",
    metaTitle: "",
    metaDescription: "",
    status: "draft",
    keywords: [],
    coverImage: { url: "", alt: "", public_id: "" },
    gallery: [],
    batch: [
      {
        startDate: "",
        endDate: "",
        quad: 0,
        triple: 0,
        double: 0,
        child: 0,
        quadDiscount: 0,
        tripleDiscount: 0,
        doubleDiscount: 0,
        childDiscount: 0,
      },
    ],
    destination: "",
    duration: { days: 0, nights: 0 },
    maxPeople: 0,
    highlights: [],
    inclusions: [],
    exclusions: [],
    itinerary: [],
    itineraryDownload: { url: "", alt: "", public_id: "" },
    faqs: [],
    isFeatured: false,
    isBestSeller: false,
    slug: "",
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
  const form = useForm<PackageFormValues>({ defaultValues });

  const batchArray = useFieldArray({ control: form.control, name: "batch" });
  const coverImageArray = useFieldArray({
    control: form.control,
    name: "gallery",
  });
  const highlightsArray = useFieldArray({
    control: form.control,
    name: "highlights",
  });
  const inclusionsArray = useFieldArray({
    control: form.control,
    name: "inclusions",
  });
  const exclusionsArray = useFieldArray({
    control: form.control,
    name: "exclusions",
  });
  const faqsArray = useFieldArray({ control: form.control, name: "faqs" });
  const itineraryArray = useFieldArray({
    control: form.control,
    name: "itinerary",
  });

  const mutation = useMutation({
    mutationFn: (values: PackageFormValues) =>
      CreatePackage(values, accessToken),
    onSuccess: (data) => {
      toast.success("Package Created successfully");
      form.reset(defaultValues);
      router.refresh();
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

  if (isLoading) return <Loader size="lg" message="Loading destinations..." />;
  if (isError) return <h1>{error.message}</h1>;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">
          Create a Package
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

            {/* Batch Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">Batch *</FormLabel>
              {batchArray.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-2 gap-2 mb-2">
                  <Input
                    type="date"
                    {...form.register(`batch.${index}.startDate`)}
                    placeholder="Start Date"
                  />
                  <Input
                    type="date"
                    {...form.register(`batch.${index}.endDate`)}
                    placeholder="End Date"
                  />
                  <Input
                    type="number"
                    {...form.register(`batch.${index}.quad`)}
                    placeholder="Quad Original Price"
                  />
                  <Input
                    type="number"
                    {...form.register(`batch.${index}.quadDiscount`)}
                    placeholder="Quad Fake Price"
                  />
                  <Input
                    type="number"
                    {...form.register(`batch.${index}.triple`)}
                    placeholder="Triple Original Price"
                  />
                  <Input
                    type="number"
                    {...form.register(`batch.${index}.tripleDiscount`)}
                    placeholder="Triple Fake Price"
                  />
                  <Input
                    type="number"
                    {...form.register(`batch.${index}.double`)}
                    placeholder="Double Original Price"
                  />
                  <Input
                    type="number"
                    {...form.register(`batch.${index}.doubleDiscount`)}
                    placeholder="Double Fake Price"
                  />
                  <Input
                    type="number"
                    {...form.register(`batch.${index}.child`)}
                    placeholder="Child Original Price"
                  />
                  <Input
                    type="number"
                    {...form.register(`batch.${index}.childDiscount`)}
                    placeholder="Child Fake Price"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => batchArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() =>
                  batchArray.append({
                    startDate: "",
                    endDate: "",
                    quad: 0,
                    triple: 0,
                    double: 0,
                    child: 0,
                    quadDiscount: 0,
                    tripleDiscount: 0,
                    doubleDiscount: 0,
                    childDiscount: 0,
                  })
                }
              >
                Add Batch
              </Button>
            </div>

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
            {/* Itinary Download */}
            <FormField
              control={form.control}
              name="itineraryDownload"
              render={() => (
                <FormItem>
                  <FormLabel>Itinerary PDF Upload</FormLabel>
                  <FormControl>
                    <ImageUploader
                      onUpload={(img) => {
                        if (!img) return null;
                        form.setValue("itineraryDownload", {
                          url: img.url,
                          public_id: img.public_id,
                          alt: form.getValues("title") ?? "",
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
                    {...form.register(`highlights.${index}`)}
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
              <Button type="button" onClick={() => highlightsArray.append("")}>
                Add Highlight
              </Button>
            </div>

            {/* Inclusions Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">Inclusions</FormLabel>
              {inclusionsArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mb-2">
                  <Input
                    {...form.register(`inclusions.${index}`)}
                    placeholder="Enter inclusion"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => inclusionsArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={() => inclusionsArray.append("")}>
                Add Inclusion
              </Button>
            </div>

            {/* Exclusions Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">Exclusions</FormLabel>
              {exclusionsArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mb-2">
                  <Input
                    {...form.register(`exclusions.${index}`)}
                    placeholder="Enter exclusion"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => exclusionsArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={() => exclusionsArray.append("")}>
                Add Exclusion
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

            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Keywords (comma separated)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      onChange={(e) =>
                        field.onChange(e.target.value.split(","))
                      }
                      placeholder="Enter SEO Meta Keywords"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isFeatured"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Featured</FormLabel>
                  <FormControl>
                    <select
                      onChange={(e) =>
                        field.onChange(e.target.value === "true")
                      }
                      className="w-full rounded-md border p-2"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isBestSeller"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Best Seller</FormLabel>
                  <FormControl>
                    <select
                      onChange={(e) =>
                        field.onChange(e.target.value === "true")
                      }
                      className="w-full rounded-md border p-2"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              {mutation.isPending ? "Creating..." : "Create Package"}
            </Button>
          </form>
        </Form>
        {mutation.isError && (
          <p className="text-red-500">Somethings went wrong!</p>
        )}
        {mutation.isSuccess && (
          <p className="text-green-500">Package created successfully!</p>
        )}
      </div>
    </div>
  );
}
