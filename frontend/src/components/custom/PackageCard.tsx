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
}: {
  pkg: Package;
  url: string;
}) {
  const batchesByMonth = useMemo(
    () => groupBatchesByMonth(pkg.batch ? pkg.batch : []),
    [pkg.batch],
  );

  const allDates = Object.values(batchesByMonth)
    .flat()
    .map((b) => format(parseISO(b.startDate), "dd MMM"));

  return (
    <Link href={url} className="min-w-[260px] sm:min-w-[280px] md:min-w-0 h-full block">
      <Card className="overflow-hidden p-0 rounded-[16px] shadow-sm hover:shadow-[0_8px_30px_rgb(20,71,143,0.12)] border border-gray-200/80 transition-all duration-300 cursor-pointer flex flex-col h-full group bg-white">
        
        {/* Edge-to-Edge Cover Image */}
        <div className="relative h-[170px] w-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
          {pkg.image ? (
            <Image
              src={pkg.image}
              alt={pkg.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <span className="text-sm text-slate-400">No Image</span>
          )}
          
          {/* Price Overlay to save vertical space */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-gray-800 px-3 py-1.5 rounded-md text-[12px] font-semibold shadow-sm border border-gray-100/50">
            ₹{Number(pkg?.price ?? 9999).toLocaleString("en-IN")}/- onwards
          </div>
        </div>

        <CardContent className="px-4 py-4 flex flex-col flex-1">
          {/* Category/Destination */}
          <span className="text-[11px] font-bold text-[#FE5300] uppercase tracking-[0.08em] mb-1.5 line-clamp-1">
            {pkg.destination}
          </span>
          
          {/* Main Title */}
          <h3 className="font-medium text-[16px] text-gray-900 leading-snug line-clamp-2 mb-3 group-hover:text-[#FE5300] transition-colors">
            {pkg.name}
          </h3>

          {/* Info Row (Calendar & MapPin) */}
          <div className="flex items-center gap-3.5 text-[12.5px] text-gray-600 mb-4 font-medium mt-auto">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-[14px] h-[14px] text-gray-400" />
              <span>{pkg.duration}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-[14px] h-[14px] text-gray-400" />
              <span className="line-clamp-1">{pkg.destination}</span>
            </div>
          </div>

          {/* Bottom Row (Dates & View) */}
          <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes breatheEmerald {
                0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                50% { transform: scale(1.05); box-shadow: 0 0 6px 0 rgba(16, 185, 129, 0.2); }
              }
              .animate-breathe-emerald {
                animation: breatheEmerald 3s ease-in-out infinite;
              }
            `}} />
            <span className="text-[12px] bg-emerald-50 px-2.5 py-1 rounded-md text-emerald-700 font-semibold line-clamp-1 max-w-[150px] animate-breathe-emerald border border-emerald-200/60">
              {allDates.length > 0 ? allDates.slice(0, 2).join(", ") : "Any date"}
            </span>
            <span className="text-[13px] font-semibold text-[#FE5300] flex items-center gap-1 group-hover:gap-1.5 transition-all">
              View <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
