"use client";
// Overview: welcome, where the business stands (verification, then the first live listing — from real data),
// real counts, the onboarding checklist, and help.
import { useQuery } from "@tanstack/react-query";
import { Bell, BookOpen, Building2, CheckCircle2, Headphones, Hotel, ListChecks, Plus, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";

import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { Checklist, ProgressCard } from "@/b2b/components/portal/overview";
import { PageHeader, StatCard } from "@/b2b/components/portal/ui";
import type { KycApplication } from "@/b2b/kyc";
import type { Property } from "@/b2b/listing";
import { listingSteps, verificationSteps } from "@/b2b/onboarding";
import { useBusinessSession } from "@/b2b/session-store";
import { SUPPORT } from "@/b2b/support";
import type { Me } from "@/b2b/types";

export default function BusinessHome() {
  return <BusinessShell>{(me) => <Overview me={me} />}</BusinessShell>;
}

function NoBusiness({ me }: { me: Me }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <Building2 className="mx-auto h-10 w-10 text-[#FE5300]" />
      <p className="mt-3 font-semibold text-slate-900">{me.memberships.length === 0 ? "You're not part of a business yet" : "Choose a business at the top to start"}</p>
      {me.memberships.length === 0 && (
        <p className="mt-1 text-sm text-slate-600">
          Ask your business&apos;s owner for an invitation, or{" "}
          <Link href="/business/register" className="font-medium text-[#FE5300] hover:underline">
            register your hotel
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function HelpCard() {
  return (
    <section className="rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-5">
      <div className="flex items-center gap-3">
        <Headphones className="h-6 w-6 text-[#FE5300]" />
        <h2 className="font-semibold text-slate-900">Need assistance?</h2>
      </div>
      <p className="mt-2 text-sm text-slate-600">Our partner team helps with onboarding, verification and listings.</p>
      <p className="mt-3 text-sm">
        <a href={`mailto:${SUPPORT.email}`} className="font-medium text-[#FE5300] hover:underline">
          {SUPPORT.email}
        </a>
        <span className="text-slate-400"> · </span>
        <a href={SUPPORT.phoneHref} className="font-medium text-slate-800">
          {SUPPORT.phone}
        </a>
      </p>
      <Link href="/business/help" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#FE5300] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e54b00]">
        <BookOpen className="h-4 w-4" /> Help & FAQs
      </Link>
    </section>
  );
}

function Overview({ me }: { me: Me }) {
  const token = useBusinessSession((s) => s.accessToken);
  const current = me.memberships.find((m) => m.orgId === me.currentOrgId);
  const can = (p: string) => me.permissions.includes(p);
  const scope = [token, me.currentOrgId];
  const kyc = useQuery({ queryKey: ["b2b", "kyc", ...scope], queryFn: () => b2b<KycApplication>("/kyc"), enabled: Boolean(current) && can("kyc.application.read") });
  const props = useQuery({ queryKey: ["b2b", "properties", ...scope], queryFn: () => b2b<{ data: Property[] }>("/hotel/properties"), enabled: Boolean(current) && can("hotel-catalog.property.read") });
  const members = useQuery({ queryKey: ["b2b", "team", "members", ...scope], queryFn: () => b2b<{ data: unknown[] }>("/members"), enabled: Boolean(current) && can("organizations.member.read") });
  const unread = useQuery({ queryKey: ["b2b", "notifications", "count", me.currentOrgId, token], queryFn: () => b2b<{ count: number }>("/notifications/unread-count"), enabled: Boolean(token) });

  const header = <PageHeader title="Welcome," highlight={`${me.user.name.split(" ")[0]}!`} subtitle={current ? `Your MusafirBaba Business workspace · ${current.displayName}` : "Your MusafirBaba Business workspace"} />;
  if (!current) return <div className="space-y-6">{header}<NoBusiness me={me} /></div>;

  const properties = props.data?.data ?? [];
  const live = properties.filter((p) => p.status === "LIVE").length;
  const verified = kyc.data?.status === "APPROVED" || current.status === "ACTIVE";
  const vSteps = kyc.data ? verificationSteps(me, kyc.data) : null;
  const lSteps = listingSteps(properties);
  const showListing = verified && can("hotel-catalog.property.read") && live === 0;
  const count = (q: { data?: unknown; isLoading: boolean }, n: number | undefined) => (q.isLoading ? "…" : (n ?? 0));

  return (
    <div className="space-y-6">
      {header}
      {vSteps && !verified && (
        <ProgressCard
          title={kyc.data?.status === "REJECTED" ? "Your verification needs changes" : kyc.data?.status === "SUBMITTED" || kyc.data?.status === "UNDER_REVIEW" ? "Verification in progress" : "Complete your business verification"}
          text={kyc.data?.status === "SUBMITTED" || kyc.data?.status === "UNDER_REVIEW" ? "MusafirBaba is reviewing your documents. You'll get an email and a notification when it's decided." : "Finish your setup so MusafirBaba can verify your business — then you can start listing your property."}
          steps={vSteps}
          cta={vSteps.find((s) => !s.done && !s.waiting) ? { label: "Continue verification", href: "/business/verification" } : undefined}
        />
      )}
      {showListing && (
        <ProgressCard
          icon={Hotel}
          title="Your business is verified — list your property"
          text="Add your property's details, room types and photos, then submit it. Once MusafirBaba approves it, it goes live."
          steps={lSteps}
          cta={lSteps.find((s) => !s.done && !s.waiting && s.href) ? { label: properties.length ? "Continue your listing" : "Add your property", href: lSteps.find((s) => !s.done && s.href)?.href ?? "/business/properties" } : undefined}
        />
      )}
      {verified && live > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5" /> {current.displayName} is verified and {live === 1 ? "1 listing is" : `${live} listings are`} live on MusafirBaba.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can("hotel-catalog.property.read") && <StatCard icon={Hotel} label="Properties" value={count(props, properties.length)} href="/business/properties" />}
        {can("hotel-catalog.property.read") && <StatCard icon={ListChecks} tone="green" label="Live listings" value={count(props, live)} href="/business/properties" />}
        {can("organizations.member.read") && <StatCard icon={Users} tone="violet" label="Team members" value={count(members, members.data?.data.length)} href="/business/team" />}
        <StatCard icon={Bell} tone="blue" label="Unread notifications" value={count(unread, unread.data?.count)} />
        {can("kyc.application.read") && !can("hotel-catalog.property.read") && <StatCard icon={ShieldCheck} tone="amber" label="Verification" value={verified ? "Verified" : "Pending"} href="/business/verification" />}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-6">
          {vSteps && !verified && <Checklist title="Onboarding checklist" steps={vSteps} />}
          {showListing && <Checklist title="Get your first listing live" steps={lSteps} />}
          {(!vSteps || verified) && !showListing && (
            <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
              <Link href="/business/properties" className="rounded-lg border border-slate-200 p-4 hover:border-[#FE5300]">
                <p className="font-medium text-slate-900">My Properties</p>
                <p className="text-xs text-slate-500">Edit details, rooms, photos and where they're sold.</p>
              </Link>
              <Link href="/business/team" className="rounded-lg border border-slate-200 p-4 hover:border-[#FE5300]">
                <p className="font-medium text-slate-900">Team & Access</p>
                <p className="text-xs text-slate-500">Invite staff and choose what they can do.</p>
              </Link>
            </section>
          )}
        </div>
        <div className="space-y-4">
          <HelpCard />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Link href="/business/security" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-[#FE5300]">
              <ShieldCheck className="h-5 w-5 text-[#FE5300]" />
              <p className="mt-2 font-medium text-slate-900">Two-step login</p>
              <p className="text-xs text-slate-500">{me.mfa.totp === "on" ? "On" : "Turn it on"}</p>
            </Link>
            <Link href="/business/register" className="rounded-xl border border-slate-200 bg-white p-4 hover:border-[#FE5300]">
              <Plus className="h-5 w-5 text-[#FE5300]" />
              <p className="mt-2 font-medium text-slate-900">Add business</p>
              <p className="text-xs text-slate-500">Another company (PAN)</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
