"use client";
import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm, useFieldArray } from "react-hook-form";
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
import { Textarea } from "../ui/textarea";
import BlogEditor from "./BlogEditor";
import ImageUploader from "./ImageUploader";
import { Label } from "../ui/label";
import SmallEditor from "./SmallEditor";
import { X } from "lucide-react";
import { getDestination } from "@/app/admin/holidays/new/page";
import { DestinationInterface } from "@/app/(user)/destinations/page";

export const vehicleSchema = z.object({
  vehicleName: z
    .string()
    .trim()
    .min(2, "Vehicle Name must be at least 2 characters"),

  vehicleType: z.enum(["car", "bike"]).default("bike"),

  vehicleYear: z.string().optional(),

  vehicleBrand: z.enum(["hero", "honda", "tvs"]).default("hero"),

  vehicleModel: z.string().optional(),

  vehicleMilage: z.string().optional(),

  fuelType: z
    .enum(["electric", "petrol", "desile", "elctric", "cng", "other"])
    .default("petrol"),

  seats: z.coerce.number().positive().optional(),

  price: z
    .object({
      daily: z.number().nonnegative().optional(),
      hourly: z.number().nonnegative().optional(),
    })
    .optional(),

  title: z.string().trim().min(2, "Title is required"),

  slug: z.string().min(2, "Slug is required"),

  content: z.string().optional(),

  availableStock: z.number().int().nonnegative().default(1),

  gallery: z
    .array(
      z.object({
        url: z.string().url("Invalid image URL"),
        alt: z.string().optional(),
        title: z.string().optional(),
        width: z.coerce.number().optional(),
        height: z.coerce.number().optional(),
      }),
    )
    .optional(),

  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  canonicalUrl: z.string().optional(),
  excerpt: z.string().optional(),

  keywords: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  tripProtectionFee: z.coerce.number(),
  convenienceFee: z.coerce.number(),
  vehicleTransmission: z.enum(["mannual", "automatic"]).default("mannual"),
  location: z.string(),

  faqs: z
    .array(
      z.object({
        question: z.string().min(1, "FAQ question required"),
        answer: z.string().min(1, "FAQ answer required"),
      }),
    )
    .optional(),

  status: z.enum(["draft", "published"]).default("published"),
});

type FormData = z.infer<typeof vehicleSchema>;

const createVehicle = async (accessToken: string, form: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/vehicle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(form),
  });
  if (!res.ok) throw new Error("Vehicle creation failed");
  return res.json();
};

const updateVehicle = async (
  accessToken: string,
  id: string,
  form: FormData,
) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(form),
  });
  if (!res.ok) throw new Error("vehicle update failed");
  return res.json();
};

const getvehicleById = async (accessToken: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch vehicle by Id");
  return res.json();
};

