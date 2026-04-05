"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader } from "@/components/custom/loader";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  status: z.enum(["active", "inactive"]),
  // Optional fields for pickup destination
  city: z.string().optional(),
  state: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface MasterDataModalProps {
  id?: string | null;
  onClose: () => void;
  endpoint: string; // e.g., "brand", "type", "pickup-destination"
  title: string;
  showExtraFields?: boolean;
}

const fetchItem = async (accessToken: string, endpoint: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/${endpoint}/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch item");
  const json = await res.json();
  return json.data;
};

export function MasterDataModal({ id, onClose, endpoint, title, showExtraFields }: MasterDataModalProps) {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      status: "active",
      city: "",
      state: "",
    },
  });

  const { data: item, isLoading } = useQuery({
    queryKey: ["master-data", endpoint, id],
    queryFn: () => fetchItem(accessToken, endpoint, id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        status: item.status,
        city: item.city || "",
        state: item.state || "",
      });
    }
  }, [item, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormData) => {
      const url = id 
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/master-data/${endpoint}/${id}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/master-data/${endpoint}`;
      
      const res = await fetch(url, {
        method: id ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Operation failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(`${title} ${id ? "updated" : "created"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["master-data", endpoint] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  if (id && isLoading) return <Loader size="lg" />;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
      <h2 className="text-xl font-semibold mb-6">{id ? `Edit ${title}` : `Add New ${title}`}</h2>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {showExtraFields && (
            <>
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter city" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter state" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
