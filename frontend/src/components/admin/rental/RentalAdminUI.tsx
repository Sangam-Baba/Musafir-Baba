"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  Car,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  IndianRupee,
  Info,
  Layers,
  LayoutList,
  Search,
} from "lucide-react";
import { AdminFormTab, AdminPageHeader, AdminTabPanel, AdminTabsList } from "@/components/admin/AdminFormUI";
import { FleetPill, fleetTone } from "@/components/admin/fleet/FleetUI";

// Rentals admin shell: the same shared admin UI the Packages / Visa / Fleet
// pages use (AdminFormUI + FleetUI), with rental-specific headers and tab sets.
// Presentational only -- no data logic lives here.

export function RentalPageHeader({
  icon = Car,
  ...props
}: Omit<React.ComponentProps<typeof AdminPageHeader>, "section" | "icon"> & { icon?: LucideIcon }) {
  return <AdminPageHeader section="Rentals" icon={icon} {...props} />;
}

// Published / Active -> green, Draft / Inactive -> grey
export function RentalStatusPill({ status }: { status?: string }) {
  const live = status === "published" || status === "active";
  return (
    <FleetPill className={live ? fleetTone.emerald : fleetTone.slate}>
      <span className="capitalize">{status || "—"}</span>
    </FleetPill>
  );
}

// ---- Tab sets (values match each form's existing TabsContent values) ----

type VehicleTab = "general" | "pricing" | "media" | "additional" | "tabs" | "seo";
const VEHICLE_TABS: (AdminFormTab & { value: VehicleTab })[] = [
  { value: "general", label: "General", icon: Info, title: "Vehicle details", description: "Title, permalink, pickup city, type, brand, model, fuel and transmission." },
  { value: "pricing", label: "Pricing & Stock", icon: IndianRupee, title: "Pricing & stock", description: "Single or per-seat pricing, units available and fees." },
  { value: "media", label: "Media", icon: ImageIcon, title: "Media", description: "Gallery images shown at the top of the vehicle page." },
  { value: "additional", label: "Additional", icon: Layers, title: "Additional details", description: "Vehicle at a Glance and Quick Answers, shown above the page tabs." },
  { value: "tabs", label: "Tabs", icon: LayoutList, title: "Page tabs", description: "Order, visibility, headings and content of every section on the vehicle page." },
  { value: "seo", label: "SEO", icon: Search, title: "SEO", description: "Meta title, description, excerpt and keywords." },
];
export function VehicleTabsList() {
  return <AdminTabsList tabs={VEHICLE_TABS} gridClassName="lg:grid-cols-6" />;
}
export function VehicleTabPanel({ tab, children }: { tab: VehicleTab; children: React.ReactNode }) {
  return <AdminTabPanel tab={VEHICLE_TABS.find((t) => t.value === tab)!}>{children}</AdminTabPanel>;
}

type CityTab = "general" | "content" | "media" | "seo";
const CITY_TABS: (AdminFormTab & { value: CityTab })[] = [
  { value: "general", label: "General", icon: Info, title: "City details", description: "Name, page heading, city, state and status." },
  { value: "content", label: "Content", icon: FileText, title: "Page content", description: "Text shown on this city's page, e.g. /rental/delhi." },
  { value: "media", label: "Media", icon: ImageIcon, title: "Banner", description: "Banner at the top of this city's page." },
  { value: "seo", label: "SEO", icon: Search, title: "SEO", description: "Meta tags, excerpt and keywords." },
];
export function CityTabsList() {
  return <AdminTabsList tabs={CITY_TABS} gridClassName="lg:grid-cols-4" />;
}
export function CityTabPanel({ tab, children }: { tab: CityTab; children: React.ReactNode }) {
  return <AdminTabPanel tab={CITY_TABS.find((t) => t.value === tab)!}>{children}</AdminTabPanel>;
}

type CityTypeTab = "general" | "content" | "media" | "faqs" | "seo";
const CITY_TYPE_TABS: (AdminFormTab & { value: CityTypeTab })[] = [
  { value: "general", label: "General", icon: Info, title: "City + type", description: "Which city and vehicle type this page is for, its heading and status." },
  { value: "content", label: "Content", icon: FileText, title: "Page content", description: "Text shown above the vehicle list." },
  { value: "media", label: "Media", icon: ImageIcon, title: "Banner", description: "Optional. Without one, the city's or vehicle type's banner is used." },
  { value: "faqs", label: "FAQs", icon: HelpCircle, title: "FAQs", description: "Shown below the vehicle list, with FAQ schema for search engines." },
  { value: "seo", label: "SEO", icon: Search, title: "SEO", description: "Meta title, description and keywords. The canonical URL is set automatically." },
];
export function CityTypeTabsList() {
  return <AdminTabsList tabs={CITY_TYPE_TABS} gridClassName="lg:grid-cols-5" />;
}
export function CityTypeTabPanel({ tab, children }: { tab: CityTypeTab; children: React.ReactNode }) {
  return <AdminTabPanel tab={CITY_TYPE_TABS.find((t) => t.value === tab)!}>{children}</AdminTabPanel>;
}

// Field label style matching FormBits' <Field> (for shadcn <FormLabel>)
export const rLabel = "text-[12px] font-medium text-slate-700";
// Primary / secondary button sizes used on the Packages pages
export const rPrimaryBtn = "h-8 gap-1.5 bg-[#FE5300] px-3 text-[12px] font-semibold hover:bg-[#e44a00]";
export const rSecondaryBtn = "h-8 px-3 text-[12px]";
