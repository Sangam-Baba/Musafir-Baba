"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ChevronRight } from "lucide-react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuthStore } from "@/store/useAuthStore";
import { useMutation } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";

const formSchema = z
  .object({
    oldPassword: z.string().min(2, {
      message: "oldPassword must be at least 6 digits.",
    }),
    newPassword: z.string().min(2, {
      message: "newPassword must be at least 6 digits.",
    }),
    confirmPassword: z.string().min(2, {
      message: "confirmPassword must be at least 6 digits.",
    }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type FormSchema = z.infer<typeof formSchema>;
const updatePasword = async (values: FormSchema, token: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/auth/update-password`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(values),
    }
  );
};
export function UpdatePasswordDialog({ title }: { title: string }) {
  const accessToken = useAuthStore((state) => state.accessToken) as string;

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormSchema) => updatePasword(values, accessToken),
    onSuccess: () => {
      toast.success("Password updated successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  // 2. Define a submit handler.
  function onSubmit(values: FormSchema) {
    mutation.mutate(values);
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="flex mx-auto w-full justify-between border-1 hover:bg-gray-100 rounded-lg px-4 py-3 max-w-md ">
          <p className="text-center"> {title}</p>
          <ChevronRight />
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] ">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="oldPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Old Password</FormLabel>
                  <FormControl>
                    <Input placeholder="******" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input placeholder="******" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input placeholder="******" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="mx-auto">
              <Button type="submit">Submit</Button>
            </div>
          </form>
          {mutation.isError && (
            <p className="text-red-600">{mutation.error.message}</p>
          )}
          {mutation.isSuccess && (
            <p className="text-green-600">Password updated successfully!</p>
          )}
        </Form>
      </DialogContent>
    </Dialog>
  );
}
