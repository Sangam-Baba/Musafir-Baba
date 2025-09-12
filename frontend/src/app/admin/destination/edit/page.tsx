// "use client"

// import { zodResolver } from "@hookform/resolvers/zod"
// import { useForm } from "react-hook-form"
// import { z } from "zod"
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
// import { Input } from "@/components/ui/input"
// import { Button } from "@/components/ui/button"

// const formSchema = z.object({
//   name: z.string().min(2, "Name must be at least 2 characters"),
//   description: z.string().min(2, "Description is required"),
//   country: z.string().min(2, "Country is required"),
//   state: z.string().optional(),
//   city: z.string().optional(),
//   coverImage: z.object({
//     url: z.string().url({ message: "Cover image is required" }),
//     public_id: z.string(),
//     alt: z.string().optional(),
//   }),
//   gallery: z.array(z.object({
//     url: z.string().url(),
//     public_id: z.string(),
//     alt: z.string().optional(),
//   })),
//   metaTitle: z.string().optional(),
//   metaDescription: z.string().optional(),
//   keywords: z.array(z.string()).optional(),
//   popularAttractions: z.array(z.string()).optional(),
//   thingsToDo: z.array(z.string()).optional(),
//   status: z.enum(["draft", "published"]).default("draft"),
// })

// type DestinationForm = z.infer<typeof formSchema>

// export function CreateDestination() {
//   const form = useForm<DestinationForm>({
//     resolver: zodResolver(formSchema),
//     defaultValues: {
//       name: "",
//       description: "",
//       country: "",
//       state: "",
//       city: "",
//       coverImage: {
//         url: "",
//         public_id: "",
//         alt: "",
//       },
//       gallery: [],
//       metaTitle: "",
//       metaDescription: "",
//       keywords: [],
//       popularAttractions: [],
//       thingsToDo: [],
//       status: "draft",
//     },
//   })

//   const onSubmit = (values: DestinationForm) => {
//     console.log("Form values:", values)
//   }

//   return (
//     <Form {...form}>
//       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

//         {/* Name */}
//         <FormField
//           control={form.control}
//           name="name"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>Name</FormLabel>
//               <FormControl>
//                 <Input placeholder="Destination name" {...field} />
//               </FormControl>
//               <FormMessage />
//             </FormItem>
//           )}
//         />

//         {/* Description */}
//         <FormField
//           control={form.control}
//           name="description"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>Description</FormLabel>
//               <FormControl>
//                 <Input placeholder="Short description" {...field} />
//               </FormControl>
//               <FormMessage />
//             </FormItem>
//           )}
//         />

//         {/* Country */}
//         <FormField
//           control={form.control}
//           name="country"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>Country</FormLabel>
//               <FormControl>
//                 <Input placeholder="Country" {...field} />
//               </FormControl>
//               <FormMessage />
//             </FormItem>
//           )}
//         />

//         {/* State */}
//         <FormField
//           control={form.control}
//           name="state"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>State</FormLabel>
//               <FormControl>
//                 <Input placeholder="State (optional)" {...field} />
//               </FormControl>
//               <FormMessage />
//             </FormItem>
//           )}
//         />

//         {/* City */}
//         <FormField
//           control={form.control}
//           name="city"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>City</FormLabel>
//               <FormControl>
//                 <Input placeholder="City (optional)" {...field} />
//               </FormControl>
//               <FormMessage />
//             </FormItem>
//           )}
//         />

//         {/* Cover Image URL */}
//         <FormField
//           control={form.control}
//           name="coverImage.url"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>Cover Image URL</FormLabel>
//               <FormControl>
//                 <Input placeholder="https://example.com/image.jpg" {...field} />
//               </FormControl>
//               <FormMessage />
//             </FormItem>
//           )}
//         />

//         {/* Meta Title */}
//         <FormField
//           control={form.control}
//           name="metaTitle"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>Meta Title</FormLabel>
//               <FormControl>
//                 <Input placeholder="SEO meta title" {...field} />
//               </FormControl>
//               <FormMessage />
//             </FormItem>
//           )}
//         />

//         {/* Meta Description */}
//         <FormField
//           control={form.control}
//           name="metaDescription"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>Meta Description</FormLabel>
//               <FormControl>
//                 <Input placeholder="SEO meta description" {...field} />
//               </FormControl>
//               <FormMessage />
//             </FormItem>
//           )}
//         />

//         {/* Status */}
//         <FormField
//           control={form.control}
//           name="status"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>Status</FormLabel>
//               <FormControl>
//                 <Input placeholder="draft or published" {...field} />
//               </FormControl>
//               <FormMessage />
//             </FormItem>
//           )}
//         />

//         <Button type="submit">Create Destination</Button>
//       </form>
//     </Form>
//   )
// }
