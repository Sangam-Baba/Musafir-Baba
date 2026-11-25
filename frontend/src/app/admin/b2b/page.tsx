"use client";
// B2B admin (MusafirBaba staff), grouped by who the work is for:
//   Partners — the companies we work with (hotels, B2B clients, their people);
//   Services — what we provide to them (bookings, catalogue & pricing, wallets, plans & usage);
//   Control  — MusafirBaba's own back office (finance, privacy, staff access).
// Each area opens on an overview; `?area=…&tab=…` in the address opens a tab directly (shareable links). The screens
// inside the tabs are the same components as before — only how they are arranged changed.
import { useQuery } from "@tanstack/react-query";
import { Activity, BarChart3, BookOpen, Briefcase, Building2, BusFront, ClipboardList, FileCheck2, Handshake, Headset, Hotel, IndianRupee, Landmark, LayoutGrid, Layers, ListChecks, Settings2, ShieldCheck, ShoppingBag, Users, Wallet, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import type { QueueItem } from "@/b2b/admin-kyc";
import { AdminBell } from "@/b2b/components/admin/AdminBell";
import { AdminPassGate, adminCall } from "@/b2b/components/admin/AdminPassGate";
import { BookingRequestsTab } from "@/b2b/components/admin/BookingRequestsTab";
import { BusReviewTab } from "@/b2b/components/admin/BusReviewTab";
import { BusOpsCancellations } from "@/b2b/components/admin/BusOpsCancellations";
import { FinanceTab } from "@/b2b/components/admin/finance/FinanceTab";
import { KycQueueTab } from "@/b2b/components/admin/KycQueueTab";
import { AdminPageHeader, AdminTabsList, FleetKpiStrip, FleetPage, SECTION, Tabs, TabsContent } from "@/b2b/components/admin/kit";
import { ListingsTab } from "@/b2b/components/admin/ListingsTab";
import { MastersTab } from "@/b2b/components/admin/MastersTab";
import { OperationsTab } from "@/b2b/components/admin/ops/OperationsTab";
import { OrdersTab } from "@/b2b/components/admin/OrdersTab";
import { OrgsTab, type AdminOrg } from "@/b2b/components/admin/OrgsTab";
import { PlansTab } from "@/b2b/components/admin/plans/PlansTab";
import { PricingTab } from "@/b2b/components/admin/pricing/PricingTab";
import { PrivacyTab } from "@/b2b/components/admin/PrivacyTab";
import { StaffTab } from "@/b2b/components/admin/StaffTab";
import { UsageTab } from "@/b2b/components/admin/UsageTab";
import { ActivityTab, UsersTab } from "@/b2b/components/admin/UsersAndActivity";
import { WalletsTab } from "@/b2b/components/admin/wallets/WalletsTab";

type AreaKey = "partners" | "services" | "control";
type TabDef = { value: string; label: string; icon: LucideIcon; title: string; description: string; render: (token: string) => ReactNode };
type AreaDef = { key: AreaKey; label: string; icon: LucideIcon; tagline: string; tabs: TabDef[] };

// Stage 18: the bus review tab appears only when the website switch for buses is on.
const BUS_ON = process.env.NEXT_PUBLIC_FEATURE_BUS === "true";
const AREAS: AreaDef[] = [
  {
    key: "partners",
    label: "Partners",
    icon: Handshake,
    tagline: "The companies we work with — hotels that supply rooms, B2B clients that buy them, and their people.",
    tabs: [
      { value: "kyc", label: "Verification", icon: FileCheck2, title: "Verification", description: "Hotels and B2B clients waiting for KYC review.", render: (t) => <KycQueueTab token={t} /> },
      { value: "listings", label: "Hotel listings", icon: Hotel, title: "Listings", description: "Hotel listings waiting for approval, and every property.", render: (t) => <ListingsTab token={t} /> },
      ...(BUS_ON ? [{ value: "buses", label: "Buses", icon: BusFront, title: "Buses", description: "Bus operators' buses and routes waiting for approval: papers, seat maps, stops and times.", render: (t) => <BusReviewTab token={t} /> } satisfies TabDef] : []),
      { value: "orgs", label: "Companies", icon: Building2, title: "Organisations", description: "Client and hotel companies: status, category, suspend / reactivate.", render: (t) => <OrgsTab token={t} /> },
      { value: "users", label: "People", icon: Users, title: "Business users", description: "People who sign in to the business area.", render: (t) => <UsersTab token={t} /> },
      { value: "activity", label: "Activity", icon: Activity, title: "Activity", description: "Sign-ins and changes in every company.", render: (t) => <ActivityTab token={t} /> },
    ],
  },
  {
    key: "services",
    label: "Services",
    icon: Briefcase,
    tagline: "What we provide to them — bookings and after-booking care, the hotel catalogue and prices, wallets, plans and usage.",
    tabs: [
      ...(BUS_ON ? [{ value: "bus-cancels", label: "Bus cancellations", icon: BusFront, title: "Bus cancellations", description: "Cancel a bus booking or a whole trip with a full refund — two people.", render: (t: string) => <BusOpsCancellations token={t} /> } satisfies TabDef] : []),
      { value: "orders", label: "Orders", icon: ShoppingBag, title: "Orders", description: "Every booking (website and B2B): search, timeline, actions with two people.", render: (t) => <OrdersTab token={t} /> },
      { value: "operations", label: "Operations", icon: Headset, title: "Operations", description: "Change requests, no-show disputes, hotel failures, cancellations, hotels not answering.", render: (t) => <OperationsTab token={t} /> },
      { value: "requests", label: "Booking requests", icon: ClipboardList, title: "Booking requests", description: "B2B clients asking MusafirBaba to arrange a stay.", render: (t) => <BookingRequestsTab token={t} /> },
      { value: "pricing", label: "Pricing", icon: IndianRupee, title: "Pricing", description: "Margin rules, price simulator, GST rates and settings.", render: (t) => <PricingTab token={t} /> },
      { value: "masters", label: "Catalogue lists", icon: ListChecks, title: "Master lists", description: "Cities, amenities, property and bed types, meal plans.", render: (t) => <MastersTab token={t} /> },
      { value: "wallets", label: "Wallets & credit", icon: Wallet, title: "Client wallets", description: "Client wallets and credit, bank-transfer approvals, wallet adjustments.", render: (t) => <WalletsTab token={t} /> },
      { value: "plans", label: "Plans", icon: Layers, title: "Plans & billing", description: "Plans and what counts, subscriptions, top-ups, revenue, unpaid clients.", render: (t) => <PlansTab token={t} /> },
      { value: "usage", label: "Usage", icon: BarChart3, title: "Client usage", description: "Counted searches, prices and bookings per client.", render: (t) => <UsageTab token={t} /> },
    ],
  },
  {
    key: "control",
    label: "Control",
    icon: Settings2,
    tagline: "MusafirBaba's own back office — money, payouts, GST, reports and system health; data requests; who on our staff can do what.",
    tabs: [
      { value: "finance", label: "Finance", icon: Landmark, title: "Finance", description: "Ledger, payments, refunds, reconciliation, hotel payouts, GST register, reports, system health.", render: (t) => <FinanceTab token={t} /> },
      { value: "privacy", label: "Privacy", icon: ShieldCheck, title: "Data requests", description: "DPDP requests: copies, corrections and deletions of personal data (30 days).", render: (t) => <PrivacyTab token={t} /> },
      { value: "staff", label: "Staff access", icon: ShieldCheck, title: "Staff access", description: "Which MusafirBaba staff can use B2B admin.", render: (t) => <StaffTab token={t} /> },
    ],
  },
];
const OVERVIEW = "overview";
/** Tailwind needs whole class names: one per tab count (overview + an area's tabs). */
const GRID: Record<number, string> = {
  4: "lg:grid-cols-[repeat(4,minmax(0,1fr))]",
  6: "lg:grid-cols-[repeat(6,minmax(0,1fr))]",
  9: "lg:grid-cols-[repeat(9,minmax(0,1fr))]",
};

/** Area and tab from the address (`?area=services&tab=orders`); unknown values fall back to the Partners overview. */
function readLocation(): { area: AreaKey; tab: string } {
  if (typeof window === "undefined") return { area: "partners", tab: OVERVIEW };
  const p = new URLSearchParams(window.location.search);
  const tabParam = p.get("tab") ?? OVERVIEW;
  const byTab = AREAS.find((a) => a.tabs.some((t) => t.value === tabParam));
  const area = (byTab?.key ?? AREAS.find((a) => a.key === p.get("area"))?.key ?? "partners") as AreaKey;
  return { area, tab: byTab ? tabParam : OVERVIEW };
}

function AreaSwitcher({ area, onChange }: { area: AreaKey; onChange: (a: AreaKey) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {AREAS.map((a) => (
        <button
          key={a.key}
          onClick={() => onChange(a.key)}
          className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${area === a.key ? "border-[#FE5300] bg-orange-50/60 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}
        >
          <a.icon className={`mt-0.5 h-5 w-5 shrink-0 ${area === a.key ? "text-[#FE5300]" : "text-slate-400"}`} />
          <span>
            <span className={`block text-[14px] font-semibold ${area === a.key ? "text-slate-900" : "text-slate-700"}`}>{a.label}</span>
            <span className="block text-[12px] leading-snug text-slate-500">{a.tagline}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function Overview({ area, onOpen, counts }: { area: AreaDef; onOpen: (tab: string) => void; counts: Record<string, string | number> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {area.tabs.map((t) => (
        <button key={t.value} onClick={() => onOpen(t.value)} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-[#FE5300]/60 hover:shadow-sm">
          <span className="rounded-md bg-slate-50 p-2"><t.icon className="h-4 w-4 text-[#FE5300]" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="text-[14px] font-semibold text-slate-900">{t.label}</span>
              {counts[t.value] !== undefined && <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[12px] font-medium text-[#FE5300]">{counts[t.value]}</span>}
            </span>
            <span className="mt-0.5 block text-[12px] leading-snug text-slate-500">{t.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export default function B2BAdminPage() {
  return <AdminPassGate>{(token) => <B2BAdmin token={token} />}</AdminPassGate>;
}

function B2BAdmin({ token }: { token: string }) {
  const all = useQuery({ queryKey: ["b2b-admin", "orgs", "kpi"], queryFn: () => adminCall<{ data: AdminOrg[] }>("/admin/orgs?limit=200", token) });
  const queue = useQuery({ queryKey: ["b2b-admin", "kyc", "kpi"], queryFn: () => adminCall<{ data: QueueItem[] }>("/admin/kyc-applications", token), retry: false });
  const [loc, setLoc] = useState<{ area: AreaKey; tab: string }>({ area: "partners", tab: OVERVIEW });
  useEffect(() => setLoc(readLocation()), []);
  const go = (area: AreaKey, tab: string) => {
    setLoc({ area, tab });
    window.history.replaceState(null, "", `${window.location.pathname}?area=${area}${tab === OVERVIEW ? "" : `&tab=${tab}`}`);
  };
  const orgs = all.data?.data ?? [];
  const count = (f: (o: AdminOrg) => boolean) => (all.data ? orgs.filter(f).length : "—");
  const waiting = queue.data ? queue.data.data.filter((a) => a.status === "SUBMITTED").length : "—";
  const area = AREAS.find((a) => a.key === loc.area) ?? (AREAS[0] as AreaDef);
  const tabs = [{ value: OVERVIEW, label: "Overview", icon: LayoutGrid, title: "Overview", description: area.tagline }, ...area.tabs];
  return (
    <FleetPage>
      <AdminPageHeader
        section={SECTION}
        icon={Building2}
        title="B2B admin"
        description="Partners we work with, the services we provide to them, and our own back office."
        actions={
          <div className="flex items-center gap-2">
            <a href="/admin/b2b/guide" className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50"><BookOpen className="h-3.5 w-3.5" /> How it works</a>
            <AdminBell token={token} />
          </div>
        }
      />
      <FleetKpiStrip
        items={[
          { label: "Organisations", value: all.data ? orgs.length : "—", icon: Building2, tone: "slate" },
          { label: "Hotels", value: count((o) => o.type === "HOTEL"), icon: Hotel, tone: "sky" },
          { label: "B2B clients", value: count((o) => o.type === "CLIENT"), icon: Users, tone: "orange" },
          { label: "Waiting for review", value: waiting, icon: FileCheck2, tone: "red" },
        ]}
      />
      <AreaSwitcher area={loc.area} onChange={(a) => go(a, OVERVIEW)} />
      <Tabs value={loc.tab} onValueChange={(t) => go(loc.area, t)} className="flex flex-col gap-4">
        <AdminTabsList tabs={tabs} gridClassName={GRID[tabs.length] ?? "lg:grid-cols-[repeat(9,minmax(0,1fr))]"} />
        <TabsContent value={OVERVIEW} className="mt-0">
          <Overview area={area} onOpen={(t) => go(loc.area, t)} counts={loc.area === "partners" ? { kyc: waiting, orgs: all.data ? orgs.length : "—", listings: count((o) => o.type === "HOTEL") } : {}} />
        </TabsContent>
        {area.tabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-0">
            {loc.tab === t.value && t.render(token)}
          </TabsContent>
        ))}
      </Tabs>
    </FleetPage>
  );
}
