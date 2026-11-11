"use client";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import { z } from "zod";
import { Info, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader } from "@/components/custom/loader";
import { useRouter } from "next/navigation";
import { FleetPage, FleetPanel } from "@/components/admin/fleet/FleetUI";
import { AdminSaveBar } from "@/components/admin/AdminFormUI";
import { dInput } from "@/components/admin/destination/FormBits";
import { RentalPageHeader, rLabel, rPrimaryBtn, rSecondaryBtn } from "@/components/admin/rental/RentalAdminUI";

// A vehicle type is just a name + status now. Page content lives on the
// "City + Type Pages" (e.g. /rental/delhi/car), not on the type.
//
// Only `name` and `status` are in the form, so only they are sent on save:
// content/banner/SEO already stored on a type (shown on /rental/{type}) is
// left untouched by the backend's partial update.
export const vehicleTypeSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  status: z.enum(["active", "inactive"]).default("active"),
});

type FormData = z.infer<typeof vehicleTypeSchema>;

const createVehicleType = async (accessToken: string, form: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/type`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(form),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to create vehicle type");
  }
  return res.json();
};

const updateVehicleType = async (accessToken: string, id: string, form: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/type/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(form),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to update vehicle type");
  }
  return res.json();
};

const getVehicleTypeById = async (accessToken: string, id: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/type/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch vehicle type");
  return res.json();
};

export const CreateEditVehicleType = ({ id }: { id: string | null }) => {
  const router = useRouter();
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(vehicleTypeSchema) as Resolver<FormData>,
    defaultValues: {
      name: "",
      status: "active",
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["master-data-type", id],
    queryFn: () => getVehicleTypeById(accessToken, id as string),
    enabled: !!id,
  });

  const typeData = data?.data;

  useEffect(() => {
    if (id && typeData) {
      form.reset({
        name: typeData.name || "",
        status: typeData.status || "active",
      });
    }
  }, [id, typeData, form]);

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      id
        ? updateVehicleType(accessToken, id, values)
        : createVehicleType(accessToken, values),
    onSuccess: () => {
      toast.success(id ? "Vehicle Type updated successfully!" : "Vehicle Type created successfully!");
      queryClient.invalidateQueries({ queryKey: ["master-data", "type"] });
      router.push("/admin/master-data/type");
    },
    onError: (err) => toast.error(err.message || "Failed to save"),
  });

  if (isLoading && id) return <Loader size="lg" />;

  function onSubmit(values: FormData) {
    // Exactly the two fields; nothing else is ever sent
    mutation.mutate({ name: values.name, status: values.status });
  }

  return (
    <FleetPage className="gap-4">
      <RentalPageHeader
        icon={ListChecks}
        title={id ? "Edit Vehicle Type" : "Create Vehicle Type"}
        description="A vehicle type like Car, Bike or Traveller. Page text for a city and type is written on City + Type Pages."
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FleetPanel title="Type details" description="Name shown to customers and in the vehicle form." icon={Info} bodyClassName="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={rLabel}>Vehicle type name *</FormLabel>
                    <FormControl>
                      <input placeholder="e.g. Car" {...field} className={dInput} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={rLabel}>Status</FormLabel>
                    <FormControl>
                      <select {...field} className={dInput}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </FleetPanel>

          <AdminSaveBar hint="Renaming changes its URLs (e.g. /rental/delhi/car); vehicles saved with the old name need updating too.">
            <Button type="button" variant="outline" className={rSecondaryBtn} onClick={() => router.push("/admin/master-data/type")}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className={rPrimaryBtn}>
              {mutation.isPending ? "Saving..." : id ? "Save changes" : "Create type"}
            </Button>
          </AdminSaveBar>
        </form>
      </Form>
    </FleetPage>
  );
};
