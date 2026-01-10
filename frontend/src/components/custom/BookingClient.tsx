"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, parseISO, isAfter } from "date-fns";
import { useAuthStore } from "@/store/useAuthStore";
import { useGroupBookingStore } from "@/store/useBookingStore";
import { AddOns } from "@/app/admin/holidays/new/page";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  ArrowRight,
  Badge,
  Calendar,
  CheckCircle2,
  Minus,
  Plus,
} from "lucide-react";

interface Batch {
  _id: string;
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
  addOns: AddOns[];
  batch: Batch[];
}

const formSchema = z.object({
  packageId: z.string(),
  batchId: z.string(),
  travellers: z.object({
    quad: z.number().nonnegative(),
    triple: z.number().nonnegative(),
    double: z.number().nonnegative(),
    child: z.number().nonnegative(),
  }),
  totalPrice: z.number().min(0),
  addOns: z
    .array(
      z.object({
        title: z.string(),
        price: z.number(),
        noOfPeople: z.number(),
      })
    )
    .optional(),
});
type BookingFormValues = z.infer<typeof formSchema>;

function groupBatchesByMonth(batches: Batch[]) {
  const now = new Date();
  const upcoming = batches.filter(
    (b) =>
      isAfter(parseISO(b.startDate), now) ||
      format(parseISO(b.startDate), "yyyy-MM-dd") === format(now, "yyyy-MM-dd")
  );
  return upcoming.reduce((acc: Record<string, Batch[]>, batch) => {
    const key = format(parseISO(batch.startDate), "MMM ''yy");
    if (!acc[key]) acc[key] = [];
    acc[key].push(batch);
    return acc;
  }, {});
}

