"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Upload, CheckCircle, FileText, Loader2, ChevronRight, 
  ChevronLeft, CreditCard, User as UserIcon, Plus, Trash2, Calendar, ShieldCheck, Lock, Shield, Globe,
  ChevronDown, ChevronUp, Mail, Phone, FileCheck, AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

interface Visa {
  _id: string;
  title: string;
  country: string;
  cost: number;
  slug: string;
  necessaryDocuments: string[];
  visas?: any[];
  coverImage?: any;
  bannerImage?: any;
  duration?: number;
  visaType?: string;
}

interface UploadedFile {
  url: string;
  key?: string;
  format?: string;
  size?: number;
}

interface VisaBookingFormProps {
  visa: Visa;
  applicationId?: string;
  defaultVisaCardId?: string;
  defaultIsExpress?: boolean;
  defaultTravellerCount?: number;
}

interface Traveller {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
}

export default function VisaBookingForm({ 
  visa, 
  applicationId: initialApplicationId,
  defaultVisaCardId,
  defaultIsExpress,
  defaultTravellerCount = 1
}: VisaBookingFormProps) {
  const [applicationId, setApplicationId] = useState<string | undefined>(initialApplicationId);
  const [selectedVisaId, setSelectedVisaId] = useState<string | undefined>(defaultVisaCardId);
  const [isExpress, setIsExpress] = useState<boolean>(!!defaultIsExpress);
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, UploadedFile>>({});
  
  const [travellers, setTravellers] = useState<Traveller[]>(() => {
    const count = defaultTravellerCount || 1;
    return Array.from({ length: count }, (_, i) => ({
      id: (Date.now() + i).toString(),
      firstName: "",
      lastName: "",
      dob: "",
      gender: "Male"
    }));
  });
  const [contactInfo, setContactInfo] = useState({ phone: "", email: "" });
  const [activeTravellerId, setActiveTravellerId] = useState<string>(() => {
    return travellers[0]?.id || "";
  });

  useEffect(() => {
    if (travellers.length > 0 && !travellers.some(t => t.id === activeTravellerId)) {
      setActiveTravellerId(travellers[0].id);
    }
  }, [travellers, activeTravellerId]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string>("Pending");
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

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
    surl: "",
    furl: "",
    hash: "",
    udf1: "",
    service_provider: "payu_paisa",
  });

  const { data: profileData } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!token,
  });

  const user = profileData?.data;

  const { data: existingAppData } = useQuery({
    queryKey: ["visa-application", applicationId],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa-application/${applicationId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      return res.json();
    },
    enabled: !!applicationId,
  });

  useEffect(() => {
    if (existingAppData?.success) {
      const app = existingAppData.data;
      if (app.travellers && app.travellers.length > 0) {
        setTravellers(app.travellers.map((t: any, i: number) => ({ ...t, id: i.toString() })));
      }
      setContactInfo({ phone: app.phone || "", email: app.email || "" });
      setApplicationStatus(app.applicationStatus);
      setStep(app.currentStep || 1);
      
      const docsMap: Record<string, UploadedFile> = {};
      app.documents.forEach((d: any) => {
        const key = d.travellerId ? `${d.travellerId}_${d.name}` : d.name;
        docsMap[key] = d.media;
      });
      setDocuments(docsMap);

      if (app.selectedVisaId) {
        setSelectedVisaId(app.selectedVisaId);
      }
      if (app.isExpress !== undefined) {
        setIsExpress(app.isExpress);
      }
    }
  }, [existingAppData]);

  useEffect(() => {
    if (user && !applicationId) {
      setContactInfo(prev => ({
        phone: prev.phone || user.phone || "",
        email: prev.email || user.email || ""
      }));
      setTravellers(prev => {
        const newTravellers = [...prev];
        if (!newTravellers[0].firstName) {
          newTravellers[0].firstName = user.name?.split(" ")[0] || "";
        }
        if (!newTravellers[0].lastName) {
          newTravellers[0].lastName = user.name?.split(" ").slice(1).join(" ") || "";
        }
        return newTravellers;
      });
    }
  }, [user, applicationId]);

  const handleFileUpload = async (docName: string, file: File, travellerId?: string) => {
    const uploadKey = travellerId ? `${travellerId}_${docName}` : docName;
    setUploading(uploadKey);
    try {
      const presignRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/upload/cloudflare-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          folder: "visa-applications",
        }),
      });

      if (!presignRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, fileUrl, key } = await presignRes.json();

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      setDocuments((prev) => ({
        ...prev,
        [uploadKey]: {
          url: fileUrl,
          key,
          format: file.type.split("/")[1],
          size: file.size,
        },
      }));
      toast.success(`${docName} attached`);
    } catch (error) {
      toast.error(`Failed to upload ${docName}`);
    } finally {
      setUploading(null);
    }
  };

  const addTraveller = () => {
    const newId = Date.now().toString();
    setTravellers([...travellers, { id: newId, firstName: "", lastName: "", dob: "", gender: "Male" }]);
    setActiveTravellerId(newId);
  };

  const removeTraveller = (id: string) => {
    if (travellers.length > 1) {
      const filtered = travellers.filter(t => t.id !== id);
      setTravellers(filtered);
      if (activeTravellerId === id) {
        setActiveTravellerId(filtered[0]?.id || "");
      }
    }
  };

  const updateTraveller = (id: string, field: keyof Traveller, value: string) => {
    setTravellers(travellers.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const isStep1Valid = travellers.every(t => t.firstName && t.lastName && t.dob && t.gender) && !!(contactInfo.email && contactInfo.phone);
  const activeTraveller = travellers.find(t => t.id === activeTravellerId) || travellers[0];
  const activeTravellerIndex = travellers.findIndex(t => t.id === activeTravellerId);

  const requiredDocs = Array.from(new Set(["Passport", "Photo", ...(visa.necessaryDocuments || [])]));
  
  const allDocumentsUploaded = travellers.every((t) => 
    requiredDocs.every((doc) => documents[`${t.id}_${doc}`])
  );
  
  // Dynamic cost calculation based on selected sub-visa card
  const selectedVisaCard = visa.visas?.find((v: any) => v._id === selectedVisaId);
  const govFee = selectedVisaCard 
    ? (isExpress ? (selectedVisaCard.expressGovernmentFee || 0) : (selectedVisaCard.governmentFee || 0)) 
    : 0;

  const serviceCharge = selectedVisaCard 
    ? (isExpress ? (selectedVisaCard.expressServiceCharges || 0) : (selectedVisaCard.serviceCharges || 0)) 
    : 0;

  const gstPercentage = selectedVisaCard?.gst || 0;
  const calculatedGst = Math.round((serviceCharge * gstPercentage) / 100);

  const singleCost = selectedVisaCard 
    ? (govFee + serviceCharge + calculatedGst) 
    : visa.cost;

  const totalCost = singleCost * travellers.length;

  const saveProgress = async (nextStep: number, requireLogin = false) => {
    try {
      const url = applicationId 
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/visa-application/${applicationId}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/visa-application`;
        
      const res = await fetch(url, {
        method: applicationId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          visaId: visa._id,
          travellers: travellers.map(({id, ...rest}) => rest),
          email: contactInfo.email || user?.email || "",
          phone: contactInfo.phone || user?.phone || "",
          currentStep: nextStep,
          selectedVisaId,
          isExpress,
          documents: Object.entries(documents).map(([key, data]) => {
            const [travellerId, ...nameParts] = key.split("_");
            const name = nameParts.join("_");
            return {
              name: name || key, // Fallback for legacy docs
              travellerId: name ? travellerId : undefined,
              media: data,
            };
          }),
        }),
      });

      if (!res.ok) throw new Error("Failed to save progress");
      const result = await res.json();
      const newAppId = result.data._id;
      
      if (!applicationId) setApplicationId(newAppId);
      
      if (requireLogin) {
        toast.info("Please login to complete your application");
        const redirectPath = `/visa/${visa.slug}/apply?applicationId=${newAppId}`;
        router.push(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
        return;
      }
      
      setStep(nextStep);
    } catch (error) {
      toast.error("Failed to save progress");
    }
  };

  const handleProceedToPayment = async () => {
    // Read token fresh from store to avoid stale state after page navigation
    const freshToken = useAuthStore.getState().accessToken;
    const freshAuth = useAuthStore.getState().isAuthenticated;

    if (!freshAuth || !freshToken) {
      await saveProgress(3, true);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const submitRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa-application/submit/${applicationId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${freshToken}`,
        },
      });

      if (!submitRes.ok) throw new Error("Failed to finalize application");

      const paymentInitRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/payment`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${freshToken}`,
        },
        body: JSON.stringify({
            txnid: "txn" + Date.now(),
            amount: Number(totalCost).toFixed(2),
            productinfo: visa._id,
            firstname: travellers[0]?.firstName || "Guest",
            lastname: travellers[0]?.lastName || "",
            email: contactInfo.email || "guest@example.com",
            phone: contactInfo.phone?.replace(/\D/g, "").slice(-10) || "9876543210",
            udf1: applicationId,
            surl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success-visa`,
            furl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failure-visa`,
        })
      });

      if (!paymentInitRes.ok) throw new Error("Payment init failed");
      const { paymentData: resPaymentData } = await paymentInitRes.json();

      setPaymentData({
        ...resPaymentData,
      });

      setTimeout(() => {
        formRef.current?.submit();
      }, 1000);

    } catch (error) {
      toast.error("Application/Payment failed");
      setIsSubmitting(false);
    }
  };

  const inputStyles = "flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#FE5300]/20 focus:border-[#FE5300] placeholder-gray-400/80 shadow-xs hover:border-gray-300";
  const cardStyles = "bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.04)] relative overflow-hidden group";
  const primaryButtonStyles = "w-full bg-gradient-to-r from-[#FE5300] to-[#FF7A00] hover:from-[#e44a00] hover:to-[#e44a00] h-10.5 rounded-xl text-xs font-extrabold text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-98 cursor-pointer select-none gap-1.5";
  const secondaryButtonStyles = "h-10.5 px-5 rounded-xl font-bold bg-white border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-center transition-all active:scale-98 cursor-pointer select-none";

  const displayDuration = selectedVisaCard 
    ? (isExpress ? (selectedVisaCard.expressVisaDuration || selectedVisaCard.processTime) : selectedVisaCard.processTime)
    : `${visa.duration || 30} Days`;

  const displayType = selectedVisaCard 
    ? `${selectedVisaCard.visaPurpose} (${selectedVisaCard.visaType})` 
    : visa.visaType || "Tourist Visa";

  return (
    <div className="w-full pb-20 md:pb-6 max-w-7xl mx-auto">
      {/* Modern Horizontal Circular Stepper */}
      <div className="w-full max-w-2xl mx-auto mb-6 mt-1 px-4">
        <div className="relative flex justify-between items-center w-full">
          {/* Connecting line */}
          <div className="absolute top-4 left-10 right-10 h-0.5 bg-gray-200 z-0">
            <div 
              className="h-full bg-[#22C55E] transition-all duration-500"
              style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
            />
          </div>

          {[
            { num: 1, label: "Travellers", desc: "Details" },
            { num: 2, label: "Documents", desc: "Uploads" },
            { num: 3, label: "Review & Pay", desc: "Checkout" }
          ].map((s) => {
            const isCompleted = step > s.num;
            const isActive = step === s.num;
            return (
              <div key={s.num} className="flex flex-col items-center gap-1.5 relative z-10 w-24">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-xs border
                  ${isCompleted 
                    ? "bg-[#22C55E] border-[#22C55E] text-white" 
                    : isActive 
                      ? "bg-[#FE5300] border-[#FE5300] text-white ring-4 ring-orange-500/15 scale-105" 
                      : "bg-white text-gray-400 border-gray-250"}
                `}>
                  {isCompleted ? <CheckCircle size={13} className="stroke-[2.5]" /> : s.num}
                </div>
                <div className="text-center">
                  <span className={`text-[10px] font-extrabold tracking-tight block ${isActive || isCompleted ? "text-gray-900 font-black" : "text-gray-400"}`}>
                    {s.label}
                  </span>
                  <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider block mt-0.5 md:hidden lg:block">
                    {s.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start px-4 sm:px-6 lg:px-8">
        
        {/* Left Column: Sticky Summary & Trust Info (4 cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6 w-full">
          
          {/* Card Left Premium combined sidebar */}
          <div className="bg-white rounded-3xl border border-gray-150 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.04)]">
            {/* Country Banner Card */}
            <div className="relative h-24 bg-gradient-to-br from-[#FE5300] via-[#FF7A00] to-[#E04700] p-4 flex flex-col justify-end overflow-hidden">
              <div className="absolute -top-12 -left-12 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <div className="absolute -bottom-16 -right-16 w-36 h-36 rounded-full bg-orange-600/30 blur-2xl pointer-events-none" />
              
              <div className="relative z-10 flex justify-between items-end">
                <div>
                  <span className="text-[8px] text-white/75 font-extrabold uppercase tracking-widest bg-white/15 px-2 py-0.5 rounded-full border border-white/10 mb-1 inline-block">
                    Visa Service
                  </span>
                  <h3 className="text-lg font-black text-white tracking-tight leading-none drop-shadow-xs">
                    {visa.title}
                  </h3>
                </div>
                <div className="bg-white/15 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded-xl text-right">
                  <span className="text-[7px] text-white/80 font-bold block uppercase tracking-wider">Duration</span>
                  <span className="text-[10px] font-extrabold text-white">{displayDuration}</span>
                </div>
              </div>
            </div>

            {/* Price Accordion Drawer on Mobile / Standard view on Desktop */}
            <div className="p-4 space-y-3.5">
              {/* Mobile collapse trigger button */}
              <button 
                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                className="flex lg:hidden w-full items-center justify-between py-1 text-sm font-bold text-gray-800 border-b border-gray-100 mb-2 cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">Total Booking Cost</span>
                  <span className="text-base font-black text-[#FE5300]">₹{totalCost}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                  {isSummaryExpanded ? "Hide Details" : "Show Details"}
                  {isSummaryExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {/* Fee Breakdown Block */}
              <div className={`${isSummaryExpanded ? "block" : "hidden lg:block"} space-y-4`}>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider pb-1 border-b border-gray-50">Booking Breakdown</h4>
                
                <div className="space-y-3.5 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Visa Plan</span>
                    <span className="font-extrabold text-gray-800 text-right max-w-[180px] truncate" title={displayType}>
                      {displayType}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Processing Time</span>
                    <span className="font-extrabold text-gray-800">
                      {displayDuration}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Visa Fee</span>
                    <span className="font-extrabold text-gray-800">
                      ₹{govFee + serviceCharge} <span className="text-gray-400 font-bold">x {travellers.length} Pax</span>
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">GST / Service Taxes ({gstPercentage}%)</span>
                    <span className="font-extrabold text-gray-800">
                      ₹{calculatedGst * travellers.length}
                    </span>
                  </div>

                  <div className="border-t border-dashed border-gray-200 my-4 pt-4" />

                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-xs font-extrabold text-gray-900">Total Payable</span>
                      <span className="text-[9px] text-gray-400 font-bold mt-0.5 block">All taxes & platform charges included</span>
                    </div>
                    <span className="text-2xl font-black text-[#FE5300] tracking-tight">₹{totalCost}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons inside sidebar (Desktop only) */}
              <div className="hidden lg:block pt-3 border-t border-gray-100">
                <button
                  onClick={handleProceedToPayment}
                  disabled={isSubmitting || step < 3}
                  className="w-full bg-gradient-to-r from-[#FE5300] to-[#FF7A00] hover:from-[#e44a00] hover:to-[#e44a00] text-white py-3.5 rounded-2xl text-sm font-extrabold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin mr-1" size={16} />
                  ) : !isAuthenticated && step >= 3 ? (
                    <UserIcon className="mr-1" size={16} />
                  ) : null}
                  {step < 3 ? (
                    "Complete Steps to Pay"
                  ) : isAuthenticated ? (
                    `Pay ₹${totalCost}`
                  ) : (
                    "Login to Pay"
                  )}
                </button>
              </div>

              {/* Secure Booking Details */}
              <div className={`${isSummaryExpanded ? "block" : "hidden lg:block"} pt-3 border-t border-gray-100 space-y-1.5`}>
                <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-wide">
                  <Lock size={11} className="text-[#FE5300] shrink-0" />
                  <span>Secure 256-bit SSL Gateway</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-[10px] font-bold uppercase tracking-wide">
                  <Shield size={11} className="text-[#FE5300] shrink-0" />
                  <span>Verified Safe Booking checkout</span>
                </div>
              </div>

            </div>
          </div>

          {/* Customer Assistance Card */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-4 flex items-start gap-3 hover:shadow-[0_10px_35px_rgb(0,0,0,0.035)] transition-all">
            <div className="w-8.5 h-8.5 rounded-xl bg-orange-50 border border-orange-100/60 flex items-center justify-center shrink-0">
              <AlertCircle size={16} className="text-[#FE5300]" />
            </div>
            <div>
              <h4 className="font-extrabold text-[11px] text-gray-900 uppercase tracking-wider mb-0.5">Need Assistance?</h4>
              <p className="text-[10px] text-gray-500 leading-normal font-semibold">Have questions about scans or fees? Connect with our visa experts.</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 pt-1.5 border-t border-gray-50">
                <a href="mailto:care@musafirbaba.com" className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-[#FE5300] font-bold transition-colors select-none">
                  <Mail size={10} /> care@musafirbaba.com
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Multi-step Application Form (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-gray-150 rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] w-full">
          
          <div className="mb-3">
            <h2 className="text-lg font-black text-gray-950 tracking-tight leading-none">
              {step === 1 ? "Traveller Information" : step === 2 ? "Upload Scanned Documents" : "Review Your Application"}
            </h2>
            <p className="text-[11px] text-gray-500 font-semibold mt-1 leading-normal">
              {step === 1 ? "Provide traveler identity details as printed on the official passport page." : step === 2 ? "Attach clear scan copies matching the required checklist for active travellers." : "Double check and verify all applicant details before initiating payment."}
            </p>
          </div>

          <div className="border-t border-gray-100 my-3" />

          {/* Form Step Contents */}
          <div className="space-y-6">
            
            {step === 1 && (
              <>
                {/* Dynamic Compact Traveller Tabs Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Select Traveller Slot</label>
                  
                  {/* Horizontally scrollable switcher to prevent wrapping or breaking grid */}
                  <div className="flex flex-row overflow-x-auto pb-2 gap-2 scrollbar-none snap-x -mx-1 px-1">
                    {travellers.map((traveller, index) => {
                      const isSelected = activeTravellerId === traveller.id;
                      const isValid = !!(traveller.firstName.trim() && traveller.lastName.trim() && traveller.dob);
                      return (
                        <button
                          key={traveller.id}
                          type="button"
                          onClick={() => setActiveTravellerId(traveller.id)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-2 cursor-pointer select-none active:scale-97 shrink-0 snap-align-start
                            ${isSelected 
                              ? "bg-[#FE5300]/10 border-[#FE5300] text-[#FE5300] shadow-xs" 
                              : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700"}
                          `}
                        >
                          <UserIcon size={13} className={isSelected ? "text-[#FE5300]" : "text-gray-400"} />
                          <span>
                            {traveller.firstName ? `${traveller.firstName} ${traveller.lastName}`.trim() : `Traveller ${index + 1}`}
                          </span>
                          {isValid ? (
                            <CheckCircle size={11} className="text-green-500 shrink-0" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}

                    {/* Add Passenger Button */}
                    <button 
                      type="button"
                      onClick={addTraveller}
                      className="px-4 py-2.5 rounded-xl text-xs font-extrabold border border-dashed border-gray-300 text-gray-500 hover:border-[#FE5300] hover:text-[#FE5300] transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Plus size={13} /> Add Traveller
                    </button>
                  </div>
                </div>

                {/* Single Active Traveller Inputs Section */}
                {activeTraveller && (
                  <div className="space-y-4 mt-2">
                    <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-gray-100">
                      <h3 className="font-black text-xs text-gray-900 tracking-tight uppercase">
                        Traveller {activeTravellerIndex !== -1 ? activeTravellerIndex + 1 : 1} Personal Info
                      </h3>
                      {travellers.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => removeTraveller(activeTraveller.id)} 
                          className="text-red-500 hover:text-red-600 p-0.5 text-[10px] font-extrabold flex items-center gap-1 transition-colors hover:bg-red-50 px-2 py-0.5 rounded-lg border border-transparent hover:border-red-100 cursor-pointer select-none"
                        >
                          <Trash2 size={11} /> Remove Slot
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-700 tracking-wide block">First Name <span className="text-[#FE5300]">*</span></label>
                        <input 
                          className={inputStyles}
                          value={activeTraveller.firstName}
                          onChange={(e) => updateTraveller(activeTraveller.id, "firstName", e.target.value)}
                          placeholder="As printed on passport" 
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-700 tracking-wide block">Last Name <span className="text-[#FE5300]">*</span></label>
                        <input 
                          className={inputStyles}
                          value={activeTraveller.lastName}
                          onChange={(e) => updateTraveller(activeTraveller.id, "lastName", e.target.value)}
                          placeholder="As printed on passport" 
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-700 tracking-wide block">Date of Birth <span className="text-[#FE5300]">*</span></label>
                        <input 
                          type="date"
                          className={inputStyles}
                          value={activeTraveller.dob}
                          onChange={(e) => updateTraveller(activeTraveller.id, "dob", e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-700 tracking-wide block">Gender <span className="text-[#FE5300]">*</span></label>
                        <select 
                          className={inputStyles}
                          value={activeTraveller.gender}
                          onChange={(e) => updateTraveller(activeTraveller.id, "gender", e.target.value)}
                          required
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Information Section */}
                <div className="space-y-3 mt-6 pt-5 border-t border-gray-100">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100">
                    <Mail size={13} className="text-[#FE5300]" />
                    <h4 className="font-black text-xs text-gray-900 tracking-tight uppercase">Booking Contact Info</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 tracking-wide block">Email Address <span className="text-[#FE5300]">*</span></label>
                      <input 
                        type="email"
                        className={inputStyles}
                        value={contactInfo.email}
                        onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="you@example.com" 
                        required
                      />
                      <p className="text-[9px] text-gray-400 font-semibold leading-none">Official e-visa copy will be dispatched here.</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 tracking-wide block">Phone Number <span className="text-[#FE5300]">*</span></label>
                      <input 
                        type="tel"
                        className={inputStyles}
                        value={contactInfo.phone}
                        onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="10-digit mobile number" 
                        required
                      />
                      <p className="text-[9px] text-gray-400 font-semibold leading-none">Real-time status updates via SMS notification.</p>
                    </div>
                  </div>
                </div>

                {/* Advance triggers */}
                <div className="pt-4">
                  <button 
                    onClick={() => saveProgress(2)} 
                    disabled={!isStep1Valid}
                    className={primaryButtonStyles}
                  >
                    Proceed to Documents <ChevronRight size={15} className="ml-1" />
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                {/* Dynamic Compact Traveller Tabs Selector for Step 2 */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Select Traveller Scans</label>
                  
                  <div className="flex flex-row overflow-x-auto pb-2 gap-2 scrollbar-none snap-x -mx-1 px-1">
                    {travellers.map((traveller, index) => {
                      const isSelected = activeTravellerId === traveller.id;
                      const allDocsUploadedForTraveller = requiredDocs.every((doc) => documents[`${traveller.id}_${doc}`]);
                      return (
                        <button
                          key={traveller.id}
                          type="button"
                          onClick={() => setActiveTravellerId(traveller.id)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-2 cursor-pointer select-none active:scale-97 shrink-0 snap-align-start
                            ${isSelected 
                              ? "bg-[#FE5300]/10 border-[#FE5300] text-[#FE5300] shadow-xs" 
                              : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700"}
                          `}
                        >
                          <UserIcon size={13} className={isSelected ? "text-[#FE5300]" : "text-gray-400"} />
                          <span>
                            {traveller.firstName ? `${traveller.firstName} ${traveller.lastName}`.trim() : `Traveller ${index + 1}`}
                          </span>
                          {allDocsUploadedForTraveller ? (
                            <CheckCircle size={11} className="text-green-500 shrink-0" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Single Active Traveller Documents Scanner Section */}
                {activeTraveller && (
                  <div className="space-y-4 mt-2">
                    <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-gray-100">
                      <div>
                        <h2 className="text-xs font-black text-gray-900 leading-none uppercase">
                          {activeTraveller.firstName ? `${activeTraveller.firstName} ${activeTraveller.lastName}` : `Traveller ${activeTravellerIndex !== -1 ? activeTravellerIndex + 1 : 1}`}
                        </h2>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-1">Scanned Documents Checklist</p>
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-400 font-semibold mb-3 bg-gray-50 px-3 py-2 rounded-xl border border-gray-150 leading-relaxed">
                      💡 <strong>Tip:</strong> Upload clear scanned copies (PDF, JPEG, or PNG, max 5MB) for active travellers.
                    </p>
                    
                    <div className="space-y-2">
                      {requiredDocs.map((doc) => {
                        const uploadKey = `${activeTraveller.id}_${doc}`;
                        const isUploaded = !!documents[uploadKey];
                        return (
                          <div key={doc} className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${isUploaded ? "border-green-150 bg-green-50/20" : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"}`}>
                            <div className="flex items-center gap-2.5">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isUploaded ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-400"}`}>
                                {isUploaded ? <CheckCircle size={11} className="stroke-[2.5]" /> : <FileText size={10} />}
                              </div>
                              <p className="font-bold text-[11px] text-gray-800 flex items-center gap-1.5">
                                {doc} <span className="text-[#FE5300] font-black">*</span>
                              </p>
                            </div>
                            <div className="relative shrink-0">
                              <input 
                                type="file" 
                                className="hidden" 
                                id={`upload-${uploadKey}`}
                                onChange={(e) => e.target.files?.[0] && handleFileUpload(doc, e.target.files[0], activeTraveller.id)}
                                disabled={!!uploading}
                              />
                              <label 
                                htmlFor={`upload-${uploadKey}`}
                                className={`px-3 py-1.5 rounded-lg justify-center text-[10px] font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${isUploaded ? "bg-green-50 hover:bg-green-100 text-green-700 border border-green-200" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"}`}
                              >
                                {uploading === uploadKey ? <Loader2 className="animate-spin" size={11} /> : isUploaded ? "Change" : "Upload"}
                                {!uploading && !isUploaded && <Upload size={10} />}
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Back and Advance Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-4">
                  <button onClick={() => saveProgress(1)} className={`w-full sm:w-1/3 ${secondaryButtonStyles}`}>
                    Back
                  </button>
                  <button 
                    onClick={() => saveProgress(3)} 
                    disabled={!allDocumentsUploaded}
                    className={`w-full sm:w-2/3 ${primaryButtonStyles}`}
                  >
                    Proceed to Review <ChevronRight size={15} className="ml-1" />
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-4 mt-2">
                  <div className="flex items-center gap-2 mb-3 pb-1.5 border-b border-gray-100">
                    <ShieldCheck className="text-[#FE5300] w-5 h-5 shrink-0" />
                    <h2 className="text-xs font-black text-gray-900 uppercase tracking-wider">Application Summary Review</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs mb-4">
                    <div className="bg-orange-50/40 p-3 rounded-xl border border-orange-100/50">
                      <p className="text-gray-400 font-bold uppercase tracking-wider text-[8px] mb-1">Destination Country</p>
                      <p className="font-extrabold text-gray-900 text-xs">{visa.title}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-150">
                       <p className="text-gray-400 font-bold uppercase tracking-wider text-[8px] mb-1">Contact Information</p>
                       <p className="font-extrabold text-gray-900 text-xs">{contactInfo.email || user?.email || "Pending"}</p>
                       <p className="font-extrabold text-gray-900 text-xs mt-0.5">{contactInfo.phone || user?.phone || "Pending"}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                     <p className="text-gray-800 mb-2 font-black text-xs uppercase tracking-wider">Applicant Slots ({travellers.length})</p>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                       {travellers.map((t, idx) => (
                         <div key={t.id} className="bg-gray-50/50 px-3 py-2 rounded-xl border border-gray-150 text-xs flex justify-between items-center hover:border-gray-250 transition-colors">
                           <div className="flex items-center gap-2">
                             <UserIcon size={12} className="text-gray-400" />
                             <span className="font-extrabold text-gray-900">{t.firstName} {t.lastName}</span>
                           </div>
                           <span className="text-gray-400 font-bold text-[8px] uppercase tracking-wider bg-white px-2 py-0.5 rounded-md border border-gray-150">{t.gender}</span>
                         </div>
                       ))}
                     </div>
                  </div>

                  <div className="border-t border-dashed border-gray-200 pt-4 mt-3">
                    <div className="flex justify-between items-center bg-gray-50 p-3.5 rounded-2xl border border-gray-150">
                      <div>
                        <p className="font-extrabold text-xs text-gray-800">Total Payable Amount</p>
                        <p className="text-[9px] text-gray-400 font-semibold mt-0.5">₹{singleCost} x {travellers.length} applicants</p>
                      </div>
                      <span className="text-xl font-black text-[#FE5300] tracking-tight">₹{totalCost}</span>
                    </div>
                  </div>
                </div>

                {/* Back and Desktop payment Trigger */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6">
                  <button onClick={() => saveProgress(2)} className={`w-full sm:w-1/3 ${secondaryButtonStyles}`}>
                    Modify Details
                  </button>
                  <button 
                    onClick={handleProceedToPayment}
                    disabled={isSubmitting}
                    className={`w-full sm:w-2/3 ${primaryButtonStyles}`}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Lock size={15} />}
                    {isAuthenticated ? `Pay ₹${totalCost}` : "Login & Submit Application"}
                  </button>
                </div>
              </>
            )}

          </div>

        </div>

      </div>

      {/* Mobile Sticky Bottom CTA Checkout Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-150 px-5 py-4 z-40 flex items-center justify-between shadow-[0_-10px_35px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total ({travellers.length} Pax)</span>
          <span className="text-xl font-black text-[#FE5300]">₹{totalCost}</span>
        </div>
        <div className="w-[180px]">
          {step === 1 ? (
            <button 
              onClick={() => saveProgress(2)}
              disabled={!isStep1Valid}
              className="w-full bg-[#FE5300] hover:bg-[#e44a00] text-white py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              Continue <ChevronRight size={14} />
            </button>
          ) : step === 2 ? (
            <button 
              onClick={() => saveProgress(3)}
              disabled={!allDocumentsUploaded}
              className="w-full bg-[#FE5300] hover:bg-[#e44a00] text-white py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              Continue <ChevronRight size={14} />
            </button>
          ) : (
            <button 
              onClick={handleProceedToPayment}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-[#FE5300] to-[#FF7A00] text-white py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Lock size={12} />}
              {isAuthenticated ? "Pay Now" : "Login to Pay"}
            </button>
          )}
        </div>
      </div>

      {/* Hidden PayU Form elements */}
      <form
        action="https://secure.payu.in/_payment"
        method="post"
        className="hidden"
        ref={formRef}
      >
        <input type="hidden" name="key" value={paymentData.key} />
        <input type="hidden" name="txnid" value={paymentData.txnid} />
        <input type="hidden" name="productinfo" value={paymentData.productinfo} />
        <input type="hidden" name="amount" value={paymentData.amount} />
        <input type="hidden" name="email" value={paymentData.email} />
        <input type="hidden" name="firstname" value={paymentData.firstname} />
        <input type="hidden" name="lastname" value={paymentData.lastname} />
        <input type="hidden" name="surl" value={paymentData.surl} />
        <input type="hidden" name="furl" value={paymentData.furl} />
        <input type="hidden" name="phone" value={paymentData.phone} />
        <input type="hidden" name="hash" value={paymentData.hash} />
        <input type="hidden" name="udf1" value={paymentData.udf1} />
        <input
          type="hidden"
          name="service_provider"
          value={paymentData.service_provider}
        />
      </form>
    </div>
  );
}
