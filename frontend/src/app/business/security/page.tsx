"use client";
// Settings & Security (inspired by the approved screens): account information, two-step login, signed-in devices,
// and notification choices. Every action uses the existing sign-in, two-step and notification endpoints.
import { Bell, ShieldCheck, User } from "lucide-react";
import { useState } from "react";

import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader, Tabs } from "@/b2b/components/portal/ui";
import { AccountPanel, NotificationPrefsPanel, SignOutEverywherePanel } from "@/b2b/components/settings/AccountPanels";
import { TwoStepPanel } from "@/b2b/components/settings/TwoStepPanel";
import type { Me } from "@/b2b/types";

type Tab = "account" | "security" | "notifications";

export default function SecurityPage() {
  return <BusinessShell>{(me) => <Settings me={me} />}</BusinessShell>;
}

function Settings({ me }: { me: Me }) {
  const [tab, setTab] = useState<Tab>("account");
  return (
    <div className="space-y-4">
      <PageHeader crumb="Settings & Security" title="Settings &" highlight="Security" subtitle="Your account, sign-in security and notifications." />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "account", label: "Account settings", icon: User },
          { value: "security", label: "Security", icon: ShieldCheck },
          { value: "notifications", label: "Notifications", icon: Bell },
        ]}
      />
      {tab === "account" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <AccountPanel me={me} />
          <TwoStepPanel status={me.mfa.totp} left={me.mfa.recoveryCodesLeft} />
        </div>
      )}
      {tab === "security" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <TwoStepPanel status={me.mfa.totp} left={me.mfa.recoveryCodesLeft} />
          <SignOutEverywherePanel />
        </div>
      )}
      {tab === "notifications" && (
        <div className="max-w-3xl">
          <NotificationPrefsPanel readOnly={Boolean(me.viewAs)} />
        </div>
      )}
    </div>
  );
}
