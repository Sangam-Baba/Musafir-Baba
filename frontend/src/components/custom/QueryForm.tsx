"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  UserRound,
  Mail,
  Phone,
  MessageCircleCode,
  CircleCheck,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import countryCodes from "country-codes-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const EnquiryFromSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  countryCode: z.string().default("+91"),
  phone: z.string().min(9, "Phone number is required"),
  message: z.string().min(1, "Message is required"),
  whatsapp: z.boolean().optional(),
  policy: z.boolean().refine((val) => val === true, {
    message: "Required",
  }),
  source: z.string(),
});

type EnquiryFromType = z.infer<typeof EnquiryFromSchema>;
const createContact = async (formData: EnquiryFromType) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Enquiry creation failed");
  }
  return res.json();
};

const createOtp = async (email: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/enquiry-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "OTP verification failed");
  }
  return res.json();
};

const verifyOtp = async (email: string, otp: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/enquiry-otp/verify-otp`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "OTP verification failed");
  }
  return res.json();
};
export default function QueryForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [openOtp, setOpenOtp] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const form = useForm<EnquiryFromType>({
    resolver: zodResolver(EnquiryFromSchema) as Resolver<EnquiryFromType>,
    defaultValues: {
      name: "",
      email: "",
      countryCode: "IN +91",
      phone: "",
      message: "",
      whatsapp: false,
      policy: false,
      source: pathname,
    },
  });
  const mutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      toast.success("Thank you for your enquiry!");
      router.push("/thank-you");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Enquiry failed");
      console.error(error);
    },
  });

  const handleCreateOtp = async (email: string) => {
    try {
      await createOtp(email);
      toast.success("OTP sent successfully");
      setOpenOtp(true);
    } catch (error) {
      console.error(error);
      toast.error("Could not send OTP");
    }
  };

  const handleVerifyOtp = async (email: string, otp: string) => {
    try {
      await verifyOtp(email, otp);
      toast.success("OTP verified successfully");
      setIsVerified(true);
    } catch (error) {
      console.error(error);
      toast.error("Could not verify OTP");
    }
  };
  function onSubmit(values: EnquiryFromType) {
    // console.log(`${values.countryCode}${values.phone}`);
    mutation.mutate({
      ...values,
      phone: `${values.countryCode}${values.phone}`,
    });
  }

  // Create country list
  const countryList = countryCodes.customList(
    "countryNameEn",
    "{countryCode} +{countryCallingCode}"
  );
  // console.log("countryList :", countryList);
  const countryOptions = Object.entries(countryList).map(
    ([countryKey, value]) => ({
      label: `${countryKey} ${value}`,
      value,
    })
  );
  // console.log("countryOptions :", countryOptions);
  return (
    <Card className="w-full mx-auto rounded-2xl shadow-lg p-1">
      <CardContent className="space-y-6 py-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h4 className="text-2xl font-bold text-gray-900">Get a Free Quote</h4>
          <div className="w-14 h-1 bg-orange-500 mx-auto rounded-full" />
          <p className="text-gray-600 text-sm">
            Share your trip details — get a custom plan instantly
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                      <UserRound className="w-5 h-5 text-orange-500" />
                      <Input
                        placeholder="John Doe"
                        {...field}
                        className="border-none p-0 shadow-none focus-visible:ring-0"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 items-center">
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                        <Mail className="w-5 h-5 text-orange-500" />
                        <Input
                          placeholder="john@gmail.com"
                          {...field}
                          className="border-none p-0 shadow-none focus-visible:ring-0"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                // disabled={!form.getValues("email")}
                onClick={() => handleCreateOtp(form.getValues("email"))}
                className="w-[20%] mt-5"
              >
                Get OTP
              </Button>
            </div>
            {/* Otp */}
            {openOtp && (
              <div className="flex items-center gap-2">
                <div className="w-[80%] space-y-2">
                  <FormLabel>Enter OTP</FormLabel>
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                    <Input
                      type="text"
                      placeholder="******"
                      className="border-none p-0 shadow-none focus-visible:ring-0"
                      onChange={(e) => {
                        if (e.target.value.length === 6) {
                          handleVerifyOtp(
                            form.getValues("email"),
                            e.target.value
                          );
                        }
                      }}
                    />
                    {isVerified && (
                      <CircleCheck
                        strokeWidth={3}
                        className="w-5 h-5 text-green-500"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => {
                const selectedCountry = countryOptions.find(
                  (c) => c.value === form.watch("countryCode")
                );

                return (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                        <Phone className="w-7 h-5 text-orange-500" />

                        {/* Country Code Select */}
                        <Select
                          value={form.watch("countryCode")}
                          onValueChange={(value) => {
                            form.setValue("countryCode", value);
                          }}
                        >
                          <SelectTrigger className="w-[130px] focus-visible:ring-0 focus-visible:ring-offset-0 border-none shadow-none">
                            {/* 👇 show VALUE after selection */}
                            {selectedCountry?.value || "Code"}
                          </SelectTrigger>

                          <SelectContent>
                            {countryOptions.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {/* 👇 dropdown shows LABEL */}
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Phone Input */}
                        <Input
                          placeholder="7345678901"
                          {...field}
                          className="border-none p-0 shadow-none focus-visible:ring-0"
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            field.onChange(value);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <div className="flex  gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                      <MessageCircleCode className="w-5 h-5 text-orange-500" />
                      <Textarea
                        placeholder="Write your travel plan or special requirements..."
                        className="min-h-[50px] border-none p-0 shadow-none focus-visible:ring-0"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Policy Agreement */}
            <FormField
              control={form.control}
              name="policy"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <Label className="text-sm text-gray-700 flex flex-wrap gap-1">
                    I agree to
                    <Link
                      href="/terms-and-conditions"
                      className="text-blue-600 hover:underline"
                    >
                      T&C
                    </Link>
                    and
                    <Link
                      href="/privacy-policy"
                      className="text-blue-600 hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </Label>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit */}
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-lg py-3 font-semibold"
            >
              {mutation.isPending ? "Sending..." : "Send Enquiry"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
