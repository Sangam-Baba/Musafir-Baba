"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useBookingStore } from "@/store/useBookingStore";
import { useAuthStore } from "@/store/useAuthStore";
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
import { Textarea } from "@/components/ui/textarea";

/* ---------- Types ---------- */
interface Destination {
  _id: string;
  name: string;
  country: string;
  state: string;
  city?: string;
  description: string;
  coverImage: string;
  slug: string;
}
interface Price {
  adult: number;
  child: number;
  currency: string;
}
interface Package {
  _id: string;
  title: string;
  description: string;
  destination: Destination;
  coverImage: string;
  gallery: string[];
  price: Price;
  slug: string;
}

/* ---------- Form schema ---------- */
const formSchema = z.object({
  packageId: z.string().min(1),
  firstName: z.string().min(2).max(50),
  lastName: z.string().max(50).optional(),
  email: z.string().email(),
  phone: z.string().min(10).max(15).regex(/^[0-9+\-\s()]+$/),
  specialRequests: z.string().max(500).optional(),
  totalPrice: z.number().nonnegative(),
  travelDate: z.string().optional(),
  paymentMethod: z.enum(["PayU", "Card", "UPI", "NetBanking"]),
  address: z
    .object({ city: z.string().min(2).max(50), state: z.string().min(2).max(50), zipcode: z.string().min(3).max(10) })
    .optional(),
  travellers: z.object({ adult: z.number().int().nonnegative(), child: z.number().int().nonnegative() }),
});
type BookingFormValues = z.infer<typeof formSchema>;

/* ---------- API call (sends auth if available) ---------- */
async function bookPkgApi(values: BookingFormValues, accessToken?: string | null) {
    console.log("Access Token got :",accessToken)
  const headers: Record<string, string> = { "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`,
   };
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/booking/`, {
    method: "POST",
    headers,
    credentials: "include", // still include cookies if server expects them
    body: JSON.stringify(values),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || "Booking failed");
  }

  return res.json();
}

/* ---------- Component ---------- */
export default function BookingClient({
  pkg,
  initialAdults = 1,
  initialChildren = 0,
  initialPrice = 0,
}: {
  pkg: Package;
  initialAdults?: number;
  initialChildren?: number;
  initialPrice?: number;
}) {
  const router = useRouter();

  // Prefer token from auth store; fallback to localStorage (if you use that)
  const accessTokenFromStore = useAuthStore((s) => s.accessToken ?? null);


  // Zustand selections (client-side)
  const { adults, children, price, date } = useBookingStore();

  // compute final total (GST applied client-side for display only)
  const finalTotal = useMemo(() => {
    const base = price && price > 0 ? price : initialPrice;
    return Math.round(base * 1.05);
  }, [price, initialPrice]);

  // hooks (always top-level)
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      packageId: pkg._id,
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      specialRequests: "",
      totalPrice: finalTotal,
      travelDate: date ?? "",
      paymentMethod: "PayU",
      address: undefined,
      travellers: { adult: adults ?? initialAdults, child: children ?? initialChildren },
    },
  });

  // mutation uses the current token value from closure when mutate() is called
  const mutation = useMutation({
    mutationFn: ({ payload, token }: { payload: BookingFormValues; token?: string | null }) =>
      bookPkgApi(payload, token),
  });

  // sync derived values into the form when they change
  useEffect(() => {
    form.setValue("packageId", pkg._id);
    form.setValue("totalPrice", finalTotal);
    form.setValue("travellers", { adult: adults ?? initialAdults, child: children ?? initialChildren });
    if (date) form.setValue("travelDate", date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg._id, finalTotal, adults, children, date]);

  const onSubmit = (values: BookingFormValues) => {
    // pick freshest token: auth store first, then fallback to localStorage
    const token = accessTokenFromStore ?? null;

    const payload: BookingFormValues = {
      ...values,
      travellers: {
        adult: Number(values.travellers?.adult ?? adults ?? initialAdults),
        child: Number(values.travellers?.child ?? children ?? initialChildren),
      },
      totalPrice: finalTotal,
      packageId: pkg._id,
    };

    if (mutation.isPending) return;

    // pass both payload and token to mutation so bookPkgApi can include Authorization header
    mutation.mutate(
      { payload, token },
      {
        onSuccess: (res) => {
          toast.success("Booking created");
          const id = res?.data?._id ?? null;
          if (id) router.replace(`/payment/${id}`);
          else router.replace("/payment");
        },
        onError: (err) => {
          toast.error(err?.message || "Booking failed");
        },
      }
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-semibold mb-4">{pkg.title}</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl><Input {...field} placeholder="John" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem>
                <FormLabel>Last name</FormLabel>
                <FormControl><Input {...field} placeholder="Doe" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input {...field} type="email" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Travel date */}
          <FormField control={form.control} name="travelDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Travel date</FormLabel>
              <FormControl><Input {...field} type="date" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Travellers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="travellers.adult" render={({ field }) => (
              <FormItem>
                <FormLabel>Adults</FormLabel>
                <FormControl><Input {...field} type="number" min={0} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="travellers.child" render={({ field }) => (
              <FormItem>
                <FormLabel>Children</FormLabel>
                <FormControl><Input {...field} type="number" min={0} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Special requests */}
          <FormField control={form.control} name="specialRequests" render={({ field }) => (
            <FormItem>
              <FormLabel>Special requests</FormLabel>
              <FormControl><Textarea {...field} /></FormControl>
            </FormItem>
          )} />

          {/* Payment */}
          <FormField control={form.control} name="paymentMethod" render={({ field }) => (
            <FormItem>
              <FormLabel>Payment method</FormLabel>
              <FormControl><Input {...field} list="pmethods" placeholder="Razorpay" /></FormControl>
              <datalist id="pmethods"><option value="Razorpay" /><option value="UPI" /><option value="Card" /><option value="NetBanking" /></datalist>
              <FormMessage />
            </FormItem>
          )} />

          {/* Summary */}
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <p className="text-sm text-gray-500">Package</p>
              <p className="font-medium">{pkg.title}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{adults ?? initialAdults} adult(s) · {children ?? initialChildren} child(ren)</p>
              <p className="text-xl font-semibold">₹{finalTotal}</p>
            </div>
          </div>

          <Button type="submit" disabled={mutation.isPending} className="w-full">
            {mutation.isPending ? "Processing..." : "Proceed to Payment"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
