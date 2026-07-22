"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProfileCompletionTabs from "@/components/partner/ProfileCompletionTabs";

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Basic frontend check for token to prevent immediate unauthenticated access
    // Proper middleware should be implemented for robust protection in the future
    const token = localStorage.getItem("partner_token");
    if (!token) {
      router.push("/partner/login");
    } else {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-white w-full">
      {/* Full-width Header Section */}
      <div className="w-full border-b border-slate-200/60 bg-white sticky top-0 z-10">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <span className="text-[#FE5300]">Partner</span> Dashboard
            </h2>
            <p className="text-sm text-slate-500 mt-2 font-medium">Manage your fleet, bank settlements, and identity verification.</p>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem("partner_token");
              router.push("/partner/login");
            }}
            className="mt-4 md:mt-0 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:text-red-600 transition-all text-sm font-bold shadow-sm flex items-center gap-2 group"
          >
            Logout
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="w-full bg-slate-50 border-t border-slate-200/50">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12">
          <div className="w-full max-w-7xl mx-auto">
            <ProfileCompletionTabs />
          </div>
        </div>
      </div>
    </div>
  );
}
