"use client";
import React, { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader } from "@/components/custom/loader";
interface Include {
  item: string;
}
interface FormValues {
  name: string;
  price: number;
  duration: string;
  include: Include[];
  exclude: Include[];
  isActive: boolean;
}

const getMembership = async (id: string, accessToken: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/membership/${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to get membership");
  const data = await res.json();
  return data?.data;
};

const updateMembership = async (
  values: FormValues,
  accessToken: string,
  id: string
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/membership/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(values),
    }
  );
  if (!res.ok) throw new Error("Failed to create membership");
  return res.json();
};
function UpdateMembershipPage() {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const id = useParams().id as string;
  const defaultValues: FormValues = {
    name: "",
    price: 0,
    duration: "",
    include: [],
    exclude: [],
    isActive: true,
  };

  const {
    data: membership,
    isLoading,
    isError,
    error,
  } = useQuery<FormValues>({
    queryKey: ["membership", id],
    queryFn: () => getMembership(id, accessToken),
  });
  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateMembership(values, accessToken, id),
    onSuccess: (data) => {
      toast.success("Membership created successfully", data);
    },
    onError: () => {
      toast.error("Something went wrong");
    },
  });

  const form = useForm<FormValues>({ defaultValues });
  const includeArray = useFieldArray({
    control: form.control,
    name: "include",
  });
  const excludeArray = useFieldArray({
    control: form.control,
    name: "exclude",
  });

  useEffect(() => {
    if (membership) {
      form.setValue("name", membership.name);
      form.setValue("price", membership.price);
      form.setValue("duration", membership.duration);
      form.setValue("include", membership.include);
      form.setValue("exclude", membership.exclude);
      form.setValue("isActive", membership.isActive);
    }
  }, [membership, form]);
  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  if (isLoading) return <Loader size="lg" message="Loading membership..." />;
  if (isError) return <h1>{error?.message}</h1>;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">
          Edit Membership Package
        </h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Membership Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter Membership Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Parmalink */}
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration*</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full rounded-md border p-2">
                      <option value="" disabled>
                        Select Duration
                      </option>
                      <option value="quaterly">Quaterly</option>
                      <option value="half-yearly">Half Yearly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price*</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Enter Price" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Inclusions Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">Include Features</FormLabel>
              {includeArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mb-2">
                  <Input
                    {...form.register(`include.${index}.item`)}
                    placeholder="Enter include Feature"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => includeArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() => includeArray.append({ item: "" })}
              >
                Add Inclusion
              </Button>
            </div>

            {/* Exclusions Dynamic */}
            <div>
              <FormLabel className="mb-2 text-lg">Exclude Features</FormLabel>
              {excludeArray.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 mb-2">
                  <Input
                    {...form.register(`exclude.${index}.item`)}
                    placeholder="Enter exclude Feature"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => excludeArray.remove(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                onClick={() => excludeArray.append({ item: "" })}
              >
                Add Exclusion
              </Button>
            </div>

            {/* Status */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <select
                      value={String(field.value)}
                      onChange={(e) =>
                        field.onChange(e.target.value === "true")
                      }
                      className="w-full rounded-md border p-2"
                    >
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Updating..." : "Update Membership"}
            </Button>
          </form>
        </Form>
        {mutation.isError && (
          <p className="text-red-500">Somethings went wrong!</p>
        )}
        {mutation.isSuccess && (
          <p className="text-green-500">
            Membership Package Updated successfully!
          </p>
        )}
      </div>
    </div>
  );
}

export default UpdateMembershipPage;
