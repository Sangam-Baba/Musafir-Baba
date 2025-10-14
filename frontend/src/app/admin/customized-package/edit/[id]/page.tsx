"use client";

import React, { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader } from "@/components/custom/loader";

interface Destination {
  _id: string;
  name: string;
  country: string;
  state: string;
  city: string;
}

// ✅ Schema
const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters."),
  destination: z.string().min(2, "Destination is required."),
  price: z.coerce.number().min(1, "Price must be at least 1."),
  city: z
    .array(
      z.object({
        name: z.string().min(2, "City must be at least 2 characters."),
      })
    )
    .optional()
    .default([]),
  transport: z
    .array(
      z.object({
        vehicleType: z.string().min(2, "Vehicle type is required."),
        price: z.coerce.number().min(1, "Price must be at least 1."),
        maxPeople: z.coerce.number().min(1, "Max people must be at least 1."),
      })
    )
    .optional()
    .default([]),
  hotel: z
    .array(
      z.object({
        star: z.string().min(1, "Hotel star is required."),
        quadPrice: z.coerce.number().min(1, "Quad price must be at least 1."),
        doublePrice: z.coerce
          .number()
          .min(1, "Double price must be at least 1."),
        triplePrice: z.coerce
          .number()
          .min(1, "Triple price must be at least 1."),
      })
    )
    .optional()
    .default([]),
  mealType: z
    .array(
      z.object({
        name: z.string().min(2, "Meal type is required."),
        price: z.coerce.number().min(1, "Price must be at least 1."),
      })
    )
    .optional()
    .default([]),
  activities: z
    .array(
      z.object({
        name: z.string().min(2, "Activity name must be at least 2 characters."),
        price: z.coerce.number().min(1, "Price must be at least 1."),
      })
    )
    .optional()
    .default([]),
  tourGuide: z
    .array(
      z.object({
        name: z
          .string()
          .min(2, "Tour guide name must be at least 2 characters."),
        price: z.coerce.number().min(1, "Price must be at least 1."),
      })
    )
    .optional()
    .default([]),
  status: z.string().min(2, "Status is required."),
});

type FormData = z.infer<typeof formSchema>;

// ✅ API helpers
const updateCustomizedPackage = async (
  data: FormData,
  accessToken: string,
  id: string
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedpackage/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to update customized package");
  }

  return res.json();
};

