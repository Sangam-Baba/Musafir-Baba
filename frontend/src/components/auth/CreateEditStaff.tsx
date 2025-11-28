"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { useEffect } from "react";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.coerce.number().min(10, {
    message: "Please enter a valid phone number.",
  }),
  password: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const createStaff = async (values: FormValues, accessToken: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/auth/register-admin`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authprization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(values),
    }
  );
  if (!res.ok) throw new Error("Registration failed");
  return res.json();
};

const updateStaff = async (
  values: FormValues,
  accessToken: string,
  id: string
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/auth/update-admin/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(values),
    }
  );
  if (!res.ok) throw new Error("Update failed");
  return res.json();
};
const getStaff = async (accessToken: string, id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/auth/admin/${id}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch staff");
  const data = await res.json();
  return data?.data;
};
function CreateEditStaff({
  id,
  onClose,
}: {
  id?: string | null;
  onClose: () => void;
}) {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      name: "",
      email: "",
      phone: 0,
      permissions: [],
    },
  });

  const {
    data: staff,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["staff", id],
    queryFn: () => getStaff(accessToken, id as string),
    retry: 2,
    enabled: id !== null,
  });

  useEffect(() => {
    if (staff) {
      form.setValue("name", staff.name);
      form.setValue("email", staff.email);
      form.setValue("phone", staff.phone);
      form.setValue("permissions", staff.permissions);
    }
  }, [staff, accessToken, form]);
  const mutate = useMutation({
    mutationFn: (values: FormValues) =>
      id
        ? updateStaff(values, accessToken, id)
        : createStaff(values, accessToken),
    onSuccess: () => {
      onClose();
    },
    onError: (err) => console.log(err),
  });
  function onSubmit(values: FormValues) {
    if (!id && !values.password) return alert("Please enter a password");
    mutate.mutate(values);
  }

  const newData = [
    {
      label: "Main",
      values: ["dashboard", "enquiry", "bookings"],
    },
    {
      label: "Content Management",
      values: [
        "visa",
        "webpage",
        "about-us",
        "news",
        "blogs",
        "video-banner",
        "footer",
        "career",
      ],
    },
    {
      label: "Packages",
      values: [
        "holidays",
        "customized-tour-package",
        "plan-my-trip",
        "destination",
        "destination-seo",
        "category",
      ],
    },
    {
      label: "Settings",
      values: ["role", "membership", "authors"],
    },
  ];
  return (
    <div className="flex flex-col max-w-2xl items-center justify-center bg-gray-50 px-4 py-6 rounded-lg shadow-md">
      {isError && <p>{(error as Error).message}</p>}
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter staff name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Email</FormLabel>
                  <FormControl>
                    <Input placeholder="staff@gmail.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Phone</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="7880896559" {...field} />
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
                    <Input placeholder="Enter password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Permissions</FormLabel>
                  <FormControl>
                    <div className="flex flex-col space-y-2">
                      {newData.map((item, i) => (
                        <div key={i}>
                          <h1 className="text-gray-600">{item.label}</h1>
                          <div className="flex flex-wrap space-y-2 gap-2 mt-2">
                            {item.values?.map((cat: string, i: number) => (
                              <label
                                key={i}
                                className="flex items-center space-x-2"
                              >
                                <input
                                  type="checkbox"
                                  value={cat}
                                  checked={field.value?.includes(cat)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      field.onChange([
                                        ...(field.value || []),
                                        cat,
                                      ]);
                                    } else {
                                      field.onChange(
                                        field.value?.filter((id) => id !== cat)
                                      );
                                    }
                                  }}
                                />
                                <span>
                                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4 px-4">
              <Button className="bg-[#FE5300] hover:bg-[#FE5300]" type="submit">
                Submit
              </Button>
              <Button
                className="bg-red-400 hover:bg-red-600"
                type="button"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </form>
        </Form>
      )}
      {mutate.isSuccess && <div>Staff created successfully</div>}
      {mutate.isError && <div>Something went wrong</div>}
    </div>
  );
}

export default CreateEditStaff;
