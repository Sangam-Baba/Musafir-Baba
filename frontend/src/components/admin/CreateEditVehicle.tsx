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
import { X, Plus, Minus } from "lucide-react";
import { DestinationInterface } from "@/app/(user)/destinations/page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fetchMasterData = async (accessToken: string, endpoint: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/master-data/${endpoint}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
  return res.json();
};

export const vehicleSchema = z.object({
  vehicleName: z
    .string()
    .trim()
    .min(2, "Vehicle Name must be at least 2 characters"),

  vehicleType: z.string().min(1, "Type is required"),

  vehicleYear: z.string().optional(),

  vehicleBrand: z.string().min(1, "Brand is required"),

  vehicleModel: z.string().optional(),

  vehicleMilage: z.string().optional(),

  fuelType: z.string().min(1, "Fuel Type is required"),

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
  inclusions: z.array(z.object({ value: z.string() })).optional(),
  exclusions: z.array(z.object({ value: z.string() })).optional(),
  tripProtectionFee: z.coerce.number(),
  convenienceFee: z.coerce.number(),
  vehicleTransmission: z.string().min(1, "Transmission is required"),
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
      vehicleTransmission: "manual",
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
      inclusions: [{ value: "" }],
      exclusions: [{ value: "" }],
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

  const { data: masterBrands } = useQuery({
    queryKey: ["master-data", "brand"],
    queryFn: () => fetchMasterData(accessToken, "brand"),
  });

  const { data: masterTypes } = useQuery({
    queryKey: ["master-data", "type"],
    queryFn: () => fetchMasterData(accessToken, "type"),
  });

  const { data: pickupDestinations } = useQuery({
    queryKey: ["master-data", "pickup-destination"],
    queryFn: () => fetchMasterData(accessToken, "pickup-destination"),
  });

  const { data: masterFuelTypes } = useQuery({
    queryKey: ["master-data", "fuel-type"],
    queryFn: () => fetchMasterData(accessToken, "fuel-type"),
  });

  const { data: masterTransmissions } = useQuery({
    queryKey: ["master-data", "transmission"],
    queryFn: () => fetchMasterData(accessToken, "transmission"),
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
  const inclusionsArray = useFieldArray({
    control: form.control,
    name: "inclusions",
  });
  const exclusionsArray = useFieldArray({
    control: form.control,
    name: "exclusions",
  });
  useEffect(() => {
    if (id && vehicle) {
      // Find case-insensitive matches from master data for consistent selection
      const matchedFuel = masterFuelTypes?.data?.find(
        (f: any) => f.name.toLowerCase() === vehicle.fuelType?.toLowerCase()
      );
      const matchedTransmission = masterTransmissions?.data?.find(
        (t: any) => t.name.toLowerCase() === vehicle.vehicleTransmission?.toLowerCase()
      );
      const matchedType = masterTypes?.data?.find(
        (t: any) => t.name.toLowerCase() === vehicle.vehicleType?.toLowerCase()
      );
      const matchedBrand = masterBrands?.data?.find(
        (b: any) => b.name.toLowerCase() === vehicle.vehicleBrand?.toLowerCase()
      );

      form.reset({
        vehicleName: vehicle.vehicleName,
        vehicleType: matchedType ? matchedType.name : vehicle.vehicleType,
        vehicleYear: vehicle.vehicleYear,
        vehicleBrand: matchedBrand ? matchedBrand.name : vehicle.vehicleBrand,
        vehicleModel: vehicle.vehicleModel,
        vehicleMilage: vehicle.vehicleMilage,
        fuelType: matchedFuel ? matchedFuel.name : vehicle.fuelType,
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
        inclusions: vehicle.inclusions?.map((i: string) => ({ value: i })) || [{ value: "" }],
        exclusions: vehicle.exclusions?.map((e: string) => ({ value: e })) || [{ value: "" }],
        faqs: vehicle.faqs,
        location: vehicle.location,
        tripProtectionFee: vehicle.tripProtectionFee,
        convenienceFee: vehicle.convenienceFee,
        vehicleTransmission: matchedTransmission ? matchedTransmission.name : vehicle.vehicleTransmission,
        status: vehicle.status,
      });
    }
  }, [id, vehicle, form, masterFuelTypes, masterTransmissions, masterTypes, masterBrands]);

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
    const finalValues = {
      ...values,
      inclusions: values.inclusions?.map((i) => i.value).filter(Boolean),
      exclusions: values.exclusions?.map((e) => e.value).filter(Boolean),
    };
    console.log(finalValues);
    mutation.mutate(finalValues as any);
  }

  return (
    <div
      className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
        {id ? "Update Vehicle" : "Create Vehicle"}
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid grid-cols-5 w-full mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="additional">Additional</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>

            {/* --- General Tab --- */}
            <TabsContent value="general" className="space-y-4 pt-1 px-1">
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
                      <FormLabel>Permalink</FormLabel>
                      <FormControl>
                        <Input placeholder="honda-shine-2026" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
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
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destination *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-full rounded-md border border-gray-300 p-2 text-sm"
                          value={field.value || ""}
                        >
                          <option value="" disabled>Select a destination</option>
                          {pickupDestinations?.data?.map((dest: any) => (
                            <option key={dest._id} value={dest._id}>
                              {dest.name.toUpperCase()} ({dest.city || "No City"})
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                <FormField
                  control={form.control}
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type</FormLabel>
                      <FormControl>
                        <select {...field} className="w-full rounded-md border border-gray-300 p-2 text-sm">
                          <option value="" disabled>Select Type</option>
                          {masterTypes?.data?.map((t: any) => (
                            <option key={t._id} value={t.name}>{t.name}</option>
                          ))}
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
                        <select {...field} className="w-full rounded-md border border-gray-300 p-2 text-sm">
                          <option value="" disabled>Select Brand</option>
                          {masterBrands?.data?.map((b: any) => (
                            <option key={b._id} value={b.name}>{b.name}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              </div>

              <div className="grid md:grid-cols-3 gap-5">
                <FormField
                  control={form.control}
                  name="vehicleYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="2024" {...field} />
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
                        <select {...field} className="w-full rounded-md border border-gray-300 p-2 text-sm">
                          <option value="" disabled>Select Fuel Type</option>
                          {masterFuelTypes?.data?.map((f: any) => (
                            <option key={f._id} value={f.name}>{f.name}</option>
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
                        <select {...field} className="w-full rounded-md border border-gray-300 p-2 text-sm">
                          <option value="" disabled>Select Transmission</option>
                          {masterTransmissions?.data?.map((t: any) => (
                            <option key={t._id} value={t.name}>{t.name}</option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="seats"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seats</FormLabel>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          onClick={() => {
                            const val = Number(form.getValues("seats")) || 0;
                            form.setValue("seats", Math.max(1, val - 1));
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            className="w-20 text-center"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          onClick={() => {
                            const val = Number(form.getValues("seats")) || 0;
                            form.setValue("seats", val + 1);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vehicleMilage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Milage</FormLabel>
                      <FormControl>
                        <Input placeholder="15 km/l" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </TabsContent>

            {/* --- Pricing & Inventory Tab --- */}
            <TabsContent value="pricing" className="space-y-4 pt-1 px-1">
              <div className="grid md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="price.daily"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
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
                      <FormLabel>Hourly Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="convenienceFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Convenience Fee (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tripProtectionFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trip Protection Fee (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="availableStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Stock</FormLabel>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => {
                          const val = Number(form.getValues("availableStock")) || 0;
                          form.setValue("availableStock", Math.max(0, val - 1));
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          className="w-20 text-center"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => {
                          const val = Number(form.getValues("availableStock")) || 0;
                          form.setValue("availableStock", val + 1);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>

            {/* --- Media & Content Tab --- */}
            <TabsContent value="media" className="space-y-6 pt-1 px-1">
              <div className="mb-4">
                <FormLabel className="mb-3 text-lg font-semibold block">Vehicle Gallery</FormLabel>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {galleryArray.fields.map((field, index) => (
                    <div key={field.id} className="relative group border rounded-xl p-1 bg-gray-50 flex flex-col items-center shadow-sm">
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
                        size="icon"
                        className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md"
                        onClick={() => galleryArray.remove(index)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="aspect-square border-dashed border-2 py-0 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-[#FE5300] rounded-xl transition-all"
                    onClick={() => galleryArray.append({ url: "", width: 0, height: 0, alt: "" })}
                  >
                    <div className="w-8 h-8 border-2 border-current border-dashed rounded-full flex items-center justify-center">
                      <span className="text-xl">+</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Add More</span>
                  </Button>
                </div>
              </div>

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-semibold">Detailed Description</FormLabel>
                    <FormControl>
                      <div className="border rounded-lg overflow-hidden min-h-[300px]">
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
            </TabsContent>

            {/* --- Additional Info Tab --- */}
            <TabsContent value="additional" className="space-y-6 pt-1 px-1">
              <div className="space-y-4">
                <Label className="text-lg font-semibold block underline decoration-[#FE5300] underline-offset-4">Vehicle Features</Label>
                <div className="flex flex-wrap gap-2 border rounded-xl p-4 bg-gray-50/50 min-h-[100px] items-start">
                  {form.watch("features")?.map((feat, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white border border-[#FE5300]/20 px-3 py-1.5 rounded-lg text-sm shadow-sm hover:border-[#FE5300] transition-colors">
                      <span className="text-gray-700 font-medium">{feat}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newFeats = form.getValues("features")?.filter((_, idx) => idx !== i);
                          form.setValue("features", newFeats);
                        }}
                        className="text-gray-400 hover:text-red-500 hover:scale-110 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <input
                    type="text"
                    className="flex-1 min-w-[200px] bg-transparent border-none focus:ring-0 focus:outline-none text-sm py-1.5"
                    placeholder="Type feature & press Enter..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          form.setValue("features", [...(form.getValues("features") || []), val]);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
                {/* Dynamic Inclusions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold block text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Inclusions
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[#FE5300] hover:bg-[#FE5300]/10 h-7 px-2 text-xs"
                      onClick={() => inclusionsArray.append({ value: "" })}
                    >
                      + Add Row
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {inclusionsArray.fields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 group">
                        <Input
                          placeholder="e.g. Helmet included"
                          className="h-9 text-sm rounded-lg border-gray-200 focus:border-[#FE5300]"
                          {...form.register(`inclusions.${index}.value`)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-gray-300 hover:text-red-500 hover:bg-red-50"
                          onClick={() => inclusionsArray.remove(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dynamic Exclusions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold block text-gray-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> Exclusions
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-[#FE5300] hover:bg-[#FE5300]/10 h-7 px-2 text-xs"
                      onClick={() => exclusionsArray.append({ value: "" })}
                    >
                      + Add Row
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {exclusionsArray.fields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 group">
                        <Input
                          placeholder="e.g. Fuel not included"
                          className="h-9 text-sm rounded-lg border-gray-200 focus:border-[#FE5300]"
                          {...form.register(`exclusions.${index}.value`)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-gray-300 hover:text-red-500 hover:bg-red-50"
                          onClick={() => exclusionsArray.remove(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t mt-4">
                <Label className="text-lg font-semibold block underline decoration-[#FE5300] underline-offset-4">Vehicle FAQs</Label>
                <div className="space-y-4">
                  {faqsArray.fields.map((field, index) => (
                    <div key={field.id} className="p-5 border rounded-2xl bg-white shadow-sm space-y-4 relative group hover:border-[#FE5300]/50 transition-colors border-gray-100">
                      <FormField
                        control={form.control}
                        name={`faqs.${index}.question`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold text-gray-700">Question {index + 1}</FormLabel>
                            <FormControl><Input placeholder="e.g. Is fuel included?" {...field} className="bg-gray-50/30" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                         <FormLabel className="font-bold text-gray-700">Answer</FormLabel>
                         <div className="border rounded-lg overflow-hidden">
                           <SmallEditor
                              value={form.watch(`faqs.${index}.answer`) || ""}
                              onChange={(val) => form.setValue(`faqs.${index}.answer`, val)}
                           />
                         </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => faqsArray.remove(index)}
                      >
                        <X className="w-4 h-4 mr-1" /> Delete FAQ
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 dashed font-semibold hover:bg-[#FE5300]/5 hover:text-[#FE5300] border-2 border-dashed border-gray-200"
                  onClick={() => faqsArray.append({ question: "", answer: "" })}
                >
                  + Add Question & Answer
                </Button>
              </div>
            </TabsContent>

            {/* --- SEO Tab --- */}
            <TabsContent value="seo" className="space-y-6 pt-1 px-1">
              <div className="grid md:grid-cols-1 gap-5">
                <FormField
                  control={form.control}
                  name="metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-gray-700">Meta Title</FormLabel>
                      <FormControl><Input placeholder="SEO Title for Search Results" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="metaDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-gray-700">Meta Description</FormLabel>
                      <FormControl><Textarea placeholder="Brief summary for search engine results" className="min-h-[100px]" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="canonicalUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-gray-700">Canonical URL</FormLabel>
                      <FormControl><Input placeholder="https://musafirbaba.com/rental/..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-gray-700">Excerpt (Short Summary)</FormLabel>
                      <FormControl><Input placeholder="Brief one-line introduction" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <Label className="block text-sm font-semibold text-gray-700">SEO Keywords</Label>
                <div className="flex flex-wrap gap-2 border rounded-xl p-4 bg-gray-50/50 min-h-[100px] items-start">
                  {form.watch("keywords")?.map((kw, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-white border border-blue-200 px-3 py-1.5 rounded-lg text-sm shadow-sm">
                      <span className="text-gray-700">{kw}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const newKw = form.getValues("keywords")?.filter((_, idx) => idx !== i);
                          form.setValue("keywords", newKw);
                        }}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <input
                    type="text"
                    className="flex-1 min-w-[200px] bg-transparent border-none focus:ring-0 focus:outline-none text-sm py-1.5"
                    placeholder="Add keywords (press comma or enter)..."
                    onKeyDown={(e) => {
                      if (e.key === "," || e.key === "Enter") {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          form.setValue("keywords", [...(form.getValues("keywords") || []), val]);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between gap-4 p-6 border-t mt-8 bg-gray-50/50 -mx-6 -mb-6 rounded-b-xl sticky bottom-0 z-20">
            <div className="flex items-center gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormLabel className="font-bold text-gray-600 uppercase text-[10px] tracking-widest">Post Status:</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="h-9 rounded-lg border-gray-300 bg-white px-3 text-sm font-semibold focus:ring-[#FE5300] outline-none border shadow-sm"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={mutation.isPending}
                className="px-6 h-11 font-medium border-gray-300 bg-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="px-10 h-11 font-bold bg-[#FE5300] hover:bg-[#e14a00] text-white shadow-lg shadow-[#FE5300]/20 transition-all uppercase tracking-wide"
              >
                {mutation.isPending ? "Connecting..." : (id ? "Update Records" : "Create Vehicle")}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {mutation.isError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm font-medium">
          Error: {mutation.error.message}
        </div>
      )}
    </div>
  );
};
