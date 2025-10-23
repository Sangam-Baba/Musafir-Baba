"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  useForm,
  FormProvider,
  useWatch,
  Control,
  Path,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";

/* --- Your existing Zod schema and helper types remain unchanged --- */
// (Use your fullSchema, types, and fetchPackages as-is)
const zNumber = (msg = "Must be a number") =>
  z.coerce.number({ invalid_type_error: msg });

const fullSchema = z.object({
  customizedPackageId: z.string().min(1),
  numberOfPeople: zNumber().min(1),
  city: z.array(z.object({ name: z.string() })),
  duration: z.object({
    durationType: z.enum(["fixed", "flexible"]),
    fixed: z
      .object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        totalDays: zNumber().optional(),
      })
      .optional(),
    flexible: z
      .object({
        month: z.string().optional(),
        totalDays: zNumber().optional(),
      })
      .optional(),
  }),
  transportType: z.object({
    name: z.string().min(1),
    price: zNumber().optional(),
    quantity: zNumber().min(1),
  }),
  hotelType: z
    .object({
      name: z.string().min(1),
      roomType: z.string().min(1),
      price: zNumber().optional(),
      quantity: zNumber().min(1),
    })
    .optional(),
  mealType: z
    .object({
      name: z.string().min(1),
      price: zNumber().optional(),
    })
    .optional(),
  tourGuide: z
    .object({
      name: z.string().min(1),
      price: zNumber().optional(),
    })
    .optional(),
  activities: z
    .array(z.object({ name: z.string().min(1), price: zNumber() }))
    .optional(),
  doorToDoor: z.boolean().optional(),
  finalPrice: zNumber().optional(),
  paidPrice: zNumber().optional(),
});

type FormData = z.infer<typeof fullSchema>;

interface BookingResponse {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    role: string;
    __v: number;
  };
  customizedPackageId: string;
  doorToDoor: boolean;
  finalPrice: number;
  paidPrice: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}
