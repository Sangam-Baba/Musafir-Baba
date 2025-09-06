"use client";

import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Calendar } from "lucide-react";
import Link from "next/link";

interface Package {
  id: string;
  name: string;
  image: string;
  price: number;
  slug: string;
  duration: string; // e.g. "6N/7D"
  destination?: string; // e.g. "Leh - Leh"
  url?: string;
}

export default function PackageCard({ pkg , url }: { pkg: Package; url: string } ) {
  return (
    <Link href={url}>
    <Card className="overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition cursor-pointer">
      {/* Image + Price tag */}
      <div className="relative h-56 w-full">
        <Image
          src={pkg.image}
          alt={pkg.name}
          width={500}
          height={500}
          className="h-full w-full object-cover"
        />
        <div className="absolute top-3 right-3 bg-yellow-400 text-black px-3 py-1 rounded-full font-semibold text-sm shadow">
          ₹{pkg.price.toLocaleString("en-IN")}/- onwards
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-lg line-clamp-2">{pkg.name}</h3>

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

        {/* Flexible date */}
        <p className="text-xs text-gray-600 mt-2">
          Any date of your choice
        </p>
      </CardContent>
    </Card>
    </Link>
  );
}
