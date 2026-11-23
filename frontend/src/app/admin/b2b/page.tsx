"use client";
// B2B admin (MusafirBaba staff): organisations, business users, activity and staff access.
// Lives inside the existing admin panel and its login, built from the admin's own UI kit.
import { useQuery } from "@tanstack/react-query";
import { Activity, Building2, ClipboardList, FileCheck2, Hotel, Headset, IndianRupee, Landmark, ShoppingBag, ListChecks, ShieldCheck, Users, Wallet, BarChart3, Layers } from "lucide-react";

import type { QueueItem } from "@/b2b/admin-kyc";
import { AdminBell } from "@/b2b/components/admin/AdminBell";
import { BookingRequestsTab } from "@/b2b/components/admin/BookingRequestsTab";
import { FinanceTab } from "@/b2b/components/admin/finance/FinanceTab";
import { OrdersTab } from "@/b2b/components/admin/OrdersTab";
import { OperationsTab } from "@/b2b/components/admin/ops/OperationsTab";
import { AdminPassGate, adminCall } from "@/b2b/components/admin/AdminPassGate";
import { KycQueueTab } from "@/b2b/components/admin/KycQueueTab";
import { ListingsTab } from "@/b2b/components/admin/ListingsTab";
import { MastersTab } from "@/b2b/components/admin/MastersTab";
import { AdminPageHeader, AdminTabsList, FleetKpiStrip, FleetPage, SECTION, Tabs, TabsContent } from "@/b2b/components/admin/kit";
import { OrgsTab, type AdminOrg } from "@/b2b/components/admin/OrgsTab";
import { PricingTab } from "@/b2b/components/admin/pricing/PricingTab";
import { StaffTab } from "@/b2b/components/admin/StaffTab";
import { WalletsTab } from "@/b2b/components/admin/wallets/WalletsTab";
import { UsageTab } from "@/b2b/components/admin/UsageTab";
import { PlansTab } from "@/b2b/components/admin/plans/PlansTab";
import { ActivityTab, UsersTab } from "@/b2b/components/admin/UsersAndActivity";

const TABS = [
  { value: "kyc", label: "Verification", icon: FileCheck2, title: "Verification", description: "Hotels waiting for KYC review." },
  { value: "listings", label: "Listings", icon: Hotel, title: "Listings", description: "Hotel listings waiting for approval, and every property." },
  { value: "orders", label: "Orders", icon: ShoppingBag, title: "Orders", description: "Website bookings: search, timeline, actions with two people, hotels not answering." },
  { value: "operations", label: "Operations", icon: Headset, title: "Operations", description: "Change requests, no-show disputes, hotel failures, cancellations, hotel payouts." },
  { value: "requests", label: "Requests", icon: ClipboardList, title: "Booking requests", description: "B2B clients asking MusafirBaba to arrange a stay." },
  { value: "masters", label: "Masters", icon: ListChecks, title: "Master lists", description: "Cities, amenities, property and bed types, meal plans." },
  { value: "pricing", label: "Pricing", icon: IndianRupee, title: "Pricing", description: "Margin rules, price simulator, GST rates and settings." },
  { value: "finance", label: "Finance", icon: Landmark, title: "Finance", description: "Ledger accounts, corrections, PayU payments, refunds and reconciliation." },
  { value: "wallets", label: "Wallets", icon: Wallet, title: "Client wallets", description: "Client wallets and credit, bank-transfer approvals, wallet adjustments, manual credits report." },
  { value: "usage", label: "Usage", icon: BarChart3, title: "Client usage", description: "Counted searches, prices and bookings per client (billing comes with plans)." },
  { value: "plans", label: "Plans", icon: Layers, title: "Plans & billing", description: "Plans and what counts, client subscriptions and top-ups, revenue, unpaid clients." },
  { value: "orgs", label: "Organisations", icon: Building2, title: "Organisations", description: "Client and hotel organisations." },
  { value: "users", label: "Users", icon: Users, title: "Business users", description: "People who sign in to the business area." },
  { value: "activity", label: "Activity", icon: Activity, title: "Activity", description: "Sign-ins and changes in every organisation." },
  { value: "staff", label: "Staff access", icon: ShieldCheck, title: "Staff access", description: "Which MusafirBaba staff can use B2B admin." },
];

export default function B2BAdminPage() {
  return <AdminPassGate>{(token) => <B2BAdmin token={token} />}</AdminPassGate>;
}

function B2BAdmin({ token }: { token: string }) {
  const all = useQuery({ queryKey: ["b2b-admin", "orgs", "kpi"], queryFn: () => adminCall<{ data: AdminOrg[] }>("/admin/orgs?limit=200", token) });
  const queue = useQuery({ queryKey: ["b2b-admin", "kyc", "kpi"], queryFn: () => adminCall<{ data: QueueItem[] }>("/admin/kyc-applications", token), retry: false });
  const orgs = all.data?.data ?? [];
  const count = (f: (o: AdminOrg) => boolean) => (all.data ? orgs.filter(f).length : "—");
  return (
    <FleetPage>
      <AdminPageHeader section={SECTION} icon={Building2} title="B2B admin" description="Hotel verification, client and hotel organisations, business users, activity and staff access." actions={<AdminBell token={token} />} />
      <FleetKpiStrip
        items={[
          { label: "Organisations", value: all.data ? orgs.length : "—", icon: Building2, tone: "slate" },
          { label: "Hotels", value: count((o) => o.type === "HOTEL"), icon: Hotel, tone: "sky" },
          { label: "B2B clients", value: count((o) => o.type === "CLIENT"), icon: Users, tone: "orange" },
          { label: "Waiting for review", value: queue.data ? queue.data.data.filter((a) => a.status === "SUBMITTED").length : "—", icon: FileCheck2, tone: "red" },
        ]}
      />
      <Tabs defaultValue="kyc" className="flex flex-col gap-4">
        <AdminTabsList tabs={TABS} gridClassName="lg:grid-cols-[repeat(15,minmax(0,1fr))]" />
        <TabsContent value="kyc" className="mt-0">
          <KycQueueTab token={token} />
        </TabsContent>
        <TabsContent value="listings" className="mt-0">
          <ListingsTab token={token} />
        </TabsContent>
        <TabsContent value="orders" className="mt-0">
          <OrdersTab token={token} />
        </TabsContent>
        <TabsContent value="operations" className="mt-0">
          <OperationsTab token={token} />
        </TabsContent>
        <TabsContent value="requests" className="mt-0">
          <BookingRequestsTab token={token} />
        </TabsContent>
        <TabsContent value="masters" className="mt-0">
          <MastersTab token={token} />
        </TabsContent>
        <TabsContent value="pricing" className="mt-0">
          <PricingTab token={token} />
        </TabsContent>
        <TabsContent value="finance" className="mt-0">
          <FinanceTab token={token} />
        </TabsContent>
        <TabsContent value="wallets" className="mt-0">
          <WalletsTab token={token} />
        </TabsContent>
        <TabsContent value="usage" className="mt-0">
          <UsageTab token={token} />
        </TabsContent>
        <TabsContent value="plans" className="mt-0">
          <PlansTab token={token} />
        </TabsContent>
        <TabsContent value="orgs" className="mt-0">
          <OrgsTab token={token} />
        </TabsContent>
        <TabsContent value="users" className="mt-0">
          <UsersTab token={token} />
        </TabsContent>
        <TabsContent value="activity" className="mt-0">
          <ActivityTab token={token} />
        </TabsContent>
        <TabsContent value="staff" className="mt-0">
          <StaffTab token={token} />
        </TabsContent>
      </Tabs>
    </FleetPage>
  );
}
