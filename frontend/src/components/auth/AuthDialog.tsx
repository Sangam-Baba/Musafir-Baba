"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;
type VerifyOtpValues = z.infer<typeof verifyOtpSchema>;
type AuthFormValues = LoginValues | RegisterValues | VerifyOtpValues;

async function verifyOtp(values: z.infer<typeof verifyOtpSchema>) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/auth/verifyOtp`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "OTP verification failed");
  }
  return res.json();
}

export function AuthDialog() {
  const router = useRouter();
  const {
    isOpen,
    mode,
    closeDialog,
    redirectUrl,
    toggleMode,
    openDialog,
    email,
  } = useAuthDialogStore();
  const setAuth = useAuthStore((s) => s.setAuth);

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(
      mode === "login"
        ? loginSchema
        : mode === "register"
        ? registerSchema
        : verifyOtpSchema
    ),
    defaultValues:
      mode === "login"
        ? { email: "", password: "" }
        : mode === "register"
        ? { name: "", email: "", password: "" }
        : { email: email || "", otp: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: z.infer<typeof loginSchema>) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(values),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Login failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setAuth(data.accessToken, data.role);
      toast.success("Login successful!");
      closeDialog();
      router.push(redirectUrl || "/");
    },
    onError: (err) => toast.error(err.message),
  });

  const registerMutation = useMutation({
    mutationFn: async (values: z.infer<typeof registerSchema>) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (_, values) => {
      toast.success("Registration successful! Please verify your email.");
      openDialog("verify-otp", values.email);
    },
    onError: (err) => toast.error(err.message),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (values: z.infer<typeof verifyOtpSchema>) => verifyOtp(values),
    onSuccess: (data) => {
      toast.success("Email verified successfully!");
      setAuth(data.accessToken, data.role);
      closeDialog();
      router.push(redirectUrl || "/");
    },
    onError: (err) => toast.error(err.message),
  });

  function onSubmit(values: LoginValues | RegisterValues | VerifyOtpValues) {
    if (mode === "login") return loginMutation.mutate(values as LoginValues);
    if (mode === "register")
      return registerMutation.mutate(values as RegisterValues);
    if (mode === "verify-otp")
      return verifyOtpMutation.mutate(values as VerifyOtpValues);
  }

  return (
    <Dialog open={isOpen} onOpenChange={closeDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "login"
              ? "Log in to your account"
              : mode === "register"
              ? "Create your account"
              : "Verify your email"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {mode === "register" && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Login + Register Email */}
            {mode !== "verify-otp" && (
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
            )}

            {/* Password for Login + Register */}
            {(mode === "login" || mode === "register") && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* OTP Form */}
            {mode === "verify-otp" && (
              <>
                <p className="text-gray-600 text-sm text-center">
                  We’ve sent a 6-digit code to <b>{email}</b>. Please enter it
                  below.
                </p>

                <FormField
                  control={form.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OTP</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter OTP"
                          maxLength={6}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={
                loginMutation.isPending ||
                registerMutation.isPending ||
                verifyOtpMutation.isPending
              }
            >
              {mode === "login"
                ? loginMutation.isPending
                  ? "Logging in..."
                  : "Login"
                : mode === "register"
                ? registerMutation.isPending
                  ? "Creating account..."
                  : "Register"
                : verifyOtpMutation.isPending
                ? "Verifying..."
                : "Verify OTP"}
            </Button>
          </form>
        </Form>

        {mode !== "verify-otp" && (
          <div className="mt-4 text-center text-sm text-gray-500">
            {mode === "login" ? (
              <p>
                Don’t have an account?{" "}
                <button
                  onClick={toggleMode}
                  className="text-blue-600 hover:underline"
                >
                  Register
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  onClick={toggleMode}
                  className="text-blue-600 hover:underline"
                >
                  Login
                </button>
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
