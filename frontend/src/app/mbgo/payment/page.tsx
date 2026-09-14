"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRideBookingStore } from "@/store/useRideBookingStore";
import { initiateRidePayment, submitPayUForm } from "@/lib/ridePaymentApi";

export default function MBGoPaymentPage() {
  const router = useRouter();
  const rideId = useRideBookingStore((s) => s.rideId);
  const totalAmount = useRideBookingStore((s) => s.totalAmount);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rideId) {
      router.replace("/mbgo");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const checkout = await initiateRidePayment(rideId);
        if (!cancelled) submitPayUForm(checkout);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Could not start payment, please try again";
          setError(message);
          toast.error(message);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rideId]);

  if (!rideId) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 pt-16">
      <div className="max-w-sm w-full bg-white border border-gray-100 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-8 text-center">
        {error ? (
          <>
            <p className="text-red-600 font-bold text-sm mb-4">{error}</p>
            <button
              onClick={() => router.push("/mbgo/booking")}
              className="w-full h-11 rounded-xl bg-[#FE5300] text-white font-bold text-[13px]"
            >
              Back to Fare Summary
            </button>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 text-[#FE5300] animate-spin mx-auto mb-4" />
            <p className="text-[15px] font-extrabold text-gray-900">Redirecting to secure payment…</p>
            <p className="text-[12px] text-gray-500 mt-1">
              Amount payable: ₹{(totalAmount ?? 0).toLocaleString("en-IN")}
            </p>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500 mt-4">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              You&apos;ll be taken to PayU to complete your payment.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
