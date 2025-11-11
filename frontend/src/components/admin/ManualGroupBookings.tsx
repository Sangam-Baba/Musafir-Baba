"use client";
import React, { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Batch, Package as PackageType } from "@/app/sitemap";
import type { Resolver } from "react-hook-form";

// 🧩 Schema
const formSchema = z.object({
  name: z.string().min(1, "Please enter a name"),
  email: z.string().email("Please enter a valid email"),
  phone: z.coerce.number().min(1000000000, "Please enter a valid phone number"),
  packageId: z.string().min(1, "Please select a package"),
  batchId: z.string().min(1, "Please select a batch"),
  travellers: z.object({
    quad: z.coerce.number().min(0).optional(),
    triple: z.coerce.number().min(0).optional(),
    double: z.coerce.number().min(0).optional(),
    child: z.coerce.number().min(0).optional(),
  }),
  totalPrice: z.number().min(0),
  paymentMethod: z.enum(["Cash", "Payu", "Online"]).default("Cash"),
  paymentInfo: z.object({
    status: z.enum(["Pending", "Paid", "Failed"]).default("Pending"),
    payemntId: z.string().optional(),
  }),
  bookingStatus: z
    .enum(["Pending", "Confirmed", "Cancelled"])
    .default("Pending"),
});

type FormSchemaType = z.infer<typeof formSchema>;

// 🧠 API Calls
const getAllPackages = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/packages/all`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch packages");
  const data = await res.json();
  return Array.isArray(data?.data?.packages) ? data.data.packages : [];
};

const createBooking = async (accessToken: string, formData: FormSchemaType) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/booking/manual`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(formData),
    }
  );

  if (!res.ok) throw new Error("Booking creation failed");
  return res.json();
};

// 🧱 Component
export default function ManualGroupBookings({
  onClose,
}: {
  onClose: () => void;
}) {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const [price, setPrice] = React.useState(0);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema) as Resolver<FormSchemaType>,
    defaultValues: {
      name: "",
      email: "",
      phone: 0,
      packageId: "",
      batchId: "",
      travellers: {
        quad: 0,
        triple: 0,
        double: 0,
        child: 0,
      },
      totalPrice: 0,
      paymentMethod: "Cash",
      paymentInfo: { status: "Pending", payemntId: "" },
      bookingStatus: "Pending",
    },
  });

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: () => getAllPackages(accessToken),
  });

  const mutation = useMutation({
    mutationFn: (values: FormSchemaType) => createBooking(accessToken, values),
    onSuccess: () => toast.success("Booking created successfully"),
    onError: (err) => toast.error(err?.message || "Error creating booking"),
  });

  const onSubmit = (values: FormSchemaType) => {
    mutation.mutate(values);
  };

  // ✅ Watch for package selection
  const selectedPackage = packages.find(
    (p: PackageType) => p._id === form.watch("packageId")
  );
  // ✅ Watch specific fields
  const quad = form.watch("travellers.quad");
  const triple = form.watch("travellers.triple");
  const double = form.watch("travellers.double");
  const child = form.watch("travellers.child");
  const batchId = form.watch("batchId");

  const selectedBatch = selectedPackage?.batch?.find(
    (b: Batch) => b._id === batchId
  );

  useEffect(() => {
    if (!selectedBatch) {
      setPrice(0);
      form.setValue("totalPrice", 0);
      return;
    }

    const total =
      (selectedBatch.quad ?? 0) * (quad ?? 0) +
      (selectedBatch.triple ?? 0) * (triple ?? 0) +
      (selectedBatch.double ?? 0) * (double ?? 0) +
      (selectedBatch.child ?? 0) * (child ?? 0);

    const totalWithTax = Math.ceil(total * 1.05); // 5% tax
    setPrice(totalWithTax);
    form.setValue("totalPrice", totalWithTax);
  }, [selectedBatch, quad, triple, double, child, form]);

  return (
    <div
      className="bg-white rounded-xl shadow-2xl max-w-3xl max-h-[90vh] overflow-y-auto p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <h1 className="text-2xl font-semibold mb-6">Manual Group Bookings</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* USER INFO */}
          <div className="grid md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="John Doe" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="john@doe.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="9876543210" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* PACKAGE SELECTION */}
          <FormField
            control={form.control}
            name="packageId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Package</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full rounded-md border p-2"
                    onChange={(e) => {
                      form.setValue("packageId", e.target.value);
                      form.setValue("batchId", "");
                    }}
                  >
                    <option value="">Select Package</option>
                    {packages.map((pack: PackageType) => (
                      <option key={pack._id} value={pack._id}>
                        {pack.title}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* BATCH SELECTION */}
          {selectedPackage && (
            <FormField
              control={form.control}
              name="batchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded-md border p-2"
                      onChange={(e) => form.setValue("batchId", e.target.value)}
                    >
                      <option value="">Select Batch</option>
                      {selectedPackage?.batch?.map((batch: Batch) => (
                        <option key={batch._id} value={batch._id}>
                          {batch.name} — {batch.startDate.split("T")[0]} →{" "}
                          {batch.endDate.split("T")[0]} (Quad: {batch.quad},
                          Triple: {batch.triple}, Double: {batch.double}, Child:{" "}
                          {batch.child})
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* TRAVELLERS */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Travellers</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(["quad", "triple", "double", "child"] as const).map((type) => (
                <FormField
                  key={type}
                  control={form.control}
                  name={`travellers.${type}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="capitalize">{type}</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>
          <FormField
            control={form.control}
            name="totalPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Price with Tax</FormLabel>
                <FormControl>
                  <Input type="number" {...field} readOnly />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* PAYMENT INFO */}
          <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full rounded-md border p-2"
                    onChange={(e) =>
                      form.setValue(
                        "paymentMethod",
                        e.target.value as "Cash" | "Online" | "Payu"
                      )
                    }
                  >
                    <option value="">Select Method</option>
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="Payu">PayU</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("paymentMethod") === "Online" && (
            <FormField
              control={form.control}
              name="paymentInfo.payemntId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment ID</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter Payment ID" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="paymentInfo.status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Status</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full rounded-md border p-2"
                    onChange={(e) =>
                      form.setValue(
                        "paymentInfo.status",
                        e.target.value as "Pending" | "Paid" | "Failed"
                      )
                    }
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Failed">Failed</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bookingStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Booking Status</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full rounded-md border p-2"
                    onChange={(e) =>
                      form.setValue(
                        "bookingStatus",
                        e.target.value as "Pending" | "Confirmed" | "Cancelled"
                      )
                    }
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* SUBMIT */}
          <Button
            type="submit"
            disabled={mutation.isPending || isLoading}
            className="w-full mt-4"
          >
            {mutation.isPending ? "Submitting..." : "Submit Booking"}
          </Button>
        </form>
      </Form>

      {mutation.isSuccess && (
        <p className="text-green-600 mt-2">✅ Booking Created</p>
      )}
      {mutation.isError && (
        <p className="text-red-600 mt-2">❌ {mutation.error?.message}</p>
      )}
      <Button type="button" onClick={onClose} className="w-full mt-4">
        Close
      </Button>
    </div>
  );
}
