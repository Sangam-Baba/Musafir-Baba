"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
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
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
export const dynamic = "force-dynamic";

// ✅ Zod Schema
const formSchema = z
  .object({
    email: z.string().email({
      message: "Please enter a valid email address.",
    }),
    password: z.string().min(6, {
      message: "Password must be at least 6 characters.",
    }),
  })
  .required();

// ✅ API call function
async function loginUser(values: z.infer<typeof formSchema>) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(values),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Login failed");
  }

  return res.json();
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect");
  
  const setAuth = useAuthStore((s) => s.setAuth);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // ✅ Use Mutation instead of useQuery
  const mutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      console.log("Login successfully:", data);
      toast.success("Login successful!");
      // 👉 Redirect or reset form here
      const accessToken = data.accessToken;
      setAuth(accessToken, data.role, data.name);
      form.reset();
      
      // Immediate redirect if parameter exists, otherwise brief delay
      if (redirectUrl) {
         router.replace(redirectUrl);
      } else {
         setTimeout(() => {
           router.replace("/");
         }, 1500);
      }
    },
    onError: (error) => {
      console.error("Registration failed:", error);
      toast.error(error.message);
      form.reset();
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-20 pb-40">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl shadow-orange-100 border border-orange-50">
        <h1 className="mb-2 text-center text-3xl font-black text-gray-900 tracking-tight">
          Welcome Back
        </h1>
        <p className="text-center text-sm text-gray-500 mb-8 font-medium">
          Log in to manage your MusafirBaba journey.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-gray-400">Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      className="bg-gray-50 border-gray-100 rounded-xl focus:ring-orange-500 focus:border-orange-500"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-widest text-gray-400">Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      className="bg-gray-50 border-gray-100 rounded-xl focus:ring-orange-500 focus:border-orange-500"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-[#FE5300] hover:bg-[#FE5300]/90 text-white font-bold py-6 rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-95"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <div className="flex items-center gap-2 justify-center">
                   <Loader2 className="animate-spin" size={18} />
                   Signing in...
                </div>
              ) : "Login Now"}
            </Button>
          </form>
        </Form>

        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-4">
          <Link
            href="/auth/forget-password"
            className="text-center text-sm font-bold text-gray-400 hover:text-[#FE5300] transition-colors"
          >
            Forgot Password?
          </Link>
          <div className="text-center">
            <p className="text-sm text-gray-500 font-medium">
              New here?{" "}
              <Link href={`/auth/register${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`} className="text-[#FE5300] font-bold hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
