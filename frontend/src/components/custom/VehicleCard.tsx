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
  vehicleTransmission: string;
  fuelType: string;
  availableSeats: number;
  price: {
    daily: number;
    hourly: number;
  };
  url: string;
  vehicleBrand: string;
  vehicleYear: string;
  pricingType?: "single" | "multiple";
  seatingOptions?: { seats: number; dailyPrice: number; stock?: number }[];
}

function VehicleCard({ vehicle }: { vehicle: IVehicleCard }) {
  // Get unique seat counts if it's a multiple option vehicle
  const seatList = React.useMemo(() => {
    if (vehicle.pricingType === "multiple" && vehicle.seatingOptions && vehicle.seatingOptions.length > 0) {
      const seats = Array.from(new Set(vehicle.seatingOptions.map(o => o.seats))).sort((a, b) => a - b);
      return seats.join(", ");
    }
    return null;
  }, [vehicle]);

  return (
    <Link
      href={vehicle.url}
      className="min-w-[280px] sm:min-w-[300px] md:min-w-0"
    >
      <Card className="overflow-hidden pt-0 pb-0 rounded-2xl shadow-md hover:shadow-xl transition cursor-pointer relative">
        {/* Image + Price tag */}
        <div className="relative h-50 w-full">
          <Image
            src={vehicle.coverImage.url}
            alt={vehicle.coverImage.alt}
            width={500}
            height={500}
            className="h-full w-full object-cover"
          />
          <div className="absolute top-3 right-3 bg-[#FE5300] text-white px-3 py-1 rounded-full font-medium text-xs shadow-sm">
            ₹{Number(vehicle?.price?.daily ?? 999).toLocaleString("en-IN")}/-
            day
          </div>
          
          {/* Multi-Option Badge */}
          {vehicle.pricingType === "multiple" && (
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#FE5300] px-2 py-0.5 rounded-md font-medium text-[9px] uppercase tracking-wider border border-[#FE5300]/20 shadow-sm">
              MULTIPLE
            </div>
          )}
        </div>

        <CardContent className="p-3 space-y-1.5">
          {/* Title */}
          <h3 className="font-semibold text-base line-clamp-1 text-gray-900">
            {vehicle.vehicleName}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <p className="text-gray-400 font-normal text-xs">
              {vehicle.vehicleBrand} | {vehicle.vehicleYear}
            </p>
            <p className="text-gray-400 font-normal text-xs">
              {vehicle.vehicleTransmission === "mannual" ? "Manual" : (vehicle.vehicleTransmission ?? "Manual")}
            </p>
          </div>

          {/* Details */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
            <div className="flex items-center gap-1">
              <Fuel className="w-3 h-3 text-blue-500/70" />
              <span className="font-normal">{vehicle.fuelType}</span>
            </div>
            <div className="flex items-center gap-1">
              <Table className="w-3 h-3 text-[#FE5300]/70" />
              <span className="font-normal">
                Seats: {seatList ? seatList : vehicle.availableSeats}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default VehicleCard;
