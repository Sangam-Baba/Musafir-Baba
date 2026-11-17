"use client";
// Hotel verification: status and timeline, then details → bank account → documents → submit.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "@/b2b/api";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader } from "@/b2b/components/portal/ui";
import { BankSection } from "@/b2b/components/kyc/BankSection";
import { DetailsSection } from "@/b2b/components/kyc/DetailsSection";
import { DocumentsSection } from "@/b2b/components/kyc/DocumentsSection";
import { GstRegistrationsSection } from "@/b2b/components/kyc/GstRegistrationsSection";
import { StatusPanel } from "@/b2b/components/kyc/StatusPanel";
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
      <StatusPanel app={a} />
      <DetailsSection app={a} canEdit={canEdit} onSaved={refresh} />
      <GstRegistrationsSection app={a} canEdit={me.permissions.includes(KYC_PERMISSION_SUBMIT) && !me.viewAs} onChanged={refresh} />
      <BankSection key={`bank-${a.revision}`} app={a} canEdit={canEdit} onSaved={refresh} />
      <DocumentsSection app={a} canEdit={canEdit} onChanged={refresh} />
      {canEdit && <SubmitBar app={a} emailVerified={me.user.emailVerified} onDone={refresh} />}
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
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-5">
      <p className="flex-1 text-sm text-slate-600">{blockers.length > 0 ? `Before you submit: ${blockers.join("; ")}.` : "Everything is ready. Submit for verification."}</p>
      <button onClick={submit} disabled={busy || blockers.length > 0} className="rounded-lg bg-[#FE5300] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e54b00] disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? "Submitting…" : app.status === "REJECTED" ? "Submit again" : "Submit for verification"}
      </button>
    </div>
  );
}
