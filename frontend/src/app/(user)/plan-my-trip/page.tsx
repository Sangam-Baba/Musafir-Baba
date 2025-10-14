// "use client";

// import React, { useEffect, useMemo, useState } from "react";
// import { useQuery } from "@tanstack/react-query";
// import { useForm, useFieldArray, FormProvider, Control } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";

// import {
//   Dialog,
//   DialogTrigger,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   Form,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormControl,
//   FormMessage,
// } from "@/components/ui/form";

// import { useAuthStore } from "@/store/useAuthStore";

// /* ---------------------------- Helpers / Schema --------------------------- */
// const zNumber = (message = "Must be a number") =>
//   z.coerce.number({
//     invalid_type_error: message,
//   });

// /** Full schema for final submit (mirrors backend booking shape) */
// const fullSchema = z.object({
//   customizedPackageId: z.string().min(1, "Please select a package"),
//   numberOfPeople: zNumber().min(1, "At least 1 person"),
//   city: z
//     .array(z.object({ name: z.string().min(1) }))
//     .min(1, "Pick at least 1 city"),
//   duration: z.object({
//     fixed: z
//       .object({
//         startDate: z.string(),
//         endDate: z.string(),
//         totalDays: zNumber(),
//       })
//       .optional(),
//     flexible: z
//       .object({
//         month: z.string().optional(),
//         totalDays: zNumber(),
//       })
//       .optional(),
//   }),
//   transportType: z.object({
//     name: z.string().min(1),
//     price: zNumber(),
//     quantity: zNumber().min(1),
//   }),
//   hotelType: z
//     .object({
//       name: z.string().min(1),
//       roomType: z.string().min(1),
//       price: zNumber(),
//       quantity: zNumber().min(1),
//     })
//     .optional(),
//   mealType: z
//     .object({
//       name: z.string().min(1),
//       price: zNumber(),
//     })
//     .optional(),
//   tourGuide: z
//     .object({
//       name: z.string().min(1),
//       price: zNumber(),
//     })
//     .optional(),
//   activities: z
//     .array(z.object({ name: z.string().min(1), price: zNumber() }))
//     .optional(),
//   doorToDoor: z.boolean().optional(),
//   finalPrice: zNumber(),
// });

// type FormData = z.infer<typeof fullSchema>;

// /* ---------------------------- API / Queries ------------------------------ */
// const fetchPackages = async (token?: string) => {
//   const res = await fetch(
//     `${process.env.NEXT_PUBLIC_BASE_URL}/customizedpackage`,
//     {
//       headers: token ? { Authorization: `Bearer ${token}` } : undefined,
//     }
//   );
//   if (!res.ok) throw new Error("Failed to fetch packages");
//   const json = await res.json();
//   return json.data;
// };

// /* ----------------------------- Component -------------------------------- */
// export default function CustomTourDialog() {
//   const token = useAuthStore((s) => s.accessToken) as string;
//   const [open, setOpen] = useState(false);
//   const [currentStep, setCurrentStep] = useState(0);

//   const methods = useForm<FormData>({
//     resolver: zodResolver(fullSchema),
//     defaultValues: {
//       customizedPackageId: "",
//       numberOfPeople: 1,
//       city: [{ name: "" }],
//       duration: {},
//       transportType: { name: "", price: 0, quantity: 1 },
//       hotelType: { name: "", roomType: "", price: 0, quantity: 1 },
//       mealType: { name: "", price: 0 },
//       tourGuide: { name: "", price: 0 },
//       activities: [{ name: "", price: 0 }],
//       doorToDoor: false,
//       finalPrice: 0,
//     },
//     mode: "onChange",
//   });

//   const { watch, handleSubmit, trigger, control, setValue, getValues, reset } =
//     methods;

//   const { data: packages, isLoading } = useQuery({
//     queryKey: ["customized-packages"],
//     queryFn: () => fetchPackages(token),
//     enabled: !!token || token === undefined, // allow non-auth browse if your API permits
//   });

//   // field arrays
//   const cityArray = useFieldArray({ control, name: "city" });
//   const activitiesArray = useFieldArray({ control, name: "activities" });

//   // derive cities for chosen package (assuming package has `destination.city` array)
//   const chosenPackageId = watch("customizedPackageId");
//   const chosenPackage = useMemo(
//     () => packages?.find((p) => p._id === chosenPackageId),
//     [packages, chosenPackageId]
//   );
//   const availableCities: string[] = chosenPackage?.destination?.city ?? [];