export const CreateEditVehicle = ({
  onClose,
  id,
}: {
  onClose: () => void;
  id: string | null;
}) => {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();
  const form = useForm<FormData>({
    resolver: zodResolver(vehicleSchema) as Resolver<FormData>,
    defaultValues: {
      vehicleName: "",
      location: "",
      vehicleTransmission: "mannual",
      tripProtectionFee: 0,
      convenienceFee: 0,
      vehicleType: "car",
      vehicleYear: "",
      vehicleBrand: "hero",
      vehicleModel: "glamour",
      vehicleMilage: "",
      fuelType: "petrol",
      seats: 4,
      price: { daily: 0, hourly: 0 },
      title: "",
      slug: "",
      content: "",
      availableStock: 1,
      gallery: [],
      metaTitle: "",
      metaDescription: "",
      canonicalUrl: "",
      excerpt: "",
      faqs: [],
      keywords: [],
      features: [],
      inclusions: [],
      exclusions: [],
      status: "draft",
    },
  });

  const {
    data,
    isLoading: VehicleLoading,
    isError: VehicleError,
  } = useQuery({
    queryKey: ["vehicle", id],
    queryFn: () => getvehicleById(accessToken, id as string),
    enabled: !!id,
  });

  const {
    data: destination,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["destination"],
    queryFn: getDestination,
  });

  const vehicle = data?.data;

  const faqsArray = useFieldArray({
    control: form.control,
    name: "faqs",
  });
  const galleryArray = useFieldArray({
    control: form.control,
    name: "gallery",
  });
  useEffect(() => {
    if (id && vehicle) {
      form.reset({
        vehicleName: vehicle.vehicleName,
        vehicleType: vehicle.vehicleType,
        vehicleYear: vehicle.vehicleYear,
        vehicleBrand: vehicle.vehicleBrand,
        vehicleModel: vehicle.vehicleModel,
        vehicleMilage: vehicle.vehicleMilage,
        fuelType: vehicle.fuelType,
        seats: vehicle.seats,
        price: vehicle.price,
        title: vehicle.title,
        slug: vehicle.slug,
        content: vehicle.content,
        availableStock: vehicle.availableStock,
        gallery: vehicle.gallery,
        metaTitle: vehicle.metaTitle,
        metaDescription: vehicle.metaDescription,
        canonicalUrl: vehicle.canonicalUrl,
        excerpt: vehicle.excerpt,
        keywords: vehicle.keywords,
        features: vehicle.features,
        inclusions: vehicle.inclusions,
        exclusions: vehicle.exclusions,
        faqs: vehicle.faqs,
        location: vehicle.location,
        tripProtectionFee: vehicle.tripProtectionFee,
        convenienceFee: vehicle.convenienceFee,
        vehicleTransmission: vehicle.vehicleTransmission,
        status: vehicle.status,
      });
    }
  }, [id, vehicle, form]);

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      id
        ? updateVehicle(accessToken, id, values)
        : createVehicle(accessToken, values),
    onSuccess: (res) => {
      toast.success(
        id ? "Vehicle updated successfully!" : "Vehicle created successfully!",
      );
      queryClient.invalidateQueries({ queryKey: ["vehicle"] });
      //   if (id) onReviewsUpdated?.(id);
      //   else onReviewsCreated(res?.data?._id || res?._id);
      onClose();
    },
    onError: (err) => toast.error(err.message || "Failed to create vehicle"),
  });

  if (VehicleLoading) return <Loader size="lg" />;

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
        {id ? "Update Vehicle" : "Create Vehicle"}
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Ttiqle and slug Basic Info */}
          <div className="grid md:grid-cols-2 gap-5">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title Name (H1)</FormLabel>
                  <FormControl>
                    <Input placeholder="Honda Shine 2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parmalink</FormLabel>
                  <FormControl>
                    <Input placeholder="honda-shine-2026" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Loaction and Tranmsiion */}
          <div className="grid md:grid-cols-2 gap-5">
            {/* Destination */}
            <FormField
              control={form.control}
              name="location"
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
                      {destination?.map((dest: DestinationInterface) => (
                        <option key={dest._id} value={dest._id}>
                          {dest.name.toLocaleUpperCase()}
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
              name="vehicleTransmission"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transmission</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="input-style border rounded-lg"
                    >
                      <option value="mannual">Mannual</option>
                      <option value="automatic">Automatic</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Transmission fee and Proctation fee */}
          <div className="grid md:grid-cols-2 gap-5">
            {/*convenienceFee  */}
            <FormField
              control={form.control}
              name="convenienceFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Convenience Fee</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="9,99" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/*Transmission fee  */}
            <FormField
              control={form.control}
              name="tripProtectionFee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Protection Fee</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="9,99" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Vehicle Basic Info */}
          <div className="grid md:grid-cols-3 gap-5">
            <FormField
              control={form.control}
              name="vehicleName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Honda Shine" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vehicleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Type</FormLabel>
                  <FormControl>
                    <select {...field} className="input-style">
                      <option value="bike">Bike</option>
                      <option value="car">Car</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vehicleBrand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <FormControl>
                    <select {...field} className="input-style">
                      <option value="hero">Hero</option>
                      <option value="honda">Honda</option>
                      <option value="tvs">TVS</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Model & Year */}
          <div className="grid md:grid-cols-3 gap-5">
            <FormField
              control={form.control}
              name="vehicleModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input placeholder="Glamour" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vehicleYear"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl>
                    <Input placeholder="2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fuelType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fuel Type</FormLabel>
                  <FormControl>
                    <select {...field} className="input-style">
                      <option value="petrol">Petrol</option>
                      <option value="electric">Electric</option>
                      <option value="desile">Diesel</option>
                      <option value="cng">CNG</option>
                      <option value="other">Other</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Seats & Stock */}
          <div className="grid md:grid-cols-2 gap-5">
            <FormField
              control={form.control}
              name="seats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seats</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availableStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available Stock</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Pricing */}
          <div className="grid md:grid-cols-2 gap-5">
            <FormField
              control={form.control}
              name="price.daily"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price.hourly"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hourly Price</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* SEO Section */}
          <div className="space-y-5">
            <FormField
              control={form.control}
              name="metaTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="canonicalUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Canonical URL</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="excerpt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Excerpt</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <div className="border rounded p-2">
                      <BlogEditor
                        value={form.getValues("content")}
                        onChange={(val) => form.setValue("content", val)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Gallery Dynamic */}
          <div className="mb-4">
            <FormLabel className="mb-2 text-lg">Vehicle Gallery</FormLabel>
            {galleryArray.fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2 mb-2">
                <ImageUploader
                  initialImage={field}
                  onUpload={(img) => {
                    if (!img) return null;
                    form.setValue(`gallery.${index}`, {
                      url: img.url,
                      alt: img.alt ?? form.getValues("title"),
                      width: img.width,
                      height: img.height,
                    });
                  }}
                />
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => galleryArray.remove(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={() =>
                galleryArray.append({
                  url: "",
                  width: 0,
                  height: 0,
                  alt: "",
                })
              }
            >
              Add Image Gallery
            </Button>
          </div>
          {/* Keywords */}
          <div className="space-y-2">
            <Label className="block text-sm font-medium">Keywords</Label>
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
                onBlur={(e) => {
                  const arr = e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean);
                  if (arr.length > 0) {
                    form.setValue("keywords", [
                      ...(form.getValues("keywords") || []),
                      ...arr,
                    ]);
                    e.target.value = "";
                  }
                }}
              />
            </div>
          </div>
          {/* Features */}
          <div className="space-y-2">
            <Label className="block text-sm font-medium">
              Vehicle Features
            </Label>
            <div className="flex flex-wrap gap-2 border rounded p-2">
              {form.watch("features")?.map((kw, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full text-sm"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => {
                      const newKeywords = form
                        .getValues("features")
                        ?.filter((_, idx) => idx !== i);
                      form.setValue("features", newKeywords);
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
                onBlur={(e) => {
                  const arr = e.target.value
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean);
                  if (arr.length > 0) {
                    form.setValue("features", [
                      ...(form.getValues("features") || []),
                      ...arr,
                    ]);
                    e.target.value = "";
                  }
                }}
              />
            </div>
          </div>

          {/* Faqs */}
          <div>
            <Label className="block text-sm font-medium mb-2">FAQs</Label>
            {faqsArray.fields.map((field, index) => (
              <div key={field.id} className="flex">
                <div className="grid gap-2 mb-2 w-full">
                  <Input
                    {...form.register(`faqs.${index}.question`)}
                    placeholder="Question"
                  />
                  <div className="border rounded p-2">
                    <SmallEditor
                      value={form.getValues(`faqs.${index}.answer`)}
                      onChange={(val) =>
                        form.setValue(`faqs.${index}.answer`, val)
                      }
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => faqsArray.remove(index)}
                >
                  X
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={() => faqsArray.append({ question: "", answer: "" })}
            >
              + FAQ
            </Button>
          </div>
          <div className="grid md:grid-cols-2 grid-cols-1 gap-4">
            {/* Inclusion */}
            <div className="space-y-2">
              <Label className="block text-sm font-medium mb-2">
                Inclusions
              </Label>
              {form.watch("inclusions")?.map((field, index) => (
                <div key={field} className="flex gap-2">
                  <Input
                    {...form.register(`inclusions.${index}`)}
                    placeholder="Inclusion"
                  />

                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() =>
                      form.setValue(
                        "inclusions",
                        form
                          .watch("inclusions")
                          ?.filter((_, idx) => idx !== index),
                      )
                    }
                  >
                    X
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() =>
                  form.setValue("inclusions", [
                    ...(form.watch("inclusions") || []),
                    "",
                  ])
                }
              >
                + In
              </Button>
            </div>
            {/* Exclusion */}
            <div className="space-y-2">
              <Label className="block text-sm font-medium mb-2">
                Exclusions
              </Label>
              {form.watch("exclusions")?.map((field, index) => (
                <div key={field} className="flex gap-2">
                  <Input
                    {...form.register(`exclusions.${index}`)}
                    placeholder="Exclusion"
                  />

                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() =>
                      form.setValue(
                        "exclusions",
                        form
                          .watch("exclusions")
                          ?.filter((_, idx) => idx !== index),
                      )
                    }
                  >
                    X
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() =>
                  form.setValue("exclusions", [
                    ...(form.watch("exclusions") || []),
                    "",
                  ])
                }
              >
                + Ex
              </Button>
            </div>
          </div>
          {/* Submit */}
          <div className="flex justify-between gap-5">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex gap-2">
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="input-style border rounded-lg"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Submit</Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>

      {mutation.isError && (
        <p className="text-red-500">{mutation.error.message}</p>
      )}
      {mutation.isSuccess && <p className="text-green-500">Success</p>}
    </div>
  );
};
