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
import SmallEditor from "@/components/admin/SmallEditor";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const schema = z.object({
  name: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  // Optional fields for pickup destination
  city: z.string().optional(),
  state: z.string().optional(),
  years: z.coerce.number().optional(),
  months: z.coerce.number().optional(),
  days: z.coerce.number().optional(),
});

type FormData = z.infer<typeof schema>;

interface MasterDataModalProps {
  id?: string | null;
  onClose: () => void;
  endpoint: string; // e.g., "brand", "type", "pickup-destination"
  title: string;
  showExtraFields?: boolean;
  showTitleDescFields?: boolean;
  isNumericDuration?: boolean;
}

const fetchItem = async (accessToken: string, endpoint: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/${endpoint}/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch item");
  const json = await res.json();
  return json.data;
};

export function MasterDataDrawer({ id, onClose, endpoint, title: modalTitle, showExtraFields, showTitleDescFields, isNumericDuration }: MasterDataModalProps) {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      title: "",
      description: "",
      status: "active",
      city: "",
      state: "",
      years: "" as any,
      months: "" as any,
      days: "" as any,
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
        name: item.name || "",
        title: item.title || "",
        description: item.description || "",
        status: item.status,
        city: item.city || "",
        state: item.state || "",
        years: item.years ?? ("" as any),
        months: item.months ?? ("" as any),
        days: item.days ?? ("" as any),
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
      toast.success(`${modalTitle} ${id ? "updated" : "created"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["master-data", endpoint] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  if (id && isLoading) return <Loader size="lg" />;

  return (
    <Sheet open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="overflow-y-auto sm:max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-8 sm:p-10">
        <SheetHeader className="mb-8">
          <SheetTitle className="text-xl font-semibold">
            {id ? `Edit ${modalTitle}` : `Add New ${modalTitle}`}
          </SheetTitle>
        </SheetHeader>
        
        <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-8">
          {!isNumericDuration && !showTitleDescFields && (
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
          )}

          {showTitleDescFields && (
            <>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <div className="border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden bg-white dark:bg-slate-950 min-h-[250px] shadow-sm">
                        <SmallEditor
                          value={field.value || ""}
                          onChange={(val) => field.onChange(val)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {isNumericDuration && (
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="years"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value ?? ""} min={0} placeholder="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="months"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Months</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value ?? ""} min={0} placeholder="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value ?? ""} min={0} placeholder="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

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

          <div className="flex justify-end gap-4 pt-8 border-t border-slate-100 dark:border-slate-800 mt-10">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Form>
      </SheetContent>
    </Sheet>
  );
}
