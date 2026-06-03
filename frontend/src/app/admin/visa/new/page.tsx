"use client";
import React, { useState } from "react";
import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";
import ImageUploader from "@/components/admin/ImageUploader";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import BlogEditor from "@/components/admin/BlogEditor";
import { X, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { CreateReviewsModal } from "@/components/admin/CreateEditReviews";
import { Reviews } from "../../holidays/new/page";
import { getReviewsByIds } from "../../holidays/new/page";
import { deleteReview } from "../../holidays/new/page";
import { Label } from "@/components/ui/label";
import SmallEditor from "@/components/admin/SmallEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
interface Faq {
  question: string;
  answer: string;
}

export interface ValidityEntry {
  visaValidity: string;
  visaDuration: string;
  entryType: string;
  processTime: string;
  governmentFee: number;
  serviceCharges: number;
  gst: number;
  expressVisaDuration?: string;
  expressGovernmentFee?: number;
  expressServiceCharges?: number;
}

export interface VisaCard {
  visaPurpose: string;
  visaType: string;
  gstTypeOrPercentageText: string;
  documents: string;
  processSteps: string;
  // Legacy single fields (kept for backward compatibility)
  governmentFee?: number;
  serviceCharges?: number;
  gst?: number;
  visaValidity: string;
  visaDuration: string;
  entryType?: string;
  processTime?: string;
  isExpress?: boolean;
  expressVisaDuration?: string;
  expressGovernmentFee?: number;
  expressServiceCharges?: number;
  // New: multiple validity entries per visa card
  validityEntries?: ValidityEntry[];
}

export interface Visa {
  country: string;
  title: string;
  slug: string;
  content: string;
  quickSummary?: string;
  highlights?: string;
  quickAnswer?: string;
  whyThisVisa?: string;
  eligibility?: string;
  feesAndCharges?: string;
  howToApply?: string;
  helpfulResources?: string;
  cta?: string;
  excerpt: string;
  schemaType?: string[];
  metaTitle: string;
  metaDescription: string;
  canonicalUrl?: string;
  keywords: string[];
  reviews?: string[];
  rejectionReasons?: string[];
  expertTips?: string[];
  cost: number;
  visaType: string;
  bannerImage?: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  };
  coverImage?: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  };
  faqs?: Faq[];
  duration: string;
  visaProcessed: number;
  necessaryDocuments?: string[];
  documentsContent?: string;
  process?: any;
  visas?: VisaCard[];
}

async function createVisa(values: Visa, accessToken: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(values),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Registration failed");
  }

  return res.json();
}

