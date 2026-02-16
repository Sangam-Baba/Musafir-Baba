import Link from "next/link";
import React from "react";
import { Card, CardContent } from "../ui/card";
import Image from "next/image";
import { Fuel, Table } from "lucide-react";

interface IVehicleCard {
  coverImage: {
    url: string;
    alt: string;
  };
  vehicleName: string;
  fuelType: string;
  availableSeats: number;
  price: {
    daily: number;
    hourly: number;
  };
  url: string;
  vehicleBrand: string;
  vehicleYear: string;
}
function VehicleCard({ vehicle }: { vehicle: IVehicleCard }) {
  return (
    <Link
      href={vehicle.url}
      className="min-w-[280px] sm:min-w-[300px] md:min-w-0"
    >
      <Card className="overflow-hidden pt-0 pb-0 rounded-2xl shadow-md hover:shadow-xl transition cursor-pointer">
        {/* Image + Price tag */}
        <div className="relative h-50 w-full">
          <Image
            src={vehicle.coverImage.url}
            alt={vehicle.coverImage.alt}
            width={500}
            height={500}
            className="h-full w-full object-cover"
          />
          <div className="absolute top-3 right-3 bg-[#FE5300] text-white px-3 py-1 rounded-full font-semibold text-sm shadow">
            ₹{Number(vehicle?.price?.daily ?? 999).toLocaleString("en-IN")}/-
            day
          </div>
        </div>

        <CardContent className="p-3 space-y-2">
          {/* Title */}
          <h3 className="font-semibold text-lg line-clamp-1">
            {vehicle.vehicleName}
          </h3>
          <p className="capitalize text-gray-400 font-medium">
            {vehicle.vehicleBrand} | {vehicle.vehicleYear}
          </p>

          {/* Duration & Location */}
          <div className="flex items-center justify-between text-sm text-gray-700 mt-2">
            <div className="flex items-center gap-1">
              <Fuel className="w-4 h-4 text-blue-600" />
              <span className="capitalize">{vehicle.fuelType}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Seats: {vehicle.availableSeats}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default VehicleCard;
