"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { format, parseISO, isAfter } from "date-fns";
import { useMemo } from "react";

interface Batch {
  _id: string;
  startDate: string;
  endDate: string;
  quad: number;
  triple?: number;
  double?: number;
  child?: number;
  quadDiscount?: number;
  tripleDiscount?: number;
  doubleDiscount?: number;
  childDiscount?: number;
}
interface Package {
  id: string;
  name: string;
  image: string;
  price: number;
  slug: string;
  duration: string; // e.g. "6N/7D"
  destination?: string; // e.g. "Leh - Leh"
  batch?: Batch[];
  url?: string;
}

function groupBatchesByMonth(batches: Batch[]) {
  const now = new Date();
  const upcoming = batches.filter(
    (b) =>
      isAfter(parseISO(b.startDate), now) ||
      format(parseISO(b.startDate), "yyyy-MM-dd") === format(now, "yyyy-MM-dd"),
  );
  return upcoming.reduce((acc: Record<string, Batch[]>, batch) => {
    const key = format(parseISO(batch.startDate), "MMM ''yy");
    if (!acc[key]) acc[key] = [];
    acc[key].push(batch);
    return acc;
  }, {});
}

export default function PackageCard({
  pkg,
  url,
  priority = false,
}: {
  pkg: Package;
  url: string;
  priority?: boolean;
}) {
  const batchesByMonth = useMemo(
    () => groupBatchesByMonth(pkg.batch ? pkg.batch : []),
    [pkg.batch],
  );

  const allDates = Object.values(batchesByMonth)
    .flat()
    .map((b) => format(parseISO(b.startDate), "dd MMM"));

  return (
    <Link href={url} className="min-w-[260px] sm:min-w-[280px] md:min-w-0 h-full block flex flex-col bg-white rounded-[16px] overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(254,83,0,0.12)] border border-slate-200/80 transition-all duration-300 group">
      {/* Image Header Area with dynamic hover zoom */}
      <div className="relative h-[170px] w-full overflow-hidden shrink-0">
        {pkg.image ? (
          <Image
            src={pkg.image}
            alt={pkg.name}
            fill
            priority={priority}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full bg-slate-100 flex items-center justify-center text-sm text-slate-400">
            No Image
          </div>
        )}
        
        {/* Protective Vignettes */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-slate-950/60 via-slate-950/10 to-transparent pointer-events-none"></div>
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950/40 to-transparent pointer-events-none"></div>
        
        {/* Vibrant Orange Price Badge */}
        <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-600 to-amber-500 backdrop-blur-md border border-orange-400/30 shadow-lg shadow-orange-500/20 rounded-xl py-1.5 px-3 transition-all duration-300">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            <span className="text-[12px] font-bold font-sans text-white tracking-tight">₹{Number(pkg?.price ?? 9999).toLocaleString("en-IN")}/- onwards</span>
          </div>
        </div>
      </div>

      {/* Content Space */}
      <div className="p-4 flex flex-col flex-1 bg-white">
        {/* Tag */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="inline-block h-1 w-1 rounded-full bg-orange-500 shrink-0"></span>
          <span className="text-[11px] font-bold text-orange-600 tracking-widest uppercase line-clamp-1">{pkg.destination}</span>
        </div>

        {/* Title */}
        <h3 className="text-[16px] font-medium text-slate-900 leading-snug group-hover:text-orange-600 transition-colors duration-200 line-clamp-2 mb-3">
          {pkg.name}
        </h3>

        <div className="mt-auto">
          <hr className="border-slate-100 mb-3" />

          {/* Meta Details Row */}
          <div className="grid grid-cols-2 gap-2 text-xs font-medium text-slate-500 mb-3">
            <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/80 p-1.5 rounded-xl transition-all duration-150">
              <div className="w-6 h-6 rounded-lg bg-orange-50 flex shrink-0 items-center justify-center text-orange-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-slate-400 font-normal leading-tight">Duration</p>
                <span className="text-slate-700 font-semibold text-[12px] truncate block leading-tight">{pkg.duration}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/80 p-1.5 rounded-xl transition-all duration-150">
              <div className="w-6 h-6 rounded-lg bg-blue-50 flex shrink-0 items-center justify-center text-blue-600">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-slate-400 font-normal leading-tight">Location</p>
                <span className="text-slate-700 font-semibold text-[12px] truncate block leading-tight">{pkg.destination}</span>
              </div>
            </div>
          </div>

          {/* Bottom Footer Elements */}
          <div className="flex items-center justify-between pt-1">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/80 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="truncate max-w-[90px]">{allDates.length > 0 ? allDates.slice(0, 1).join("") : "Any date"}</span>
            </div>

            {/* Arrow Action Trigger */}
            <div className="flex items-center gap-1 text-[12px] font-bold text-orange-600 hover:text-orange-700 group/btn transition-all duration-200 cursor-pointer whitespace-nowrap">
              <span>View Details</span>
              <svg className="w-3.5 h-3.5 transform group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
