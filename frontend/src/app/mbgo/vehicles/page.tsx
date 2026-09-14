"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Car, Users, Briefcase, Snowflake, Navigation, Calendar, Check, ShieldCheck } from "lucide-react";
import { useRideBookingStore } from "@/store/useRideBookingStore";
import type { RideOffer } from "@/lib/rideApi";

function TripSummaryCard({
  pickup,
  drop,
  rideDate,
  rideTime,
  tripType,
  returnDate,
  returnTime,
  distanceKm,
  onEdit,
}: {
  pickup: string;
  drop: string;
  rideDate: string;
  rideTime: string;
  tripType: "ONE_WAY" | "ROUND_TRIP";
  returnDate: string;
  returnTime: string;
  distanceKm: number;
  onEdit: () => void;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_10px_35px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between pb-3">
        <span className="bg-orange-50 border border-orange-100 text-[#FE5300] text-[10.5px] font-extrabold px-2.5 py-1 rounded-full tracking-wide">
          {tripType === "ROUND_TRIP" ? "ROUND TRIP" : "ONE-WAY TRIP"}
        </span>
        <span className="flex items-center gap-1 text-[11.5px] font-extrabold text-gray-600">
          <Navigation className="w-3.5 h-3.5" />
          {distanceKm} km
        </span>
      </div>

      <div className="space-y-3.5 py-1">
        <div className="flex items-start gap-2.5">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[9.5px] font-extrabold text-gray-400 tracking-wide">PICKUP</p>
            <p className="text-[13.5px] font-extrabold text-gray-900 truncate">{pickup}</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="w-3.5 h-3.5 rounded-full bg-[#FE5300] mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[9.5px] font-extrabold text-gray-400 tracking-wide">DROP</p>
            <p className="text-[13.5px] font-extrabold text-gray-900 truncate">{drop}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-1 border-t border-gray-50">
        <span className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-gray-900">
          <Calendar className="w-3.5 h-3.5" />
          {rideDate} &bull; {rideTime}
        </span>
        <button
          onClick={onEdit}
          className="text-[11.5px] font-extrabold text-[#FE5300] hover:text-[#e04800] transition-colors"
        >
          Edit
        </button>
      </div>

      {tripType === "ROUND_TRIP" && (
        <div className="pt-2.5 mt-1 border-t border-gray-50 text-[11.5px] font-extrabold text-gray-900">
          Return: {returnDate} &bull; {returnTime}
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-gray-50 text-[11px] font-semibold text-emerald-600">
        <ShieldCheck className="w-3.5 h-3.5" />
        Tolls &amp; fuel included &bull; No hidden charges
      </div>
    </div>
  );
}

export default function MBGoVehiclesPage() {
  const router = useRouter();
  const pickup = useRideBookingStore((s) => s.pickup);
  const drop = useRideBookingStore((s) => s.drop);
  const rideDate = useRideBookingStore((s) => s.rideDate);
  const rideTime = useRideBookingStore((s) => s.rideTime);
  const tripType = useRideBookingStore((s) => s.tripType);
  const returnDate = useRideBookingStore((s) => s.returnDate);
  const returnTime = useRideBookingStore((s) => s.returnTime);
  const quote = useRideBookingStore((s) => s.quote);
  const selectedOffer = useRideBookingStore((s) => s.selectedOffer);
  const setSelectedOffer = useRideBookingStore((s) => s.setSelectedOffer);

  useEffect(() => {
    if (!quote) {
      router.replace("/mbgo");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote]);

  if (!quote) return null;

  const offers = quote.offers;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-24 sm:pt-28 pb-28 lg:pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/mbgo")}
            className="p-2 rounded-full bg-white border border-gray-100 shadow-sm hover:shadow transition-shadow shrink-0"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-gray-900" />
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Choose a Vehicle</h1>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* Vehicle list */}
          <div className="space-y-3">
            {offers.map((offer: RideOffer) => {
              const isSelected = selectedOffer?.category === offer.category;
              return (
                <button
                  key={offer.category}
                  type="button"
                  onClick={() => setSelectedOffer(offer)}
                  className={`w-full text-left bg-white rounded-2xl p-4 sm:p-5 border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                    isSelected
                      ? "border-[#FE5300] border-[1.5px] shadow-[0_8px_24px_rgba(254,83,0,0.12)]"
                      : "border-gray-100 shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-14 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-orange-50 border border-orange-100" : "bg-gray-50 border border-gray-100"
                        }`}
                      >
                        <Car className={`w-5.5 h-5.5 ${isSelected ? "text-[#FE5300]" : "text-gray-800"}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[15px] font-extrabold ${isSelected ? "text-[#FE5300]" : "text-gray-900"}`}>
                          {offer.category}
                        </p>
                        <p className="text-[12px] text-gray-500 truncate">{offer.vehicleName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-2 shrink-0">
                      <p className="text-[17px] font-black text-gray-900">
                        ₹{offer.totalAmount.toLocaleString("en-IN")}
                      </p>
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          isSelected ? "bg-[#FE5300]" : "border-[1.5px] border-gray-300"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <span className="flex items-center gap-1 bg-gray-100 text-gray-600 text-[10.5px] font-bold px-2.5 py-1 rounded-md">
                      <Users className="w-3 h-3" /> {offer.seatingCapacity} Seats
                    </span>
                    <span className="flex items-center gap-1 bg-gray-100 text-gray-600 text-[10.5px] font-bold px-2.5 py-1 rounded-md">
                      <Briefcase className="w-3 h-3" /> {offer.category === "SUV" ? "4 Bags" : "2 Bags"}
                    </span>
                    <span className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10.5px] font-bold px-2.5 py-1 rounded-md">
                      <Snowflake className="w-3 h-3" /> AC Vehicle
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sticky trip summary + continue (desktop) */}
          <div className="hidden lg:block lg:sticky lg:top-28 space-y-4">
            <TripSummaryCard
              pickup={pickup}
              drop={drop}
              rideDate={rideDate}
              rideTime={rideTime}
              tripType={tripType}
              returnDate={returnDate}
              returnTime={returnTime}
              distanceKm={quote.distanceKm}
              onEdit={() => router.push("/mbgo")}
            />
            <button
              onClick={() => selectedOffer && router.push("/mbgo/booking")}
              disabled={!selectedOffer}
              className="w-full h-12 rounded-xl bg-[#FE5300] hover:bg-[#e04800] disabled:bg-gray-300 text-white font-bold text-[13.5px] flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition-colors"
            >
              {selectedOffer
                ? `Continue • ₹${selectedOffer.totalAmount.toLocaleString("en-IN")}`
                : "Select a vehicle to continue"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sticky continue bar (mobile only) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-3 z-40">
        <button
          onClick={() => selectedOffer && router.push("/mbgo/booking")}
          disabled={!selectedOffer}
          className="w-full h-11 rounded-xl bg-[#FE5300] disabled:bg-gray-300 text-white font-bold text-[13px] flex items-center justify-center gap-2"
        >
          {selectedOffer
            ? `Continue with ${selectedOffer.category} • ₹${selectedOffer.totalAmount.toLocaleString("en-IN")}`
            : "Select a vehicle to continue"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