const getCustomizedPackage = async (accessToken: string, id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedpackage/${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to get customized package");
  const data = await res.json();
  return data?.data;
};
const getDestination = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/destination`);
  if (!res.ok) throw new Error("Failed to get destinations");
  const data = await res.json();
  return data?.data || [];
};

// ✅ Component
export default function Page({ params }: { params: { id: string } }) {
  const router = useRouter();
  const id = params.id as string;
  const { accessToken } = useAuthStore();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      destination: "",
      price: 0,
      city: [],
      transport: [],
      hotel: [],
      mealType: [],
      activities: [],
      tourGuide: [],
      status: "active",
    },
  });

  const cityArray = useFieldArray({ control: form.control, name: "city" });
  const transportArray = useFieldArray({
    control: form.control,
    name: "transport",
  });
  const hotelArray = useFieldArray({ control: form.control, name: "hotel" });
  const mealArray = useFieldArray({ control: form.control, name: "mealType" });
  const activityArray = useFieldArray({
    control: form.control,
    name: "activities",
  });
  const tourGuideArray = useFieldArray({
    control: form.control,
    name: "tourGuide",
  });

  const {
    data: customizedPackage,
    isLoading: pkgLoading,
    isError: pkgError,
  } = useQuery({
    queryKey: ["customizedpackage", id],
    queryFn: () => getCustomizedPackage(accessToken as string, id),
  });
  const {
    data: destinations,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["destination"],
    queryFn: getDestination,
  });

  useEffect(() => {
    if (customizedPackage) {
      form.reset(customizedPackage);
    }
  }, [customizedPackage, form]);
  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      updateCustomizedPackage(values, accessToken as string, id),
    onSuccess: () => {
      toast.success("Customized package update successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create package");
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    mutation.mutate(data);
  });

  if (isLoading) return <Loader size="lg" message="Loading destinations..." />;
  if (isError)
    return <h1 className="text-red-500">{(error as Error).message}</h1>;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
      <h1 className="text-3xl font-bold mt-6 mb-2">
        Create New Customized Package
      </h1>

      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter package title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Destination */}
          <FormField
            control={form.control}
            name="destination"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Destination</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full rounded-md border border-gray-300 p-2"
                    value={field.value || ""}
                  >
                    <option value="">Select destination</option>
                    {destinations?.map((d: Destination) => (
                      <option key={d._id} value={d._id}>
                        {d.state.toUpperCase()} ({d.country})
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Price */}
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Base Price</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="5000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Cities */}
          <div>
            <FormLabel className="text-lg font-semibold">
              Visiting Places
            </FormLabel>
            {cityArray.fields.map((item, index) => (
              <div key={item.id} className="flex gap-2 mb-2">
                <Input
                  {...form.register(`city.${index}.name`)}
                  placeholder="Enter visiting place"
                />
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => cityArray.remove(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={() => cityArray.append({ name: "" })}
            >
              Add Place
            </Button>
          </div>

          {/* Transport */}
          <div>
            <FormLabel className="text-lg font-semibold">
              Transportation
            </FormLabel>
            {transportArray.fields.map((item, index) => (
              <div key={item.id} className="flex flex-wrap gap-2 mb-2">
                <select
                  {...form.register(`transport.${index}.vehicleType`)}
                  className="border p-2 rounded-md"
                >
                  <option value="">Select vehicle</option>
                  <option value="5-Seater">5-Seater</option>
                  <option value="7-Seater">7-Seater</option>
                  <option value="12-Seater">12-Seater</option>
                </select>
                <Input
                  type="number"
                  placeholder="Max People"
                  {...form.register(`transport.${index}.maxPeople`)}
                />
                <Input
                  type="number"
                  placeholder="Price"
                  {...form.register(`transport.${index}.price`)}
                />
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => transportArray.remove(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={() =>
                transportArray.append({
                  vehicleType: "",
                  maxPeople: 0,
                  price: 0,
                })
              }
            >
              Add Transport
            </Button>
          </div>

          {/* Hotel */}
          <div>
            <FormLabel className="text-lg font-semibold">
              Hotel Details
            </FormLabel>
            {hotelArray.fields.map((item, index) => (
              <div key={item.id} className="flex flex-wrap gap-2 mb-2">
                <select
                  {...form.register(`hotel.${index}.star`)}
                  className="border p-2 rounded-md"
                >
                  <option value="">Select Star</option>
                  <option value="5">⭐⭐⭐⭐⭐</option>
                  <option value="4">⭐⭐⭐⭐</option>
                  <option value="3">⭐⭐⭐</option>
                  <option value="2">⭐⭐</option>
                  <option value="1">⭐</option>
                </select>
                <Input
                  type="number"
                  placeholder="Quad Price"
                  {...form.register(`hotel.${index}.quadPrice`)}
                />
                <Input
                  type="number"
                  placeholder="Double Price"
                  {...form.register(`hotel.${index}.doublePrice`)}
                />
                <Input
                  type="number"
                  placeholder="Triple Price"
                  {...form.register(`hotel.${index}.triplePrice`)}
                />
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => hotelArray.remove(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={() =>
                hotelArray.append({
                  star: "",
                  quadPrice: 0,
                  doublePrice: 0,
                  triplePrice: 0,
                })
              }
            >
              Add Hotel
            </Button>
          </div>

          {/* Meals */}
          <div>
            <FormLabel className="text-lg font-semibold">
              Meal Options
            </FormLabel>
            {mealArray.fields.map((item, index) => (
              <div key={item.id} className="flex gap-2 mb-2">
                <select
                  {...form.register(`mealType.${index}.name`)}
                  className="border p-2 rounded-md"
                >
                  <option value="">Select Meal Type</option>
                  <option value="Veg">Veg</option>
                  <option value="NonVeg">Non-Veg</option>
                  <option value="Jain">Jain</option>
                </select>
                <Input
                  type="number"
                  placeholder="Meal Price"
                  {...form.register(`mealType.${index}.price`)}
                />
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => mealArray.remove(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={() => mealArray.append({ name: "", price: 0 })}
            >
              Add Meal
            </Button>
          </div>

          {/* Activities */}
          <div>
            <FormLabel className="text-lg font-semibold">Activities</FormLabel>
            {activityArray.fields.map((item, index) => (
              <div key={item.id} className="flex gap-2 mb-2">
                <Input
                  placeholder="Activity Name"
                  {...form.register(`activities.${index}.name`)}
                />
                <Input
                  type="number"
                  placeholder="Price"
                  {...form.register(`activities.${index}.price`)}
                />
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => activityArray.remove(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={() => activityArray.append({ name: "", price: 0 })}
            >
              Add Activity
            </Button>
          </div>

          {/* Tour Guides */}
          <div>
            <FormLabel className="text-lg font-semibold">Tour Guide</FormLabel>
            {tourGuideArray.fields.map((item, index) => (
              <div key={item.id} className="flex gap-2 mb-2">
                <select
                  {...form.register(`tourGuide.${index}.name`)}
                  className="border p-2 rounded-md"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <Input
                  type="number"
                  placeholder="Guide Price"
                  {...form.register(`tourGuide.${index}.price`)}
                />
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => tourGuideArray.remove(index)}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              onClick={() => tourGuideArray.append({ name: "", price: 0 })}
            >
              Add Tour Guide
            </Button>
          </div>
          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full rounded-md border border-gray-300 p-2"
                  >
                    <option value="" disabled>
                      Select Status
                    </option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={mutation.isPending} className="mt-4">
            {mutation.isPending ? "Submitting..." : "Create Package"}
          </Button>
        </form>
      </Form>
      {mutation.isError && (
        <p className="text-red-500">{mutation.error.message}</p>
      )}
      {mutation.isSuccess && (
        <p className="text-green-500">Package updated successfully</p>
      )}
    </div>
  );
}
