"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation , useQuery} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { set, z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO, isAfter } from "date-fns";
import { useAuthStore } from "@/store/useAuthStore";
import {Loader} from "@/components/custom/loader";


interface Batch {
  startDate: string;
  endDate: string;
  quad: number;
  triple: number;
  double: number;
  child: number;
  quadDiscount: number;
  tripleDiscount: number;
  doubleDiscount: number;
  childDiscount: number;
}
interface Package {
  _id: string;
  title: string;
  description: string;
  batch: Batch[];
}


const formSchema = z.object({
  user: z.string(),
  packageId: z.string(),
  address: z
    .object({
      city: z.string().optional(),
      state: z.string().optional(),
      zipcode: z.string().optional(),
    })
    .optional(),
  travellers: z.object({
    quad: z.number().nonnegative(),
    triple: z.number().nonnegative(),
    double: z.number().nonnegative(),
    child: z.number().nonnegative(),
  }),
  travelDate: z.string().min(1),
  totalPrice: z.number().min(0),
});
type BookingFormValues = z.infer<typeof formSchema>;


async function bookPkgApi(values: BookingFormValues, accessToken: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
     },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error("Booking failed");
  return res.json();
}

function groupBatchesByMonth(batches: Batch[]) {
  const now = new Date();
  const upcoming = batches.filter(b => isAfter(parseISO(b.startDate), now));
  return upcoming.reduce((acc: Record<string, Batch[]>, batch) => {
    const key = format(parseISO(batch.startDate), "MMM ''yy");
    if (!acc[key]) acc[key] = [];
    acc[key].push(batch);
    return acc;
  }, {});
}

const getUser= async (accessToken:string)=>{
  const res= await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/me`,{
    headers:{"Authorization":`Bearer ${accessToken}`},})
    if(!res.ok) throw new Error("Failed to fetch user");
    const data=await res.json();
    return data?.data;
}

export default function BookingClient({ pkg }: { pkg: Package }) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [travellers, setTravellers] = useState({ quad: 0, triple: 0, double: 0, child: 0 });
  const [price, setPrice] = useState(0);

  const {data:myUser, isLoading, isError, error} = useQuery({queryKey:["user"], queryFn: ()=>getUser(accessToken), staleTime: 1000 * 60 * 5,});
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      user: myUser?._id || "",
      packageId: pkg._id,
      travellers,
      totalPrice: 0,
      travelDate: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: BookingFormValues) => bookPkgApi(payload, accessToken || ""),
    onSuccess: (res) => {
      toast.success("Booking created");
      router.push(`/payment/${res.data._id}`);
    },
    onError: (err) => toast.error(err.message || "Booking failed"),
  });

  const totalPrice = useMemo(() => {
    if (!selectedBatch) return 0;
    const price=
      travellers.quad * selectedBatch.quad +
      travellers.triple * selectedBatch.triple +
      travellers.double * selectedBatch.double +
      travellers.child * selectedBatch.child
      form.setValue("user", myUser?._id || "");
      setPrice(price);
    return price;
  }, [travellers, selectedBatch, myUser]);
  const totalPriceWithTax=Math.ceil(totalPrice*1.05)
  
  const batchesByMonth = useMemo(() => groupBatchesByMonth(pkg.batch? pkg.batch : []), [pkg.batch]);

  const confirmSelection = () => {
    if (!selectedBatch) return;
    form.setValue("travellers", travellers);
    form.setValue("totalPrice", totalPriceWithTax);
    form.setValue("travelDate", selectedBatch.startDate);
    setSelectedBatch(null);
  };

  const onSubmit = (values: BookingFormValues) => {
    if (mutation.isPending) return;
    mutation.mutate(values);
  };
  if(isLoading) return <Loader size={"lg"} message="Loading, please wait..." />;
  if(isError) return <div>{error.message}</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4">{pkg.title}</h2>

      {/* Batches Accordion */}
      <Accordion type="single" collapsible defaultValue={Object.keys(batchesByMonth)[0]} className="w-full border rounded-lg p-4">
        {Object.entries(batchesByMonth).map(([month, list]) => (
          <AccordionItem key={month} value={month}>
            <AccordionTrigger>{month}</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {list.map((b, i) => {
                  const start = format(parseISO(b.startDate), "dd MMM yyyy");
                  const end = format(parseISO(b.endDate), "dd MMM yyyy");
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedBatch(b)}
                      className="flex justify-between p-3 border rounded-lg cursor-pointer hover:bg-blue-50"
                    >
                      <div>
                        <p className="font-medium">{start} – {end}</p>
                        <p className="text-green-600 text-sm">Open</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Starting Price</p>
                        <p className="font-semibold text-[#FE5300]">₹{b.quad.toLocaleString()}</p>
                        <span className="font-semibold line-through">₹{b.quadDiscount.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>


      <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Select Travellers</DialogTitle></DialogHeader>
          {selectedBatch && (
            <div className="space-y-4">
              {(["quad", "triple", "double", "child"] as const).map(type => (
                <div key={type} className="flex  justify-between items-center">
                  <span className="capitalize">{type}</span>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" onClick={() => setTravellers(t => ({ ...t, [type]: Math.max(0, t[type] - 1) }))}>-</Button>
                    <span>{travellers[type]}</span>
                    <Button type="button" size="sm" onClick={() => setTravellers(t => ({ ...t, [type]: t[type] + 1 }))}>+</Button>
                  </div>
                  <p className="text-md text-[#FE5300] font-semibold">₹{selectedBatch[type]}</p>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Total</span>
                <span className="font-semibold">₹{totalPrice.toLocaleString()}</span>
              </div>
              <Button className="w-full" onClick={confirmSelection}>Confirm</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>


      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4"> 
          <div className="flex flex-col  justify-between border-t pt-4 space-y-4">
              <div>
              <div className="flex justify-between">
                <p className="text-md font-semibold"> Travel Date </p>
                 <p>{form.watch("travelDate").slice(0, 10)}</p>
              </div>
              <div className="flex justify-between">
                <p>Travellers</p>
                 <p className="text-sm text-gray-500">{travellers.quad + travellers.triple + travellers.double} adult(s) · {travellers.child} child(ren)</p>
              </div>
              </div>

             <div className="flex justify-between">
              <p className="text-md font-semibold">Package Price INR  </p>
              <p>{price}</p>
             </div>
             <div className="flex justify-between">
              <p>GST (5%)</p>
              <p className="text-sm text-gray-500"> { price*0.05 } </p>
             </div>
              <div className="flex justify-between">
                <p className="text-md font-semibold">Total Price (Incl. GST) </p>
                <p className="text-md font-semibold"> ₹{form.watch("totalPrice")}</p>
              </div>
              
            {/* </div> */}
          </div>
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Processing..." : "Book Now"}
        </Button>
      </form>
    </div>
  );
}
