"use client";

import { useState, useEffect, useMemo } from "react";
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
  RefreshCcw,
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
import Image from "next/image";
import { State, City } from "country-state-city";

const EnquiryFromSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  countryCode: z.string().default("+91"),
  phone: z.string().min(9, "Phone number is required"),
  state: z.string().optional(),
  city: z.string().optional(),
  message: z.string().optional(),
  interests: z.array(z.string()).default([]),
  whatsapp: z.boolean().default(false),
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

export default function QueryForm({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [captcha, setCaptcha] = useState({ n1: 0, n2: 0 });
  const [userAnswer, setUserAnswer] = useState("");
  const isHumanVerified = parseInt(userAnswer) === captcha.n1 + captcha.n2;

  const generateCaptcha = () => {
    let n1, n2;
    const rand = Math.random();
    if (rand < 0.4) {
      n1 = Math.floor(Math.random() * 900) + 100;
      n2 = Math.floor(Math.random() * 9) + 1;
    } else {
      n1 = Math.floor(Math.random() * 99) + 1;
      n2 = Math.floor(Math.random() * 99) + 1;
    }
    setCaptcha({ n1, n2 });
    setUserAnswer("");
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

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
      interests: [],
      whatsapp: false,
      policy: false,
      source: pathname,
    },
  });

  // Watchers for dynamic location selection
  const countryCodeValue = form.watch("countryCode");
  const countryIso = countryCodeValue?.split(" ")[0] || ""; // e.g. "IN"
  const stateNameValue = form.watch("state");
  const selectedInterests = form.watch("interests") || [];

  // Get dynamic state list
  const stateData = useMemo(() => {
    return countryIso ? State.getStatesOfCountry(countryIso) : [];
  }, [countryIso]);

  // Find the selected state's ISO code for cities
  const selectedStateIso = useMemo(() => {
    return stateData.find((s) => s.name === stateNameValue)?.isoCode || "";
  }, [stateData, stateNameValue]);

  // Get dynamic city list
  const cityData = useMemo(() => {
    return countryIso && selectedStateIso
      ? City.getCitiesOfState(countryIso, selectedStateIso)
      : [];
  }, [countryIso, selectedStateIso]);

  // Reset dependent fields when parent selection changes
  useEffect(() => {
    form.setValue("state", "");
    form.setValue("city", "");
  }, [countryIso, form]);

  useEffect(() => {
    form.setValue("city", "");
  }, [stateNameValue, form]);

  const mutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      toast.success("Thank you for your enquiry!");
      router.push("/thank-you");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Enquiry failed");
      console.error(error);
      generateCaptcha();
    },
  });

  function onSubmit(values: EnquiryFromType) {
    if (!isHumanVerified) {
      toast.error("Invalid Math Answer");
      return;
    }

    if (stateData.length > 0 && !values.state) {
      form.setError("state", { message: "State is required", type: "manual" });
      toast.error("Please select a state.");
      return;
    }

    // Process interests and message
    const coreInterests = (values.interests || []).filter(i => i !== "other");
    let finalMessage = coreInterests.join(", ");
    
    if (values.interests?.includes("other") && values.message) {
      finalMessage = finalMessage 
        ? `${finalMessage}\n\nAdditional Details: ${values.message}`
        : values.message;
    }

    mutation.mutate({
      ...values,
      message: finalMessage || "General Enquiry",
      phone: `${values.countryCode}${values.phone}`,
    });
  }

  const countryListRaw = countryCodes.customList(
    "countryCode",
    "{countryNameEn}::{flag}::{countryCode} +{countryCallingCode}",
  );
  const countryOptions = Object.values(countryListRaw)
    .map((rawString) => {
      const [countryKey, flag, value] = rawString.split("::");
      return {
        label: `${flag} ${countryKey} ${value}`,
        value,
        flag,
        callingCode: value.split(" ")[1],
      };
    })
    .filter((item, index, self) => index === self.findIndex((t) => t.value === item.value));

  const interestOptions = [
    { id: "visa", label: "Visa" },
    { id: "rental", label: "Rental" },
    { id: "packages", label: "Tour Packages" },
    { id: "other", label: "Other" },
  ];

  return (
    <Card className={`w-full max-w-[480px] mx-auto rounded-2xl shadow-xl p-0 ${className || ""}`}>
      <CardContent className="space-y-3 p-4 md:p-6">
        <div className="text-center space-y-0.5">
          <h4 className="text-lg md:text-xl font-extrabold text-gray-900 tracking-tight">
            Get a Free Quote
          </h4>
          <div className="w-10 h-0.5 bg-orange-500 mx-auto rounded-full" />
          <p className="text-gray-500 text-[12px] font-medium">
            Share trip details — get a custom plan
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="relative pt-1.5">
                  <FormControl>
                    <div className="relative flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition-all">
                      <UserRound className="w-5 h-5 text-orange-500" />
                      <Input
                        placeholder=" "
                        {...field}
                        className="peer border-none p-0 shadow-none focus-visible:ring-0 min-w-0 bg-transparent"
                      />
                      <FormLabel className="absolute text-[13px] text-gray-400 duration-300 transform -translate-y-4 scale-[0.8] top-1.5 z-10 origin-[0] bg-white px-1 peer-focus:px-1 peer-focus:text-orange-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-1.5 peer-focus:scale-[0.8] peer-focus:-translate-y-4 left-9 pointer-events-none">
                        Name <span className="text-red-500">*</span>
                      </FormLabel>
                    </div>
                  </FormControl>
                  <FormMessage className="mt-1 text-[10px]" />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="relative pt-1.5">
                    <FormControl>
                      <div className="relative flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition-all">
                        <Mail className="w-4 h-4 text-orange-500" />
                        <Input
                          placeholder=" "
                          {...field}
                          className="peer border-none p-0 shadow-none focus-visible:ring-0 min-w-0 bg-transparent"
                        />
                        <FormLabel className="absolute text-[13px] text-gray-400 duration-300 transform -translate-y-4 scale-[0.8] top-1.5 z-10 origin-[0] bg-white px-1 peer-focus:px-1 peer-focus:text-orange-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-1.5 peer-focus:scale-[0.8] peer-focus:-translate-y-4 left-9 pointer-events-none">
                          Email <span className="text-red-500">*</span>
                        </FormLabel>
                      </div>
                    </FormControl>
                    <FormMessage className="mt-1 text-[10px]" />
                  </FormItem>
                )}
              />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => {
                const selectedCountry = countryOptions.find(
                  (c) => c.value === form.watch("countryCode"),
                );

                return (
                  <FormItem className="relative pt-1.5">
                    <FormControl>
                      <div className="relative flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition-all">
                        <Phone className="w-4 h-4 text-orange-500 shrink-0" />

                        <Select
                          value={form.watch("countryCode")}
                          onValueChange={(value) => {
                            form.setValue("countryCode", value);
                          }}
                        >
                          <SelectTrigger className="w-[80px] md:w-[100px] h-8 focus-visible:ring-0 focus-visible:ring-offset-0 border-none shadow-none text-sm p-0">
                            {selectedCountry ? (
                              <span className="flex items-center gap-1.5 whitespace-nowrap">
                                <span className="text-[20px] leading-none">{selectedCountry.flag}</span>
                                <span>{selectedCountry.callingCode}</span>
                              </span>
                            ) : (
                              "Code"
                            )}
                          </SelectTrigger>

                          <SelectContent>
                            {countryOptions.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                <span className="flex items-center gap-2">
                                  <span className="text-[20px] leading-none">{item.flag}</span>
                                  <span>{item.label.replace(item.flag + " ", "")}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Input
                          placeholder=" "
                          {...field}
                          className="peer border-none bg-transparent p-0 shadow-none focus-visible:ring-0 flex-1"
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "");
                            field.onChange(value);
                          }}
                        />
                        <div className="flex items-center gap-2 border-l pl-2 relative z-20">
                            <Checkbox checked={form.watch("whatsapp")} onCheckedChange={(val) => form.setValue("whatsapp", !!val)} className="w-5 h-5 border-gray-300 data-[state=checked]:bg-green-500" />
                           <img src="https://cdn-icons-png.flaticon.com/512/124/124034.png" alt="whatsapp" width={18} height={18} className="object-contain" />
                        </div>
                        <FormLabel className="absolute text-[13px] text-gray-400 duration-300 transform -translate-y-4 scale-[0.8] top-1.5 z-10 origin-[0] bg-white px-1 peer-focus:px-1 peer-focus:text-orange-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-1.5 peer-focus:scale-[0.8] peer-focus:-translate-y-4 left-9 peer-placeholder-shown:left-[120px] md:peer-placeholder-shown:left-[140px] peer-focus:left-9 pointer-events-none">
                          Phone <span className="text-red-500">*</span>
                        </FormLabel>
                      </div>
                    </FormControl>
                    <FormMessage className="mt-1 text-[10px]" />
                  </FormItem>
                );
              }}
            />

            {/* State and City */}
            <div className="flex gap-3">
               <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem className="relative flex-1 pt-1.5">
                      <FormControl>
                        <div className="relative flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition-all">
                          <MapPin className="w-4 h-4 text-orange-500" />
                          <Select
                            disabled={!countryIso || stateData.length === 0}
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="peer w-full border-none shadow-none focus:ring-0 h-8 p-0 text-left overflow-hidden text-[13px] bg-transparent relative z-20 flex justify-between items-center">
                               <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60 overflow-y-auto">
                               {stateData.map((state) => (
                                 <SelectItem key={state.isoCode} value={state.name}>
                                    {state.name}
                                 </SelectItem>
                               ))}
                            </SelectContent>
                          </Select>
                          <FormLabel className={`absolute text-[13px] text-gray-400 duration-300 transform origin-[0] bg-white px-1 left-9 pointer-events-none z-10
                            ${field.value ? "-translate-y-4 scale-[0.8] top-1.5" : "-translate-y-1/2 top-1/2"}
                            peer-focus:-translate-y-4 peer-focus:scale-[0.8] peer-focus:top-1.5 peer-focus:text-orange-500
                            peer-data-[state=open]:-translate-y-4 peer-data-[state=open]:scale-[0.8] peer-data-[state=open]:top-1.5 peer-data-[state=open]:text-orange-500
                          `}>
                            State {stateData.length > 0 && <span className="text-red-500">*</span>}
                          </FormLabel>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
               />
               <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem className="relative flex-1 pt-1.5">
                      <FormControl>
                        <div className="relative flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus-within:ring-2 focus-within:ring-orange-500 transition-all">
                          <MapPin className="w-4 h-4 text-orange-500" />
                          <Select
                            disabled={!stateNameValue || cityData.length === 0}
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger className="peer w-full border-none shadow-none focus:ring-0 h-8 p-0 text-left overflow-hidden text-[13px] bg-transparent relative z-20 flex justify-between items-center">
                               <SelectValue placeholder="" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60 overflow-y-auto">
                               {cityData.map((city) => (
                                 <SelectItem key={city.name} value={city.name}>
                                    {city.name}
                                 </SelectItem>
                               ))}
                            </SelectContent>
                          </Select>
                          <FormLabel className={`absolute text-[13px] text-gray-400 duration-300 transform origin-[0] bg-white px-1 left-9 pointer-events-none z-10
                            ${field.value ? "-translate-y-4 scale-[0.8] top-1.5" : "-translate-y-1/2 top-1/2"}
                            peer-focus:-translate-y-4 peer-focus:scale-[0.8] peer-focus:top-1.5 peer-focus:text-orange-500
                            peer-data-[state=open]:-translate-y-4 peer-data-[state=open]:scale-[0.8] peer-data-[state=open]:top-1.5 peer-data-[state=open]:text-orange-500
                          `}>
                            City
                          </FormLabel>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
               />
            </div>

            {/* Interest Multi-select */}
            <FormField
              control={form.control}
              name="interests"
              render={({ field }) => (
                <FormItem className="space-y-1 px-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">I am interested in:</Label>
                  </div>
                  <div className="flex flex-wrap gap-2 pb-1.5">
                    {interestOptions.map((option) => {
                      const isSelected = field.value?.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            const newInterests = isSelected
                              ? (field.value || []).filter((i) => i !== option.id)
                              : [...(field.value || []), option.id];
                            field.onChange(newInterests);
                          }}
                          className={`
                            px-3 py-1 rounded-full text-[12px] font-semibold transition-all duration-200 border
                            ${isSelected 
                              ? "bg-orange-500 text-white border-orange-500 shadow-md scale-105" 
                              : "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-500"}
                          `}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </FormItem>
              )}
            />

            {/* Conditional Message Box */}
            {selectedInterests.includes("other") && (
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="relative animate-in slide-in-from-top-2 duration-300 pt-1.5">
                    <FormControl>
                      <div className="relative flex gap-2 border border-blue-400 rounded-lg px-3 py-2 bg-white shadow-sm ring-1 ring-blue-100 transition focus-within:ring-blue-400">
                        <MessageCircleCode className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                        <div className="relative w-full">
                          <Textarea
                            placeholder=" "
                            className="peer min-h-[80px] border-none p-0 bg-transparent shadow-none focus-visible:ring-0 text-sm w-full resize-none"
                            {...field}
                          />
                          <FormLabel className="absolute text-[13px] text-gray-400 duration-300 transform -translate-y-3 scale-[0.8] top-1 z-10 origin-[0] bg-white px-1 peer-focus:px-1 peer-focus:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:top-0 peer-focus:top-1 peer-focus:scale-[0.8] peer-focus:-translate-y-3 left-0 pointer-events-none">
                            Details Message
                          </FormLabel>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="space-y-1 relative pt-1.5">
                <div className="relative flex items-center gap-2 border border-gray-200 rounded-lg px-2 py-1.5 bg-blue-50/30 transition-all focus-within:border-orange-500 focus-within:bg-orange-50/10">
                    <div className="bg-orange-500 text-white px-2 py-0.5 rounded text-[12px] font-black shadow-sm select-none tracking-widest min-w-[70px] text-center relative z-20">
                        {captcha.n1}+{captcha.n2}
                    </div>
                    <span className="text-gray-400 font-bold text-xs relative z-20">=</span>
                    <Input
                        type="number"
                        placeholder=" "
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        className="peer border-none bg-transparent p-0 shadow-none focus-visible:ring-0 text-[14px] font-semibold flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="flex items-center gap-1.5 pr-1 border-l pl-2 border-gray-200 relative z-20">
                        {isHumanVerified ? (
                             <CircleCheck className="w-4 h-4 text-green-500" />
                        ) : (
                          <button
                              type="button"
                              onClick={generateCaptcha}
                              className="text-gray-300 hover:text-orange-500 transition-colors"
                              title="Refresh"
                          >
                              <RefreshCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                    </div>
                    <FormLabel className="absolute text-[13px] text-gray-400 duration-300 transform -translate-y-4 scale-[0.8] top-1.5 z-10 origin-[0] bg-white px-1 peer-focus:px-1 peer-focus:text-orange-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-1.5 peer-focus:scale-[0.8] peer-focus:-translate-y-4 left-4 peer-placeholder-shown:left-[110px] peer-focus:left-4 pointer-events-none">
                        Captcha <span className="text-red-500">*</span>
                    </FormLabel>
                </div>
                {!isHumanVerified && userAnswer && (
                    <p className="text-[10px] text-red-500 font-medium px-1">Incorrect result.</p>
                )}
            </div>

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

            <Button
              type="submit"
              disabled={mutation.isPending}
              className={`w-full bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-lg py-2.5 font-semibold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] ${!isHumanVerified ? 'hidden' : ''}`}
            >
              {mutation.isPending ? "Sending..." : "Send Enquiry"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
