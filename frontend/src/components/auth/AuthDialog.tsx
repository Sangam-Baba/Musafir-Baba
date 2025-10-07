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

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export function AuthDialog() {
  const router = useRouter();
  const { isOpen, mode, closeDialog, redirectUrl, toggleMode } =
    useAuthDialogStore();
  const setAuth = useAuthStore((s) => s.setAuth);

  const form = useForm<LoginFormValues | RegisterFormValues>({
    resolver: zodResolver(mode === "login" ? loginSchema : registerSchema),
    defaultValues:
      mode === "login"
        ? { email: "", password: "" }
        : { name: "", email: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: (values: LoginFormValues) =>
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Login failed");
        }
        return res.json();
      }),
    onSuccess: (data) => {
      setAuth(data.accessToken, data.role);
      toast.success("Login successful!");
      closeDialog();
      router.push(redirectUrl || "/");
    },
    onError: (err) => toast.error(err.message),
  });

  const registerMutation = useMutation({
    mutationFn: (values: RegisterFormValues) =>
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      }).then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Registration failed");
        }
        return res.json();
      }),
    onSuccess: () => {
      toast.success("Registration successful! Please verify your email.");
      closeDialog();
    },
    onError: (err) => toast.error(err.message),
  });

  function onSubmit(values: LoginFormValues | RegisterFormValues) {
    if (mode === "login") {
      loginMutation.mutate(values as LoginFormValues);
    } else {
      registerMutation.mutate(values as RegisterFormValues);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={closeDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "login"
              ? "Log in to your account"
              : "Create your account"}
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

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="you@example.com"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••••" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending || registerMutation.isPending}
            >
              {mode === "login"
                ? loginMutation.isPending
                  ? "Logging in..."
                  : "Login"
                : registerMutation.isPending
                ? "Creating account..."
                : "Register"}
            </Button>
          </form>
        </Form>

        <div className="mt-4 text-center text-sm text-gray-500">
          {mode === "login" ? (
            <p>
              {`Don't have an account?`}{" "}
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
      </DialogContent>
    </Dialog>
  );
}
