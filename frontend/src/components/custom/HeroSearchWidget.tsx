"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Sparkles, Palmtree, FileCheck2, Car, Plane, Hotel, MessageCircle, Loader2 } from "lucide-react";
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

// Same static list visaClient.tsx's own Visa Type dropdown uses — kept in
// sync manually since that file doesn't export it.
const VISA_TYPES = ["all", "E-Visa", "DAC", "EVOA", "Sticker", "ETA", "PAR"];
// Same static list RentalsClient.tsx's own Seats dropdown uses.
const SEAT_OPTIONS = ["4", "5", "6", "7", "8", "9", "10", "12", "14", "17", "20", "26"];

const HOLIDAY_DEFAULTS = { search: "", category: "", price: 500000, duration: 25 };
const RENTAL_DEFAULTS = { vehicleType: "", location: "", seats: "", price: 50000 };
const VISA_DEFAULTS = { visaType: "", country: "", maxPrice: 5000000 };

const selectTriggerClass =
  "w-full h-10 bg-white border-gray-200 focus:ring-[#FE5300] focus:border-[#FE5300] shadow-sm";
// Fixed height so every label sits on exactly one line and every field's
// input/select starts at the same vertical position, regardless of how long
// its label text is — the previous longer wording ("Where do you want to
// go?", "Max Budget/Day:") wrapped to 2 lines while sibling labels stayed on
// 1, throwing the whole row out of alignment.
const fieldLabelClass = "text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 h-4";
const rangeTrackContainerClass = "w-full h-10 bg-white border border-gray-200 rounded-md shadow-sm px-3 flex items-center";
const rangeSliderClass = "w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#FE5300] focus:outline-none";

function rangeFillStyle(value: number, min: number, max: number) {
  const percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return {
    background: `linear-gradient(to right, #FE5300 ${percent}%, #e5e7eb ${percent}%)`,
  };
}

