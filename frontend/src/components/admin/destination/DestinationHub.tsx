"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, MapPin, MapPinPenIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";

// Shared header for the Destinations admin hub. It only merges the two
// existing pages visually: each tab is a plain link to its own existing route
// (/admin/destination and /admin/destination-seo), so the NAV_GROUPS-based
// page guard, sidebar and staff permission form keep working exactly as
// before. No data logic lives here.

type HubTab = "destinations" | "seo";

const TABS: {
  key: HubTab;
  label: string;
  href: string;
  permission: string;
  icon: LucideIcon;
  description: string;
}[] = [
  {
    key: "destinations",
    label: "Destinations",
    href: "/admin/destination",
    permission: "destination",
    icon: MapPin,
    description: "Destination hub pages shown at /destinations/{slug}.",
  },
  {
    key: "seo",
    label: "Category SEO Pages",
    href: "/admin/destination-seo",
    permission: "destination-seo",
    icon: MapPinPenIcon,
    description:
      "SEO, content and FAQs for each category + destination listing page at /holidays/{category}/{destination}.",
  },
];

export function DestinationHubHeader({
  active,
  title,
  description,
  actions,
  hideTabs = false,
}: {
  active: HubTab;
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  hideTabs?: boolean;
}) {
  const role = useAdminAuthStore((s) => s.role);
  const permissions = (useAdminAuthStore((s) => s.permissions) as string[]) || [];

  // Same visibility rule the sidebar uses for these two entries.
  const visibleTabs = TABS.filter(
    (t) => role === "superadmin" || role === "admin" || permissions.includes(t.permission)
  );
  const current = TABS.find((t) => t.key === active)!;
  const heading = title || current.label;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <span>Packages</span>
            <ChevronRight size={12} className="text-slate-300" />
            <span>Destinations</span>
            {heading !== "Destinations" && (
              <>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="text-slate-700">{heading}</span>
              </>
            )}
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            <current.icon size={18} className="text-[#FE5300]" />
            {heading}
          </h1>
          <p className="mt-0.5 max-w-3xl text-[13px] text-slate-500">{description ?? current.description}</p>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {!hideTabs && visibleTabs.length > 1 && (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <nav className="inline-flex h-auto w-max min-w-full justify-start gap-0.5 rounded-md bg-slate-100/80 p-0.5 sm:w-auto sm:min-w-0">
            {visibleTabs.map((t) => (
              <Link
                key={t.key}
                href={t.href}
                aria-current={t.key === active ? "page" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[5px] px-3 text-[12px] font-medium transition-colors",
                  t.key === active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
