"use client";

import React from "react";
import { CalendarDays, FileText, Image as ImageIcon, Info, LayoutList, Package, Search, Share2, Star } from "lucide-react";
import { AdminFormTab, AdminPageHeader, AdminTabPanel, AdminTabsList } from "@/components/admin/AdminFormUI";

// Package Create/Edit page shell: the shared admin form UI with package tabs
// (same values and order as before, so TabsContent/defaultValue still match).

export function PackagePageHeader(props: Omit<React.ComponentProps<typeof AdminPageHeader>, "section" | "icon">) {
  return <AdminPageHeader section="Packages" icon={Package} {...props} />;
}

type PackageAdminTab = "basic" | "content" | "batch" | "media" | "seo" | "faqs" | "social" | "tabs";

const PACKAGE_ADMIN_TABS: (AdminFormTab & { value: PackageAdminTab })[] = [
  { value: "basic", label: "Basic Detail", icon: Info, title: "Basic details", description: "Title, permalink, destination, categories, duration and listing flags." },
  { value: "content", label: "Content", icon: FileText, title: "Package content", description: "Highlights, essentials, at-a-glance, CTA, banner text and add-ons." },
  { value: "batch", label: "Batch & Pricing", icon: CalendarDays, title: "Batches & pricing", description: "Departure batches and their prices." },
  { value: "media", label: "Media", icon: ImageIcon, title: "Media", description: "Cover images, itinerary download and the image gallery." },
  { value: "seo", label: "SEO", icon: Search, title: "SEO", description: "Meta tags, canonical URL, schema and target keywords." },
  { value: "faqs", label: "Reviews", icon: Star, title: "Reviews", description: "Customer reviews shown on the package page." },
  { value: "social", label: "Social (OG)", icon: Share2, title: "Social sharing", description: "How the page looks when shared on social media." },
  { value: "tabs", label: "Tabs", icon: LayoutList, title: "Page tabs", description: "Order, visibility, headings and content of every tab on the package page." },
];

export function PackageAdminTabsList() {
  return <AdminTabsList tabs={PACKAGE_ADMIN_TABS} gridClassName="lg:grid-cols-8" />;
}

export function PackageTabPanel({ tab, children }: { tab: PackageAdminTab; children: React.ReactNode }) {
  return <AdminTabPanel tab={PACKAGE_ADMIN_TABS.find((t) => t.value === tab)!}>{children}</AdminTabPanel>;
}
