import { Clock } from "lucide-react";

// No real Play Store listing exists yet for MBConnect, so every spot the
// design shows a "GET IT ON Google Play" badge/QR renders this instead —
// same "launching soon" visual language already established sitewide by
// HeroSearchWidget.tsx's Flights/Hotels tabs (orange badge, muted copy).
export default function ComingSoonBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2.5 bg-black/90 text-white rounded-lg px-4 py-2.5 ${className}`}
    >
      <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
        <Clock className="w-4 h-4 text-[#FE5300]" strokeWidth={2} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] text-white/60 uppercase tracking-wide">Coming Soon</span>
        <span className="text-[13px] font-semibold">On Google Play</span>
      </span>
    </div>
  );
}
