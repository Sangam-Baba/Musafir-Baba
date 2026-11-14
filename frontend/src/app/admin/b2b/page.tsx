"use client";
// B2B admin (MusafirBaba staff): organisations, business users, activity and staff access.
// Lives inside the existing admin panel and its login, built from the admin's own UI kit.
import { useQuery } from "@tanstack/react-query";
import { Activity, Ban, Building2, Hotel, ShieldCheck, Users } from "lucide-react";

import { AdminPassGate, adminCall } from "@/b2b/components/admin/AdminPassGate";
import { AdminPageHeader, AdminTabsList, FleetKpiStrip, FleetPage, SECTION, Tabs, TabsContent } from "@/b2b/components/admin/kit";
import { OrgsTab, type AdminOrg } from "@/b2b/components/admin/OrgsTab";
import { StaffTab } from "@/b2b/components/admin/StaffTab";
import { ActivityTab, UsersTab } from "@/b2b/components/admin/UsersAndActivity";

const TABS = [
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
  const orgs = all.data?.data ?? [];
  const count = (f: (o: AdminOrg) => boolean) => (all.data ? orgs.filter(f).length : "—");
  return (
    <FleetPage>
      <AdminPageHeader section={SECTION} icon={Building2} title="B2B admin" description="Client and hotel organisations, business users, activity and staff access." />
      <FleetKpiStrip
        items={[
          { label: "Organisations", value: all.data ? orgs.length : "—", icon: Building2, tone: "slate" },
          { label: "Hotels", value: count((o) => o.type === "HOTEL"), icon: Hotel, tone: "sky" },
          { label: "B2B clients", value: count((o) => o.type === "CLIENT"), icon: Users, tone: "orange" },
          { label: "Suspended", value: count((o) => o.status === "SUSPENDED"), icon: Ban, tone: "red" },
        ]}
      />
      <Tabs defaultValue="orgs" className="flex flex-col gap-4">
        <AdminTabsList tabs={TABS} gridClassName="lg:grid-cols-4" />
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
