"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Users, Sparkles, Palmtree, FileCheck2, Car, Plane, Hotel, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getWhatsAppLink } from "@/config/contact";

type TabId = "holidays" | "visa" | "rentals" | "flights" | "hotels";

const TABS: { id: TabId; label: string; icon: typeof Palmtree; href: string; enabled: boolean }[] = [
  { id: "holidays", label: "Holidays", icon: Palmtree, href: "/holidays", enabled: true },
  { id: "visa", label: "Visa", icon: FileCheck2, href: "/visa", enabled: true },
  { id: "rentals", label: "Rentals", icon: Car, href: "/rental", enabled: true },
  { id: "flights", label: "Flights", icon: Plane, href: "", enabled: false },
  { id: "hotels", label: "Hotels", icon: Hotel, href: "", enabled: false },
];

const BUDGETS = ["any", "under-25k", "25k-50k", "50k-plus"] as const;
const BUDGET_LABELS: Record<(typeof BUDGETS)[number], string> = {
  any: "Any Budget",
  "under-25k": "Under ₹25,000",
  "25k-50k": "₹25,000 – ₹50,000",
  "50k-plus": "₹50,000+",
};

function nextMonths(count: number) {
  const out: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    out.push({
      value: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    });
  }
  return out;
}

const selectTriggerClass =
  "w-full h-10 bg-white border-gray-200 focus:ring-[#FE5300] focus:border-[#FE5300] shadow-sm";
const fieldLabelClass = "text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1";

export default function HeroSearchWidget() {
  const router = useRouter();
  const months = useMemo(() => nextMonths(12), []);

  const [activeTab, setActiveTab] = useState<TabId>("holidays");
  const [destination, setDestination] = useState("");
  const [month, setMonth] = useState(months[0].value);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [budget, setBudget] = useState<(typeof BUDGETS)[number]>("any");
  const [travellersOpen, setTravellersOpen] = useState(false);

  const activeTabConfig = TABS.find((t) => t.id === activeTab)!;

  const handleSubmit = () => {
    if (!activeTabConfig.enabled || !activeTabConfig.href) return;
    // Phase 1: routes to the right landing page. Deep query-param filtering
    // (destination/month/travellers/budget) isn't wired up yet — none of
    // /holidays, /visa or /rental read search params today, so passing them
    // would be a silent no-op rather than real filtering. Wiring that up is
    // a separate, backend-confirmed step.
    router.push(activeTabConfig.href);
  };

  return (
    <div className="w-full max-w-[560px] sm:max-w-[640px] lg:max-w-[720px] bg-white rounded-2xl shadow-xl p-4 md:p-5 relative z-20 mt-4 md:mt-6 mb-4">
      {/* Service tabs */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              title={tab.enabled ? undefined : "Coming soon — tap to see how to reach us"}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold flex-shrink-0 transition-colors ${
                isActive
                  ? "bg-[#FE5300] text-white"
                  : tab.enabled
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  : "bg-gray-50 text-gray-400 hover:bg-gray-100"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" strokeWidth={2} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {!activeTabConfig.enabled ? (
        /* Flights/Hotels: no real search/filter to show yet, so the field
           grid and submit button are swapped for a CTA instead of being
           shown disabled — same real WhatsApp link used sitewide
           (config/contact.ts), not a placeholder. */
        <div className="flex flex-col items-center text-center gap-3 py-6 px-2">
          <span className="w-11 h-11 rounded-full bg-orange-50 flex items-center justify-center">
            <activeTabConfig.icon className="w-5 h-5 text-[#FE5300]" strokeWidth={2} />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-gray-900">
              {activeTabConfig.label} booking is launching soon
            </p>
            <p className="text-[12.5px] text-gray-500 mt-1">
              Message us on WhatsApp and our team will help you book manually in the meantime.
            </p>
          </div>
          <a
            href={getWhatsAppLink(`Hi, I'd like help booking ${activeTabConfig.label.toLowerCase()}.`)}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white text-[13px] font-bold px-5 py-2.5 rounded-lg transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Chat on WhatsApp
          </a>
        </div>
      ) : (
      <>
      {/* Fields — single row on desktop, matching the filter-bar pattern
          used on /rental (RentalsClient.tsx): Label + shadcn Select/Input,
          h-10, focus ring in brand orange. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 lg:items-end">
        <div className="flex flex-col gap-1.5 col-span-2 lg:col-span-1">
          <Label className={fieldLabelClass}>
            <MapPin className="w-3 h-3" /> Where do you want to go?
          </Label>
          <Input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Search destination, country or place"
            className={selectTriggerClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className={fieldLabelClass}>Travel Month</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Travel Month</SelectLabel>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 relative">
          <Label className={fieldLabelClass}>
            <Users className="w-3 h-3" /> Travellers
          </Label>
          <button
            type="button"
            onClick={() => setTravellersOpen((v) => !v)}
            className={`${selectTriggerClass} flex items-center px-3 text-[13px] text-gray-800 text-left rounded-md border`}
          >
            {adults} Adult{adults !== 1 ? "s" : ""} · {children} Child{children !== 1 ? "ren" : ""}
          </button>

          {travellersOpen && (
            <div className="absolute left-0 top-full mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-30">
              {([
                { key: "adults", label: "Adults", value: adults, setValue: setAdults, min: 1 },
                { key: "children", label: "Children", value: children, setValue: setChildren, min: 0 },
              ] as const).map((row) => (
                <div key={row.key} className="flex items-center justify-between py-1.5">
                  <span className="text-[13px] text-gray-700">{row.label}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => row.setValue(Math.max(row.min, row.value - 1))}
                      className="w-6 h-6 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center hover:border-[#FE5300] hover:text-[#FE5300] transition-colors"
                      aria-label={`Decrease ${row.label}`}
                    >
                      −
                    </button>
                    <span className="text-[13px] w-4 text-center">{row.value}</span>
                    <button
                      type="button"
                      onClick={() => row.setValue(row.value + 1)}
                      className="w-6 h-6 rounded-full border border-gray-300 text-gray-600 flex items-center justify-center hover:border-[#FE5300] hover:text-[#FE5300] transition-colors"
                      aria-label={`Increase ${row.label}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setTravellersOpen(false)}
                className="mt-1 w-full text-center text-[12px] font-semibold text-[#FE5300] py-1.5"
              >
                Done
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className={fieldLabelClass}>Budget (Optional)</Label>
          <Select value={budget} onValueChange={(v) => setBudget(v as (typeof BUDGETS)[number])}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Budget</SelectLabel>
                {BUDGETS.map((b) => (
                  <SelectItem key={b} value={b}>{BUDGET_LABELS[b]}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-bold tracking-wide transition-colors bg-[#FE5300] text-white hover:bg-[#e04800]"
      >
        <Sparkles className="w-4 h-4" />
        PLAN MY TRIP
      </button>
      </>
      )}
    </div>
  );
}
