"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar } from "lucide-react";
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
      format(parseISO(b.startDate), "yyyy-MM-dd") === format(now, "yyyy-MM-dd")
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
    [pkg.batch]
  );

  const allDates = Object.values(batchesByMonth)
    .flat()
    .map((b) => format(parseISO(b.startDate), "dd MMM"));
  return (
    <Link href={url}>
      <Card className="overflow-hidden pt-0 pb-0 rounded-2xl shadow-md hover:shadow-xl transition cursor-pointer">
        {/* Image + Price tag */}
        <div className="relative h-56 w-full">
          <Image
            src={pkg.image}
            alt={pkg.name}
            width={500}
            height={500}
            className="h-full w-full object-cover"
          />
          <div className="absolute top-3 right-3 bg-[#FE5300] text-white px-3 py-1 rounded-full font-semibold text-sm shadow">
            ₹{Number(pkg?.price ?? 9999).toLocaleString("en-IN")}/- onwards
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Title */}
          <h3 className="font-semibold text-lg line-clamp-1">{pkg.name}</h3>

          {/* Duration & Location */}
          <div className="flex items-center justify-between text-sm text-gray-700 mt-2">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>{pkg.duration}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>{pkg.destination}</span>
            </div>
          </div>

          <p className="text-xs text-gray-600 mt-2 line-clamp-1">
            {allDates.length > 0
              ? allDates.slice(0, 4).join(", ") // first 4 dates
              : "Any Date of your choice"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
