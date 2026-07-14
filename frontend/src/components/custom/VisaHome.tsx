import React from "react";
import { VisaInterface } from "@/app/(user)/visa/visaClient";
import Link from "next/link";
import { 
  Building2, Globe, Flag, Crown, Leaf, Anchor, 
  Sun, Mountain, Umbrella, Castle, TreePine, Moon, ArrowRight 
} from "lucide-react";
import PopupQueryForm from "./PopupQueryForm";
import { getWhatsAppLink } from "@/config/contact";

const getVisa = async (search: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/visa/?country=${search}`,
    {
      next: { revalidate: 3600 },
    },
  );
  if (!res.ok) throw new Error("Failed to fetch visas");
  const data = await res.json();
  return data?.data; // []
};

// Map each country to an icon
const VISA_METADATA: Record<string, { icon: any }> = {
  "UAE": { icon: Building2 },
  "Schengen": { icon: Globe },
  "USA": { icon: Flag },
  "UK": { icon: Crown },
  "Canada": { icon: Leaf },
  "Singapore": { icon: Anchor },
  "Australia": { icon: Sun },
  "Japan": { icon: Mountain },
  "Vietnam": { icon: Umbrella },
  "China": { icon: Castle },
  "New Zealand": { icon: TreePine },
  "Turkey": { icon: Moon },
};

function getDisplayDuration(visa: VisaInterface) {
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
    if (minFee !== Infinity && minFeeProcessTime) {
      displayDuration = minFeeProcessTime;
    }
  }
  return displayDuration || "TBD";
}

async function VisaHome() {
  const visa: VisaInterface[] = await getVisa("");
  
  const finalVisa = [
    "UAE", "Schengen", "USA", "UK", "Canada", "Singapore",
    "Australia", "Japan", "Vietnam", "China", "New Zealand", "Turkey"
  ];
  
  const shownVisa = visa
    .filter((v) => finalVisa.includes(v.country))
    .sort((a, b) => finalVisa.indexOf(a.country) - finalVisa.indexOf(b.country));

  return (
    <section className="w-full bg-white px-4 md:px-10 py-12 md:py-20 border-t border-gray-100">
      <div className="w-full max-w-7xl mx-auto flex flex-col items-start">
        
        {/* Header Section */}
        <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="flex flex-col gap-1 items-start">
            <span className="text-[10px] md:text-[12px] font-semibold tracking-[0.08em] text-[#FE5300] uppercase">
              VISA ASSISTANCE
            </span>
            <h2 className="text-2xl md:text-[32px] leading-tight font-medium text-gray-900">
              <span>Popular</span> visa services for Indian travellers
            </h2>
            <p className="text-[14px] md:text-[16px] text-gray-600">
              Fast, reliable visa assistance for top travel destinations.
            </p>
          </div>
          
          <Link href="/visa" className="flex items-center gap-1 text-[#FE5300] font-medium hover:text-[#e04800] transition-colors shrink-0 mb-1 pb-1">
            View all <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {/* Grid Section */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4 mb-2 md:mb-3">
          {shownVisa.slice(0, 12).map((data, i) => {
            const meta = VISA_METADATA[data.country] || { icon: Globe };
            const Icon = meta.icon;
            const displayDuration = getDisplayDuration(data);
            
            return (
              <Link key={i} href={`/visa/${data.slug}`} className="block">
                <div className="flex flex-col items-center justify-center p-5 md:p-7 bg-white border border-gray-200 rounded-2xl hover:border-[#FE5300] hover:shadow-sm transition-all duration-200 h-full gap-1">
                  <Icon className="w-7 h-7 md:w-8 md:h-8 text-[#FE5300] mb-3" strokeWidth={1.5} />
                  <h3 className="text-[15px] md:text-base font-medium text-gray-900 text-center">
                    {data.country}
                  </h3>
                  <span className="text-[13px] text-[#FE5300] font-normal text-center mt-1">
                    {displayDuration}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col">
            <h3 className="text-lg md:text-[20px] font-medium text-gray-900 mb-1">
              Not sure which visa you need?
            </h3>
            <p className="text-[14px] md:text-[16px] text-gray-600">
              Free consultation — document checklist included, no hidden fees.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
            <Link 
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-3 rounded-xl font-medium text-[15px] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              WhatsApp
            </Link>
            <PopupQueryForm 
              triggerText="Talk to a visa expert" 
              triggerClassName="w-full sm:w-auto bg-[#FE5300] hover:bg-[#e04800] text-white px-6 py-3 rounded-xl font-medium text-[15px] shadow-sm hover:shadow-md hover:-translate-y-0.5 whitespace-nowrap transition-all duration-300" 
              icon={null} 
            />
          </div>
        </div>

      </div>
    </section>
  );
}

export default VisaHome;