/* --------------------- API types --------------------- */
interface Destination {
  _id: string;
  name: string;
  state?: string;
}
interface City {
  _id: string;
  name: string;
}
interface Transport {
  vehicleType: string;
  price: number;
}
interface Hotel {
  star: string; // "3", "4" ...
  quadPrice?: number;
  doublePrice?: number;
  triplePrice?: number;
}
interface NameAndPrice {
  name: string;
  price: number;
}
interface Package {
  _id: string;
  title?: string;
  destination?: Destination;
  price?: number;
  city?: City[];
  transport?: Transport[];
  hotel?: Hotel[];
  mealType?: NameAndPrice[];
  activities?: NameAndPrice[];
  tourGuide?: NameAndPrice[];
}
const fetchPackages = async (token?: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedpackage`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );
  if (!res.ok) throw new Error("Failed to fetch packages");
  const json = await res.json();
  return json.data as Package[];
};

const createBooking = async (data: FormData, accessToken: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedbooking`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) throw new Error("Failed to book package");
  return res.json();
};
export default function CustomTourStepper() {
  const token = useAuthStore((s) => s.accessToken) as string;
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [paymentData, setPaymentData] = useState({
    key: "",
    txnid: "",
    amount: "",
    productinfo: "",
    firstname: "",
    lastname: "",
    email: "",
    phone: "",
    surl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success-customized`,
    furl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failure-customized`,
    hash: "",
    udf1: "",
    service_provider: "",
  });
  const methods = useForm<FormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      customizedPackageId: "",
      numberOfPeople: 1,
      city: [],
      duration: {},
      transportType: { name: "", price: 0, quantity: 1 },
      hotelType: { name: "", roomType: "Double", price: 0, quantity: 1 },
      mealType: { name: "", price: 0 },
      tourGuide: { name: "None", price: 0 },
      activities: [],
      doorToDoor: false,
      finalPrice: 0,
    },
    mode: "onChange",
  });

  const {
    watch,
    handleSubmit,
    trigger,
    control,
    setValue,
    getValues,
    register,
  } = methods;

  const { data: packages, isLoading } = useQuery({
    queryKey: ["customized-packages"],
    queryFn: () => fetchPackages(token),
    enabled: !!token || token === undefined,
  });

  // chosen package and helpers
  const chosenPackageId = watch("customizedPackageId");
  const chosenPackage = useMemo(
    () => packages?.find((p: Package) => p._id === chosenPackageId),
    [packages, chosenPackageId]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) {
      router.replace("/auth/login"); // safer than push for auth redirects
    }
  }, [mounted, token, router]);

  // totalDays auto-calc (fixed)
  useEffect(() => {
    const fixed = getValues().duration?.fixed;
    if (fixed?.startDate && fixed?.endDate) {
      const start = new Date(fixed.startDate);
      const end = new Date(fixed.endDate);
      const diffDays = Math.max(
        1,
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      );
      setValue("duration.fixed.totalDays", diffDays);
    }

    // watch keys are declared below in dependency list (via watch)
  }, [
    watch("duration.fixed.startDate"),
    watch("duration.fixed.endDate"),
    getValues,
    setValue,
  ]);
  /* --- Keep your price calculations, helpers, and effects as-is --- */

  // helper: find price by transport name
  const getTransportPrice = (name?: string) => {
    if (!chosenPackage?.transport || !name) return 0;
    const found = chosenPackage.transport.find((t) => t.vehicleType === name);
    return found ? found.price : 0;
  };

  // helper: get hotel room price by star & roomType
  const getHotelRoomBase = (star?: string, roomType?: string) => {
    if (!chosenPackage?.hotel || !star || !roomType) return 0;
    const found = chosenPackage.hotel.find(
      (h) => String(h.star) === String(star)
    );
    if (!found) return 0;
    if (roomType === "Quad") return found.quadPrice ?? 0;
    if (roomType === "Triple") return found.triplePrice ?? 0;
    return found.doublePrice ?? 0;
  };

  // helper: meal price by name
  const getMealPrice = (name?: string) => {
    if (!chosenPackage?.mealType || !name) return 0;
    const found = chosenPackage.mealType.find((m) => m.name === name);
    return found ? found.price : 0;
  };

  // helper: activity price
  const getActivityPrice = (name?: string) => {
    if (!chosenPackage?.activities || !name) return 0;
    const found = chosenPackage.activities.find((a) => a.name === name);
    return found ? found.price : 0;
  };

  // helper: guide price
  const getGuidePrice = (name?: string) => {
    if (!chosenPackage?.tourGuide || !name) return 0;
    const found = chosenPackage.tourGuide.find((g) => g.name === name);
    return found ? found.price : 0;
  };

  // auto price calculation (main)
  const watchedValues = useWatch({
    control,
    name: [
      "transportType.name",
      "transportType.quantity",
      "hotelType.name",
      "hotelType.roomType",
      "hotelType.quantity",
      "mealType.name",
      "tourGuide.name",
      "activities",
      "numberOfPeople",
      "duration.fixed.totalDays",
      "duration.flexible.totalDays",
    ],
  });

  useEffect(() => {
    console.log("➡ Current Step:", currentStep);
  }, [currentStep]);

  useEffect(() => {
    if (!chosenPackage) {
      setValue("finalPrice", 0);
      return;
    }

    const vals = getValues();
    const {
      transportType,
      hotelType,
      mealType,
      tourGuide,
      activities,
      numberOfPeople,
      duration,
    } = vals;

    const totalDays =
      duration?.fixed?.totalDays || duration?.flexible?.totalDays || 0;
    console.log("This is totalDays:", totalDays);
    const packageTotal = (chosenPackage.price || 1) * numberOfPeople;
    console.log("This is packageTotal:", packageTotal);
    const duractionTotal = packageTotal * totalDays;
    console.log("This is duractionTotal:", duractionTotal);

    // Transport
    const transportBase = getTransportPrice(transportType?.name) || 0;
    const transportTotal = transportBase * (transportType?.quantity || 1);
    if (transportBase)
      setValue("transportType.price", transportBase, { shouldDirty: true });

    // Hotel
    const hotelBase =
      getHotelRoomBase(hotelType?.name, hotelType?.roomType) || 0;
    const hotelTotal = hotelBase * (hotelType?.quantity || 1) * totalDays;
    console.log("hotelTotal is :", hotelTotal);
    if (hotelBase)
      setValue("hotelType.price", hotelBase, { shouldDirty: true });

    // Meal
    const mealBase = getMealPrice(mealType?.name) || 0;
    const mealTotal = mealBase * (numberOfPeople || 1) * totalDays;
    console.log("mealTotal is :", mealTotal);
    if (mealBase) setValue("mealType.price", mealBase, { shouldDirty: true });

    // Guide
    const guideBase = getGuidePrice(tourGuide?.name) || 0;
    const guideTotal = guideBase;
    if (guideBase)
      setValue("tourGuide.price", guideBase, { shouldDirty: true });

    // Activities
    const activitiesSelected = activities || [];
    const activitiesTotal =
      activitiesSelected.reduce(
        (sum, a) => sum + (getActivityPrice(a.name) || 0),
        0
      ) * (numberOfPeople || 1);
    console.log("activitiesTotal is:", activitiesTotal);

    // Final total
    const total =
      packageTotal +
      duractionTotal +
      transportTotal +
      hotelTotal +
      mealTotal +
      guideTotal +
      activitiesTotal;

    setValue("finalPrice", Math.max(0, Math.round(total)), {
      shouldDirty: true,
    });
  }, [chosenPackage, ...watchedValues]);

  /* -------------------- Stepper & step validation -------------------- */
  const steps = [
    "Choose Package & City",
    "Duration & Transport",
    "Hotel & Meal",
    "Guide & Activities",
    "Summary",
  ];

  const stepFields: Record<number, Array<Path<FormData>>> = {
    0: ["customizedPackageId", "numberOfPeople", "city"],
    1: [
      "duration.fixed.startDate",
      "duration.fixed.endDate",
      "transportType.name",
      "transportType.quantity",
    ],
    2: [
      "hotelType.name",
      "hotelType.roomType",
      "hotelType.quantity",
      "mealType.name",
    ],
    3: ["tourGuide.name", "activities"],
    4: [],
  };

  const next = async () => {
    const fields = stepFields[currentStep] ?? [];
    const ok = fields.length
      ? await trigger(fields, { shouldFocus: true })
      : true;
    if (ok) setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const back = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const mutation = useMutation({
    mutationFn: (values: FormData) => createBooking(values, token),
    onSuccess: (data) => {
      console.log(data);
      const booking = data?.data;
      handlePayment(booking);
    },
    onError: (error) => {
      console.error(error);
    },
  });
  const onFullSubmit = (data: FormData) => {
    const formData = data; // or your form values
    const gstRate = 0.05;

    const payload = {
      ...formData,
      finalPrice: Math.round((formData.finalPrice || 0) * (1 + gstRate)),
      paidPrice: Math.round((formData.finalPrice || 0) * (1 + gstRate)),
    };
    console.log("FINAL Full BOOKING PAYLOAD:", payload);
    mutation.mutate(payload);
  };
  const onPartialSubmit = (data: FormData) => {
    const formData = data; // or your form values
    const gstRate = 0.05;

    const payload = {
      ...formData,
      finalPrice: Math.round((formData.finalPrice || 0) * (1 + gstRate)),
      paidPrice: Math.round(
        Math.round((formData.finalPrice || 0) * (1 + gstRate)) * 0.25
      ),
    };
    console.log("FINAL Partial BOOKING PAYLOAD:", payload);
    mutation.mutate(payload);
  };

  const handlePayment = async (bookings: BookingResponse) => {
    setLoading(true);

    try {
      const txnid = "txn" + Date.now();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          txnid,
          amount: bookings?.paidPrice?.toFixed(2) || 0,
          productinfo: bookings?.customizedPackageId ?? "Membership Package",
          firstname: bookings.userId?.name ?? "Guest",
          email: bookings.userId?.email ?? "abhi@example.com",
          phone: "9876543210",
          udf1: bookings?._id,
          surl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success-customized`,
          furl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failure-customized`,
        }),
      });

      if (!res.ok) {
        throw new Error(`Payment init failed: ${res.status}`);
      }

      const { paymentData } = await res.json();
      setPaymentData(paymentData);
      setTimeout(() => {
        formRef.current?.submit();
      }, 1000);
    } catch (err) {
      // toast.error((err as Error).message);
      setLoading(false);
    }
  };

  if (!mounted) return null; // prevents mismatch/hydration issues

  if (!token) {
    return <p>Redirecting to login...</p>;
  }
  /* -------------------- JSX -------------------- */
  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6 my-8">
      <h2 className="text-2xl font-bold mb-6 text-center text-[#FF5300]">
        Customize Your Tour
      </h2>

      {/* Stepper Header */}
      <div className="flex items-center justify-between mb-8">
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
                className={`absolute top-4 left-[60%] h-[2px] w-[85%] ${
                  index < currentStep ? "bg-[#FF5300]" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <FormProvider {...methods}>
        <Form {...methods}>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="space-y-4 min-h-[300px]"
          >
            {/* step content (reuse from your existing Step1–Step4–Summary blocks) */}
            {currentStep === 0 && (
              <>
                <FormField
                  control={control as unknown as Control<FormData>}
                  name="customizedPackageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Choose Desired Destination</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded border p-2"
                        >
                          <option value="">Select Destination</option>
                          {isLoading ? (
                            <option>Loading...</option>
                          ) : (
                            packages?.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.destination?.state ?? p._id}
                              </option>
                            ))
                          )}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control as unknown as Control<FormData>}
                  name="numberOfPeople"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of People</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {chosenPackage?.city && (
                  <div className="mt-3">
                    <FormLabel>Places to visit (pick any)</FormLabel>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {chosenPackage?.city?.map((act) => {
                        const checked = !!watch("city")?.find(
                          (a) => a.name === act.name
                        );
                        return (
                          <label
                            key={act.name}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const list = watch("city") || [];
                                const newList = e.target.checked
                                  ? [...list, { name: act.name }]
                                  : list.filter((x) => x.name !== act.name);

                                setValue("city", newList, {
                                  shouldValidate: true,
                                  shouldDirty: true,
                                });
                              }}
                            />
                            <span>{act.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage>
                      {methods.formState.errors.city?.message as string}
                    </FormMessage>
                  </div>
                )}
              </>
            )}
            {currentStep === 1 && (
              <>
                <FormLabel>Duration</FormLabel>

                <select
                  className="border rounded p-2 mb-4"
                  {...register("duration.durationType")}
                  onChange={(e) =>
                    setValue(
                      "duration.durationType",
                      e.target.value as "fixed" | "flexible"
                    )
                  }
                >
                  <option value="">Select Duration</option>
                  <option value="fixed">Fixed</option>
                  <option value="flexible">Flexible</option>
                </select>
                {watch("duration.durationType") === "fixed" && (
                  <div className="flex gap-2 mb-2">
                    <label className="flex-1">
                      <div className="text-sm">Start Date</div>
                      <Input
                        type="date"
                        {...register("duration.fixed.startDate")}
                      />
                    </label>
                    <label className="flex-1">
                      <div className="text-sm">End Date</div>
                      <Input
                        type="date"
                        {...register("duration.fixed.endDate")}
                      />
                    </label>
                  </div>
                )}
                {watch("duration.durationType") === "flexible" && (
                  <div className="mb-4">
                    <div className="text-sm mb-1">
                      Or choose flexible month + total days
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Month (e.g. June)"
                        {...register("duration.flexible.month")}
                      />
                      <Input
                        type="number"
                        {...register("duration.flexible.totalDays")}
                        placeholder="Total days"
                      />
                    </div>
                  </div>
                )}

                <FormField
                  control={control as unknown as Control<FormData>}
                  name="transportType.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transport</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded border p-2"
                        >
                          <option value="">Select vehicle</option>
                          {chosenPackage?.transport?.map((t) => (
                            <option key={t.vehicleType} value={t.vehicleType}>
                              {t.vehicleType} — ₹{t.price}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control as unknown as Control<FormData>}
                  name="transportType.quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transport Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {currentStep === 2 && (
              <>
                <FormField
                  control={control as unknown as Control<FormData>}
                  name="hotelType.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hotel Star</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded border p-2"
                        >
                          <option value="">Select star</option>
                          {chosenPackage?.hotel?.map((h) => (
                            <option key={h.star} value={String(h.star)}>
                              {h.star} Star
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control as unknown as Control<FormData>}
                  name="hotelType.roomType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Type</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded border p-2"
                        >
                          <option value="Double">Double</option>
                          <option value="Triple">Triple</option>
                          <option value="Quad">Quad</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control as unknown as Control<FormData>}
                  name="hotelType.quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Quantity</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control as unknown as Control<FormData>}
                  name="mealType.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded border p-2"
                        >
                          <option value="">Select meal</option>
                          {chosenPackage?.mealType?.map((m) => (
                            <option key={m.name} value={m.name}>
                              {m.name} — ₹{m.price}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            {currentStep === 3 && (
              <>
                <FormField
                  control={control as unknown as Control<FormData>}
                  name="tourGuide.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tour Guide</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded border p-2"
                        >
                          <option value="None">None</option>
                          {chosenPackage?.tourGuide?.map((g) => (
                            <option key={g.name} value={g.name}>
                              {g.name} — ₹{g.price}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="mt-3">
                  <FormLabel>Activities (pick any)</FormLabel>
                  <div className="grid grid-cols-1 gap-2 mt-2">
                    {chosenPackage?.activities?.map((act) => {
                      const checked = !!watch("activities")?.find(
                        (a) => a.name === act.name
                      );
                      return (
                        <label
                          key={act.name}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const list = watch("activities") || [];
                              if (e.target.checked) {
                                // add
                                setValue("activities", [
                                  ...list,
                                  { name: act.name, price: act.price },
                                ]);
                              } else {
                                // remove
                                setValue(
                                  "activities",
                                  list.filter((x) => x.name !== act.name)
                                );
                              }
                            }}
                          />
                          <span>
                            {act.name} — ₹{act.price}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
            {currentStep === 4 && (
              <>
                <h3 className="font-semibold">Summary</h3>
                <div className="text-sm text-gray-700">
                  <p>Destination: {chosenPackage?.destination?.state}</p>
                  <p>
                    Place to visit:{" "}
                    {watch("city")
                      ?.map((c) => c.name)
                      .join(", ")}
                  </p>
                  <p>Total People: {watch("numberOfPeople")}</p>
                  <p>
                    Duration:{" "}
                    {watch("duration.fixed")?.startDate
                      ? `${watch("duration.fixed")?.startDate} → ${
                          watch("duration.fixed")?.endDate
                        } (${watch("duration.fixed")?.totalDays || 1} days)`
                      : watch("duration.flexible")?.totalDays
                      ? `Flexible: ${
                          watch("duration.flexible")?.totalDays
                        } days`
                      : "1 day"}
                  </p>
                  <p>
                    Transport: {watch("transportType")?.name} ×{" "}
                    {watch("transportType")?.quantity}
                  </p>
                  <p>
                    Hotel: {watch("hotelType")?.name} Star /{" "}
                    {watch("hotelType")?.roomType}
                    {" Sharing"} × {watch("hotelType")?.quantity}
                  </p>
                  <p>Meal: {watch("mealType")?.name} Food</p>
                  <p>Guide: {watch("tourGuide")?.name}</p>
                  <p>
                    Activities:{" "}
                    {(watch("activities") || [])
                      .map((a) => a.name)
                      .join(", ") || "—"}
                  </p>
                </div>

                <div className="text-right font-bold mt-4">
                  Price: ₹{watch("finalPrice") || 0}
                </div>

                <p className="text-right font-semibold mt-1">
                  @GST: 5% — ₹{((watch("finalPrice") || 0) * 0.05).toFixed(2)}
                </p>

                <div className="text-right font-bold mt-4">
                  Final Price including @GST: ₹
                  {((watch("finalPrice") || 0) * 1.05).toFixed(2)}
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-6 border-t mt-6">
              {currentStep > 0 ? (
                <Button type="button" variant="ghost" onClick={back}>
                  ← Back
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2 items-center">
                <div className="text-sm mr-2">
                  Current total: ₹{(watch("finalPrice") || 0).toFixed(2)}
                </div>

                {currentStep < steps.length - 1 ? (
                  <Button type="button" onClick={next}>
                    Next →
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      onClick={handleSubmit(onPartialSubmit)}
                    >
                      Partial Payment ₹
                      {((watch("finalPrice") || 0) * 1.05 * 0.25).toFixed(2)}
                    </Button>
                    <Button type="button" onClick={handleSubmit(onFullSubmit)}>
                      Full Payment ₹
                      {((watch("finalPrice") || 0) * 1.05).toFixed(2)}
                    </Button>
                    <div className="mt-4 p-4 ">
                      <form
                        ref={formRef}
                        action="https://secure.payu.in/_payment"
                        method="post"
                        className="flex flex-col"
                      >
                        <input
                          type="hidden"
                          name="key"
                          value={paymentData.key}
                        />
                        <input
                          type="hidden"
                          name="txnid"
                          value={paymentData.txnid}
                        />
                        <input
                          type="hidden"
                          name="productinfo"
                          value={paymentData.productinfo}
                        />
                        <input
                          type="hidden"
                          name="amount"
                          value={paymentData.amount}
                        />
                        <input
                          type="hidden"
                          name="email"
                          value={paymentData.email}
                        />
                        <input
                          type="hidden"
                          name="firstname"
                          value={paymentData.firstname}
                        />
                        <input
                          type="hidden"
                          name="lastname"
                          value={paymentData.lastname}
                        />
                        <input
                          type="hidden"
                          name="surl"
                          value={paymentData.surl}
                        />
                        <input
                          type="hidden"
                          name="furl"
                          value={paymentData.furl}
                        />
                        <input
                          type="hidden"
                          name="phone"
                          value={paymentData.phone}
                        />
                        <input
                          type="hidden"
                          name="hash"
                          value={paymentData.hash}
                        />
                        <input
                          type="hidden"
                          name="udf1"
                          value={paymentData.udf1}
                        />
                      </form>
                    </div>
                  </>
                )}
              </div>
            </div>
          </form>
          {mutation.isSuccess && (
            <div className="p-6 text-green-600">
              <h1>✅ Booking Successful</h1>
              <p>Thank you for your Booking.</p>
            </div>
          )}
          {mutation.isError && (
            <div className="p-6 text-red-600">
              <h1>❌ Booking Failed</h1>
              <p>Please try again.</p>
            </div>
          )}
        </Form>
      </FormProvider>
    </div>
  );
}
