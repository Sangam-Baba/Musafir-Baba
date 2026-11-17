"use client";
// Hotel verification (inspired by the approved screens): status banner and timeline, then documents, details,
// bank account and GST registrations; submit, help and important information on the right.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Headphones, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader } from "@/b2b/components/portal/ui";
import { BankSection } from "@/b2b/components/kyc/BankSection";
import { DetailsSection } from "@/b2b/components/kyc/DetailsSection";
import { DocumentsSection } from "@/b2b/components/kyc/DocumentsSection";
import { GstRegistrationsSection } from "@/b2b/components/kyc/GstRegistrationsSection";
import { VerificationStatus } from "@/b2b/components/kyc/VerificationStatus";
import { SUPPORT } from "@/b2b/support";
import { KYC_PERMISSION_READ, KYC_PERMISSION_SUBMIT, type KycApplication } from "@/b2b/kyc";
import { errorMessage } from "@/b2b/messages";
import { useBusinessSession } from "@/b2b/session-store";
import type { Me } from "@/b2b/types";

export default function VerificationPage() {
  return <BusinessShell>{(me) => <Verification me={me} />}</BusinessShell>;
}

function Verification({ me }: { me: Me }) {
  const token = useBusinessSession((s) => s.accessToken);
  const queryClient = useQueryClient();
  const canRead = me.permissions.includes(KYC_PERMISSION_READ);
  const app = useQuery({ queryKey: ["b2b", "kyc", token, me.currentOrgId], queryFn: () => b2b<KycApplication>("/kyc"), enabled: canRead });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["b2b", "kyc"] });

  if (!canRead) return <p className="text-sm text-slate-600">Only the organisation's Owner can see the verification. Ask them for help.</p>;
  if (app.isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!app.data) return <p className="text-sm text-red-700">{errorMessage(app.error)}</p>;
  const a = app.data;
  const canEdit = a.editable && me.permissions.includes(KYC_PERMISSION_SUBMIT) && !me.viewAs;
  return (
    <div className="space-y-6">
      <PageHeader crumb="Verification" title="Business" highlight="Verification" subtitle="Complete verification to activate your MusafirBaba Business account and start listing." />
      {!me.user.emailVerified && <EmailBanner email={me.user.email} />}
      <VerificationStatus app={a} orgActive={me.memberships.find((m) => m.orgId === me.currentOrgId)?.status === "ACTIVE"} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <DocumentsSection app={a} canEdit={canEdit} onChanged={refresh} />
          <DetailsSection app={a} canEdit={canEdit} onSaved={refresh} />
          <BankSection key={`bank-${a.revision}`} app={a} canEdit={canEdit} onSaved={refresh} />
          <GstRegistrationsSection app={a} canEdit={me.permissions.includes(KYC_PERMISSION_SUBMIT) && !me.viewAs} onChanged={refresh} />
        </div>
        <aside className="space-y-4">
          {canEdit && <SubmitBar app={a} emailVerified={me.user.emailVerified} onDone={refresh} />}
          <section className="rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-5">
            <p className="flex items-center gap-2 font-semibold text-slate-900">
              <Headphones className="h-5 w-5 text-[#FE5300]" /> Need help with verification?
            </p>
            <p className="mt-2 text-sm text-slate-600">Our partner team can help with documents and the verification process.</p>
            <a href={`mailto:${SUPPORT.email}`} className="mt-4 inline-flex rounded-lg bg-[#FE5300] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e54b00]">
              Contact support →
            </a>
            <p className="mt-2 text-xs text-slate-500">{SUPPORT.phone} · {SUPPORT.hours}</p>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="flex items-center gap-2 font-semibold text-slate-900">
              <Info className="h-5 w-5 text-[#FE5300]" /> Important information
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-600 marker:text-[#FE5300]">
              <li>Make sure every document is clear, valid and readable.</li>
              <li>Files: PDF, JPG or PNG — up to 10 MB each.</li>
              <li>Verification usually takes 1–2 working days.</li>
              <li>You&apos;ll get an email and a notification in the bell when it&apos;s decided.</li>
              <li>Your PAN and bank account number are stored encrypted; only the last 4 digits are shown.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function EmailBanner({ email }: { email: string | null }) {
  const [sent, setSent] = useState(false);
  async function resend() {
    try {
      await b2b("/registrations/resend-verification", { method: "POST" });
      setSent(true);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
      <span className="flex-1">Please confirm your email ({email}) — we sent you a link. You need it before you can submit.</span>
      {sent ? <span>New link sent.</span> : <button onClick={resend} className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium hover:bg-amber-100">Send a new link</button>}
    </div>
  );
}

function SubmitBar({ app, emailVerified, onDone }: { app: KycApplication; emailVerified: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const label = (key: string) => app.documentSet.find((d) => d.key === key)?.label ?? key;
  const blockers = [
    !emailVerified && "confirm your email",
    !app.bank && "add your bank account",
    app.missingDocuments.length > 0 && `upload: ${app.missingDocuments.map(label).join(", ")}`,
  ].filter(Boolean) as string[];

  async function submit() {
    setBusy(true);
    try {
      await b2b("/kyc/submit", { method: "POST", body: {} });
      toast.success("Submitted — we'll let you know by email.");
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <p className="font-semibold text-slate-900">{app.status === "REJECTED" ? "Submit again" : "Submit for verification"}</p>
      <p className="text-sm text-slate-600">{blockers.length > 0 ? `Before you submit: ${blockers.join("; ")}.` : "Everything is ready. Submit for verification."}</p>
      <button onClick={submit} disabled={busy || blockers.length > 0} className="w-full rounded-lg bg-[#FE5300] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e54b00] disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? "Submitting…" : app.status === "REJECTED" ? "Submit again" : "Submit for verification"}
      </button>
    </div>
  );
}
