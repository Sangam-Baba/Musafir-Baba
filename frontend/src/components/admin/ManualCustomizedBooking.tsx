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
import { Package as PackageType } from "@/app/sitemap";
import type { Resolver } from "react-hook-form";

export interface Plan {
  title: string;
  include: string;
  price: string;
}
// 🧩 Schema
const formSchema = z.object({
  name: z.string().min(1, "Please enter a name"),
  email: z.string().email("Please enter a valid email"),
  phone: z.coerce.number().min(1000000000, "Please enter a valid phone number"),
  packageId: z.string().min(1, "Please select a package"),
  plan: z.string().min(1, "Please select a plan"),
  noOfPeople: z.coerce.number().min(1, "Please enter a valid number"),
  date: z.string().min(1, "Please select a date"),
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

const getAllPackages = async (accessToken: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch packages");
  const data = await res.json();
  return data?.data ?? [];
};

const createBooking = async (accessToken: string, formData: FormSchemaType) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourbooking/manual`,
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
export default function ManualCustomizedBookings({
  onClose,
}: {
  onClose: () => void;
}) {
  const accessToken = useAuthStore((state) => state.accessToken) as string;

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema) as Resolver<FormSchemaType>,
    defaultValues: {
      name: "",
      email: "",
      phone: 0,
      packageId: "",
      plan: "",
      noOfPeople: 0,
      date: "",
      totalPrice: 0,
      paymentMethod: "Cash",
      paymentInfo: { status: "Pending", payemntId: "" },
      bookingStatus: "Pending",
    },
  });

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["customized-packages"],
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

  const selectedPackage = packages.find(
    (p: PackageType) => p._id === form.watch("packageId")
  );

  const planTitle = form.watch("plan");
  const people = form.watch("noOfPeople");

  const selectedPlan = selectedPackage?.plans?.find(
    (b: Plan) => b.title === planTitle
  );

  useEffect(() => {
    if (!selectedPlan) {
      form.setValue("totalPrice", 0);
      return;
    }
    const total = selectedPlan.price * people;
    const totalWithTax = Math.ceil(total * 1.05); // 5% tax
    form.setValue("totalPrice", totalWithTax);
  }, [selectedPlan, people, form]);

  return (
    <div className="" onClick={(e) => e.stopPropagation()}>
      {/* <h1 className="text-2xl font-semibold mb-6">
        Manual Customized Bookings
      </h1> */}

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
                      form.setValue("plan", "");
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

          {/* Plan SELECTION */}
          {selectedPackage && (
            <FormField
              control={form.control}
              name="plan"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Package Plan</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded-md border p-2"
                      onChange={(e) => form.setValue("plan", e.target.value)}
                    >
                      <option value="">Select Plan</option>
                      {selectedPackage?.plans?.map((plan: Plan) => (
                        <option key={plan.title} value={plan.title}>
                          {plan.title}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Date Selection */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tour Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* TRAVELLERS */}
            <FormField
              control={form.control}
              name={`noOfPeople`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>No of People</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          <div className="grid md:grid-cols-3 gap-4">
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
          </div>

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
          <div className="grid grid-cols-2 gap-4">
            {/* SUBMIT */}
            <Button
              type="submit"
              disabled={mutation.isPending || isLoading}
              className="w-full mt-4 bg-[#FE5300] hover:bg-[#FE5300]/80"
            >
              {mutation.isPending ? "Submitting..." : "Submit Booking"}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              className="w-full mt-4 bg-red-400 hover:bg-red-500"
            >
              Close
            </Button>
          </div>
        </form>
      </Form>

      {mutation.isSuccess && (
        <p className="text-green-600 mt-2">✅ Booking Created</p>
      )}
      {mutation.isError && (
        <p className="text-red-600 mt-2">❌ {mutation.error?.message}</p>
      )}
    </div>
  );
}
