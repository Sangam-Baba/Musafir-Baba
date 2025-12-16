"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Resolver, useForm } from "react-hook-form";
import { z } from "zod";
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
import { Textarea } from "../ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect } from "react";
import ImageUploaderClient from "../custom/ImageUploaderClient";
import countryCodes from "country-codes-list";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { User, MapPin, Phone, X, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  phone: z.string().min(10, {
    message: "Please enter a valid phone number.",
  }),
  alternatePhone: z
    .string()
    .min(10, {
      message: "Please enter a valid emergency phone number.",
    })
    .optional(),
  avatar: z
    .object({
      url: z.string().optional(),
      public_id: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      alt: z.string().optional(),
    })
    .optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipcode: z.string().optional(),
  country: z.string().min(2, {
    message: "Country must be at least 2 characters.",
  }),
});

type FormData = z.infer<typeof formSchema>;

const updateProfile = async (id: string, values: FormData, token: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/auth/update/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(values),
    }
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || error.error || "Failed to update profile");
  }
  return res.json();
};
const getProfile = async (token: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || error.error || "Failed to get profile");
  }
  const data = await res.json();
  return data?.data;
};
function EditProfile({ id, onClose }: { id: string; onClose: () => void }) {
  const token = useAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
    defaultValues: {
      name: "",
      phone: "",
      alternatePhone: "",
      address: "",
      city: "",
      state: "",
      zipcode: "",
      country: "",
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(token),
  });
  const mutate = useMutation({
    mutationFn: (values: FormData) => updateProfile(id, values, token),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      onClose();
    },
    onError: (err) => {
      console.log(err);
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        ...profile,
        country: profile.country,
      });
    }
  }, [profile, form]);

  function onSubmit(values: FormData) {
    mutate.mutate(values);
  }

  // Create country list
  const countryList = countryCodes.customList(
    "countryNameEn",
    "{countryNameEn} ({countryCallingCode})"
  );
  const countryOptions = Object.entries(countryList).map(
    ([country, label]) => ({
      label,
      value: country,
      dialCode: countryCodes.customList(
        "countryCallingCode",
        "+{countryCallingCode}"
      )[country],
    })
  );

  return (
    <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
      <CardHeader className="border-b bg-muted/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold">
              Edit Profile
            </CardTitle>
            <CardDescription className="mt-1">
              Update your personal information and contact details
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Personal Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="avatar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Picture</FormLabel>
                        <FormControl>
                          <ImageUploaderClient
                            type="image"
                            onUpload={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123 Main Street"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            {/* Contact Information Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Contact Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Phone</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+91 995 995 995"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alternatePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+91 995 995 995"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            {/* Location Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Location Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>

                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {countryOptions.map((country) => (
                              <SelectItem
                                key={country.value}
                                value={country.label}
                              >
                                {country.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <FormLabel>State / Province</FormLabel>
                      <FormControl>
                        <Input placeholder="Maharashtra" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Mumbai" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zipcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal / ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="400001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {mutate.isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  {(mutate.error as Error).message || "Something went wrong"}
                </AlertDescription>
              </Alert>
            )}

            {mutate.isSuccess && (
              <Alert className="border-green-200 bg-green-50 text-green-900">
                <AlertDescription>
                  Profile updated successfully
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                className="flex-1"
                disabled={mutate.isPending}
              >
                {mutate.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {mutate.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={mutate.isPending}
                className="flex-1 bg-transparent"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default EditProfile;
