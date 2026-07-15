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
import { format, parseISO, isAfter, parse, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isBefore } from "date-fns";
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
  packagePercent?: number;
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
      }),
    )
    .optional(),
});
type BookingFormValues = z.infer<typeof formSchema>;

function groupBatchesByMonth(batches: Batch[]) {
  const now = new Date();
  const upcoming = batches.filter(
    (b) =>
      isAfter(parseISO(b.startDate), now) ||
      format(parseISO(b.startDate), "yyyy-MM-dd") === format(now, "yyyy-MM-dd"),
  );
  upcoming.sort(
    (a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime(),
  );
  return upcoming.reduce((acc: Record<string, Batch[]>, batch) => {
    const key = format(parseISO(batch.startDate), "MMM ''yy");
    if (!acc[key]) acc[key] = [];
    acc[key].push(batch);
    return acc;
  }, {});
}

export default function BookingClient({ pkg }: { pkg: Package }) {
  const batchesByMonth = useMemo(
    () => groupBatchesByMonth(pkg.batch ? pkg.batch : []),
    [pkg.batch],
  );
  // console.log("batchesByMonth", batchesByMonth);
  // console.log("firste", Object.values(batchesByMonth)[0]?.[0]);
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const setGroup = useGroupBookingStore((state) => state.setGroup);
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(
    Object.values(batchesByMonth)[0]?.[0] ?? null,
  );
  const [confirmedBatch, setConfirmedBatch] = useState<Batch | null>(
    Object.values(batchesByMonth)[0]?.[0] ?? null,
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

    const y = pkg.packagePercent || 0;
    const totalAdults = travellers.quad + travellers.triple + travellers.double;
    const applyMarkup = totalAdults < 4; // If 4 or more adults, waive the extra markup

    const baseAdults =
      travellers.quad * confirmedBatch.quad +
      travellers.triple * confirmedBatch.triple +
      travellers.double * confirmedBatch.double;

    let adultsTotal = 0;
    if (totalAdults > 0) {
      if (applyMarkup) {
        adultsTotal = baseAdults + (baseAdults * y) / 100;
      } else {
        adultsTotal = baseAdults;
      }
    }

    const baseChild = travellers.child * confirmedBatch.child;
    let childTotal = 0;
    if (baseChild > 0) {
      if (applyMarkup) {
        childTotal = baseChild + (baseChild * y) / 100;
      } else {
        childTotal = baseChild;
      }
    }

    const addOnPrice = addOns.reduce(
      (sum, a) => sum + a.price * a.noOfPeople,
      0,
    );

    return Math.round(adultsTotal + childTotal + addOnPrice);
  }, [travellers, confirmedBatch, addOns, pkg.packagePercent]);

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
    people: number,
  ) => {
    setAddOns((prev) => {
      const existing = prev.find((a) => a.title === addon.title);

      if (existing) {
        return prev.map((a) =>
          a.title === addon.title ? { ...a, noOfPeople: people } : a,
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
      <div className="relative bg-gray-100 rounded-lg overflow-hidden">
        <div className="relative">
          <div className="flex gap-8 lg:gap-12 items-start md:items-center justify-between">
            {/* Left: Image + Content */}
            <div className="flex gap-1 md:gap-8 items-start md:items-center w-full">
              {/* Package Image */}
              <div className="relative w-[120px] md:w-[200px] lg:w-[240px] aspect-4/3 h-[-webkit-fill-available] flex-shrink-0">
                <Image
                  src={pkg.coverImage?.url}
                  alt={pkg.title}
                  fill
                  sizes="(max-width: 768px) 120px, (max-width: 1024px) 200px, 240px"
                  className="object-cover rounded-r-lg shadow-md"
                  unoptimized
                />

                {/* Borders */}
                <div className="absolute inset-0 rounded-r-lg ring-2 ring-white/60 shadow-inner" />
                <div className="absolute inset-0 rounded-r-lg ring-1 ring-black/10" />
              </div>

              {/* Title & Details */}
              <div className="flex flex-col justify-center space-y-4 py-2">
                {/* Main Title */}
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
                  {pkg.title}
                </h1>

                {/* Location & Duration - Larger, better spaced */}
                <div className="flex gap-6 text-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="md:p-2 bg-orange-100 rounded-xl">
                      <MapPin size={20} className="text-[#FE5300]" />
                    </div>
                    <span className="md:text-lg  font-medium">
                      {pkg.destination.state.charAt(0).toUpperCase() +
                        pkg.destination.state.slice(1)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="md:p-2 bg-orange-100 rounded-xl">
                      <Clock size={20} className="text-[#FE5300]" />
                    </div>
                    <span className="md:text-lg font-medium">
                      {pkg.duration.nights}N/{pkg.duration.days}D
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
                        ? "bg-green-500 text-white"
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
                      index < currentStep ? "bg-green-500" : "bg-gray-300"
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
                
                <div className="flex items-center gap-2 mt-1 mb-2">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 shadow-sm" />
                  <span className="text-[10px] md:text-xs text-muted-foreground font-medium uppercase tracking-wider">Available Starting Dates</span>
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
                          className="border border-[#FE5300]
      data-[state=active]:bg-[#FE5300]
      data-[state=active]:text-white"
                        >
                          {month}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {Object.entries(batchesByMonth).map(([month, list]) => {
                    const monthDate = parse(month, "MMM ''yy", new Date());
                    const firstDay = startOfMonth(monthDate);
                    const lastDay = endOfMonth(monthDate);
                    const days = eachDayOfInterval({ start: firstDay, end: lastDay });
                    const startingDayIndex = getDay(firstDay); // 0 = Sunday, 1 = Monday, etc.
                    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

                    return (
                    <TabsContent key={month} value={month} className="w-full">
                      <div className="bg-white border rounded-xl p-4 shadow-sm">
                        <div className="grid grid-cols-7 gap-1 text-center mb-2">
                          {weekDays.map(day => (
                            <div key={day} className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-2">
                              {day}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1 md:gap-2 text-center">
                          {Array.from({ length: startingDayIndex }).map((_, i) => (
                            <div key={`empty-${i}`} className="p-2 md:p-3" />
                          ))}
                          {days.map(day => {
                            const batchForDay = list.find(b => isSameDay(parseISO(b.startDate), day));
                            
                            const isSelectedRange = selectedBatch && (
                              isSameDay(day, parseISO(selectedBatch.startDate)) ||
                              isSameDay(day, parseISO(selectedBatch.endDate)) ||
                              (isAfter(day, parseISO(selectedBatch.startDate)) && isBefore(day, parseISO(selectedBatch.endDate)))
                            );

                            const isSelectedStart = selectedBatch && isSameDay(day, parseISO(selectedBatch.startDate));
                            const isSelectedEnd = selectedBatch && isSameDay(day, parseISO(selectedBatch.endDate));
                            
                            return (
                              <div
                                key={day.toString()}
                                onClick={() => {
                                  if (batchForDay) {
                                    setSelectedBatch(batchForDay);
                                    confirmSelection(batchForDay);
                                    const el = document.getElementById("calculator");
                                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                                  }
                                }}
                                className={`relative p-0.5 md:p-1 rounded-lg border flex flex-col items-center justify-center transition-all min-h-[28px] md:min-h-[32px] ${
                                  isSelectedRange
                                    ? "border-blue-500 bg-blue-500/10 " + (isSelectedStart ? "ring-1 ring-blue-500" : "")
                                    : batchForDay
                                      ? "border-green-200 bg-green-50/50 hover:border-green-500 hover:bg-green-100 cursor-pointer hover:shadow-sm"
                                      : "border-transparent bg-gray-50 text-gray-400 opacity-50 cursor-not-allowed"
                                } ${batchForDay ? "cursor-pointer" : ""}`}
                              >
                                <span className={`text-[10px] md:text-xs font-semibold leading-none ${batchForDay && !isSelectedStart ? 'text-gray-900' : ''} ${isSelectedRange ? 'text-blue-600' : ''}`}>
                                  {format(day, 'd')}
                                </span>
                                {batchForDay && (
                                  <span className={`text-[8px] md:text-[9px] font-medium leading-none mt-1 ${isSelectedRange ? 'text-blue-700/70' : 'text-green-700/70'}`}>
                                    ₹{Math.floor(batchForDay.quad / 1000)}k
                                  </span>
                                )}
                                {batchForDay && !isSelectedStart && (
                                  <div className="absolute top-1 right-1 w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full shadow-sm" />
                                )}
                                {isSelectedStart && (
                                  <CheckCircle2 className="absolute -top-1 -right-1 w-3 h-3 text-blue-500 fill-white rounded-full bg-white" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </TabsContent>
                  )})}
                </Tabs>

                {/* Details of Selected Batch - Moved outside Tabs so it stays visible across months */}
                {selectedBatch && (
                  <div className="mt-2 p-2 md:p-3 border-2 border-green-500/20 bg-green-500/5 rounded-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm md:text-base">
                          {format(parseISO(selectedBatch.startDate), "MMMM d, yyyy")}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="font-semibold text-sm md:text-base">
                          {format(parseISO(selectedBatch.endDate), "MMMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="text-[9px] font-bold uppercase tracking-wider bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">
                          Available
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          Industry Best Price
                        </span>
                      </div>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                        From{" "}
                        <span className="text-xs line-through">
                          ₹{selectedBatch.quadDiscount.toLocaleString()}
                        </span>
                      </p>
                      <p className="text-lg md:text-xl font-bold text-green-600">
                        ₹{selectedBatch.quad.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Disclaimer */}
                <div className="mt-4 p-4 bg-gray-50 border rounded-xl text-xs text-muted-foreground space-y-1.5">
                  <h3 className="font-semibold text-sm text-gray-900 mb-3">Disclaimer</h3>
                  <p className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Booking amount is non-refundable.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Package cost is based on a minimum of 4 travellers.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Trip may be rescheduled if minimum group size is not met.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>Prices are subject to availability and confirmation.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span>By submitting this form, you agree to the applicable booking T&C.</span>
                  </p>
                </div>
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
                                (a) => a.title === b.title,
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
                                          addOnPeople[b.title] || 1,
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
              className="w-full scroll-mt-20 md:w-1/2 md:mt-10 border rounded-xl px-4 bg-card shadow-sm hover:shadow-md transition-shadow h-fit py-4 pt-4 sticky top-10 self-start"
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
                  <p className="text-xs text-muted-foreground italic mt-2">
                    *These prices are valid for a minimum group of 4 persons.
                  </p>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="mt-6 space-y-4"
                  >
                    <div className="flex flex-col justify-between border-t pt-4 space-y-4">
                      <div>
                        <div className="flex justify-between">
                          <p className="text-md font-semibold"> Travel Date </p>
                          <p>
                            {new Date(
                              confirmedBatch?.startDate || "",
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>

                        {(["quad", "triple", "double", "child"] as const).map(
                          (type) => {
                            if (!confirmedBatch || travellers?.[type] === 0) return null;

                            const y = pkg.packagePercent || 0;
                            const totalAdults = travellers.quad + travellers.triple + travellers.double;
                            const applyMarkup = totalAdults < 4; // Markup is waived if 4 or more adults
                            let base = confirmedBatch[type];
                            let markedUp = base;

                            if (applyMarkup) {
                                markedUp = base + (base * y) / 100;
                            }

                            markedUp = Math.round(markedUp);

                            return (
                              <div key={type} className="mb-2">
                                <div className="flex justify-between">
                                  <p className="capitalize">{type === 'child' ? 'Child' : `${type} Sharing`}</p>
                                  <p className="text-sm text-gray-500">
                                    ₹{markedUp.toLocaleString()} X {travellers[type]}
                                  </p>
                                </div>
                              </div>
                            );
                          }
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
                    <div className="flex gap-5 bg-green-200 rounded-xl p-2 items-center">
                      <Badge className="w-5 h-5 text-green-900" />
                      <p className="text-sm text-gray-600">
                        Partial Payment Available at checkout page
                      </p>
                    </div>
                    <Button type="submit" className="w-full">
                      Book Now
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full flex items-center justify-center ">
          <h2 className="text-2xl font-semibold">No Dates Available!</h2>
        </div>
      )}
    </div>
  );
}