export default function CreateVisaPage() {
  const accessToken = useAdminAuthStore((state) => state.accessToken) as string;
  const queryClient = useQueryClient();
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [editReviewsId, setEditReviewsId] = useState<string | null>(null);
  const [reviewsDetails, setReviewsDetails] = useState<Reviews[]>([]);
  const defaultValues: Visa = {
    country: "",
    title: "",
    slug: "",
    content: "",
    quickSummary: "",
    highlights: "",
    quickAnswer: "",
    whyThisVisa: "",
    eligibility: "",
    feesAndCharges: "",
    howToApply: "",
    helpfulResources: "",
    cta: "",
    excerpt: "",
    schemaType: [],
    metaTitle: "",
    metaDescription: "",
    canonicalUrl: "",
    keywords: [],
    reviews: [],
    rejectionReasons: [],
    expertTips: [],
    cost: 0,
    visaType: "DAC",
    faqs: [
      {
        question: "",
        answer: "",
      },
    ],
    visaProcessed: 0,
    duration: "",
    necessaryDocuments: ["Photo", "Passport"],
    documentsContent: "",
    process: "",
    visas: [],
  };

  const form = useForm<Visa>({ defaultValues });

  // ✅ pass variables (values) into mutate
  const mutation = useMutation({
    mutationFn: (values: Visa) => createVisa(values, accessToken),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["visa"] });
      console.log("Registered successfully:", data);
      toast.success("Registration successful!");
      form.reset(defaultValues);
    },
    onError: (error: unknown) => {
      console.error("Registration failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Something went wrong"
      );
    },
  });

  const faqsArray = useFieldArray({
    control: form.control,
    name: "faqs",
  });

  const visasArray = useFieldArray({
    control: form.control,
    name: "visas",
  });

  const [collapsedCards, setCollapsedCards] = useState<Record<number, boolean>>({});
  const toggleCard = (index: number) => setCollapsedCards((prev) => ({ ...prev, [index]: !prev[index] }));

  // Master data queries for dropdowns
  const { data: visaPurposeData } = useQuery({
    queryKey: ["master-data", "visa-type"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/visa-type`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const { data: visaValidityData } = useQuery({
    queryKey: ["master-data", "visa-validity"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/visa-validity`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const { data: visaDurationData } = useQuery({
    queryKey: ["master-data", "visa-duration"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/visa-duration`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const { data: visaRejectionReasonsData } = useQuery({
    queryKey: ["master-data", "visa-rejection-reasons"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/visa-rejection-reasons?all=true`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });
  const { data: visaExpertTipsData } = useQuery({
    queryKey: ["master-data", "visa-expert-tips"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/visa-expert-tips?all=true`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const visaPurposeOptions = visaPurposeData?.data || [];
  const visaValidityOptions = visaValidityData?.data || [];
  const visaDurationOptions = visaDurationData?.data || [];
  const visaRejectionReasonsOptions = visaRejectionReasonsData?.data || [];
  const visaExpertTipsOptions = visaExpertTipsData?.data || [];

  const formatDuration = (item: any) => {
    const parts = [];
    if (item.years) parts.push(`${item.years} Year${item.years > 1 ? 's' : ''}`);
    if (item.months) parts.push(`${item.months} Month${item.months > 1 ? 's' : ''}`);
    if (item.days) parts.push(`${item.days} Day${item.days > 1 ? 's' : ''}`);
    return parts.join(' ') || '0 Days';
  };

  const handleReviewsCreated = async (id: string) => {
    const existing = form.getValues("reviews") || [];
    form.setValue("reviews", [...existing, id]); // update form array

    const newReview = await getReviewsByIds(accessToken, [id]);
    setReviewsDetails((prev) => [...prev, ...newReview]);
    setShowReviewsModal(false);
  };

  const handleReviewsEdit = (id: string) => {
    setEditReviewsId(id);
    setShowReviewsModal(true);
  };
  const handleReviewsUpdated = async (id: string) => {
    toast.success("Reviews updated successfully");
    const updated = await getReviewsByIds(accessToken, [id]);
    setReviewsDetails((prev) =>
      prev.map((b) => (b._id === id ? updated[0] : b))
    );
    setShowReviewsModal(false);
    setEditReviewsId(null);
  };
  const handleReviewsRemove = async (id: string, index: number) => {
    await deleteReview(accessToken, id);
    const updatedIds = form.getValues("reviews")?.filter((_, i) => i !== index);
    const updatedDetails = reviewsDetails.filter((_, i) => i !== index);

    form.setValue("reviews", updatedIds);
    setReviewsDetails(updatedDetails);
  };

   const onSubmit: SubmitHandler<Visa> = (values) => {
    const sanitizedVisas = values.visas?.map((v) => ({
      ...v,
      governmentFee: v.governmentFee === "" as any ? 0 : Number(v.governmentFee || 0),
      serviceCharges: v.serviceCharges === "" as any ? 0 : Number(v.serviceCharges || 0),
      gst: v.gst === "" as any ? 0 : Number(v.gst || 0),
      expressGovernmentFee: v.expressGovernmentFee === "" as any ? 0 : Number(v.expressGovernmentFee || 0),
      expressServiceCharges: v.expressServiceCharges === "" as any ? 0 : Number(v.expressServiceCharges || 0),
      validityEntries: v.validityEntries?.map((entry) => ({
        ...entry,
        governmentFee: entry.governmentFee === "" as any ? 0 : Number(entry.governmentFee || 0),
        serviceCharges: entry.serviceCharges === "" as any ? 0 : Number(entry.serviceCharges || 0),
        gst: entry.gst === "" as any ? 0 : Number(entry.gst || 0),
        expressGovernmentFee: entry.expressGovernmentFee === "" as any ? 0 : Number(entry.expressGovernmentFee || 0),
        expressServiceCharges: entry.expressServiceCharges === "" as any ? 0 : Number(entry.expressServiceCharges || 0),
      })) || [],
    })) || [];

    mutation.mutate({
      ...values,
      cost: values.cost === "" as any ? 0 : Number(values.cost || 0),
      visaProcessed: values.visaProcessed === "" as any ? 0 : Number(values.visaProcessed || 0),
      visas: sanitizedVisas,
    });
  };

  const schemaTypes = ["FAQ", "Webpage", "Review"];

  return (
    <div className="w-full bg-gray-50/30 p-2 lg:p-4">
      <div className="w-full rounded-md bg-white p-4 shadow border border-gray-100">
        <h1 className="mb-3 text-center text-lg font-extrabold text-gray-800 tracking-tight">Create Visa</h1>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-8 rounded-md p-0.5 mb-2 bg-gray-100">
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="basic">Basic Detail</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="content">Content</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="visas">Visas</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="media">Media</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="seo">SEO & Docs</TabsTrigger>
                <TabsTrigger className="rounded h-full leading-none text-[11px] font-medium data-[state=active]:shadow-sm" value="faqs">FAQs & Review</TabsTrigger>
              </TabsList>

              {/* TAB 1: BASIC INFO */}
              <TabsContent value="basic" className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Name */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Title</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 rounded-sm" placeholder="Thailand Visa" {...field} required />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  {/* SLug */}
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Permalink</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 rounded-sm" placeholder="thailand-visa" {...field} required />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  {/* country */}
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Country</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 rounded-sm" placeholder="Thailand" {...field} required />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {/* Role */}
                  <FormField
                    control={form.control}
                    name="visaType"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Visa Type</FormLabel>
                        <FormControl>
                          <select
                            className="w-full rounded-sm border border-gray-300 px-2 h-7 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
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
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {/* Fee */}
                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Fee</FormLabel>
                        <FormControl>
                          <Input
                            className="h-7 text-xs px-2 rounded-sm"
                            type="number"
                            placeholder="100"
                            value={field.value === 0 ? "" : field.value}
                            onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                            required
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {/* Processed */}
                  <FormField
                    control={form.control}
                    name="visaProcessed"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Total Processed</FormLabel>
                        <FormControl>
                          <Input
                            className="h-7 text-xs px-2 rounded-sm"
                            type="number"
                            placeholder="100"
                            value={field.value === 0 ? "" : field.value}
                            onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {/* Duration */}
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Duration</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 rounded-sm" type="text" placeholder="2 to 7" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* TAB: VISAS */}
              <TabsContent value="visas" className="space-y-5">
                
                {/* Rejection Reasons Multi-Select */}
                <div className="bg-white p-3 border rounded-md shadow-sm space-y-3">
                  <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Visa Rejection Reasons</FormLabel>
                  {visaRejectionReasonsOptions.length === 0 ? (
                    <div className="text-[11px] text-gray-400 italic">No rejection reasons found in Master Data.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {visaRejectionReasonsOptions.map((reason: any) => {
                        const current = form.watch("rejectionReasons") || [];
                        const isChecked = current.includes(reason._id);
                        return (
                          <div key={reason._id} className="flex items-start space-x-2 border rounded-md p-2 bg-slate-50 hover:bg-slate-100 transition-colors">
                            <Checkbox
                              id={`reason-${reason._id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  form.setValue("rejectionReasons", [...current, reason._id]);
                                } else {
                                  form.setValue("rejectionReasons", current.filter((id) => id !== reason._id));
                                }
                              }}
                              className="mt-0.5"
                            />
                            <div className="space-y-1 leading-none">
                              <label
                                htmlFor={`reason-${reason._id}`}
                                className="text-[11px] font-semibold text-slate-800 cursor-pointer"
                              >
                                {reason.title}
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Expert Tips Multi-Select */}
                <div className="bg-white p-3 border rounded-md shadow-sm space-y-3">
                  <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Visa Expert Tips</FormLabel>
                  {visaExpertTipsOptions.length === 0 ? (
                    <div className="text-[11px] text-gray-400 italic">No expert tips found in Master Data.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {visaExpertTipsOptions.map((tip: any) => {
                        const current = form.watch("expertTips") || [];
                        const isChecked = current.includes(tip._id);
                        return (
                          <div key={tip._id} className="flex items-start space-x-2 border rounded-md p-2 bg-slate-50 hover:bg-slate-100 transition-colors">
                            <Checkbox
                              id={`tip-${tip._id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  form.setValue("expertTips", [...current, tip._id]);
                                } else {
                                  form.setValue("expertTips", current.filter((id) => id !== tip._id));
                                }
                              }}
                              className="mt-0.5"
                            />
                            <div className="space-y-1 leading-none">
                              <label
                                htmlFor={`tip-${tip._id}`}
                                className="text-[11px] font-semibold text-slate-800 cursor-pointer"
                              >
                                {tip.title}
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Visa Cards</FormLabel>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] font-semibold rounded-sm"
                    onClick={() => visasArray.append({
                      visaPurpose: "",
                      visaType: "",
                      gstTypeOrPercentageText: "",
                      documents: "",
                      processSteps: "",
                      visaValidity: "",
                      visaDuration: "",
                      entryType: "",
                      processTime: "",
                      validityEntries: [{ 
                        visaValidity: "", 
                        visaDuration: "", 
                        entryType: "", 
                        processTime: "",
                        governmentFee: 0,
                        serviceCharges: 0,
                        gst: 0,
                        expressVisaDuration: "",
                        expressGovernmentFee: 0,
                        expressServiceCharges: 0,
                      }],
                      isExpress: false,
                    })}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Visa Card
                  </Button>
                </div>

                {visasArray.fields.length === 0 && (
                  <div className="text-center py-10 text-[11px] text-gray-500 border border-dashed rounded bg-white">
                    No visa cards added yet. Click "Add Visa Card" to get started.
                  </div>
                )}

                <div className="space-y-3">
                  {visasArray.fields.map((field, index) => {
                    const isCollapsed = collapsedCards[index];
                    const purpose = form.watch(`visas.${index}.visaPurpose`);
                    const vType = form.watch(`visas.${index}.visaType`);
                    const isExpress = form.watch(`visas.${index}.isExpress`);
                    return (
                      <div key={field.id} className="border rounded-md bg-white shadow-sm">
                        {/* Card Header */}
                        <div
                          className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b cursor-pointer rounded-t-md"
                          onClick={() => toggleCard(index)}
                        >
                          <div className="flex items-center gap-2">
                            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronUp className="w-3.5 h-3.5 text-gray-500" />}
                            <span className="text-xs font-semibold text-gray-700">
                              {purpose || vType ? `${purpose}${purpose && vType ? ' — ' : ''}${vType}` : `Visa Card #${index + 1}`}
                            </span>
                            {isExpress && <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold">EXPRESS</span>}
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-6 w-6 p-0 rounded-sm"
                            onClick={(e) => { e.stopPropagation(); visasArray.remove(index); }}
                          >
                            <X size={12} />
                          </Button>
                        </div>

                        {/* Card Body */}
                        {!isCollapsed && (
                          <div className="p-3 space-y-3">
                            {/* Row 1: Purpose + Type */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <FormField
                                control={form.control}
                                name={`visas.${index}.visaPurpose`}
                                render={({ field }) => (
                                  <FormItem className="space-y-0.5">
                                    <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Visa Purpose</FormLabel>
                                    <FormControl>
                                      <select className="w-full rounded-sm border border-gray-300 px-2 h-7 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary" {...field}>
                                        <option value="">Select Purpose</option>
                                        {visaPurposeOptions.map((opt: any) => (
                                          <option key={opt._id} value={opt.name}>{opt.name}</option>
                                        ))}
                                      </select>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`visas.${index}.visaType`}
                                render={({ field }) => (
                                  <FormItem className="space-y-0.5">
                                    <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Visa Type</FormLabel>
                                    <FormControl>
                                      <select className="w-full rounded-sm border border-gray-300 px-2 h-7 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary" {...field}>
                                        <option value="">Select Type</option>
                                        <option value="E-Visa">E-Visa</option>
                                        <option value="DAC">DAC</option>
                                        <option value="EVOA">EVOA</option>
                                        <option value="Sticker">Sticker</option>
                                        <option value="ETA">ETA</option>
                                        <option value="PAR">PAR</option>
                                      </select>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Row 3: Validity & Pricing Entries (Multiple per card) */}
                            <div className="space-y-3">
                              <div className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200">
                                <Label className="text-[12px] font-bold text-gray-700 uppercase tracking-widest">Validity & Pricing Entries</Label>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="default"
                                  className="h-7 text-[10px] font-semibold rounded-sm bg-[#FE5300] hover:bg-[#e44a00]"
                                  onClick={() => {
                                    const current = form.getValues(`visas.${index}.validityEntries`) || [];
                                    form.setValue(`visas.${index}.validityEntries`, [
                                      ...current,
                                      { 
                                        visaValidity: "", visaDuration: "", entryType: "", processTime: "",
                                        governmentFee: 0, serviceCharges: 0, gst: 0,
                                        expressVisaDuration: "", expressGovernmentFee: 0, expressServiceCharges: 0
                                      }
                                    ]);
                                  }}
                                >
                                  <Plus className="w-3 h-3 mr-1" /> Add Entry
                                </Button>
                              </div>

                              {(form.watch(`visas.${index}.validityEntries`) || []).map((_: any, vIdx: number) => (
                                <div key={vIdx} className="relative bg-white p-3 rounded-lg border border-gray-200 shadow-sm space-y-3">
                                  {/* Remove button */}
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full shadow-md z-10"
                                    onClick={() => {
                                      const current = form.getValues(`visas.${index}.validityEntries`) || [];
                                      if (current.length > 1) {
                                        form.setValue(`visas.${index}.validityEntries`, current.filter((_: any, i: number) => i !== vIdx));
                                      }
                                    }}
                                  >
                                    <X size={12} />
                                  </Button>
                                  
                                  {/* Entry Basics */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {/* Visa Validity */}
                                    <div className="space-y-0.5">
                                      <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Validity</Label>
                                      <select
                                        className="w-full rounded-sm border border-gray-300 px-2 h-7 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                        value={form.watch(`visas.${index}.validityEntries.${vIdx}.visaValidity`) || ""}
                                        onChange={(e) => form.setValue(`visas.${index}.validityEntries.${vIdx}.visaValidity`, e.target.value)}
                                      >
                                        <option value="">Select Validity</option>
                                        {visaValidityOptions.map((opt: any) => (
                                          <option key={opt._id} value={formatDuration(opt)}>{formatDuration(opt)}</option>
                                        ))}
                                      </select>
                                    </div>
                                    {/* Visa Duration */}
                                    <div className="space-y-0.5">
                                      <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Duration</Label>
                                      <select
                                        className="w-full rounded-sm border border-gray-300 px-2 h-7 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                        value={form.watch(`visas.${index}.validityEntries.${vIdx}.visaDuration`) || ""}
                                        onChange={(e) => form.setValue(`visas.${index}.validityEntries.${vIdx}.visaDuration`, e.target.value)}
                                      >
                                        <option value="">Select Duration</option>
                                        {visaDurationOptions.map((opt: any) => (
                                          <option key={opt._id} value={formatDuration(opt)}>{formatDuration(opt)}</option>
                                        ))}
                                      </select>
                                    </div>
                                    {/* Entry Type */}
                                    <div className="space-y-0.5">
                                      <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Entry</Label>
                                      <select
                                        className="w-full rounded-sm border border-gray-300 px-2 h-7 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                                        value={form.watch(`visas.${index}.validityEntries.${vIdx}.entryType`) || ""}
                                        onChange={(e) => form.setValue(`visas.${index}.validityEntries.${vIdx}.entryType`, e.target.value)}
                                      >
                                        <option value="">Select Entry</option>
                                        <option value="Single">Single</option>
                                        <option value="Multiple">Multiple</option>
                                      </select>
                                    </div>
                                    {/* Process Time */}
                                    <div className="space-y-0.5">
                                      <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Process Time</Label>
                                      <Input
                                        className="h-7 text-xs px-2 rounded-sm"
                                        placeholder="e.g. 3-4 Days"
                                        value={form.watch(`visas.${index}.validityEntries.${vIdx}.processTime`) || ""}
                                        onChange={(e) => form.setValue(`visas.${index}.validityEntries.${vIdx}.processTime`, e.target.value)}
                                      />
                                    </div>
                                  </div>

                                  {/* Standard Pricing */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
                                    <div className="space-y-0.5">
                                      <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Gov Fee</Label>
                                      <Input
                                        className="h-7 text-xs px-2 rounded-sm bg-gray-50"
                                        type="number"
                                        placeholder="0"
                                        value={form.watch(`visas.${index}.validityEntries.${vIdx}.governmentFee`) === 0 ? "" : form.watch(`visas.${index}.validityEntries.${vIdx}.governmentFee`)}
                                        onChange={(e) => form.setValue(`visas.${index}.validityEntries.${vIdx}.governmentFee`, e.target.value === "" ? "" as any : Number(e.target.value))}
                                      />
                                    </div>
                                    <div className="space-y-0.5">
                                      <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Service Charges</Label>
                                      <Input
                                        className="h-7 text-xs px-2 rounded-sm bg-gray-50"
                                        type="number"
                                        placeholder="0"
                                        value={form.watch(`visas.${index}.validityEntries.${vIdx}.serviceCharges`) === 0 ? "" : form.watch(`visas.${index}.validityEntries.${vIdx}.serviceCharges`)}
                                        onChange={(e) => form.setValue(`visas.${index}.validityEntries.${vIdx}.serviceCharges`, e.target.value === "" ? "" as any : Number(e.target.value))}
                                      />
                                    </div>
                                    <div className="space-y-0.5">
                                      <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">GST (%)</Label>
                                      <Input
                                        className="h-7 text-xs px-2 rounded-sm bg-gray-50"
                                        type="number"
                                        placeholder="0"
                                        value={form.watch(`visas.${index}.validityEntries.${vIdx}.gst`) === 0 ? "" : form.watch(`visas.${index}.validityEntries.${vIdx}.gst`)}
                                        onChange={(e) => form.setValue(`visas.${index}.validityEntries.${vIdx}.gst`, e.target.value === "" ? "" as any : Number(e.target.value))}
                                      />
                                    </div>
                                  </div>

                                  {/* Express Pricing (Conditional) */}
                                  {isExpress && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-2 bg-orange-50/50 rounded border border-orange-100">
                                      <div className="space-y-0.5">
                                        <Label className="text-[10px] font-bold text-orange-700 uppercase tracking-widest">Express Process Time</Label>
                                        <Input
                                          className="h-7 text-xs px-2 rounded-sm border-orange-200"
                                          placeholder="e.g. 1-2 Days"
                                          value={form.watch(`visas.${index}.validityEntries.${vIdx}.expressVisaDuration`) || ""}
                                          onChange={(e) => form.setValue(`visas.${index}.validityEntries.${vIdx}.expressVisaDuration`, e.target.value)}
                                        />
                                      </div>
                                      <div className="space-y-0.5">
                                        <Label className="text-[10px] font-bold text-orange-700 uppercase tracking-widest">Express Gov Fee</Label>
                                        <Input
                                          className="h-7 text-xs px-2 rounded-sm border-orange-200"
                                          type="number"
                                          placeholder="0"
                                          value={form.watch(`visas.${index}.validityEntries.${vIdx}.expressGovernmentFee`) === 0 ? "" : form.watch(`visas.${index}.validityEntries.${vIdx}.expressGovernmentFee`)}
                                          onChange={(e) => form.setValue(`visas.${index}.validityEntries.${vIdx}.expressGovernmentFee`, e.target.value === "" ? "" as any : Number(e.target.value))}
                                        />
                                      </div>
                                      <div className="space-y-0.5">
                                        <Label className="text-[10px] font-bold text-orange-700 uppercase tracking-widest">Express Service Charges</Label>
                                        <Input
                                          className="h-7 text-xs px-2 rounded-sm border-orange-200"
                                          type="number"
                                          placeholder="0"
                                          value={form.watch(`visas.${index}.validityEntries.${vIdx}.expressServiceCharges`) === 0 ? "" : form.watch(`visas.${index}.validityEntries.${vIdx}.expressServiceCharges`)}
                                          onChange={(e) => form.setValue(`visas.${index}.validityEntries.${vIdx}.expressServiceCharges`, e.target.value === "" ? "" as any : Number(e.target.value))}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                              
                              {(form.watch(`visas.${index}.validityEntries`) || []).length === 0 && (
                                <div className="text-center py-3 text-[10px] text-gray-400 border border-dashed rounded bg-white">
                                  No validity entries. Click &quot;Add Entry&quot; above.
                                </div>
                              )}
                            </div>

                            {/* Row 4: Documents + Process Steps (Rich Text) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-0.5">
                                <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Documents</Label>
                                <div className="border rounded-sm overflow-hidden text-xs">
                                  <SmallEditor
                                    value={form.getValues(`visas.${index}.documents`) || ""}
                                    onChange={(val) => form.setValue(`visas.${index}.documents`, val)}
                                  />
                                </div>
                              </div>
                              <div className="space-y-0.5">
                                <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Process Steps</Label>
                                <div className="border rounded-sm overflow-hidden text-xs">
                                  <SmallEditor
                                    value={form.getValues(`visas.${index}.processSteps`) || ""}
                                    onChange={(val) => form.setValue(`visas.${index}.processSteps`, val)}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Express Toggle at the bottom (conditional fields are now inside validity entries) */}
                            <div className="flex items-center gap-3 pt-2 border-t">
                              <Switch
                                checked={isExpress}
                                onCheckedChange={(checked) => form.setValue(`visas.${index}.isExpress`, checked)}
                              />
                              <Label className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Enable Express Pricing for Entries</Label>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* TAB 2: CONTENT */}
              <TabsContent value="content" className="space-y-3">
                {/* Content */}
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem className="space-y-0.5">
                      <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Content</FormLabel>
                      <FormControl className="text-xs">
                        <BlogEditor value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                {/* Quick Summary */}
                <FormField control={form.control} name="quickSummary" render={({ field }) => (
                  <FormItem className="space-y-0.5">
                    <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Quick Summary</FormLabel>
                    <FormControl className="text-xs"><BlogEditor value={field.value} onChange={field.onChange} /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )} />

                {/* Highlights */}
                <FormField control={form.control} name="highlights" render={({ field }) => (
                  <FormItem className="space-y-0.5">
                    <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Highlights</FormLabel>
                    <FormControl className="text-xs"><BlogEditor value={field.value} onChange={field.onChange} /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )} />

                {/* Quick Answer */}
                <FormField control={form.control} name="quickAnswer" render={({ field }) => (
                  <FormItem className="space-y-0.5">
                    <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Quick Answer</FormLabel>
                    <FormControl className="text-xs"><BlogEditor value={field.value} onChange={field.onChange} /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )} />

                {/* Why This Visa */}
                <FormField control={form.control} name="whyThisVisa" render={({ field }) => (
                  <FormItem className="space-y-0.5">
                    <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Why This Visa</FormLabel>
                    <FormControl className="text-xs"><BlogEditor value={field.value} onChange={field.onChange} /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )} />

                {/* Eligibility */}
                <FormField control={form.control} name="eligibility" render={({ field }) => (
                  <FormItem className="space-y-0.5">
                    <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Eligibility</FormLabel>
                    <FormControl className="text-xs"><BlogEditor value={field.value} onChange={field.onChange} /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )} />

                {/* Fees and Charges */}
                <FormField control={form.control} name="feesAndCharges" render={({ field }) => (
                  <FormItem className="space-y-0.5">
                    <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Fees and Charges</FormLabel>
                    <FormControl className="text-xs"><BlogEditor value={field.value} onChange={field.onChange} /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )} />

                {/* How to Apply */}
                <FormField control={form.control} name="howToApply" render={({ field }) => (
                  <FormItem className="space-y-0.5">
                    <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">How to Apply</FormLabel>
                    <FormControl className="text-xs"><BlogEditor value={field.value} onChange={field.onChange} /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )} />

                {/* Helpful Resources */}
                <FormField control={form.control} name="helpfulResources" render={({ field }) => (
                  <FormItem className="space-y-0.5">
                    <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Helpful Resources</FormLabel>
                    <FormControl className="text-xs"><BlogEditor value={field.value} onChange={field.onChange} /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )} />

                {/* CTA */}
                <FormField control={form.control} name="cta" render={({ field }) => (
                  <FormItem className="space-y-0.5">
                    <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">CTA</FormLabel>
                    <FormControl className="text-xs"><BlogEditor value={field.value} onChange={field.onChange} /></FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )} />

                
                {/* excerpt*/}
                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem className="space-y-0.5">
                      <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Excerpt</FormLabel>
                      <FormControl>
                        <Input className="h-7 text-xs px-2 rounded-sm" type="text" placeholder="Short description" {...field} />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* TAB 3: MEDIA */}
              <TabsContent value="media" className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 items-start gap-3">
                  {/* Avatar */}
                  <div className="space-y-2 p-2 border rounded bg-gray-50/50">
                    <FormField
                      control={form.control}
                      name="coverImage"
                      render={() => (
                        <FormItem className="space-y-0.5">
                          <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Avatar</FormLabel>
                          <FormControl>
                            <div className="max-w-[160px] mx-auto w-full">
                              <ImageUploader
                                initialImage={form.watch("coverImage")}
                                onUpload={(img) => {
                                  if (!img) return;
                                  form.setValue("coverImage", {
                                    url: img ? img.url : "",
                                    alt: img.alt ?? form.getValues("country"),
                                  });
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    <Input
                      className="h-7 text-xs px-2 rounded-sm mt-1"
                      placeholder="Cover alt"
                      value={form.watch("coverImage")?.alt ?? ""}
                      onChange={(e) =>
                        form.setValue("coverImage.alt", e.target.value ?? form.getValues("country"))
                      }
                    />
                  </div>

                  {/* Banner Image */}
                  <div className="space-y-2 p-2 border rounded bg-gray-50/50">
                    <FormField
                      control={form.control}
                      name="bannerImage"
                      render={() => (
                        <FormItem className="space-y-0.5">
                          <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Banner Image</FormLabel>
                          <FormControl>
                            <div className="max-w-[160px] mx-auto w-full">
                              <ImageUploader
                                initialImage={form.watch("bannerImage")}
                                onUpload={(img) => {
                                  if (!img) return;
                                  form.setValue("bannerImage", {
                                    url: img ? img.url : "",
                                    alt: img.alt ?? form.getValues("country"),
                                  });
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    <Input
                      className="h-7 text-xs px-2 rounded-sm mt-1"
                      placeholder="Banner alt"
                      value={form.watch("bannerImage")?.alt ?? ""}
                      onChange={(e) =>
                        form.setValue("bannerImage.alt", e.target.value ?? form.getValues("country"))
                      }
                    />
                  </div>
                </div>
              </TabsContent>

              {/* TAB 4: SEO & DOCS */}
              <TabsContent value="seo" className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* metaTitle */}
                  <FormField
                    control={form.control}
                    name="metaTitle"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">SEO MetaTitle</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 rounded-sm" type="text" placeholder="Title for SEO" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {/* meta description */}
                  <FormField
                    control={form.control}
                    name="metaDescription"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">SEO MetaDescription</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 rounded-sm" type="text" placeholder="Description for SEO" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {/* canonicalUrl */}
                  <FormField
                    control={form.control}
                    name="canonicalUrl"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Canonical Url</FormLabel>
                        <FormControl>
                          <Input className="h-7 text-xs px-2 rounded-sm" type="text" placeholder="Canonical Url" {...field} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  
                  {/* Schema Type */}
                  <FormField
                    control={form.control}
                    name="schemaType"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-0.5">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Schema Type</FormLabel>
                        <FormControl>
                          <select
                            className="w-full rounded-sm border border-gray-300 p-1 text-[11px] h-16 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                            value={field.value || []}
                            onChange={(e) => {
                              const value = Array.from(e.target.selectedOptions, (option) => option.value);
                              field.onChange(value);
                            }}
                            multiple
                          >
                            {schemaTypes.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </FormControl>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {form.watch("schemaType")?.map((option) => (
                            <span key={option} className="flex items-center gap-0.5 bg-gray-100 rounded px-1.5 py-0.5 text-[10px] border">
                              {option}
                              <X
                                size={10}
                                className="cursor-pointer hover:text-red-500"
                                onClick={() => form.setValue("schemaType", form.getValues("schemaType")?.filter((item) => item !== option))}
                              />
                            </span>
                          ))}
                        </div>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                  {/* keywords */}
                  <div className="space-y-1">
                    <Label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest">Keywords</Label>
                    <div className="flex flex-wrap gap-1 border border-gray-300 rounded-sm p-1 min-h-[30px] bg-white">
                      {form.watch("keywords")?.map((kw, i) => (
                        <span key={i} className="flex items-center gap-0.5 bg-gray-100 px-1.5 py-0.5 rounded text-[10px] border">
                          {kw}
                          <button
                            type="button"
                            onClick={() => form.setValue("keywords", form.getValues("keywords")?.filter((_, idx) => idx !== i))}
                            className="text-gray-500 hover:text-red-500"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}

                      <input
                        type="text"
                        className="flex-1 min-w-[100px] border-none focus:ring-0 focus:outline-none bg-transparent text-[11px] px-1 h-5"
                        placeholder="Type & Enter..."
                        onBlur={(e) => {
                          const arr = e.target.value.split(",").map((v) => v.trim()).filter(Boolean);
                          if (arr.length > 0) {
                            form.setValue("keywords", [...(form.getValues("keywords") || []), ...arr]);
                            e.target.value = "";
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const arr = (e.target as HTMLInputElement).value.split(",").map((v) => v.trim()).filter(Boolean);
                            if (arr.length > 0) {
                              form.setValue("keywords", [...(form.getValues("keywords") || []), ...arr]);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* necessaryDocuments */}
                  <div className="space-y-1">
                    <Label className="block text-[11px] font-bold text-gray-600 uppercase tracking-widest">Necessary Documents Checklist</Label>
                    <div className="flex flex-wrap gap-1 border border-gray-300 rounded-sm p-1 min-h-[30px] bg-white">
                      {form.watch("necessaryDocuments")?.map((doc, i) => (
                        <span key={i} className="flex items-center gap-0.5 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] border border-blue-100">
                          {doc}
                          <button
                            type="button"
                            onClick={() => form.setValue("necessaryDocuments", form.getValues("necessaryDocuments")?.filter((_, idx) => idx !== i))}
                            className="text-blue-500 hover:text-red-500"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}

                      <input
                        type="text"
                        className="flex-1 min-w-[100px] border-none focus:ring-0 focus:outline-none bg-transparent text-[11px] px-1 h-5"
                        placeholder="Type & Enter..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = (e.target as HTMLInputElement).value.trim();
                            if (val) {
                              form.setValue("necessaryDocuments", [...(form.getValues("necessaryDocuments") || []), val]);
                              (e.target as HTMLInputElement).value = "";
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* documentsContent */}
                  <FormField
                    control={form.control}
                    name="documentsContent"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5 col-span-1 md:col-span-2">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Documents Info</FormLabel>
                        <FormControl className="text-xs bg-white">
                          <SmallEditor value={field.value || ""} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  {/* process */}
                  <FormField
                    control={form.control}
                    name="process"
                    render={({ field }) => (
                      <FormItem className="space-y-0.5 col-span-1 md:col-span-2 pt-2">
                        <FormLabel className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Process Steps</FormLabel>
                        <FormControl className="text-xs bg-white">
                          <SmallEditor value={field.value || ""} onChange={field.onChange} />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* TAB 5: FAQS & REVIEWS */}
              <TabsContent value="faqs" className="space-y-4">
                {/* FAQs Dynamic */}
                <div className="bg-gray-50/50 p-3 rounded border">
                  <FormLabel className="mb-2 block text-[11px] font-bold text-gray-600 uppercase tracking-widest">Frequently Asked Questions (FAQs)</FormLabel>
                  <div className="space-y-2">
                    {faqsArray.fields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 p-2 bg-white rounded border shadow-sm relative group">
                        <div className="w-full space-y-1.5">
                          <Input className="h-7 text-xs font-medium rounded-sm px-2" {...form.register(`faqs.${index}.question`)} placeholder="Question" />
                          <div className="border rounded-sm overflow-hidden text-xs">
                            <SmallEditor
                              value={form.getValues(`faqs.${index}.answer`)}
                              onChange={(val) => form.setValue(`faqs.${index}.answer`, val)}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="shrink-0 h-7 w-7 p-0 rounded-sm"
                          onClick={() => faqsArray.remove(index)}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button size="sm" type="button" variant="outline" className="mt-2 w-full md:w-auto h-7 text-[11px] font-semibold rounded-sm tracking-wide" onClick={() => faqsArray.append({ question: "", answer: "" })}>
                    + Add FAQ
                  </Button>
                </div>

                {/* Reviews */}
                <div className="bg-gray-50/50 p-3 rounded border">
                  <FormLabel className="mb-2 block text-[11px] font-bold text-gray-600 uppercase tracking-widest">Attached Reviews</FormLabel>
                  
                  {reviewsDetails.length === 0 ? (
                    <div className="text-center py-4 text-[11px] text-gray-500 border border-dashed rounded bg-white">
                      No reviews attached to this visa yet.
                    </div>
                  ) : (
                    <div className="space-y-1.5 mb-2">
                      {reviewsDetails.map((review, index) => (
                        <div key={review._id} className="flex justify-between items-center p-1.5 bg-white rounded border shadow-sm">
                          <div>
                            <span className="font-semibold text-xs block leading-none mb-0.5">{review.name}</span>
                            <span className="text-[10px] text-gray-500 line-clamp-1">{review.comment}</span>
                          </div>
                          <div className="flex gap-1 shrink-0 ml-2">
                            <Button type="button" variant="secondary" size="sm" className="h-6 text-[10px] px-1.5 rounded-sm" onClick={() => handleReviewsEdit(review._id as string)}>
                              Edit
                            </Button>
                            <Button type="button" variant="destructive" size="sm" className="h-6 text-[10px] px-1.5 rounded-sm" onClick={() => handleReviewsRemove(review._id as string, index)}>
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button size="sm" type="button" className="h-7 text-[11px] font-semibold rounded-sm tracking-wide" onClick={() => setShowReviewsModal(true)}>
                    + Add Review
                  </Button>

                  {showReviewsModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <CreateReviewsModal
                        onReviewsCreated={handleReviewsCreated}
                        onClose={() => {
                          setShowReviewsModal(false);
                          setEditReviewsId(null);
                        }}
                        onReviewsUpdated={handleReviewsUpdated}
                        existingReviews={editReviewsId}
                        type="package"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="pt-3 border-t mt-4 flex justify-end">
              <Button size="sm" type="submit" className="w-full md:w-auto px-6 h-8 text-[11px] font-bold uppercase tracking-widest rounded shadow-sm" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating..." : "Create Visa"}
              </Button>
            </div>
          </form>
        </Form>

        {mutation.isError && (
          <p className="mt-3 text-center text-sm text-red-500">
            {(mutation.error as Error).message}
          </p>
        )}
        {mutation.isSuccess && (
          <p className="mt-3 text-center text-sm text-green-600">
            Visa Creation successful!
          </p>
        )}
      </div>
    </div>
  );
}
