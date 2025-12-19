"use client";
import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import { z } from "zod";
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
import { Loader } from "@/components/custom/loader";

const formSchema = z
  .object({
    code: z.string().uppercase().min(2, {
      message: "Code must be at least 6 characters.",
    }),
    description: z.string().optional(),
    type: z.enum(["FLAT", "PERCENTAGE"]),
    value: z.coerce.number(),
    minAmount: z.coerce.number(),
    maxDiscount: z.coerce.number(),
    validFrom: z.coerce.date(),
    validTill: z.coerce.date(),
    isActive: z.boolean(),
    applicableItems: z.array(
      z.object({
        itemId: z.string(),
        itemType: z.enum(["CUSTOM_PACKAGE", "GROUP_PACKAGE", "VISA"]),
      })
    ),
  })
  .refine((data) => data.validTill >= data.validFrom, {
    message: "Valid till must be after valid from",
    path: ["validTill"],
  });
type FormData = z.infer<typeof formSchema>;

const createCoupan = async (accessToken: string, form: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/coupan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(form),
  });
  if (!res.ok) throw new Error("Coupan creation failed");
  return res.json();
};

const updateCoupan = async (
  accessToken: string,
  id: string,
  form: FormData
) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/coupan/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(form),
  });
  if (!res.ok) throw new Error("Coupan update failed");
  return res.json();
};

const getCoupanById = async (accessToken: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/coupan/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch coupan by Id");
  return res.json();
};

const getAllGroupPkgs = async (accessToken: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/packages/all`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch group packages");
  const data = await res.json();
  return data?.data?.packages;
};
const getAllCustomizedPkgs = async (accessToken: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch group packages");
  const data = await res.json();
  return data?.data;
};
export const CreateEditCoupan = ({
  onClose,
  id,
}: {
  onClose: () => void;
  id: string | null;
}) => {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
    defaultValues: {
      code: "",
      description: "",
      type: "FLAT",
      value: 0,
      minAmount: 0,
      maxDiscount: 0,
      validFrom: new Date(),
      validTill: new Date(),
      isActive: true,
      applicableItems: [],
    },
  });

  const {
    data,
    isLoading: CoupanLoading,
    isError: CoupanError,
  } = useQuery({
    queryKey: ["coupan", id],
    queryFn: () => getCoupanById(accessToken, id as string),
    enabled: !!id,
  });

  const {
    data: groupPkgs,
    isLoading: GroupLoading,
    isError: GroupError,
  } = useQuery({
    queryKey: ["groupPkgs"],
    queryFn: () => getAllGroupPkgs(accessToken),
  });
  const {
    data: customizedPkgs,
    isLoading: CustomizedLoading,
    isError: CustomizedError,
  } = useQuery({
    queryKey: ["customizedPkgs"],
    queryFn: () => getAllCustomizedPkgs(accessToken),
  });

  const combinedPkgs = useMemo(() => {
    if (groupPkgs && customizedPkgs) {
      const group = groupPkgs.map((item: any) => ({
        id: item._id,
        name: item.title,
        itemType: "GROUP_PACKAGE",
      }));
      const customized = customizedPkgs.map((item: any) => ({
        id: item._id,
        name: item.title,
        itemType: "CUSTOM_PACKAGE",
      }));
      return [...group, ...customized];
    }
    return [];
  }, [groupPkgs, customizedPkgs]);

  const coupan = data?.data;
  useEffect(() => {
    if (id && coupan) {
      form.reset({
        code: coupan.code,
        description: coupan.description,
        type: coupan.type,
        value: coupan.value,
        minAmount: coupan.minAmount,
        maxDiscount: coupan.maxDiscount,
        validFrom: new Date(coupan.validFrom),
        validTill: new Date(coupan.validTill),
        isActive: coupan.isActive,
        applicableItems: coupan.applicableItems,
      });
    }
  }, [id, coupan]);

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      id
        ? updateCoupan(accessToken, id, values)
        : createCoupan(accessToken, values),
    onSuccess: (res) => {
      toast.success(
        id ? "Batch updated successfully!" : "Batch created successfully!"
      );
      queryClient.invalidateQueries({ queryKey: ["all-coupans"] });
      //   if (id) onReviewsUpdated?.(id);
      //   else onReviewsCreated(res?.data?._id || res?._id);
      onClose();
    },
    onError: (err) => toast.error(err.message || "Failed to create coupan"),
  });

  //   const handleChange = (key: keyof Reviews, value: string) => {
  //     if (["rating"].includes(key))
  //       setForm((prev) => ({ ...prev, [key]: Number(value) }));
  //     else setForm((prev) => ({ ...prev, [key]: value }));
  //   };
  if (CoupanLoading || GroupLoading || CustomizedLoading)
    return <Loader size="lg" />;

  function onSubmit(values: FormData) {
    console.log(values);
    mutation.mutate(values);
  }

  return (
    <div
      className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
        {id ? "Update Review" : "Create Review"}
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Code and Type and Value */}
          <div className="grid grid-cols-3 gap-5 items-center">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coupan Code</FormLabel>
                  <FormControl>
                    <Input placeholder="BABA100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coupan Type (Flat or Percentage)</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="" disabled>
                        Select Coupan Type
                      </option>
                      <option value="FLAT">Flat</option>
                      <option value="PERCENTAGE">Percentage</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discounted Value</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="10% or 500" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enjoy discount on your order"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Minimum Amount and Maximum Discount */}
          <div className="grid grid-cols-2 gap-5 items-center">
            <FormField
              control={form.control}
              name="minAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coupan Code Apply Minimum Amount</FormLabel>
                  <FormControl>
                    <Input placeholder="Rs.5999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxDiscount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Discount for % coupons</FormLabel>
                  <FormControl>
                    <Input placeholder="Rs.5999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Valid From and Valid Till */}
          <div className="grid grid-cols-3 items-center gap-2">
            {" "}
            <FormField
              control={form.control}
              name="validFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coupan Valid From</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      placeholder="Rs.5999"
                      value={
                        field.value
                          ? new Date(field.value).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="validTill"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coupan Valid Till</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      placeholder="Rs.5999"
                      value={
                        field.value
                          ? new Date(field.value).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coupan Code Apply Minimum Amount</FormLabel>
                  <FormControl>
                    <select
                      onChange={(e) => field.onChange(e.target.value == "true")}
                      // value={field.value ? "true" : "false"}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="" disabled>
                        Select Status
                      </option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {/* Applicable Items */}
          <FormField
            control={form.control}
            name="applicableItems"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Coupan Code Apply Minimum Amount</FormLabel>
                <FormControl>
                  <select
                    multiple
                    className="w-full h-40 rounded-lg border p-2"
                    value={
                      field.value
                        ? field.value.map(
                            (item) => `${item.itemType}:${item.itemId}`
                          )
                        : []
                    }
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions).map(
                        (option) => {
                          const [itemType, itemId] = option.value.split(":");
                          return { itemId, itemType };
                        }
                      );
                      field.onChange(selected);
                    }}
                  >
                    {combinedPkgs.map((pkg) => (
                      <option
                        key={`${pkg.itemType}-${pkg.id}`}
                        value={`${pkg.itemType}:${pkg.id}`}
                      >
                        {pkg.name} ({pkg.itemType})
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Submit and Close */}
          <div className="grid grid-cols-2 gap-5">
            <Button type="submit">Submit</Button>
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          </div>
        </form>
      </Form>
      {mutation.isError && (
        <p className="text-red-500">{mutation.error.message}</p>
      )}
      {mutation.isSuccess && <p className="text-green-500">Success</p>}
    </div>
  );
};
