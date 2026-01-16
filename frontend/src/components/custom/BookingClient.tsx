"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  Clock,
  MapPin,
  Minus,
  Plus,
  User,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";

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
  coverImage: {
    url: string;
    alt: string;
  };
  destination: {
    country: string;
    state: string;
  };
  duration: {
    days: number;
    nights: number;
  };

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
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(
    pkg?.batch[0] ?? null
  );
  const [confirmedBatch, setConfirmedBatch] = useState<Batch | null>(
    pkg?.batch[0] ?? null
  );
  const [travellers, setTravellers] = useState({
    quad: 0,
    triple: 0,
    double: 0,
    child: 0,
  });
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

  const batchesByMonth = useMemo(
    () => groupBatchesByMonth(pkg.batch ? pkg.batch : []),
    [pkg.batch]
  );

  const confirmSelection = (batch: Batch) => {
    setConfirmedBatch(batch);
    form.setValue("batchId", batch._id);
  };

  const onSubmit = (values: BookingFormValues) => {
    if (totalPrice === 0) {
      toast.error("Please select Travellers");
      return;
    }
    setGroup({
      packageId: pkg._id,
      batchId: confirmedBatch!._id,
      travellers: travellers,
      addOns: addOns,
    });
    router.push(`/payment/${values.packageId}`);
  };
  useEffect(() => {
    form.setValue("addOns", addOns);
  }, [addOns, form]);

  useEffect(() => {
    form.setValue("travellers", travellers);
  }, [travellers, form]);

  useEffect(() => {
    form.setValue("totalPrice", totalPrice);
    if (totalPrice > 0) setCurrentStep(1);
    else setCurrentStep(0);
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

  const steps = ["Select Batch", "Select Travellers", "Payment"];
  // if (!accessToken) return <div>Please Login</div>;
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-4">
      {/* <h2 className="text-2xl font-semibold mb-4">{pkg.title}</h2> */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-5 p-4 rounded-md shadow-md">
        <div className="flex items-center gap-2">
          <Image
            src={pkg.coverImage.url}
            alt={pkg.title}
            width={500}
            height={500}
            className="w-[150px] h-[100px] rounded-md"
          />
          <h1 className="md:text-3xl text-xl font-bold mb-4">{pkg.title}</h1>
        </div>

        <div className="flex gap-2">
          <span className="flex items-center gap-1 p-1 rounded-md md:text-lg">
            <MapPin color="#FE5300" size={20} />
            <span>
              {pkg.destination.state.charAt(0).toUpperCase() +
                pkg.destination.state.slice(1)}
            </span>
          </span>

          <span className="flex items-center gap-1 p-1 rounded-md md:text-lg">
            <Clock color="#FE5300" size={20} />
            <span>
              {pkg.duration.nights}N/{pkg.duration.days}D
            </span>
          </span>
        </div>
      </div>
      {Object.values(batchesByMonth).length > 0 ? (
        <div className="mt-10">
          {/* Stepper Header */}
          <div className="flex items-center justify-between mb-8 sticky top-3 bg-white z-10">
            {steps.map((step, index) => (
              <div key={index} className="flex-1 text-center relative">
                <div
                  className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                    index === currentStep
                      ? "bg-[#FF5300] text-white"
                      : index < currentStep
                      ? "bg-[#FF5300]/70 text-white"
                      : "bg-gray-300 text-gray-700"
                  }`}
                >
                  {index + 1}
                </div>
                <p className="text-xs mt-2 text-gray-600">{step}</p>

                {/* Progress line */}
                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-4 left-[50%] h-[2px] w-[100%] z-[-1] ${
                      index < currentStep ? "bg-[#FF5300]" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-col md:flex-row gap-8 justify-between">
            <div className="w-full md:w-1/2">
              {/* Batches Accordion */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Select Travel Dates</h2>
                </div>

                <Tabs
                  defaultValue={Object.keys(batchesByMonth)[0]}
                  className="flex flex-col w-full "
                >
                  <div className="overflow-x-auto no-scrollbar">
                    <TabsList className="flex flex-row gap-4 mb-4 whitespace-nowrap min-w-max">
                      {Object.keys(batchesByMonth).map((month) => (
                        <TabsTrigger
                          key={month}
                          value={month}
                          className="hover:bg-[#FE5300]/80"
                        >
                          {month}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {Object.entries(batchesByMonth).map(([month, list]) => (
                    <TabsContent key={month} value={month} className="w-full">
                      <div className="grid gap-3">
                        {list.map((b) => {
                          const start = format(
                            parseISO(b.startDate),
                            "EEE, dd MMM"
                          );
                          const end = format(
                            parseISO(b.endDate),
                            "EEE, dd MMM"
                          );
                          const isSelected = selectedBatch?._id === b._id;

                          return (
                            <div
                              key={b._id}
                              onClick={() => {
                                setSelectedBatch(b);
                                confirmSelection(b);
                                const el =
                                  document.getElementById("calculator");
                                el?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                });
                              }}
                              className={`group relative flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                isSelected
                                  ? "border-primary bg-primary/5 shadow-inner"
                                  : "border-transparent bg-secondary/50 hover:bg-secondary/80 hover:border-primary/20"
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold md:text-lg text-md">
                                    {start}
                                  </span>
                                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-semibold md:text-lg text-md">
                                    {end}
                                  </span>
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

                              <div className="">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-tight">
                                  From{" "}
                                  <span className="text-sm text-muted-foreground line-through">
                                    ₹{b.quadDiscount.toLocaleString()}
                                  </span>
                                </p>
                                <div className="flex items-baseline justify-start sm:justify-end gap-2">
                                  <p className="text-2xl font-bold text-primary">
                                    ₹{b.quad.toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              {isSelected && (
                                <CheckCircle2 className="absolute -top-2 -right-2 w-6 h-6 text-primary fill-background shadow-sm rounded-full" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </section>

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
                              const selected = addOns.find(
                                (a) => a.title === b.title
                              );
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
            </div>
            {/* Calculator */}
            <div
              id="calculator"
              className="w-full md:w-1/2 md:mt-10 border rounded-xl px-4 bg-card shadow-sm hover:shadow-md transition-shadow h-fit py-4 pt-4 sticky top-10 self-start"
            >
              <div className="flex justify-between px-5 gap-5 py-2">
                <h3 className="capitalize font-bold md:text-lg text-md whitespace-nowrap">
                  Room Type
                </h3>
                <p className="capitalize font-bold md:text-lg text-md whitespace-nowrap">
                  Adults
                </p>
              </div>

              {selectedBatch && (
                <div className="space-y-6  ">
                  <div className="grid gap-4">
                    {(
                      [
                        { name: "quad", no: 4 },
                        { name: "triple", no: 3 },
                        { name: "double", no: 2 },
                        { name: "child", no: 1 },
                      ] as const
                    ).map((type) => (
                      <div
                        key={type.name}
                        className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/50"
                      >
                        <div className="space-y-1 flex gap-2 md:gap-5">
                          <div className="flex flex-col">
                            <span className="capitalize font-bold text-md">
                              {type.name === "child"
                                ? "Child"
                                : `${type.name} Sharing`}
                            </span>
                            <div className="flex gap-2">
                              <span className="flex gap-1 ml-2">
                                {Array.from({ length: type.no }).map((_, i) => (
                                  <User key={i} className="w-4 h-4" />
                                ))}
                              </span>
                              {type.name == "child" && (
                                <p className="text-xs text-muted-foreground whitespace-nowrap ">
                                  Child upto 12 years
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-primary font-semibold whitespace-nowrap">
                          ₹{selectedBatch[type.name].toLocaleString()}/-
                        </p>
                        <div className="flex items-center md:gap-4 gap-3 bg-background p-1 rounded-lg border shadow-sm">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="md:h-8 md:w-8 h-4 w-4 rounded-md"
                            onClick={() => {
                              setTravellers((t) => ({
                                ...t,
                                [type.name]: Math.max(0, t[type.name] - 1),
                              }));
                              confirmSelection(selectedBatch);
                            }}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="md:text-lg text-md font-semibold text-center">
                            {travellers[type.name]}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="md:h-8 md:w-8 h-4 w-4 rounded-md"
                            onClick={() => {
                              setTravellers((t) => ({
                                ...t,
                                [type.name]: t[type.name] + 1,
                              }));
                              confirmSelection(selectedBatch);
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="mt-6 space-y-4"
                  >
                    <div className="flex flex-col justify-between border-t pt-4 space-y-4">
                      <div>
                        <div className="flex justify-between">
                          <p className="text-md font-semibold"> Travel Date </p>
                          <p>
                            <p>
                              {new Date(
                                confirmedBatch?.startDate || ""
                              ).toLocaleDateString("en-UK", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </p>
                        </div>

                        {(["quad", "triple", "double", "child"] as const).map(
                          (type) => (
                            <div key={type} className="mb-2">
                              {confirmedBatch
                                ? travellers?.[type] > 0 && (
                                    <div className="flex justify-between">
                                      <p className="capitalize">{type}</p>
                                      <p className="text-sm text-gray-500">
                                        ₹
                                        {confirmedBatch?.[
                                          type
                                        ].toLocaleString()}{" "}
                                        X {travellers?.[type]}
                                      </p>
                                    </div>
                                  )
                                : null}
                            </div>
                          )
                        )}
                        <div className="flex justify-between border-t pt-4">
                          <p>Total Travellers</p>
                          <p className="text-sm text-gray-500">
                            {travellers.quad +
                              travellers.triple +
                              travellers.double}{" "}
                            adult(s) · {travellers.child} child(ren)
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between bg-primary/5 p-4 rounded-xl border border-primary/10">
                        <p className="text-md font-semibold">Total Price</p>
                        <p className="text-xl font-semibold">
                          {" "}
                          ₹{form.watch("totalPrice").toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      Book Now
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
          {/* <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg md:hidden px-5 pb-2">
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-6 space-y-4"
            >
              <div className="flex flex-col justify-between border-t pt-4 space-y-4">
                <div>
                  <div className="flex justify-between">
                    <p className="text-md font-semibold"> Travel Date </p>
                    <p>
                      <p>
                        {new Date(
                          confirmedBatch?.startDate || ""
                        ).toLocaleDateString("en-UK", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </p>
                  </div>

                  {(["quad", "triple", "double", "child"] as const).map(
                    (type) => (
                      <div key={type} className="mb-2">
                        {confirmedBatch
                          ? travellers?.[type] > 0 && (
                              <div className="flex justify-between">
                                <p className="capitalize">{type}</p>
                                <p className="text-sm text-gray-500">
                                  ₹{confirmedBatch?.[type]} X{" "}
                                  {travellers?.[type]}
                                </p>
                              </div>
                            )
                          : null}
                      </div>
                    )
                  )}
                  <div className="flex justify-between border-t pt-4">
                    <p>Total Travellers</p>
                    <p className="text-sm text-gray-500">
                      {travellers.quad + travellers.triple + travellers.double}{" "}
                      adult(s) · {travellers.child} child(ren)
                    </p>
                  </div>
                </div>
                <div className="flex justify-between bg-primary/5 p-4 rounded-xl border border-primary/10">
                  <p className="text-md font-semibold">Total Price</p>
                  <p className="text-xl font-semibold">
                    {" "}
                    ₹{form.watch("totalPrice").toLocaleString()}
                  </p>
                </div>
              </div>
              <Button type="submit" className="w-full">
                Book Now
              </Button>
            </form>
          </div> */}
        </div>
      ) : (
        <div className="w-full flex items-center justify-center ">
          <h2 className="text-2xl font-semibold">No Dates Available!</h2>
        </div>
      )}
    </div>
  );
}
