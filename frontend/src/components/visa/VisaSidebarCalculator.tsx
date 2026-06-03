"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Check, Calendar, Clock, Globe, Zap, ArrowRight, ShieldCheck, HelpCircle, Users
} from "lucide-react";
import Link from "next/link";

interface ValidityEntry {
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

interface VisaCardData {
  _id: string;
  visaPurpose: string;
  visaType: string;
  isExpress: boolean;
  validityEntries?: ValidityEntry[];
  
  // Legacy fields
  governmentFee?: number;
  serviceCharges?: number;
  gst?: number;
  visaValidity?: string;
  visaDuration?: string;
  entryType?: string;
  processTime?: string;
  expressVisaDuration?: string;
  expressGovernmentFee?: number;
  expressServiceCharges?: number;
}

interface VisaSidebarCalculatorProps {
  visa: {
    _id: string;
    title: string;
    country: string;
    slug: string;
    cost: number;
    visas?: VisaCardData[];
  };
}

export default function VisaSidebarCalculator({ visa }: VisaSidebarCalculatorProps) {
  const visasList = visa.visas || [];
  
  // Default to the first visa card if available
  const [selectedVisaIndex, setSelectedVisaIndex] = useState<number>(0);
  const [selectedValidityIndex, setSelectedValidityIndex] = useState<number>(0);
  const [isExpress, setIsExpress] = useState<boolean>(false);
  const [travellers, setTravellers] = useState<number>(1);

  const selectedVisaCard = visasList[selectedVisaIndex] as VisaCardData | undefined;

  // Reset validity selection and express option when visa card changes
  useEffect(() => {
    setSelectedValidityIndex(0);
    if (selectedVisaCard && !selectedVisaCard.isExpress) {
      setIsExpress(false);
    }
  }, [selectedVisaIndex, selectedVisaCard]);

  // If no specific visas are configured, fall back to simple cost display
  if (!selectedVisaCard) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-6 border border-gray-100 flex flex-col gap-5">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 font-semibold">Visa Fee</span>
          <span className="text-3xl font-extrabold text-[#FE5300]">₹{visa.cost}</span>
        </div>
        <Link href={`/visa/${visa.slug}/apply`} className="w-full">
          <Button className="w-full bg-[#FE5300] hover:bg-[#e44a00] text-white py-6 rounded-xl text-lg font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
            Apply Now <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <ShieldCheck className="w-4 h-4 text-green-500" />
          <span>Secure & encrypted application process</span>
        </div>
      </div>
    );
  }

  const hasValidityEntries = selectedVisaCard.validityEntries && selectedVisaCard.validityEntries.length > 0;
  const currentEntry = hasValidityEntries 
    ? selectedVisaCard.validityEntries![selectedValidityIndex]
    : selectedVisaCard; // Fallback to legacy structure

  // Fees calculation
  const govFee = (isExpress 
    ? (currentEntry?.expressGovernmentFee || 0) 
    : (currentEntry?.governmentFee || 0)) * travellers;

  const serviceCharge = (isExpress 
    ? (currentEntry?.expressServiceCharges || 0) 
    : (currentEntry?.serviceCharges || 0)) * travellers;

  const gstPercentage = currentEntry?.gst || 0;
  const calculatedGst = Math.round((serviceCharge * gstPercentage) / 100);
  const totalCost = govFee + serviceCharge + calculatedGst;

  const processTime = isExpress 
    ? (currentEntry?.expressVisaDuration || currentEntry?.processTime) 
    : currentEntry?.processTime;

  return (
    <div className="space-y-4 flex flex-col">
      <style>{`
        @keyframes slide-gradient-infinite {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
        .animate-slide-gradient {
          background-size: 400% 100%;
          animation: slide-gradient-infinite 10s linear infinite;
        }
      `}</style>
      {/* Ribbon Badge */}
      <div 
        className="relative self-start inline-flex items-center gap-2 text-white pl-3 pr-[18px] py-1.5 w-max mb-[-4px] z-10 bg-[linear-gradient(90deg,#dc2626,#FE5300,#facc15,#FE5300,#dc2626)] animate-slide-gradient drop-shadow-md"
        style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)" }}
      >
        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
        <span className="font-bold text-xs tracking-wide">India&apos;s #1 Visa Agency</span>
      </div>

      {/* Dynamic Visa Calculator Card */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-gray-100/90 overflow-hidden relative z-0">

        <div className="p-4 space-y-3">
          {/* Interchange Select Option for Visa Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
              Choose Visa Type
            </label>
            <div className="relative">
              <select
                value={selectedVisaIndex}
                onChange={(e) => setSelectedVisaIndex(Number(e.target.value))}
                className="w-full bg-gray-50/50 hover:bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FE5300] focus:border-transparent transition-all cursor-pointer appearance-none"
              >
                {visasList.map((v, index) => (
                  <option key={v._id || index} value={index}>
                    {v.visaPurpose} ({v.visaType})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Validity Entries Dropdown (Only show if there are entries) */}
          {hasValidityEntries && selectedVisaCard.validityEntries!.length > 0 && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
                Choose Validity
              </label>
              <div className="relative">
                <select
                  value={selectedValidityIndex}
                  onChange={(e) => setSelectedValidityIndex(Number(e.target.value))}
                  className="w-full bg-gray-50/50 hover:bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FE5300] focus:border-transparent transition-all cursor-pointer appearance-none"
                >
                  {selectedVisaCard.validityEntries!.map((entry, index) => (
                    <option key={index} value={index}>
                      {entry.visaValidity || "N/A"} Validity / {entry.visaDuration || "N/A"} Stay ({entry.entryType || "Single"})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Traveller Count Selector */}
          <div className="bg-gray-50/60 px-2.5 py-1.5 rounded-xl border border-gray-100/80 flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-gray-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#FE5300] fill-current" /> Travellers
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTravellers(prev => Math.max(1, prev - 1))}
                className="w-5.5 h-5.5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 font-bold transition-all text-xs shadow-xs cursor-pointer select-none"
              >
                -
              </button>
              <span className="text-xs font-black text-gray-800 w-4 text-center">{travellers}</span>
              <button
                type="button"
                onClick={() => setTravellers(prev => prev + 1)}
                className="w-5.5 h-5.5 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 font-bold transition-all text-xs shadow-xs cursor-pointer select-none"
              >
                +
              </button>
            </div>
          </div>

          {/* Express/Standard Toggle */}
          {selectedVisaCard.isExpress && (
            <div className="bg-gray-50/60 px-2.5 py-1.5 rounded-xl border border-gray-100/80 flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-gray-700 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#FE5300] fill-current" /> Express Processing
              </span>
              <div className="flex bg-white p-0.5 rounded-full border border-gray-200/80 text-[10px] font-bold shrink-0 shadow-xs">
                <button
                  type="button"
                  onClick={() => setIsExpress(false)}
                  className={`px-2.5 py-1 rounded-full transition-all ${!isExpress ? "bg-[#FE5300] text-white shadow-xs" : "text-gray-400 hover:text-gray-700"}`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpress(true)}
                  className={`px-2.5 py-1 rounded-full transition-all ${isExpress ? "bg-[#FE5300] text-white shadow-xs" : "text-gray-400 hover:text-gray-700"}`}
                >
                  Express
                </button>
              </div>
            </div>
          )}

          {/* Specifications removed as requested */}

          {/* Pricing Breakdown */}
          <div className="space-y-3 pt-2">
            <div className="border-t border-dashed border-gray-200" />
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between items-center text-gray-500">
                <span>Government Fee {travellers > 1 ? `(x${travellers})` : ""}</span>
                <span className="font-bold text-gray-800">₹{govFee}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span>Service Charges {travellers > 1 ? `(x${travellers})` : ""}</span>
                <span className="font-bold text-gray-800">₹{serviceCharge}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span>GST ({gstPercentage}%) {travellers > 1 ? `(x${travellers})` : ""}</span>
                <span className="font-bold text-gray-800">₹{calculatedGst}</span>
              </div>
            </div>
            <div className="pt-3 border-t border-dashed border-gray-200 flex justify-between items-center text-sm">
              <span className="font-extrabold text-gray-900">Total Fee {travellers > 1 ? `(${travellers} Pax)` : ""}</span>
              <span className="text-2xl font-black text-[#FE5300]">₹{totalCost}</span>
            </div>
          </div>

          {/* Apply Button */}
          <Link 
            href={`/visa/${visa.slug}/apply?visaCardId=${selectedVisaCard._id}&validityIndex=${selectedValidityIndex}&express=${isExpress}&travellers=${travellers}`}
            className="block w-full pt-1"
          >
            <Button className="w-full bg-[#FE5300] hover:bg-[#e44a00] text-white py-4 rounded-xl text-base font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
              Apply Now <ArrowRight className="w-5 h-5 animate-pulse" />
            </Button>
          </Link>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
            <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
            <span>Secure & 100% encrypted processing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
