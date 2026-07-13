"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProfileCompletionTabs from "../../../components/partner/ProfileCompletionTabs";

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Basic frontend check for token to prevent immediate unauthenticated access
    // Proper middleware should be implemented for robust protection in the future
    const token = localStorage.getItem("partner_token");
    if (!token) {
      router.push("/partner-login");
    } else {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;
  }

  return (
    <div className="w-full max-w-4xl bg-white p-8 rounded-xl shadow-lg border border-slate-100 mt-10 mx-auto">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Partner Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">Welcome to the MusafirBaba Fleet Management Portal.</p>
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem("partner_token");
            router.push("/partner-login");
          }}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          Logout
        </button>
      </div>

      <ProfileCompletionTabs />
    </div>
  );
}
