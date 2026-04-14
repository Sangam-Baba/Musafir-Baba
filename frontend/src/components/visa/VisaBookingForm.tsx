"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Upload, CheckCircle, FileText, Loader2, ChevronRight, 
  ChevronLeft, CreditCard, User as UserIcon, Plus, Trash2, Calendar, ShieldCheck
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
}

interface Traveller {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
}

export default function VisaBookingForm({ visa, applicationId: initialApplicationId }: VisaBookingFormProps) {
  const [applicationId, setApplicationId] = useState<string | undefined>(initialApplicationId);
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, UploadedFile>>({});
  
  const [travellers, setTravellers] = useState<Traveller[]>([
    { id: Date.now().toString(), firstName: "", lastName: "", dob: "", gender: "Male" }
  ]);
  const [contactInfo, setContactInfo] = useState({ phone: "", email: "" });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string>("Pending");

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
        docsMap[d.name] = d.media;
      });
      setDocuments(docsMap);
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

  const handleFileUpload = async (docName: string, file: File) => {
    setUploading(docName);
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
        [docName]: {
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
    setTravellers([...travellers, { id: Date.now().toString(), firstName: "", lastName: "", dob: "", gender: "Male" }]);
  };

  const removeTraveller = (id: string) => {
    if (travellers.length > 1) {
      setTravellers(travellers.filter(t => t.id !== id));
    }
  };

  const updateTraveller = (id: string, field: keyof Traveller, value: string) => {
    setTravellers(travellers.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const isStep1Valid = travellers.every(t => t.firstName && t.lastName && t.dob && t.gender);

  const requiredDocs = Array.from(new Set(["Passport", "Photo", ...(visa.necessaryDocuments || [])]));
  const allDocumentsUploaded = requiredDocs.every((doc) => documents[doc]);
  
  const totalCost = visa.cost * travellers.length;

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
          email: contactInfo.email,
          phone: contactInfo.phone,
          currentStep: nextStep,
          documents: Object.entries(documents).map(([name, data]) => ({
            name,
            media: data,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to save progress");
      const result = await res.json();
      const newAppId = result.data._id;
      
      if (!applicationId) setApplicationId(newAppId);
      
      if (requireLogin) {
        toast.info("Please login to complete your application");
        router.push(`/auth/login?redirect=/visa/${visa.slug}/apply?applicationId=${newAppId}`);
        return;
      }
      
      setStep(nextStep);
    } catch (error) {
      toast.error("Failed to save progress");
    }
  };

  const handleProceedToPayment = async () => {
    if (!isAuthenticated) {
      await saveProgress(3, true);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const submitRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa-application/submit/${applicationId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!submitRes.ok) throw new Error("Failed to finalize application");

      const paymentInitRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/payment`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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

  const inputStyles = "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#FE5300] focus-visible:border-[#FE5300]";
  const cardStyles = "bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-sm";
  const primaryButtonStyles = "w-full bg-[#FE5300] hover:bg-orange-600 h-10 sm:h-12 rounded-lg text-sm sm:text-base font-semibold text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const secondaryButtonStyles = "h-10 sm:h-12 px-6 rounded-lg font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center justify-center transition-colors";

  return (
    <div className="w-full max-w-2xl mx-auto py-6 sm:py-8">
      {/* Compact Step Indicator */}
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        {[
          { num: 1, label: "Travellers" },
          { num: 2, label: "Documents" },
          { num: 3, label: "Payment" }
        ].map((s, i) => {
          const isActive = step >= s.num;
          return (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
                    ${isActive ? "bg-[#FE5300] text-white" : "bg-gray-100 text-gray-400"}
                `}>
                  {step > s.num ? <CheckCircle size={16} /> : s.num}
                </div>
                <span className={`text-[10px] sm:text-xs font-semibold ${isActive ? "text-gray-900" : "text-gray-400"}`}>{s.label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-[2px] mx-2 sm:mx-4 ${step > s.num ? 'bg-[#FE5300]' : 'bg-gray-100'}`}></div>}
            </React.Fragment>
          );
        })}
      </div>

      <div className="space-y-4">
        {step === 1 && (
          <>
            <div className={cardStyles}>
              <h2 className="text-base font-bold mb-3 text-gray-900 border-b border-gray-100 pb-2">Primary Contact <span className="text-gray-400 font-normal text-xs ml-1">(Optional)</span></h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Email Address</label>
                  <input 
                    type="email"
                    className={inputStyles}
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="john@example.com" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Phone Number</label>
                  <input 
                    className={inputStyles}
                    value={contactInfo.phone}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 98765 43210" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {travellers.map((traveller, index) => (
                <div key={traveller.id} className={cardStyles}>
                  <div className="flex justify-between items-center mb-3">
                     <h3 className="font-bold text-sm text-gray-900">Traveller {index + 1}</h3>
                     {travellers.length > 1 && (
                       <button onClick={() => removeTraveller(traveller.id)} className="text-red-600 hover:text-red-700 p-1 text-xs font-medium flex items-center gap-1">
                         <Trash2 size={12} /> Remove
                       </button>
                     )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">First Name</label>
                      <input 
                        className={inputStyles}
                        value={traveller.firstName}
                        onChange={(e) => updateTraveller(traveller.id, "firstName", e.target.value)}
                        placeholder="As per passport" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Last Name</label>
                      <input 
                        className={inputStyles}
                        value={traveller.lastName}
                        onChange={(e) => updateTraveller(traveller.id, "lastName", e.target.value)}
                        placeholder="As per passport" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 flex items-center gap-1"><Calendar size={12}/> Date of Birth</label>
                      <input 
                        type="date"
                        className={inputStyles}
                        value={traveller.dob}
                        onChange={(e) => updateTraveller(traveller.id, "dob", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Gender</label>
                      <select 
                        className={inputStyles}
                        value={traveller.gender}
                        onChange={(e) => updateTraveller(traveller.id, "gender", e.target.value)}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button 
              variant="outline" 
              onClick={addTraveller}
              className="w-full bg-white border border-dashed border-gray-300 py-6 rounded-xl text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-[#FE5300] hover:text-[#FE5300] transition-colors"
            >
              <Plus size={16} className="mr-1.5" /> Add Traveller
            </Button>

            <div className="pt-2">
              <button 
                onClick={() => saveProgress(2)} 
                disabled={!isStep1Valid}
                className={primaryButtonStyles}
              >
                Proceed Setup <ChevronRight size={18} className="ml-1" />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
           <>
            <div className={cardStyles}>
              <h2 className="text-base font-bold mb-1 text-gray-900">Upload Documents</h2>
              <p className="text-xs text-gray-500 mb-4">Provide clear, colored scanned copies.</p>
              
              <div className="space-y-3">
                {requiredDocs.map((doc) => (
                  <div key={doc} className="p-3 sm:p-4 rounded-lg border border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                        {doc}
                        {documents[doc] && <ShieldCheck size={14} className="text-green-600" />}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Required</p>
                    </div>
                    <div className="relative shrink-0">
                      <input 
                        type="file" 
                        className="hidden" 
                        id={`upload-${doc}`}
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(doc, e.target.files[0])}
                        disabled={!!uploading}
                      />
                      <label 
                        htmlFor={`upload-${doc}`}
                        className={`w-full sm:w-auto px-4 py-2 rounded-md justify-center text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${documents[doc] ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                      >
                        {uploading === doc ? <Loader2 className="animate-spin" size={14} /> : documents[doc] ? "Change" : "Browse"}
                        {!uploading && !documents[doc] && <Upload size={14} />}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button onClick={() => saveProgress(1)} className={`sm:w-1/3 ${secondaryButtonStyles}`}>
                Back
              </button>
              <button 
                onClick={() => saveProgress(3)} 
                disabled={!allDocumentsUploaded}
                className={`sm:w-2/3 ${primaryButtonStyles}`}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className={cardStyles}>
              <h2 className="text-base font-bold mb-3 border-b border-gray-100 pb-2 text-gray-900">Summary</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm mb-4">
                <div className="bg-orange-50/50 p-3 rounded-lg border border-orange-100/50">
                  <p className="text-gray-500 mb-0.5">Destination</p>
                  <p className="font-bold text-gray-900 text-sm">{visa.title}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                   <p className="text-gray-500 mb-0.5">Contact</p>
                   <p className="font-semibold text-gray-900">{contactInfo.email || user?.email || "Pending Login"}</p>
                   <p className="font-semibold text-gray-900">{contactInfo.phone || user?.phone || "To be provided"}</p>
                </div>
              </div>

              <div className="mb-4">
                 <p className="text-gray-900 mb-2 font-bold text-sm">Travellers ({travellers.length})</p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                   {travellers.map((t, idx) => (
                     <div key={t.id} className="bg-gray-50 px-3 py-2 rounded-md border border-gray-100 text-xs flex justify-between items-center">
                       <span className="font-semibold text-gray-800">{t.firstName} {t.lastName}</span>
                       <span className="text-gray-500">{t.gender}</span>
                     </div>
                   ))}
                 </div>
              </div>

              <div className="border-t border-gray-100 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Total Payable</p>
                    <p className="text-xs text-gray-500">₹{visa.cost} x {travellers.length} applicants</p>
                  </div>
                  <span className="text-2xl font-bold text-[#FE5300]">₹{totalCost}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button onClick={() => saveProgress(2)} className={`sm:w-1/3 ${secondaryButtonStyles}`}>
                Modify
              </button>
              <button 
                onClick={handleProceedToPayment} 
                disabled={isSubmitting}
                className={`sm:w-2/3 ${primaryButtonStyles}`}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin mr-2" size={18} />
                ) : !isAuthenticated && (
                  <UserIcon className="mr-2" size={18} />
                )}
                {isAuthenticated ? `Pay ₹${totalCost}` : 'Login to Pay'}
              </button>
            </div>
          </>
        )}
      </div>

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
