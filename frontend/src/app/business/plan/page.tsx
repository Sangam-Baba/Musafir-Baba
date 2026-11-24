"use client";
// The company's plan, query usage this month and invoices (Stage 13).
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PlanBilling } from "@/b2b/components/plan/PlanBilling";
import { PageHeader } from "@/b2b/components/portal/ui";

export default function PlanPage() {
  return (
    <BusinessShell>
      {(me) =>
        me.permissions.includes("subscriptions.subscription.read") ? (
          <div className="space-y-4">
            <PageHeader title="Plan &" highlight="billing" subtitle="Your plan, this month's queries and your invoices. Plan fees are taken from your wallet." />
            <PlanBilling canChange={me.permissions.includes("subscriptions.subscription.change") && !me.viewAs} />
          </div>
        ) : (
          <p className="text-[13px] text-slate-600">Only your company&apos;s owner, admin or accountant can see the plan.</p>
        )
      }
    </BusinessShell>
  );
}