//   // live final price calculation
//   const values = watch();
//   useEffect(() => {
//     // Price calculation strategy:
//     // transport price * quantity + hotel price * quantity + meal price + guide price + sum activities
//     const transportTotal =
//       (values.transportType?.price || 0) *
//       (values.transportType?.quantity || 1);
//     const hotelTotal =
//       (values.hotelType?.price || 0) * (values.hotelType?.quantity || 1);
//     const mealTotal =
//       (values.mealType?.price || 0) * (values.numberOfPeople || 1);
//     const guideTotal = values.tourGuide?.price || 0;
//     const activitiesTotal =
//       (values.activities || []).reduce((s, a) => s + (a?.price || 0), 0) *
//       (values.numberOfPeople || 1);
//     const peopleMultiplier =
//       values.duration?.fixed?.totalDays ||
//       values.duration?.flexible?.totalDays ||
//       1; // if you want to multiply certain items by people
//     const base =
//       transportTotal + hotelTotal + mealTotal + guideTotal + activitiesTotal;
//     const total = Math.max(0, Math.round(base * peopleMultiplier));
//     setValue("finalPrice", total);
//   }, [
//     values.transportType?.price,
//     values.transportType?.quantity,
//     values.hotelType?.price,
//     values.hotelType?.quantity,
//     values.mealType?.price,
//     values.tourGuide?.price,
//     values.activities,
//     values.numberOfPeople,
//     setValue,
//   ]);

//   // steps
//   const steps = [
//     "Choose Package & City",
//     "Duration & Transport",
//     "Hotel & Meal",
//     "Guide & Activities",
//     "Summary",
//   ];

//   // navigation helpers
//   const next = async () => {
//     const ok = await trigger(); // validate visible fields
//     if (ok) setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
//   };
//   const back = () => setCurrentStep((s) => Math.max(s - 1, 0));
//   const close = () => {
//     setOpen(false);
//     setTimeout(() => {
//       reset(); // reset after close to clear state (optional)
//       setCurrentStep(0);
//     }, 200);
//   };

//   const onSubmit = async (data: FormData) => {
//     try {
//       // TODO: replace with your create booking API call
//       // Example:
//       // await fetch(`${BASE}/customized-bookings`, { method: "POST", body: JSON.stringify(data) })
//       console.log("SUBMIT BOOKING", data);
//       // show success, close dialog
//       close();
//       // toast.success("Booking created");
//     } catch (err) {
//       console.error(err);
//       // toast.error("Booking failed");
//     }
//   };

//   /* --------------------------- Step renderers --------------------------- */

//   const StepChoosePackage = (
//     <>
//       <FormField
//         control={control as unknown as Control<FormData>}
//         name="customizedPackageId"
//         render={({ field }) => (
//           <FormItem>
//             <FormLabel>Choose Package</FormLabel>
//             <FormControl>
//               <select {...field} className="w-full rounded border p-2">
//                 <option value="">Select a package</option>
//                 {isLoading ? (
//                   <option>Loading...</option>
//                 ) : (
//                   packages?.map((p: any) => (
//                     <option key={p._id} value={p._id}>
//                       {p.destination?.state ?? p._id} — ₹{p.price ?? 0}
//                     </option>
//                   ))
//                 )}
//               </select>
//             </FormControl>
//             <FormMessage />
//           </FormItem>
//         )}
//       />

//       <FormField
//         control={control as unknown as Control<FormData>}
//         name="numberOfPeople"
//         render={({ field }) => (
//           <FormItem>
//             <FormLabel>Number of People</FormLabel>
//             <FormControl>
//               <Input type="number" min={1} {...field} />
//             </FormControl>
//             <FormMessage />
//           </FormItem>
//         )}
//       />

//       {chosenPackageId && (
//         <FormItem>
//           <FormLabel>City (choose from package destinations)</FormLabel>
//           <FormControl>
//             <select
//               {...methodsRegisterFor("city.0.name", control)}
//               className="w-full rounded border p-2"
//               value={watch("city")?.[0]?.name || ""}
//               onChange={(e) => {
//                 setValue("city", [{ name: e.target.value }]);
//               }}
//             >
//               <option value="">Select City</option>
//               {availableCities?.map((c) => (
//                 <option key={c} value={c}>
//                   {c}
//                 </option>
//               ))}
//             </select>
//           </FormControl>
//         </FormItem>
//       )}
//     </>
//   );

