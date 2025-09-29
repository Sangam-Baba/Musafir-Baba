"use client"

import { useForm, SubmitHandler } from "react-hook-form"
import { useMutation , useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import ImageUploader from "@/components/admin/ImageUploader"
import { useAuthStore } from "@/store/useAuthStore"
import { useParams } from "next/navigation"
import {Loader} from "@/components/custom/loader"
import { useEffect } from "react"
interface Visa{
    country: string;
    cost: number;
    visaType: string;
    childUrl?: string;
    coverImage?:{
        url:string;
        alt:string;
        width?:number;
        height?:number;
    };
    duration: string;
    visaProcessed: number
}



async function updateVisa(values: Visa, accessToken: string , id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(values),
  })

  if (!res.ok) {
    const errorData = await res.json()
    throw new Error(errorData.message || "Updation failed")
  }

  return res.json()
}

async function getVisa (id: string , accessToken: string) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa/${id}`,{
        method:"GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        }
    });
    if (!res.ok) throw new Error("Failed to fetch Visa");
    const data = await res.json();
    return data?.data;
}
export default function CreateVisaPage() {
  const accessToken = useAuthStore((state) => state.accessToken) as string
  const { id } = useParams() as { id: string };

  const defaultValues: Visa = {
    country: "",
    cost: 0,
    visaType: "DAC",
    coverImage: {
      url: "",
      alt: "",
      width: 50,
      height: 50,
    },
    visaProcessed:0,
    childUrl: "",
    duration: "",
  }
   const form = useForm<Visa>({ defaultValues })
  const { data, isLoading , isError , error } = useQuery<Visa>({
    queryKey: ["visa" , id],
    queryFn: () => getVisa(id , accessToken),
    staleTime: 1000 * 60 * 5,
    retry: 2,
  })


 
  useEffect(()=>{
    if(data){
        form.setValue("country" , data.country);
        form.setValue("cost" , data.cost);
        form.setValue("visaType" , data.visaType);
        form.setValue("coverImage" , data.coverImage);
        form.setValue("childUrl" , data.childUrl);
        form.setValue("duration" , data.duration);
        form.setValue("visaProcessed" , data.visaProcessed);
    }
  },[data, form])

  // ✅ pass variables (values) into mutate
  const mutation = useMutation({
    mutationFn: (values: Visa) => updateVisa(values, accessToken , id),
    onSuccess: (data) => {
      console.log("Updated successfully:", data)
      toast.success("Updated successful!")
      form.reset(defaultValues)
    },
    onError: (error: unknown) => {
      console.error("Updation failed:", error)
      toast.error(error instanceof Error ? error.message : "Something went wrong")
    },
  })

  const onSubmit: SubmitHandler<Visa> = (values) => {
    mutation.mutate(values)
  }

  if(isLoading) return <Loader size="lg" message="Loading Visa..." />;
  if(isError) return <h1>{(error as Error).message}</h1>;


  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">Edit Visa</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name */}
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input placeholder="Thailand" {...field} required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="100" {...field} required />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* About */}
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="2 to 7" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* About */}
            <FormField
              control={form.control}
              name="childUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apply Now Link</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="https://musafirbaba.com/visa/thailand" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* About */}
            <FormField
              control={form.control}
              name="visaProcessed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Visa Processed</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="100" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Role */}
            <FormField
              control={form.control}
              name="visaType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visa Type</FormLabel>
                  <FormControl>
                    <select
                      className="w-full rounded-md border border-gray-300 p-2"
                      {...field}
                      required
                    >
                        <option value="" disabled>Select Visa Type</option>
                      <option value="DAC">DAC</option>
                      <option value="E-Visa">E-Visa</option>
                      <option value="ETA">ETA</option>
                      <option value="EVOA">EVOA</option>
                      <option value="PAR">PAR</option>
                      <option value="Sticker">Sticker</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Avatar */}
            <FormField
              control={form.control}
              name="coverImage"
              render={() => (
                <FormItem>
                  <FormLabel>Avatar</FormLabel>
                  <FormControl>
                    <ImageUploader
                      onUpload={(img) =>
                        form.setValue("coverImage", {
                          url: img.url,
                          alt: form.getValues("country") ?? "",
                        })
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Updating..." : "Update Visa"}
            </Button>
          </form>
        </Form>

        {mutation.isError && (
          <p className="mt-3 text-center text-sm text-red-500">
            {(mutation.error as Error).message}
          </p>
        )}
        {mutation.isSuccess && (
          <p className="mt-3 text-center text-sm text-green-600">Visa Updated successful!</p>
        )}
      </div>
    </div>
  )
}
