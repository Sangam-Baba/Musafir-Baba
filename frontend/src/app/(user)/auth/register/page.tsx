"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
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
import { toast } from "sonner";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";
export const dynamic = "force-dynamic";

// ✅ Zod Schema
const formSchema = z
  .object({
    name: z.string().min(2, {
      message: "Username must be at least 2 characters.",
    }),
    email: z.string().email({
      message: "Please enter a valid email address.",
    }),
    password: z.string().min(6, {
      message: "Password must be at least 6 characters.",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const verifyOtpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

// ✅ API call function
async function registerUser(values: z.infer<typeof formSchema>) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Registration failed");
  }

  return res.json();
}

async function verifyOtpAPI(email: string, otp: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/verifyOtp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Verification failed");
  }

  return res.json();
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  
  const setAuth = useAuthStore((s) => s.setAuth);
  const [isVerifying, setIsVerifying] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // ✅ Use Mutation instead of useQuery
  const mutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data, variables) => {
      toast.success("Registration successful! Please verify your email.");
      setRegisteredEmail(variables.email);
      setIsVerifying(true);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (otp: string) => verifyOtpAPI(registeredEmail, otp),
    onSuccess: (data) => {
      toast.success("Email verified successfully!");
      setAuth(data.accessToken, data.role, data.name);
      router.push(redirectUrl || "/");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const otpForm = useForm<z.infer<typeof verifyOtpSchema>>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { otp: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }

  function onOtpSubmit(values: z.infer<typeof verifyOtpSchema>) {
    verifyMutation.mutate(values.otp);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-20 pb-40">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl shadow-orange-100 border border-orange-50">
        <h1 className="mb-2 text-center text-3xl font-black text-gray-900 tracking-tight">
          {isVerifying ? "Verify Email" : "Create Account"}
        </h1>
        <p className="text-center text-sm text-gray-500 mb-8 font-medium">
          {isVerifying 
            ? `Digit code sent to ${registeredEmail}` 
            : "Join MusafirBaba today and start your journey."}
        </p>

        {!isVerifying ? (
          <>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-widest text-gray-400">Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" className="bg-gray-50 border-gray-100 rounded-xl focus:ring-orange-500 focus:border-orange-500" {...field} />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-widest text-gray-400">Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" className="bg-gray-50 border-gray-100 rounded-xl focus:ring-orange-500 focus:border-orange-500" {...field} />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-widest text-gray-400">Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" className="bg-gray-50 border-gray-100 rounded-xl focus:ring-orange-500 focus:border-orange-500" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-widest text-gray-400">Confirm</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" className="bg-gray-50 border-gray-100 rounded-xl focus:ring-orange-500 focus:border-orange-500" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#FE5300] hover:bg-[#FE5300]/90 text-white font-bold py-6 rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-95"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? (
                    <div className="flex items-center gap-2">
                       <Loader2 className="animate-spin" size={18} />
                       Creating Account...
                    </div>
                  ) : "Register Now"}
                </Button>
              </form>
            </Form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500 font-medium">
                Already have an account?{" "}
                <Link href={`/auth/login${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`} className="text-[#FE5300] font-bold hover:underline">
                  Login
                </Link>
              </p>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-widest text-gray-400">Enter OTP Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="000000" 
                          maxLength={6} 
                          className="bg-gray-50 border-gray-100 rounded-xl text-center text-3xl font-black tracking-[1em] h-20 focus:ring-orange-500 focus:border-orange-500" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-[10px] text-center" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-gray-900 hover:bg-black text-white font-bold py-6 rounded-xl shadow-xl transition-all active:scale-95"
                  disabled={verifyMutation.isPending}
                >
                  {verifyMutation.isPending ? (
                    <div className="flex items-center gap-2 justify-center">
                       <Loader2 className="animate-spin" size={18} />
                       Verifying...
                    </div>
                  ) : "Verify & Complete Signup"}
                </Button>
              </form>
            </Form>
            
            <button 
              onClick={() => setIsVerifying(false)}
              className="w-full text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-[#FE5300] transition-colors"
            >
              Back to registration
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
