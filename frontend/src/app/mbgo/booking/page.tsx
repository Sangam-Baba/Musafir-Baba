"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Car, Navigation, Calendar, ShieldCheck, Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRideBookingStore } from "@/store/useRideBookingStore";
import { useRiderAuthStore } from "@/store/useRiderAuthStore";
import { useRiderAuthDialogStore } from "@/store/useRiderAuthDialogStore";
import { createRide } from "@/lib/rideApi";

export default function MBGoBookingPage() {
  const router = useRouter();
  const pickup = useRideBookingStore((s) => s.pickup);
  const drop = useRideBookingStore((s) => s.drop);
  const pickupCoords = useRideBookingStore((s) => s.pickupCoords);
  const dropCoords = useRideBookingStore((s) => s.dropCoords);
  const rideDate = useRideBookingStore((s) => s.rideDate);
  const rideTime = useRideBookingStore((s) => s.rideTime);
  const tripType = useRideBookingStore((s) => s.tripType);
  const returnDate = useRideBookingStore((s) => s.returnDate);
  const returnTime = useRideBookingStore((s) => s.returnTime);
  const quote = useRideBookingStore((s) => s.quote);
  const selectedOffer = useRideBookingStore((s) => s.selectedOffer);
  const setRide = useRideBookingStore((s) => s.setRide);

  const isRiderAuthenticated = useRiderAuthStore((s) => s.isRiderAuthenticated);
  const openDialog = useRiderAuthDialogStore((s) => s.openDialog);

  const [isBooking, setIsBooking] = useState(false);

  useEffect(() => {
    if (!quote || !selectedOffer) {
      router.replace("/mbgo");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote, selectedOffer]);

  if (!quote || !selectedOffer) return null;

  const proceedToBooking = async () => {
    setIsBooking(true);
    try {
      const res = await createRide({
        pickup: { address: pickup, ...(pickupCoords || {}) },
        drop: { address: drop, ...(dropCoords || {}) },
        rideDate,
        rideTime,
        vehicleCategory: selectedOffer.category,
        tripType,
        ...(tripType === "ROUND_TRIP" ? { returnDate, returnTime } : {}),
      });
      setRide(res.data.rideId, res.data.totalAmount);
      router.push("/mbgo/payment");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create booking, please try again");
    } finally {
      setIsBooking(false);
    }
  };

  const handleProceedToBooking = () => {
    if (!isRiderAuthenticated) {
      openDialog("login", { onSuccess: proceedToBooking });
      return;
    }
    proceedToBooking();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pt-24 sm:pt-28 pb-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/mbgo/vehicles")}
            className="p-2 rounded-full bg-white border border-gray-100 shadow-sm hover:shadow transition-shadow shrink-0"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-gray-900" />
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Fare Summary</h1>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* Main: route + vehicle + breakdown */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="bg-orange-50 border border-orange-100 text-[#FE5300] text-[10.5px] font-extrabold px-2.5 py-1 rounded-full tracking-wide">
                  {tripType === "ROUND_TRIP" ? "ROUND TRIP" : "ONE-WAY TRIP"}
                </span>
                <span className="flex items-center gap-1 text-[11.5px] font-extrabold text-gray-600">
                  <Navigation className="w-3.5 h-3.5" />
                  {quote.distanceKm} km
                </span>
              </div>

              <div className="space-y-3.5">
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

              <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                <span className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-gray-900">
                  <Calendar className="w-3.5 h-3.5" />
                  {rideDate} &bull; {rideTime}
                </span>
                <button
                  onClick={() => router.push("/mbgo/vehicles")}
                  className="text-[11.5px] font-extrabold text-[#FE5300] hover:text-[#e04800] transition-colors"
                >
                  Change
                </button>
              </div>

              <div className="flex items-center gap-3.5 pt-3 border-t border-gray-50">
                <div className="w-14 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                  <Car className="w-6 h-6 text-[#FE5300]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-extrabold text-gray-900">{selectedOffer.category}</p>
                  <p className="text-[12px] text-gray-500 truncate">{selectedOffer.vehicleName}</p>
                </div>
              </div>
            </div>

            {/* Fare breakdown */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-gray-50 pb-2.5">
                <p className="text-[14px] font-extrabold text-gray-900">Fare Breakdown</p>
                <p className="text-[10.5px] font-bold text-gray-500">Amount (₹)</p>
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-gray-600 font-semibold">Base Fare ({quote.distanceKm} km)</span>
                <span className="font-extrabold text-gray-900">
                  {selectedOffer.baseFare.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-gray-600 font-semibold">Driver Allowance</span>
                <span className="font-extrabold text-gray-900">
                  {selectedOffer.driverAllowance.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-gray-50">
                <p className="text-[14px] font-black text-gray-900">Total Amount</p>
                <p className="text-[18px] font-black text-gray-900">
                  ₹{selectedOffer.totalAmount.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>

          {/* Sticky payment sidebar */}
          <div className="lg:sticky lg:top-28 space-y-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-[0_10px_35px_rgba(0,0,0,0.06)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center">
                    <Wallet className="w-4.5 h-4.5 text-[#FE5300]" />
                  </div>
                  <div>
                    <p className="text-[10.5px] font-bold text-gray-500">To be paid</p>
                    <p className="text-[19px] font-black text-gray-900">
                      ₹{selectedOffer.totalAmount.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleProceedToBooking}
                disabled={isBooking}
                className="w-full h-12 rounded-xl bg-[#FE5300] hover:bg-[#e04800] disabled:bg-gray-300 text-white font-bold text-[13.5px] flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition-colors"
              >
                {isBooking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Booking...
                  </>
                ) : (
                  <>
                    Proceed to Booking <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                <ShieldCheck className="w-3.5 h-3.5" />
                100% secure payment via PayU
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
