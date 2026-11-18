"use client";
// B2B admin → Pricing: margin rules (with approval), the price simulator, GST rates and pricing settings.
import { useState } from "react";

import { MarginRules } from "./MarginRules";
import { Simulator } from "./Simulator";
import { TaxSettings } from "./TaxSettings";

const SECTIONS = [
  { key: "rules", label: "Margin rules" },
  { key: "simulator", label: "Simulator" },
  { key: "tax", label: "GST & settings" },
] as const;

export function PricingTab({ token }: { token: string }) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]["key"]>("rules");
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {SECTIONS.map((s) => (
          <button key={s.key} onClick={() => setSection(s.key)} className={`rounded-md border px-3 py-1 text-[12px] ${section === s.key ? "border-[#FE5300] bg-orange-50 font-medium text-[#FE5300]" : "border-slate-200 bg-white text-slate-600"}`}>
            {s.label}
          </button>
        ))}
      </div>
      {section === "rules" && <MarginRules token={token} />}
      {section === "simulator" && <Simulator token={token} />}
      {section === "tax" && <TaxSettings token={token} />}
    </div>
  );
}
