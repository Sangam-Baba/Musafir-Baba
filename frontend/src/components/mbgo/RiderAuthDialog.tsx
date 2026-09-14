"use client";

import { useEffect } from "react";
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
import { toast } from "sonner";
import { useRiderAuthDialogStore } from "@/store/useRiderAuthDialogStore";
import { useRiderAuthStore } from "@/store/useRiderAuthStore";
import {
  loginRider,
  registerRider,
  verifyRiderOtp,
  resendRiderOtp,
} from "@/lib/riderAuthApi";
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
  fullName: z.string().min(2),
  email: z.string().email(),
  mobileNumber: z.string().min(10, "Enter a valid mobile number"),
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

export function RiderAuthDialog() {
  const { isOpen, mode, closeDialog, toggleMode, openDialog, email, onSuccess } =
    useRiderAuthDialogStore();
  const setRiderAuth = useRiderAuthStore((s) => s.setRiderAuth);

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(
      mode === "login" ? loginSchema : mode === "register" ? registerSchema : verifyOtpSchema,
    ),
    defaultValues:
      mode === "login"
        ? { email: "", password: "" }
        : mode === "register"
          ? { fullName: "", email: "", mobileNumber: "", password: "" }
          : { email: email || "", otp: "" },
  });

  useEffect(() => {
    form.reset(
      mode === "login"
        ? { email: "", password: "" }
        : mode === "register"
          ? { fullName: "", email: "", mobileNumber: "", password: "" }
          : { email: email || "", otp: "" },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, email]);

  const finishAuth = (data: {
    accessToken: string;
    refreshToken: string;
    profile?: { fullName?: string; email?: string; mobileNumber?: string } | null;
  }) => {
    setRiderAuth(data.accessToken, data.refreshToken, data.profile);
    closeDialog();
    onSuccess?.();
  };

  const loginMutation = useMutation({
    mutationFn: (values: LoginValues) => loginRider(values),
    onSuccess: (data) => {
      toast.success("Login successful!");
      finishAuth(data);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const registerMutation = useMutation({
    mutationFn: (values: RegisterValues) => registerRider(values),
    onSuccess: (_, values) => {
      toast.success("Registration successful! Please verify your email.");
      openDialog("verify-otp", { email: values.email, onSuccess });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: (values: VerifyOtpValues) => verifyRiderOtp(values),
    onSuccess: (data) => {
      toast.success("Email verified successfully!");
      finishAuth(data);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resendOtpMutation = useMutation({
    mutationFn: (values: { email: string }) => resendRiderOtp(values),
    onSuccess: () => toast.success("OTP resent to your email"),
    onError: (err: Error) => toast.error(err.message),
  });

  function onSubmit(values: LoginValues | RegisterValues | VerifyOtpValues) {
    if (mode === "login") return loginMutation.mutate(values as LoginValues);
    if (mode === "register") return registerMutation.mutate(values as RegisterValues);
    if (mode === "verify-otp") return verifyOtpMutation.mutate(values as VerifyOtpValues);
  }

  return (
    <Dialog open={isOpen} onOpenChange={closeDialog}>
      <DialogContent
        className="sm:max-w-[425px]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {mode === "login"
              ? "Log in to book your ride"
              : mode === "register"
                ? "Create your MBGo account"
                : "Verify your email"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {mode === "register" && (
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {mode !== "verify-otp" && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {mode === "register" && (
              <FormField
                control={form.control}
                name="mobileNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="10-digit mobile number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(mode === "login" || mode === "register") && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {mode === "verify-otp" && (
              <>
                <p className="text-gray-600 text-sm text-center">
                  We&apos;ve sent a 6-digit code to <b>{email}</b>. Please enter it below.
                </p>

                <FormField
                  control={form.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>OTP</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter OTP" maxLength={6} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <button
                  type="button"
                  onClick={() => email && resendOtpMutation.mutate({ email })}
                  disabled={resendOtpMutation.isPending}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {resendOtpMutation.isPending ? "Resending..." : "Resend OTP"}
                </button>
              </>
            )}

            <Button
              type="submit"
              className="w-full bg-[#FE5300] hover:bg-[#FE5300]/90"
              disabled={
                loginMutation.isPending || registerMutation.isPending || verifyOtpMutation.isPending
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
                Don&apos;t have an account?{" "}
                <button onClick={toggleMode} className="text-blue-600 hover:underline">
                  Register
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button onClick={toggleMode} className="text-blue-600 hover:underline">
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
