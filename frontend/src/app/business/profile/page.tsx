"use client";
// Business Profile: who the business is, read-only. Organisation facts come from the membership; the
// registered details, bank and GST registrations come from verification (only for roles that may read it).
import { useQuery } from "@tanstack/react-query";
import { Building2, FileText, Landmark, MapPin, Receipt } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader, Panel, Pill } from "@/b2b/components/portal/ui";
import { ENTITY_TYPES, KYC_PERMISSION_READ, STATUS_TEXT, stateName, type KycApplication } from "@/b2b/kyc";
import { errorMessage } from "@/b2b/messages";
import { roleName } from "@/b2b/roles";
import { useBusinessSession } from "@/b2b/session-store";
import type { Me, Membership } from "@/b2b/types";

export default function ProfilePage() {
  return <BusinessShell>{(me) => <Profile me={me} />}</BusinessShell>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-2.5 text-sm last:border-0 sm:grid-cols-[12rem_1fr]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900">{children ?? "—"}</dd>
    </div>
  );
}

const TYPE_TEXT: Record<string, string> = { HOTEL: "Hotel supplier", CLIENT: "Travel business (client)", PLATFORM: "MusafirBaba" };

function OrgPanel({ org, kyc }: { org: Membership; kyc: KycApplication | undefined }) {
  return (
    <Panel icon={Building2} title={org.displayName} subtitle={TYPE_TEXT[org.type] ?? org.type} action={<Pill tone={org.status === "ACTIVE" ? "green" : "amber"}>{org.status === "ACTIVE" ? "Active" : org.status.toLowerCase()}</Pill>}>
      <dl>
        <Row label="Business ID">{org.reference}</Row>
        <Row label="Your role">{roleName(org.roles[0] ?? "")}</Row>
        {kyc && <Row label="Verification">{STATUS_TEXT[kyc.status].label}</Row>}
      </dl>
    </Panel>
  );
}

function DetailsPanels({ kyc }: { kyc: KycApplication }) {
  const d = kyc.details;
  if (!d) {
    return (
      <Panel icon={FileText} title="Registered details" subtitle="Not filled in yet.">
        <Link href="/business/verification" className="text-sm font-medium text-[#FE5300] hover:underline">
          Add them on the Verification page →
        </Link>
      </Panel>
    );
  }
  const a = d.address;
  return (
    <>
      <Panel icon={FileText} title="Registered details" subtitle="Changes go through Verification.">
        <dl>
          <Row label="Legal name">{d.legalName}</Row>
          {d.tradeName && <Row label="Trade name">{d.tradeName}</Row>}
          {d.entityType && <Row label="Type of business">{ENTITY_TYPES[d.entityType]}</Row>}
          {d.yearEstablished && <Row label="Year established">{d.yearEstablished}</Row>}
          <Row label="PAN">•••• {d.panLast4}</Row>
          <Row label="Key contact">
            {d.contactName}
            {d.contactDesignation ? ` · ${d.contactDesignation}` : ""}
          </Row>
          <Row label="Email">{d.email}</Row>
          <Row label="Mobile">
            {d.mobile}
            {d.alternateMobile ? ` · ${d.alternateMobile}` : ""}
          </Row>
          <Row label="Properties">{d.propertyCount}</Row>
        </dl>
      </Panel>
      <Panel icon={MapPin} title="Registered address">
        <p className="text-sm text-slate-800">
          {[a.line1, a.line2, a.city, `${stateName(a.stateCode)} ${a.pin}`].filter(Boolean).join(", ")}
        </p>
      </Panel>
    </>
  );
}

function TaxPanels({ kyc }: { kyc: KycApplication }) {
  const d = kyc.details;
  return (
    <>
      <Panel icon={Receipt} title="GST registrations" subtitle="One GSTIN per state, all under the same PAN.">
        {!d?.gstRegistered && kyc.gstRegistrations.length === 0 ? (
          <p className="text-sm text-slate-600">Not registered for GST.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {d?.gstin && (
              <li className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {d.gstin} <span className="text-slate-500">· main · {stateName(d.address.stateCode)}</span>
                </span>
                <Pill tone={kyc.status === "APPROVED" ? "green" : "amber"}>{kyc.status === "APPROVED" ? "Verified" : "With verification"}</Pill>
              </li>
            )}
            {kyc.gstRegistrations.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {g.gstin} <span className="text-slate-500">· {stateName(g.stateCode)}</span>
                </span>
                <Pill tone={g.status === "VERIFIED" ? "green" : g.status === "REJECTED" ? "red" : "amber"}>{g.status === "VERIFIED" ? "Verified" : g.status === "REJECTED" ? "Not accepted" : "Being checked"}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel icon={Landmark} title="Bank account" subtitle="Where MusafirBaba pays you.">
        {kyc.bank ? (
          <dl>
            <Row label="Account holder">{kyc.bank.holderName}</Row>
            <Row label="Account">•••• {kyc.bank.accountLast4}</Row>
            <Row label="IFSC">{kyc.bank.ifsc}</Row>
          </dl>
        ) : (
          <p className="text-sm text-slate-600">Not added yet.</p>
        )}
      </Panel>
    </>
  );
}

function Profile({ me }: { me: Me }) {
  const token = useBusinessSession((s) => s.accessToken);
  const org = me.memberships.find((m) => m.orgId === me.currentOrgId);
  const canKyc = me.permissions.includes(KYC_PERMISSION_READ);
  const kyc = useQuery({ queryKey: ["b2b", "kyc", token, me.currentOrgId], queryFn: () => b2b<KycApplication>("/kyc"), enabled: Boolean(org) && canKyc });
  const header = <PageHeader crumb="Business Profile" title="Business" highlight="Profile" subtitle="Your business as MusafirBaba knows it." />;
  if (!org) return <div className="space-y-6">{header}<p className="text-sm text-slate-600">Choose a business at the top first.</p></div>;
  return (
    <div className="space-y-6">
      {header}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <OrgPanel org={org} kyc={kyc.data} />
          {kyc.data && <DetailsPanels kyc={kyc.data} />}
        </div>
        <div className="space-y-6">
          {kyc.data && <TaxPanels kyc={kyc.data} />}
          {kyc.error && <p className="text-sm text-red-700">{errorMessage(kyc.error)}</p>}
          {!canKyc && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">Registered details, GST and bank are visible to the business owner and managers.</p>}
        </div>
      </div>
    </div>
  );
}