export default function HeroSearchWidget({
  categories,
  vehicleFilters,
}: {
  // Real, live categories (holidays) and vehicle types/locations (rentals) —
  // fetched server-side in page.tsx from the same endpoints the dedicated
  // /holidays and /rental listing pages already use, so the values offered
  // here are guaranteed to match something real on the destination page.
  categories: { id: string; name: string; slug: string }[];
  vehicleFilters: { types: string[]; locations: { id: string; name: string }[] };
}) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>("holidays");
  const activeTabConfig = TABS.find((t) => t.id === activeTab)!;

  // Same 4 real filters PackagesClient.tsx (the /holidays listing page)
  // actually has: search, category, price, duration.
  const [holiday, setHoliday] = useState(HOLIDAY_DEFAULTS);
  // Same 4 (of RentalsClient.tsx's 6) real filters chosen as most relevant
  // for a quick hero search: category, location, seats, budget.
  const [rental, setRental] = useState(RENTAL_DEFAULTS);
  // The visa listing page only has 3 real filters today (visaType, country,
  // maxPrice) — no 4th one exists to bring over, so only 3 are shown here.
  const [visa, setVisa] = useState(VISA_DEFAULTS);

  const [isSearching, setIsSearching] = useState(false);
  const showSeatsFilter = rental.vehicleType === "car" || rental.vehicleType === "";

  const handleSubmit = () => {
    if (!activeTabConfig.enabled || !activeTabConfig.href) return;
    setIsSearching(true);

    const params = new URLSearchParams();
    if (activeTab === "holidays") {
      if (holiday.search) params.set("search", holiday.search);
      if (holiday.category) params.set("category", holiday.category);
      if (holiday.price !== HOLIDAY_DEFAULTS.price) params.set("price", String(holiday.price));
      if (holiday.duration !== HOLIDAY_DEFAULTS.duration) params.set("duration", String(holiday.duration));
    } else if (activeTab === "rentals") {
      if (rental.vehicleType) params.set("vehicleType", rental.vehicleType);
      if (rental.location) params.set("location", rental.location);
      if (rental.seats) params.set("seats", rental.seats);
      if (rental.price !== RENTAL_DEFAULTS.price) params.set("price", String(rental.price));
    } else if (activeTab === "visa") {
      if (visa.visaType) params.set("visaType", visa.visaType);
      if (visa.country) params.set("country", visa.country);
      if (visa.maxPrice !== VISA_DEFAULTS.maxPrice) params.set("maxPrice", String(visa.maxPrice));
    }

    const qs = params.toString();
    router.push(qs ? `${activeTabConfig.href}?${qs}` : activeTabConfig.href);
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
              onClick={() => {
                setActiveTab(tab.id);
                setIsSearching(false);
              }}
              title={tab.enabled ? undefined : "Coming soon — tap to see how to reach us"}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-semibold flex-shrink-0 transition-colors cursor-pointer ${
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
      {activeTab === "holidays" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 lg:items-end">
          <div className="flex flex-col gap-1.5 col-span-2 lg:col-span-1">
            <Label className={fieldLabelClass}>
              <MapPin className="w-3 h-3" /> Destination
            </Label>
            <Input
              type="text"
              value={holiday.search}
              onChange={(e) => setHoliday((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search country, state..."
              className={selectTriggerClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className={fieldLabelClass}>Package Type</Label>
            <Select
              value={holiday.category}
              onValueChange={(v) => setHoliday((prev) => ({ ...prev, category: v }))}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Any Package" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Package Type</SelectLabel>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className={fieldLabelClass}>
              Budget: <span className="font-semibold text-[#FE5300]">₹{holiday.price.toLocaleString()}</span>
            </Label>
            <div className={rangeTrackContainerClass}>
              <input
                type="range"
                min={100}
                max={500000}
                value={holiday.price}
                onChange={(e) => setHoliday((prev) => ({ ...prev, price: Number(e.target.value) }))}
                className={rangeSliderClass}
                style={rangeFillStyle(holiday.price, 100, 500000)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className={fieldLabelClass}>
              Duration: <span className="font-semibold text-[#FE5300]">{holiday.duration} Days</span>
            </Label>
            <div className={rangeTrackContainerClass}>
              <input
                type="range"
                min={1}
                max={25}
                value={holiday.duration}
                onChange={(e) => setHoliday((prev) => ({ ...prev, duration: Number(e.target.value) }))}
                className={rangeSliderClass}
                style={rangeFillStyle(holiday.duration, 1, 25)}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "rentals" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 lg:items-end">
          <div className="flex flex-col gap-1.5">
            <Label className={fieldLabelClass}>Category</Label>
            <Select
              value={rental.vehicleType}
              onValueChange={(v) =>
                setRental((prev) => ({ ...prev, vehicleType: v, seats: v !== "car" ? "" : prev.seats }))
              }
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Any Vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Category</SelectLabel>
                  {vehicleFilters.types.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className={fieldLabelClass}>Location</Label>
            <Select
              value={rental.location}
              onValueChange={(v) => setRental((prev) => ({ ...prev, location: v }))}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="Any Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Location</SelectLabel>
                  {vehicleFilters.locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {showSeatsFilter ? (
            <div className="flex flex-col gap-1.5">
              <Label className={fieldLabelClass}>Seats</Label>
              <Select
                value={rental.seats}
                onValueChange={(v) => setRental((prev) => ({ ...prev, seats: v }))}
              >
                <SelectTrigger className={selectTriggerClass}>
                  <SelectValue placeholder="Any Seats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Seats</SelectLabel>
                    {SEAT_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s} Seats</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div />
          )}

          <div className="flex flex-col gap-1.5">
            <Label className={fieldLabelClass}>
              Budget/Day: <span className="font-semibold text-[#FE5300]">₹{rental.price.toLocaleString()}</span>
            </Label>
            <div className={rangeTrackContainerClass}>
              <input
                type="range"
                min={500}
                max={50000}
                step={500}
                value={rental.price}
                onChange={(e) => setRental((prev) => ({ ...prev, price: Number(e.target.value) }))}
                className={rangeSliderClass}
                style={rangeFillStyle(rental.price, 500, 50000)}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "visa" && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4 lg:items-end">
          <div className="flex flex-col gap-1.5">
            <Label className={fieldLabelClass}>Visa Type</Label>
            <Select
              value={visa.visaType}
              onValueChange={(v) => setVisa((prev) => ({ ...prev, visaType: v }))}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue placeholder="All Visas" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Visa Type</SelectLabel>
                  {VISA_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t === "all" ? "All Visas" : t}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 col-span-2 lg:col-span-1">
            <Label className={fieldLabelClass}>
              <MapPin className="w-3 h-3" /> Destination
            </Label>
            <Input
              type="text"
              value={visa.country}
              onChange={(e) => setVisa((prev) => ({ ...prev, country: e.target.value }))}
              placeholder="Search country..."
              className={selectTriggerClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className={fieldLabelClass}>
              Max Budget: <span className="font-semibold text-[#FE5300]">₹{visa.maxPrice.toLocaleString()}</span>
            </Label>
            <div className={rangeTrackContainerClass}>
              <input
                type="range"
                min={0}
                max={5000000}
                step={1000}
                value={visa.maxPrice}
                onChange={(e) => setVisa((prev) => ({ ...prev, maxPrice: Number(e.target.value) }))}
                className={rangeSliderClass}
                style={rangeFillStyle(visa.maxPrice, 0, 5000000)}
              />
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSearching}
        className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-bold tracking-wide transition-all bg-[#FE5300] text-white hover:bg-[#e04800] active:scale-[0.99] cursor-pointer shadow-sm disabled:opacity-80"
      >
        {isSearching ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Searching...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>{activeTab === "holidays" ? "PLAN MY TRIP" : activeTab === "rentals" ? "FIND VEHICLES" : "SEARCH VISAS"}</span>
          </>
        )}
      </button>
      </>
      )}
    </div>
  );
}