export default function BookingClient({ pkg }: { pkg: Package }) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const setGroup = useGroupBookingStore((state) => state.setGroup);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [confirmedBatch, setConfirmedBatch] = useState<Batch | null>(null);
  const [travellers, setTravellers] = useState({
    quad: 0,
    triple: 0,
    double: 0,
    child: 0,
  });
  // const [price, setPrice] = useState(0);
  const [addOns, setAddOns] = useState<
    { title: string; price: number; noOfPeople: number }[]
  >([]);
  const [addOnPeople, setAddOnPeople] = useState<Record<string, number>>({});

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      packageId: pkg._id,
      batchId: selectedBatch?._id || "",
      travellers,
      totalPrice: 0,
    },
  });

  const totalPrice = useMemo(() => {
    if (!confirmedBatch) return 0;

    const basePrice =
      travellers.quad * confirmedBatch.quad +
      travellers.triple * confirmedBatch.triple +
      travellers.double * confirmedBatch.double +
      travellers.child * confirmedBatch.child;

    const addOnPrice = addOns.reduce(
      (sum, a) => sum + a.price * a.noOfPeople,
      0
    );

    return basePrice + addOnPrice;
  }, [travellers, confirmedBatch, addOns]);

  // const totalPriceWithTax = Math.ceil(totalPrice * 1.05);

  const batchesByMonth = useMemo(
    () => groupBatchesByMonth(pkg.batch ? pkg.batch : []),
    [pkg.batch]
  );

  const confirmSelection = () => {
    if (!selectedBatch) return;

    setConfirmedBatch(selectedBatch); // ✅ save batch
    form.setValue("travellers", travellers);
    form.setValue("batchId", selectedBatch._id);

    // setSelectedBatch(null); // only closes dialog
  };

  const onSubmit = (values: BookingFormValues) => {
    setGroup(values);
    router.push(`/payment/${values.packageId}`);
  };
  useEffect(() => {
    form.setValue("addOns", addOns);
  }, [addOns, form]);

  useEffect(() => {
    form.setValue("totalPrice", totalPrice);
  }, [totalPrice, form]);

  const handleAddOn = (
    addon: { title: string; price: number },
    people: number
  ) => {
    setAddOns((prev) => {
      const existing = prev.find((a) => a.title === addon.title);

      if (existing) {
        return prev.map((a) =>
          a.title === addon.title ? { ...a, noOfPeople: people } : a
        );
      }

      return [...prev, { ...addon, noOfPeople: people }];
    });
  };

  const handleRemoveAddOn = (title: string) => {
    setAddOns((prev) => prev.filter((a) => a.title !== title));
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h2 className="text-2xl font-semibold mb-4">{pkg.title}</h2>

      {/* Batches Accordion */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Select Travel Dates</h2>
        </div>

        <Accordion
          type="single"
          collapsible
          defaultValue={Object.keys(batchesByMonth)[0]}
          className="w-full space-y-3"
        >
          {Object.entries(batchesByMonth).map(([month, list]) => (
            <AccordionItem
              key={month}
              value={month}
              className="border rounded-xl px-4 bg-card shadow-sm hover:shadow-md transition-shadow"
            >
              <AccordionTrigger className="hover:no-underline py-4">
                <span className="text-lg font-medium">{month}</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid gap-3">
                  {list.map((b) => {
                    const start = format(parseISO(b.startDate), "EEE, dd MMM");
                    const end = format(parseISO(b.endDate), "EEE, dd MMM");
                    const isSelected = confirmedBatch?._id === b._id;

                    return (
                      <div
                        key={b._id}
                        onClick={() => setSelectedBatch(b)}
                        className={`group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-inner"
                            : "border-transparent bg-secondary/50 hover:bg-secondary/80 hover:border-primary/20"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">
                              {start}
                            </span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold text-lg">{end}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              // variant="outline"
                              className="text-[10px] font-bold uppercase tracking-wider bg-green-500/10 text-green-600 border-green-500/20"
                            >
                              Available
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Industry Best Price
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 sm:mt-0 text-left sm:text-right">
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">
                            From
                          </p>
                          <div className="flex items-baseline justify-start sm:justify-end gap-2">
                            <p className="text-2xl font-bold text-primary">
                              ₹{b.quad.toLocaleString()}
                            </p>
                            <span className="text-sm text-muted-foreground line-through">
                              ₹{b.quadDiscount.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <CheckCircle2 className="absolute -top-2 -right-2 w-6 h-6 text-primary fill-background shadow-sm rounded-full" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      <Dialog
        open={!!selectedBatch}
        onOpenChange={() => setSelectedBatch(null)}
      >
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Configure Travellers
            </DialogTitle>
            <DialogDescription>
              Select the number of travellers based on room occupancy.
            </DialogDescription>
          </DialogHeader>

          {selectedBatch && (
            <div className="space-y-6 pt-4">
              <div className="grid gap-4">
                {(["quad", "triple", "double", "child"] as const).map(
                  (type) => (
                    <div
                      key={type}
                      className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/50"
                    >
                      <div className="space-y-1">
                        <span className="capitalize font-bold text-lg">
                          {type} Occupancy
                        </span>
                        <p className="text-primary font-semibold">
                          ₹{selectedBatch[type].toLocaleString()} / pax
                        </p>
                      </div>
                      <div className="flex items-center gap-4 bg-background p-1 rounded-lg border shadow-sm">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-md"
                          onClick={() =>
                            setTravellers((t) => ({
                              ...t,
                              [type]: Math.max(0, t[type] - 1),
                            }))
                          }
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="text-lg font-bold min-w-[20px] text-center">
                          {travellers[type]}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-md"
                          onClick={() => {
                            setTravellers((t) => ({
                              ...t,
                              [type]: t[type] + 1,
                            }));
                            confirmSelection();
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-muted-foreground">
                    Running Total
                  </span>
                  <span className="text-2xl font-black text-primary">
                    ₹{totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              <Button
                className="w-full h-12 text-lg font-bold rounded-xl"
                onClick={() => setSelectedBatch(null)}
              >
                Confirm Selection
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Ons */}
      {pkg.addOns?.length > 0 && (
        <div className="space-y-4">
          <p className="font-semibold text-xl">Special Add On</p>

          <Accordion
            type="single"
            collapsible
            defaultValue={pkg.addOns[0].title}
            className="w-full border rounded-lg p-4"
          >
            {pkg.addOns?.map((items) => (
              <AccordionItem key={items.title} value={items.title}>
                <AccordionTrigger>{items.title}</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {items.items?.map((b, i) => {
                      const selected = addOns.find((a) => a.title === b.title);
                      // const [people, setPeople] = useState(1);

                      return (
                        <div
                          key={i}
                          className="flex flex-wrap gap-4 justify-between p-3 border rounded-lg"
                        >
                          <p className="font-medium">{b.title}</p>
                          <p>₹{b.price.toLocaleString()}</p>

                          <div className="flex items-center gap-2">
                            <Label>No. of People</Label>
                            <Input
                              type="number"
                              min={1}
                              value={addOnPeople[b.title] || 1}
                              onChange={(e) =>
                                setAddOnPeople((p) => ({
                                  ...p,
                                  [b.title]: Number(e.target.value),
                                }))
                              }
                            />
                          </div>

                          {!selected ? (
                            <Button
                              onClick={() =>
                                handleAddOn(
                                  { title: b.title, price: b.price },
                                  addOnPeople[b.title] || 1
                                )
                              }
                              className="w-20"
                            >
                              Add
                            </Button>
                          ) : (
                            <Button
                              variant="destructive"
                              onClick={() => handleRemoveAddOn(b.title)}
                              className="w-20"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
        <div className="flex flex-col  justify-between border-t pt-4 space-y-4">
          <div>
            <div className="flex justify-between">
              <p className="text-md font-semibold"> Travel Date </p>
              <p>
                <p>{confirmedBatch?.startDate.split("T")[0]}</p>
              </p>
            </div>
            <div className="flex justify-between">
              <p>Travellers</p>
              <p className="text-sm text-gray-500">
                {travellers.quad + travellers.triple + travellers.double}{" "}
                adult(s) · {travellers.child} child(ren)
              </p>
            </div>
          </div>
          <div className="flex justify-between">
            <p className="text-md font-semibold">Total Price</p>
            <p className="text-md font-semibold">
              {" "}
              ₹{form.watch("totalPrice")}
            </p>
          </div>

          {/* </div> */}
        </div>
        <Button type="submit" className="w-full">
          {/* {mutation.isPending ? "Processing..." : "Book Now"} */}
          Book Now
        </Button>
      </form>
    </div>
  );
}