//   const StepDurationTransport = (
//     <>
//       <FormField
//         control={control as unknown as Control<FormData>}
//         name="duration.fixed.startDate"
//         render={({ field }) => (
//           <FormItem>
//             <FormLabel>Start Date</FormLabel>
//             <FormControl>
//               <Input type="date" {...field} />
//             </FormControl>
//           </FormItem>
//         )}
//       />
//       <FormField
//         control={control as unknown as Control<FormData>}
//         name="duration.fixed.endDate"
//         render={({ field }) => (
//           <FormItem>
//             <FormLabel>End Date</FormLabel>
//             <FormControl>
//               <Input type="date" {...field} />
//             </FormControl>
//           </FormItem>
//         )}
//       />

//       <FormField
//         control={control as unknown as Control<FormData>}
//         name="transportType.name"
//         render={({ field }) => (
//           <FormItem>
//             <FormLabel>Transport Type</FormLabel>
//             <FormControl>
//               <select {...field} className="w-full rounded border p-2">
//                 <option value="">Select vehicle</option>
//                 <option value="5-Seater">5-Seater</option>
//                 <option value="7-Seater">7-Seater</option>
//                 <option value="12-Seater">12-Seater</option>
//               </select>
//             </FormControl>
//             <FormMessage />
//           </FormItem>
//         )}
//       />
//       <FormField
//         control={control as unknown as Control<FormData>}
//         name="transportType.price"
//         render={({ field }) => (
//           <FormItem>
//             <FormLabel>Transport Price (per unit)</FormLabel>
//             <FormControl>
//               <Input type="number" {...field} />
//             </FormControl>
//             <FormMessage />
//           </FormItem>
//         )}
//       />
//       <FormField
//         control={control as unknown as Control<FormData>}
//         name="transportType.quantity"
//         render={({ field }) => (
//           <FormItem>
//             <FormLabel>Transport Quantity</FormLabel>
//             <FormControl>
//               <Input type="number" min={1} {...field} />
//             </FormControl>
//             <FormMessage />
//           </FormItem>
//         )}
//       />
//     </>
//   );

//   const StepHotelMeal = (
//     <>
//       <FormField
//         control={control as unknown as Control<FormData>}
//         name="hotelType.name"
//         render={({ field }) => (
//           <FormItem>
//             <FormLabel>Hotel Star</FormLabel>
//             <FormControl>
//               <select {...field} className="w-full rounded border p-2">
//                 <option value="">Select star</option>
//                 {[1, 2, 3, 4, 5].map((n) => (
//                   <option key={n} value={String(n)}>
//                     {n} Star
//                   </option>
//                 ))}
//               </select>
//             </FormControl>
//           </FormItem>
//         )}
//       />

//       <FormField
//         control={control as unknown as Control<FormData>}
//         name="hotelType.roomType"
//         render={({ field }) => (
//           <FormItem>
//             <FormLabel>Room Type</FormLabel>
//             <FormControl>
//               <select {...field} className="w-full rounded border p-2">
//                 <option value="Double">Double</option>
//                 <option value="Triple">Triple</option>
//                 <option value="Quad">Quad</option>
//               </select>
//             </FormControl>
//           </FormItem>
//         )}
//       />
//       <FormField
//         control={control as unknown as Control<FormData>}
//         name="hotelType.price"
//         render={({ field }) => (
//           <FormItem>
//             <FormLabel>Hotel Price (per night / per unit)</FormLabel>
//             <FormControl>
//               <Input type="number" {...field} />
//             </FormControl>
//           </FormItem>
//         )}
//       />

//       <FormField
//         control={control as unknown as Control<FormData>}
//         name="mealType.name"
//         render={({ field }) => (
//           <FormItem>
//             <FormLabel>Meal Type</FormLabel>
//             <FormControl>
//               <select {...field} className="w-full rounded border p-2">
//                 <option value="Veg">Veg</option>
//                 <option value="Non-Veg">Non-Veg</option>
//                 <option value="Jain">Jain</option>
//               </select>
//             </FormControl>
//           </FormItem>
//         )}
//       />
//       <FormField
//         control={control as unknown as Control<FormData>}
//         name="mealType.price"
//         render={({ field }) => (
//           <FormItem>
//             <FormLabel>Meal Price (per person / per day)</FormLabel>
//             <FormControl>
//               <Input type="number" {...field} />
//             </FormControl>
//           </FormItem>
//         )}
//       />
//     </>
//   );

