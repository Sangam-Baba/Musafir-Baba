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
    <div 
      className="min-h-screen w-full bg-cover bg-right bg-no-repeat bg-fixed flex flex-col"
      style={{ backgroundImage: "url('/partner/bgimage.avif')" }}
    >
      {/* Premium Full-width Header Section (Slim & High Visibility) */}
      <div className="w-full bg-white/95 backdrop-blur-2xl border-b border-slate-200/60 sticky top-0 z-10 shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-3 md:py-4 flex justify-between items-center">
          
          <div className="flex items-center gap-3 md:gap-6">
            <div className="flex items-center justify-center pr-3 md:pr-6 border-r border-slate-200 h-8 md:h-10">
              <img src="/partner/mbconnect.avif" alt="MB Connect Logo" className="h-6 md:h-8 w-auto object-contain drop-shadow-sm" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-1.5 md:gap-2 leading-none">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FE5300] to-[#ff7e3e]">Partner</span> Dashboard
              </h2>
              <p className="hidden md:block text-[11px] text-slate-500 mt-1.5 font-medium tracking-wide">Manage your fleet, bank settlements, and identity verification.</p>
            </div>
          </div>

          <button 
            onClick={() => {
              localStorage.removeItem("partner_token");
              router.push("/partner/login");
            }}
            className="px-4 py-1.5 md:px-6 md:py-2 bg-slate-900 text-white rounded-full hover:bg-[#FE5300] hover:shadow-[0_6px_15px_rgba(254,83,0,0.25)] transition-all duration-300 text-[10px] md:text-[11px] uppercase tracking-wider font-bold shadow-md flex items-center gap-1.5 md:gap-2 group shrink-0"
          >
            <span className="hidden sm:inline">Logout</span>
            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 sm:group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="w-full flex-1 bg-slate-50/95 border-t border-slate-200/50">
        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12 pb-24">
          <div className="w-full max-w-7xl mx-auto">
            <ProfileCompletionTabs />
          </div>
        </div>
      </div>
    </div>
  );
}
