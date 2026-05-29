"use client";

import React, { use } from "react";
import { useQuery } from "@tanstack/react-query";
import Hero from "@/components/custom/Hero";
import Breadcrumb from "@/components/common/Breadcrumb";
import VisaBookingForm from "@/components/visa/VisaBookingForm";
import { Loader } from "@/components/custom/loader";
import { notFound } from "next/navigation";

async function getVisaBySlug(slug: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa/slug/${slug}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data;
}

export default function VisaApplyPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ slug: string }>,
  searchParams: Promise<{ applicationId?: string; visaCardId?: string; validityIndex?: string; express?: string; travellers?: string }>
}) {
  const { slug } = use(params);
  const { applicationId, visaCardId, validityIndex, express, travellers } = use(searchParams);

  const { data: visa, isLoading, isError } = useQuery({
    queryKey: ["visa", slug],
    queryFn: () => getVisaBySlug(slug),
  });

  if (isLoading) return <Loader size="lg" message="Preparing application form..." />;
  if (isError || !visa) return notFound();

  // Find sub-visa card details if selected
  const selectedVisaCard = visa.visas?.find((v: any) => v._id === visaCardId);
  const isExpressSelected = express === "true";
  const parsedValidityIndex = Number(validityIndex) || 0;

  const currentEntry = selectedVisaCard?.validityEntries?.[parsedValidityIndex] || selectedVisaCard;

  const govFee = currentEntry 
    ? (isExpressSelected ? (currentEntry.expressGovernmentFee || 0) : (currentEntry.governmentFee || 0)) 
    : 0;
  const serviceCharge = currentEntry 
    ? (isExpressSelected ? (currentEntry.expressServiceCharges || 0) : (currentEntry.serviceCharges || 0)) 
    : 0;
  const gstPercentage = currentEntry?.gst || 0;
  const calculatedGst = Math.round((serviceCharge * gstPercentage) / 100);
  
  const travellersCount = Number(travellers) || 1;

  const displayCost = currentEntry 
    ? ((govFee + serviceCharge + calculatedGst) * travellersCount) 
    : (visa.cost * travellersCount);

  const displayDuration = currentEntry 
    ? (isExpressSelected ? (currentEntry.expressVisaDuration || currentEntry.processTime) : currentEntry.processTime)
    : `${visa.duration} Days`;

  const displayType = selectedVisaCard 
    ? `${selectedVisaCard.visaPurpose} (${selectedVisaCard.visaType})` 
    : visa.visaType;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pt-8">
        <Breadcrumb title="Apply" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <VisaBookingForm 
          visa={visa} 
          applicationId={applicationId} 
          defaultVisaCardId={visaCardId}
          defaultValidityIndex={parsedValidityIndex}
          defaultIsExpress={isExpressSelected}
          defaultTravellerCount={travellersCount}
        />
      </div>
    </main>
  );
}
