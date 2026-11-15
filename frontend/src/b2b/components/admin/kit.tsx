"use client";
// The existing admin panel's own UI kit (FleetUI / AdminFormUI / Button / Input / Table), re-exported
// for the B2B admin pages so they look exactly like the rest of the admin. Nothing here changes
// those shared components — they are only imported.
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { rPrimaryBtn, rSecondaryBtn } from "@/components/admin/rental/RentalAdminUI";
import { FleetPill, fleetTone } from "@/components/admin/fleet/FleetUI";

export { AdminPageHeader, AdminTabsList } from "@/components/admin/AdminFormUI";
export { FleetEmptyState, FleetKpiStrip, FleetPage, FleetPanel, FleetPill, fleetSelectClass, fleetTh, fleetTone } from "@/components/admin/fleet/FleetUI";
export { Input } from "@/components/ui/input";
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
export { Tabs, TabsContent } from "@/components/ui/tabs";

export const SECTION = "B2B & Hotels";
export const inputSm = "h-8 text-[13px]";
export const labelSm = "text-[12px] font-medium text-slate-700";

export function PrimaryBtn({ children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button size="sm" className={rPrimaryBtn} {...rest}>
      {children}
    </Button>
  );
}

export function SecondaryBtn({ children, danger, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <Button size="sm" variant="outline" className={`${rSecondaryBtn} ${danger ? "text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700" : ""}`} {...rest}>
      {children}
    </Button>
  );
}

const ORG_STATUS_TONE: Record<string, string> = {
  ACTIVE: fleetTone.emerald,
  ONBOARDING: fleetTone.sky,
  SUSPENDED: fleetTone.red,
  CLOSED: fleetTone.slate,
};

export function OrgStatusPill({ status }: { status: string }) {
  return (
    <FleetPill className={ORG_STATUS_TONE[status] ?? fleetTone.slate}>
      <span className="capitalize">{status.toLowerCase()}</span>
    </FleetPill>
  );
}

export function TypePill({ type }: { type: string }) {
  return (
    <FleetPill className={type === "HOTEL" ? fleetTone.violet : fleetTone.orange} dot={false}>
      {type === "HOTEL" ? "Hotel" : "Client"}
    </FleetPill>
  );
}

export function Notice({ tone = "amber", children }: { tone?: "amber" | "red"; children: ReactNode }) {
  const cls = tone === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800";
  return <div className={`rounded-md border px-3 py-2 text-[12px] ${cls}`}>{children}</div>;
}
