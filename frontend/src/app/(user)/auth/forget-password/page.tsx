"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";

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
import { useRouter } from "next/navigation";

import { toast } from "sonner";
import Link from "next/link";
export const dynamic = "force-dynamic";
import { verifyOtp } from "@/components/auth/AuthDialog";
import { useState } from "react";

// ✅ Zod Schema
const emailSchema = z
  .object({
    email: z.string().email({
      message: "Please enter a valid email address.",
    }),
  })
  .required();

const otpSchema = z.object({
  otp: z.string().min(6, {
    message: "Please enter a valid otp.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;
type FormData = EmailFormValues | OtpFormValues;

// ✅ API call function
async function resetUser(values: EmailFormValues) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/auth/forgotPassword`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }
  );

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Reset Password failed");
  }

  return res.json();
}

export default function forgetPassword() {
  const router = useRouter();
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(isEmailVerified ? otpSchema : emailSchema),
    defaultValues: isEmailVerified ? { otp: "", email: "" } : { email: "" },
  });

  // ✅ Use Mutation instead of useQuery
  const mutation = useMutation({
    mutationFn: (values: EmailFormValues) => resetUser(values),
    onSuccess: () => {
      toast.success("Enter OTP send to your email successful!");
      setIsEmailVerified(true);
    },
    onError: (error) => {
      console.error("Reset failed:", error);
      toast.error(error.message);
      form.reset();
    },
  });

  const otpMutation = useMutation({
    mutationFn: (values: OtpFormValues) => verifyOtp(values),
    onSuccess: () => {
      toast.success("Email verified successful!");
    },
    onError: (error) => {
      console.error("Reset failed:", error);
      toast.error(error.message);
    },
  });

  function onSubmit(values: FormData) {
    if (isEmailVerified) {
      otpMutation.mutate(values as OtpFormValues);
    } else {
      mutation.mutate(values as EmailFormValues);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">Reset Password</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* otp */}
            {isEmailVerified && (
              <FormField
                control={form.control}
                name="otp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OTP</FormLabel>
                    <FormControl>
                      <Input type="otp" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Sending..." : "Get OTP"}
            </Button>
          </form>
        </Form>

        {mutation.isError && (
          <p className="mt-3 text-center text-sm text-red-500">
            {mutation.error.message}
          </p>
        )}
        {mutation.isSuccess && (
          <p className="mt-3 text-center text-sm text-green-600">
            OTP send to your email successful!
          </p>
        )}

        <div className="flex gap-2 items-center justify-center mt-4 text-center text-sm text-gray-500">
          <Link href="/auth/login" className="text-blue-600 hover:underline">
            Back to Login
          </Link>
          <Link href="/auth/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
