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
  searchParams: Promise<{ applicationId?: string }>
}) {
  const { slug } = use(params);
  const { applicationId } = use(searchParams);

  const { data: visa, isLoading, isError } = useQuery({
    queryKey: ["visa", slug],
    queryFn: () => getVisaBySlug(slug),
  });

  if (isLoading) return <Loader size="lg" message="Preparing application form..." />;
  if (isError || !visa) return notFound();

  return (
    <main className="min-h-screen bg-gray-50">
      <Hero
        image={visa.bannerImage?.url || visa.coverImage?.url}
        title={`Apply for ${visa.title}`}
        height="sm"
        description={`Fast and secure visa application for ${visa.country}`}
        overlayOpacity={60}
      />
      
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-8">
        <Breadcrumb title="Apply" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col lg:flex-row gap-10">
          <div className="flex-1">
             <VisaBookingForm visa={visa} applicationId={applicationId} />
          </div>
          
          <aside className="w-full lg:w-80 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-lg mb-4">Visa Details</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Destination</span>
                  <span className="font-bold">{visa.country}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Processing Time</span>
                  <span className="font-bold">{visa.duration} Days</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Visa Type</span>
                  <span className="font-bold">{visa.visaType}</span>
                </div>
                <div className="pt-4 border-t flex justify-between items-center">
                  <span className="font-bold">Total Fee</span>
                  <span className="text-xl font-extrabold text-[#FE5300]">₹{visa.cost}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-[#FE5300]/5 p-6 rounded-2xl border border-[#FE5300]/10">
                <h4 className="font-bold text-sm mb-2 text-[#FE5300]">Need Help?</h4>
                <p className="text-xs text-gray-600 mb-4">Assistance available 24/7 for your visa application.</p>
                <a href="tel:+919876543210" className="text-sm font-bold block">Call: +91 98765 43210</a>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