//   const StepGuideActivities = (
//     <>
//       <FormField
//         control={control as unknown as Control<FormData>}
//         name="tourGuide.name"
//         render={({ field }) => (
//           <FormItem>
//             <FormLabel>Guide Gender / Option</FormLabel>
//             <FormControl>
//               <select {...field} className="w-full rounded border p-2">
//                 <option value="None">None</option>
//                 <option value="Male">Male</option>
//                 <option value="Female">Female</option>
//               </select>
//             </FormControl>
//           </FormItem>
//         )}
//       />
//       <FormField
//         control={control as unknown as Control<FormData>}
//         name="tourGuide.price"
//         render={({ field }) => (
//           <FormItem>
//             <FormLabel>Guide Price</FormLabel>
//             <FormControl>
//               <Input type="number" {...field} />
//             </FormControl>
//           </FormItem>
//         )}
//       />

//       <div>
//         <FormLabel>Activities</FormLabel>
//         {activitiesArray.fields.map((a, i) => (
//           <div key={a.id} className="flex gap-2 mb-2">
//             <Input
//               {...methodsRegisterFor(`activities.${i}.name`, control)}
//               placeholder="Activity name"
//             />
//             <Input
//               type="number"
//               {...methodsRegisterFor(`activities.${i}.price`, control)}
//               placeholder="Price"
//             />
//             <Button
//               type="button"
//               variant="destructive"
//               onClick={() => activitiesArray.remove(i)}
//             >
//               Remove
//             </Button>
//           </div>
//         ))}
//         <Button
//           type="button"
//           onClick={() => activitiesArray.append({ name: "", price: 0 })}
//         >
//           Add Activity
//         </Button>
//       </div>
//     </>
//   );

//   const StepSummary = (
//     <>
//       <h3 className="text-lg font-semibold mb-2">Review & Confirm</h3>
//       <pre className="bg-slate-50 p-3 rounded mb-3">
//         {JSON.stringify(getValues(), null, 2)}
//       </pre>
//       <div className="text-right font-bold">
//         Final Price: ₹{values.finalPrice}
//       </div>
//     </>
//   );

//   /* ---------------------- Helper: register path wrapper -------------------- */
//   // React Hook Form typing sometimes causes trouble with nested string names in custom usage.
//   // This wrapper gives a typed `register` by delegating to control via getValues/setValue.
//   function methodsRegisterFor(path: string, c: Control<FormData>) {
//     // We just return the minimal set of props that a controlled input expects:
//     // name and onChange via setValue/getValues for simple inputs.
//     // BUT we prefer to use methods.register where possible — this is a fallback for inline usage.
//     // To keep things simple, use methods.register by casting path as any:
//     // @ts-ignore
//     return (methods.register as any)(path);
//   }

//   /* ------------------------------ JSX ----------------------------------- */
//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <Button onClick={() => setOpen(true)}>Customize & Book</Button>
//       </DialogTrigger>

//       <DialogContent className="max-w-3xl w-full">
//         <DialogHeader>
//           <DialogTitle>Customize Your Tour</DialogTitle>
//         </DialogHeader>

//         <div className="py-4">
//           <div className="flex gap-2 mb-4">
//             {steps.map((s, i) => (
//               <div
//                 key={s}
//                 className={`flex-1 text-center py-2 rounded ${
//                   i === currentStep
//                     ? "bg-blue-600 text-white"
//                     : "bg-gray-200 text-gray-700"
//                 }`}
//               >
//                 {s}
//               </div>
//             ))}
//           </div>

//           <FormProvider {...methods}>
//             <Form {...methods}>
//               <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//                 <div className="min-h-[240px]">
//                   {
//                     [
//                       StepChoosePackage,
//                       StepDurationTransport,
//                       StepHotelMeal,
//                       StepGuideActivities,
//                       StepSummary,
//                     ][currentStep]
//                   }
//                 </div>

//                 <div className="flex items-center justify-between mt-4">
//                   <div>
//                     {currentStep > 0 && (
//                       <Button variant="ghost" onClick={back}>
//                         Back
//                       </Button>
//                     )}
//                   </div>

//                   <div className="flex gap-2 items-center">
//                     <div className="text-sm mr-4">
//                       Current total: ₹{values.finalPrice}
//                     </div>

//                     {currentStep < steps.length - 1 ? (
//                       <Button onClick={next}>Next</Button>
//                     ) : (
//                       <Button type="submit">Confirm Booking</Button>
//                     )}
//                   </div>
//                 </div>
//               </form>
//             </Form>
//           </FormProvider>
//         </div>

//         <DialogFooter>
//           <Button variant="secondary" onClick={close}>
//             Close
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }
