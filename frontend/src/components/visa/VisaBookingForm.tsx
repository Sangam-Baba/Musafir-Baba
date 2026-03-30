"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, CheckCircle, FileText, Loader2, ChevronRight, ChevronLeft, CreditCard, User as UserIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";

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

export default function VisaBookingForm({ visa, applicationId: initialApplicationId }: VisaBookingFormProps) {
  const [applicationId, setApplicationId] = useState<string | undefined>(initialApplicationId);
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, UploadedFile>>({});
  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
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

  // Fetch user profile for pre-filling
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

  // Fetch existing application if applicationId is provided
  const { data: existingAppData } = useQuery({
    queryKey: ["visa-application", applicationId],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa-application/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    enabled: !!applicationId && !!token,
  });

  useEffect(() => {
    if (existingAppData?.success) {
      const app = existingAppData.data;
      setPersonalInfo({
        firstName: app.firstName || "",
        lastName: app.lastName || "",
        phone: app.phone || "",
      });
      setApplicationStatus(app.status);
      setStep(app.currentStep || 1);
      
      const docsMap: Record<string, UploadedFile> = {};
      app.documents.forEach((d: any) => {
        docsMap[d.name] = d.media;
      });
      setDocuments(docsMap);
    }
  }, [existingAppData]);

  // Pre-fill from profile
  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/visa/${visa.slug}/apply${applicationId ? `?applicationId=${applicationId}` : ""}`);
    } else if (user && !applicationId) {
      setPersonalInfo({
        firstName: user.name?.split(" ")[0] || "",
        lastName: user.name?.split(" ").slice(1).join(" ") || "",
        phone: user.phone || "",
      });
    }
  }, [isAuthenticated, router, visa.slug, user, applicationId]);

  const handleFileUpload = async (docName: string, file: File) => {
    setUploading(docName);
    try {
      const presignRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/upload/cloudflare-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
      toast.success(`${docName} uploaded successfully`);
    } catch (error) {
      toast.error(`Failed to upload ${docName}`);
    } finally {
      setUploading(null);
    }
  };

  const requiredDocs = Array.from(new Set(["Passport", "Photo", ...(visa.necessaryDocuments || [])]));
  const allDocumentsUploaded = requiredDocs.every((doc) => documents[doc]);

  const saveProgress = async (nextStep: number) => {
    try {
      const url = applicationId 
        ? `${process.env.NEXT_PUBLIC_BASE_URL}/visa-application/submit/${applicationId}`
        : `${process.env.NEXT_PUBLIC_BASE_URL}/visa-application`;
        
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          visaId: visa._id,
          ...personalInfo,
          currentStep: nextStep,
          documents: Object.entries(documents).map(([name, data]) => ({
            name,
            media: data,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to save progress");
      const result = await res.json();
      if (!applicationId) setApplicationId(result.data._id);
      setStep(nextStep);
    } catch (error) {
      toast.error("Failed to save progress");
    }
  };

  const handleSubmitApplication = async () => {
    setIsSubmitting(true);
    try {
      // 1. Ensure application is finalized in DB
      const submitRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa-application/submit/${applicationId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...personalInfo,
          currentStep: 3,
          documents: Object.entries(documents).map(([name, data]) => ({
            name,
            media: data,
          })),
        }),
      });

      if (!submitRes.ok) throw new Error("Failed to finalize application");

      // 2. Initiate Payment
      const paymentInitRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/payment`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            txnid: "txn" + Date.now(),
            amount: Number(visa.cost).toFixed(2),
            productinfo: visa._id,
            firstname: user?.name || "Guest",
            email: user?.email || "abhi@example.com",
            phone: user?.phone?.replace(/\D/g, "").slice(-10) || "9876543210",
            udf1: applicationId,
            surl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/success-visa`,
            furl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/failure-visa`,
        })
      });

      if (!paymentInitRes.ok) throw new Error("Payment init failed");
      const { paymentData: resPaymentData } = await paymentInitRes.json();

      setPaymentData({
        ...resPaymentData,
        lastname: "" // Match rental's empty lastname
      });

      setTimeout(() => {
        formRef.current?.submit();
      }, 1000);

    } catch (error) {
      toast.error("Application/Payment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= s ? "bg-[#FE5300] text-white" : "bg-gray-200 text-gray-500"}`}>
                {step > s ? <CheckCircle size={20} /> : s}
              </div>
              <span className={`text-xs font-medium ${step >= s ? "text-[#FE5300]" : "text-gray-400"}`}>
                {s === 1 ? "Documents" : s === 2 ? "Personal Info" : "Payment"}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-[#FE5300]" 
            initial={{ width: "33%" }}
            animate={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FileText className="text-[#FE5300]" /> Upload Documents
              </h2>
              <p className="text-sm text-gray-500 mb-6 font-medium">Please upload clear scanned copies of the required documents.</p>
              
              <div className="space-y-4">
                {requiredDocs.map((doc) => (
                  <div key={doc} className="p-4 rounded-xl border-2 border-dashed border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-700">{doc}</p>
                      {documents[doc] && (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                          <CheckCircle size={12} /> Uploaded
                        </p>
                      )}
                    </div>
                    <div className="relative">
                      <input 
                        type="file" 
                        className="hidden" 
                        id={`upload-${doc}`}
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(doc, e.target.files[0])}
                        disabled={!!uploading}
                      />
                      <label 
                        htmlFor={`upload-${doc}`}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${documents[doc] ? "bg-green-50 text-green-600" : "bg-white border text-gray-700 hover:border-[#FE5300] hover:text-[#FE5300]"}`}
                      >
                        {uploading === doc ? <Loader2 className="animate-spin" size={16} /> : documents[doc] ? "Change" : "Upload"}
                        {!uploading && <Upload size={16} />}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <Button 
                onClick={() => saveProgress(2)} 
                disabled={!allDocumentsUploaded}
                className="w-full bg-[#FE5300] hover:bg-[#e44a00] py-6 rounded-xl text-lg font-bold transition-all shadow-md group"
            >
              Continue to Personal Info <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <UserIcon className="text-[#FE5300]" /> Personal Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600">First Name</label>
                  <Input 
                    value={personalInfo.firstName}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-600">Last Name</label>
                  <Input 
                    value={personalInfo.lastName}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe" 
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-600">Phone Number</label>
                  <Input 
                    value={personalInfo.phone}
                    onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+91 XXXXX XXXXX" 
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="ghost" onClick={() => setStep(1)} className="py-6 rounded-xl font-bold">
                <ChevronLeft className="mr-2" /> Back
              </Button>
              <Button 
                onClick={() => saveProgress(3)} 
                disabled={!personalInfo.firstName || !personalInfo.lastName || !personalInfo.phone}
                className="flex-1 bg-[#FE5300] hover:bg-[#e44a00] py-6 rounded-xl text-lg font-bold transition-all shadow-md group"
              >
                Review & Pay <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 space-y-6">
              <h2 className="text-xl font-bold border-b pb-4">Application Review</h2>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 mb-1">Applicant</p>
                  <p className="font-bold">{personalInfo.firstName} {personalInfo.lastName}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-1">Visa</p>
                  <p className="font-bold">{visa.title} ({visa.country})</p>
                </div>
              </div>

              <div>
                <p className="text-gray-500 mb-2 text-sm font-medium">Uploaded Documents</p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(documents).map(doc => (
                    <span key={doc} className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-100">
                      {doc}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex justify-between items-center">
                <span className="font-bold text-gray-600">Total Fee</span>
                <span className="text-2xl font-extrabold text-[#FE5300]">₹{visa.cost}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <Button variant="ghost" onClick={() => setStep(2)} className="py-6 rounded-xl font-bold">
                <ChevronLeft className="mr-2" /> Back
              </Button>
              <Button 
                onClick={handleSubmitApplication} 
                disabled={isSubmitting}
                className="flex-1 bg-black hover:bg-gray-800 text-white py-6 rounded-xl text-lg font-bold transition-all shadow-md group"
              >
                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CreditCard className="mr-2" />}
                Pay ₹{visa.cost} & Apply
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
