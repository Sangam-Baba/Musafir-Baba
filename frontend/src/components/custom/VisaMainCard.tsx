import {
  Card,
} from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { VisaTypesDialog } from "./VisaTypesDialog";
import { VisaInterface } from "@/app/(user)/visa/visaClient";
import { Clock, CheckCircle2, ArrowRight } from "lucide-react";

function VisaMainCard({ visa }: { visa: VisaInterface }) {
  let displayCost = visa.cost;
  let displayDuration = visa.duration;

  if (visa.visas && Array.isArray(visa.visas) && visa.visas.length > 0) {
    let minFee = Infinity;
    let minFeeProcessTime = "";

    visa.visas.forEach((v) => {
      if (v.validityEntries && Array.isArray(v.validityEntries)) {
        v.validityEntries.forEach((entry: any) => {
          if (entry.governmentFee !== undefined && entry.governmentFee < minFee) {
            minFee = entry.governmentFee;
            minFeeProcessTime = entry.processTime || minFeeProcessTime;
          }
        });
      }
    });

    if (minFee !== Infinity) {
      displayCost = minFee;
      if (minFeeProcessTime) {
        displayDuration = minFeeProcessTime;
      }
    }
  }

  return (
    <Card
      key={visa.id}
      className="group relative bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-[0_8px_30px_rgb(254,83,0,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden"
    >
      <Link href={`/visa/${visa.slug}`} className="absolute inset-0 z-20">
        <span className="sr-only">View {visa.country} Visa</span>
      </Link>

      <div className="p-4 flex flex-col flex-1 relative z-10">
        {/* Top Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-gray-50 shadow-sm flex-shrink-0 relative">
              <Image
                src={visa.coverImage?.url || ""}
                alt={visa.country}
                fill
                className="object-cover"
              />
            </div>
            <h3 className="text-[16px] font-bold text-gray-900 leading-tight">
              {visa.country}
            </h3>
          </div>
          <div className="scale-90 origin-right">
            <VisaTypesDialog type={visa.visaType} />
          </div>
        </div>

        {/* Middle Details */}
        <div className="flex flex-col gap-3 mb-1 mt-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 text-[#FE5300]">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <p className="text-[13px] text-gray-600">
              Get visa in <span className="font-bold text-gray-900">{displayDuration}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-[13px] text-gray-600">
              <span className="font-bold text-gray-900">{visa.visaProcessed}+</span> processed
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between relative z-10 group-hover:bg-orange-50/50 transition-colors duration-300">
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Starting From</span>
          <p className="text-[17px] font-black text-[#FE5300] leading-none">
            ₹{displayCost.toLocaleString("en-IN")}
            <span className="text-[11px] font-semibold text-gray-500 ml-1">+fee</span>
          </p>
        </div>

        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 text-[#FE5300] group-hover:bg-[#FE5300] group-hover:text-white group-hover:border-[#FE5300] shadow-sm transition-all duration-300 relative z-30">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Card>
  );
}

export default VisaMainCard;
