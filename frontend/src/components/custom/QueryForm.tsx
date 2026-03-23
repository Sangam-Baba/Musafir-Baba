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
  MapPin,
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
import { INDIAN_STATES_AND_CITIES, INDIAN_STATES } from "@/lib/indiaData";

const EnquiryFromSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  countryCode: z.string().default("+91"),
  phone: z.string().min(9, "Phone number is required"),
  state: z.string().optional(),
  city: z.string().optional(),
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
    },
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
      state: "",
      city: "",
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
    "{countryCode} +{countryCallingCode}",
  );
  // console.log("countryList :", countryList);
  const countryOptions = Object.entries(countryList).map(
    ([countryKey, value]) => ({
      label: `${countryKey} ${value}`,
      value,
    }),
  );

  const selectedState = form.watch("state");
  const cityOptions = selectedState && INDIAN_STATES_AND_CITIES[selectedState] 
    ? INDIAN_STATES_AND_CITIES[selectedState] 
    : [];

  return (
    <Card className="w-full mx-auto rounded-2xl shadow-lg p-1">
      <CardContent className="space-y-6 py-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h4 className="text-lg md:text-2xl font-bold text-gray-900">
            Get a Free Quote
          </h4>
          <div className="w-14 h-1 bg-orange-500 mx-auto rounded-full" />
          <p className="text-gray-600 text-sm">
            Share your trip details — get a custom plan instantly
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="relative pt-2 space-y-0">
                  <FormLabel className="absolute top-0 left-4 bg-white px-1.5 text-[11px] text-gray-500 font-semibold z-10 transition-colors">Name</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                      <UserRound className="w-5 h-5 text-orange-500 shrink-0" />
                      <Input
                        placeholder="John Doe"
                        {...field}
                        className="border-none p-0 shadow-none focus-visible:ring-0 min-w-0"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="mt-1 text-[10px]" />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-4 gap-2 items-start">
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="col-span-3 relative pt-2 space-y-0">
                    <FormLabel className="absolute top-0 left-4 bg-white px-1.5 text-[11px] text-gray-500 font-semibold z-10 transition-colors">Email</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                        <Mail className="w-5 h-5 text-orange-500 shrink-0" />
                        <Input
                          placeholder="john@gmail.com"
                          {...field}
                          className="border-none p-0 shadow-none focus-visible:ring-0 min-w-0"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="mt-1 text-[10px]" />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                onClick={() => handleCreateOtp(form.getValues("email"))}
                className="col-span-1 h-[42px] mt-2 text-xs md:text-sm px-2"
              >
                Get OTP
              </Button>
            </div>
            {/* Otp */}
            {openOtp && (
              <div className="flex items-center gap-2 mt-1">
                <div className="w-[80%] relative pt-2">
                  <FormLabel className="absolute top-0 left-4 bg-white px-1.5 text-[11px] text-gray-500 font-semibold z-10">Enter OTP</FormLabel>
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                    <Input
                      type="text"
                      placeholder="******"
                      className="border-none p-0 shadow-none focus-visible:ring-0"
                      onChange={(e) => {
                        if (e.target.value.length === 6) {
                          handleVerifyOtp(
                            form.getValues("email"),
                            e.target.value,
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
                  (c) => c.value === form.watch("countryCode"),
                );

                return (
                  <FormItem className="relative pt-2 space-y-0">
                    <FormLabel className="absolute top-0 left-4 bg-white px-1.5 text-[11px] text-gray-500 font-semibold z-10 transition-colors">Phone</FormLabel>
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
                          className="border-none p-0 shadow-none focus-visible:ring-0 min-w-0"
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            field.onChange(value);
                          }}
                        />

                        {/* WhatsApp Quick Toggle */}
                        <div className="flex items-center gap-1.5 shrink-0 border-l border-gray-200 pl-3 pr-1" title="Available on WhatsApp?">
                          <Checkbox
                            id="whatsapp-inline"
                            checked={form.watch("whatsapp")}
                            onCheckedChange={(val) => form.setValue("whatsapp", val === true)}
                            className="w-4 h-4 text-green-600 border-gray-400 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                          />
                          <Label htmlFor="whatsapp-inline" className="cursor-pointer flex items-center justify-center mt-0.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="text-green-500 hover:text-green-600 transition">
                              <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
                            </svg>
                          </Label>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className="mt-1 text-[10px]" />
                  </FormItem>
                );
              }}
            />

            {/* State and City */}
            <div className="flex flex-wrap gap-3 w-full">
              <div className="flex-1 min-w-[140px]">
                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem className="relative pt-2 space-y-0">
                      <FormLabel className="absolute top-0 left-4 bg-white px-1.5 text-[11px] text-gray-500 font-semibold z-10 transition-colors">State</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                          <MapPin className="w-5 h-5 text-orange-500 shrink-0" />
                          <Select
                            value={field.value || ""}
                            onValueChange={(val) => {
                              field.onChange(val);
                              form.setValue("city", "");
                            }}
                          >
                            <SelectTrigger className="w-full focus-visible:ring-0 focus-visible:ring-offset-0 border-none shadow-none text-left px-0 h-auto">
                              <span className={!field.value ? "text-muted-foreground" : "text-foreground"}>
                                {field.value || "Select State"}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              {INDIAN_STATES.map((stateItem) => (
                                <SelectItem key={stateItem} value={stateItem}>
                                  {stateItem}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </FormControl>
                      <FormMessage className="mt-1 text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex-1 min-w-[140px]">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="relative pt-2 space-y-0">
                      <FormLabel className="absolute top-0 left-4 bg-white px-1.5 text-[11px] text-gray-500 font-semibold z-10 transition-colors">City</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                          <MapPin className="w-5 h-5 text-orange-500 shrink-0" />
                          <Select
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            disabled={!selectedState}
                          >
                            <SelectTrigger className="w-full focus-visible:ring-0 focus-visible:ring-offset-0 border-none shadow-none text-left px-0 h-auto disabled:opacity-50">
                              <span className={!field.value ? "text-muted-foreground" : "text-foreground"}>
                                {field.value || "Select City"}
                              </span>
                            </SelectTrigger>
                            <SelectContent>
                              {cityOptions.length > 0 ? (
                                cityOptions.map((cityItem) => (
                                  <SelectItem key={cityItem} value={cityItem}>
                                    {cityItem}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>Select a state first</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </FormControl>
                      <FormMessage className="mt-1 text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="relative pt-2 space-y-0">
                  <FormLabel className="absolute top-0 left-4 bg-white px-1.5 text-[11px] text-gray-500 font-semibold z-10 transition-colors">Message</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition">
                      <MessageCircleCode className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                      <Textarea
                        placeholder="Write your travel plan or special requirements..."
                        className="min-h-[50px] border-none p-0 shadow-none focus-visible:ring-0 min-w-0"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="mt-1 text-[10px]" />
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
