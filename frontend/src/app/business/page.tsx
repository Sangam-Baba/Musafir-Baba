"use client";
// Business area home: who you are, the organisation you're working in, and where to go next.
import Link from "next/link";

import { BusinessShell } from "@/b2b/components/BusinessShell";
import { roleName } from "@/b2b/roles";


export default function BusinessHome() {
  return (
    <BusinessShell>
      {(me) => {
        const current = me.memberships.find((m) => m.orgId === me.currentOrgId);
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Welcome, {me.user.name}</h1>
              <p className="text-sm text-slate-500">{me.user.email ?? me.user.phone}</p>
            </div>
            {current ? (
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs uppercase tracking-wide text-slate-500">Working in</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{current.displayName}</p>
                <p className="text-sm text-slate-500">
                  {current.type === "HOTEL" ? "Hotel" : "Travel business"} · {current.reference} · {current.status.toLowerCase()} · your role: {current.roles.map(roleName).join(", ")}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
                {me.memberships.length === 0 ? (
                  <>
                    You&apos;re not part of any organisation yet. Ask your organisation&apos;s owner for an invitation, or{" "}
                    <Link href="/business/register" className="text-[#FE5300] hover:underline">
                      register your hotel
                    </Link>
                    .
                  </>
                ) : (
                  "Choose an organisation at the top to start."
                )}
              </div>
            )}
            {current?.status === "ONBOARDING" && me.permissions.includes("kyc.application.read") && (
              <Link href="/business/verification" className="block rounded-xl border border-orange-200 bg-orange-50 p-5 transition hover:shadow-sm">
                <p className="font-semibold text-[#FE5300]">Finish your verification</p>
                <p className="mt-1 text-sm text-slate-600">Add your bank account and documents and submit them. Once MusafirBaba verifies your business, you can start listing.</p>
              </Link>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card href="/business/team" title="Team" text="Members, invitations, roles and branches." />
              <Card href="/business/activity" title="Activity" text="Sign-ins and changes in your organisation." />
              <Card href="/business/security" title="Security" text={me.mfa.totp === "on" ? "Two-step login is on." : "Turn on two-step login."} />
              <Card href="/business/register" title="Add another business" text="A hotel company with a different PAN? Register it under this same login." />
            </div>
            <p className="text-xs text-slate-400">Hotel listings, rooms, rates and bookings arrive in the next stages.</p>
          </div>
        );
      }}
    </BusinessShell>
  );
}

function Card({ href, title, text }: { href: string; title: string; text: string }) {
  return (
    <Link href={href} className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-orange-200 hover:shadow-sm">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </Link>
  );
}
