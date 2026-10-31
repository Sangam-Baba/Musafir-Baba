"use client";

import React from "react";
import { FileText, Image as ImageIcon, LayoutList, Plane, Search, Share2, Star, Info } from "lucide-react";
import {
  AdminFormTab,
  AdminPageHeader,
  AdminTabPanel,
  AdminTabsList,
  AdminSaveBar,
  CompactBlogEditor,
  CompactSmallEditor,
  CollapsibleRichEditor,
} from "@/components/admin/AdminFormUI";

// Visa Create/Edit page shell: the shared admin form UI with visa's tabs.

export function VisaPageHeader(props: Omit<React.ComponentProps<typeof AdminPageHeader>, "section" | "icon">) {
  return <AdminPageHeader section="Visa" icon={Plane} {...props} />;
}

type VisaAdminTab = "basic" | "content" | "tabs" | "media" | "seo" | "faqs" | "social";

const VISA_ADMIN_TABS: (AdminFormTab & { value: VisaAdminTab })[] = [
  { value: "basic", label: "Basic Detail", icon: Info, title: "Basic details", description: "Country, permalink, type, author and the headline fee shown on listings." },
  { value: "content", label: "Content", icon: FileText, title: "Page content", description: "Summary and highlights above the tab bar, plus resources, CTA and excerpt below it." },
  { value: "tabs", label: "Tabs", icon: LayoutList, title: "Page tabs", description: "Order, visibility, headings and content of every tab on the visa page." },
  { value: "media", label: "Media", icon: ImageIcon, title: "Media", description: "Avatar used on listings and the banner shown at the top of the visa page." },
  { value: "seo", label: "SEO & Docs", icon: Search, title: "SEO & documents", description: "Meta tags, keywords, schema and the required-documents checklist." },
  { value: "faqs", label: "Reviews", icon: Star, title: "Reviews", description: "Customer reviews attached to this visa." },
  { value: "social", label: "Social (OG)", icon: Share2, title: "Social sharing", description: "How the page looks when shared on social media." },
];

export function VisaAdminTabsList() {
  return <AdminTabsList tabs={VISA_ADMIN_TABS} gridClassName="lg:grid-cols-7" />;
}

export function VisaTabPanel({ tab, children }: { tab: VisaAdminTab; children: React.ReactNode }) {
  return <AdminTabPanel tab={VISA_ADMIN_TABS.find((t) => t.value === tab)!}>{children}</AdminTabPanel>;
}

export const VisaSaveBar = AdminSaveBar;
export const VisaBlogEditor = CompactBlogEditor;
export const VisaSmallEditor = CompactSmallEditor;
export const VisaCollapsibleEditor = CollapsibleRichEditor;
