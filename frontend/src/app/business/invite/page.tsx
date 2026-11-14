"use client";
// Accept an invitation from the emailed link (?token=…). New people create their account here and
// land in the organisation; people who already have an account sign in first.
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { b2b, refreshBusinessSession } from "@/b2b/api";
import { AuthCard, FormError } from "@/b2b/components/AuthCard";
import { Field, PrimaryButton } from "@/b2b/components/Field";
import { errorMessage } from "@/b2b/messages";
import { useBusinessSession } from "@/b2b/session-store";
import type { Tokens } from "@/b2b/types";

interface InvitationInfo {
  email: string;
  orgName: string;
  orgType: "CLIENT" | "HOTEL" | null;
  roles: string[];
}

function AcceptInvitation() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const accessToken = useBusinessSession((s) => s.accessToken);
  const setToken = useBusinessSession((s) => s.setAccessToken);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const info = useQuery({ queryKey: ["b2b", "invite", token], queryFn: () => b2b<InvitationInfo>(`/invitations/lookup?token=${encodeURIComponent(token)}`), enabled: token.length > 0, retry: false });

  useEffect(() => {
    if (!accessToken) void refreshBusinessSession(); // already signed in on this device?
  }, [accessToken]);

  async function accept(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (accessToken) {
        const r = await b2b<{ orgId: string }>("/invitations/accept", { method: "POST", body: { token } });
        const switched = await b2b<{ accessToken: string }>("/orgs/switch", { method: "POST", body: { orgId: r.orgId } });
        setToken(switched.accessToken);
      } else {
        const tokens = await b2b<Tokens>("/invitations/accept", { method: "POST", body: { token, name: name.trim(), password } });
        setToken(tokens.accessToken);
      }
      router.replace("/business");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!token || info.isError) {
    return (
      <AuthCard title="Invitation not valid">
        <p className="text-sm text-slate-600">{info.isError ? errorMessage(info.error) : "This link has no invitation in it."}</p>
      </AuthCard>
    );
  }
  if (!info.data) return <AuthCard title="Checking your invitation…">{null}</AuthCard>;
  const kind = info.data.orgType === "HOTEL" ? "hotel" : "travel business";
  return (
    <AuthCard title={`Join ${info.data.orgName}`} subtitle={`You've been invited to this ${kind} on MusafirBaba Business as ${info.data.email}.`}>
      <form onSubmit={accept} className="space-y-4">
        {accessToken ? (
          <p className="text-sm text-slate-600">You're signed in. Accept to add {info.data.orgName} to your account.</p>
        ) : (
          <>
            <Field label="Your name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            <Field label="Choose a password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" hint="At least 10 characters." required />
            <p className="text-xs text-slate-500">
              Already have an account? <Link href="/business/login" className="text-[#FE5300] hover:underline">Sign in</Link>, then open the invitation link again.
            </p>
          </>
        )}
        <FormError message={error} />
        <PrimaryButton type="submit" busy={busy}>
          Accept invitation
        </PrimaryButton>
      </form>
    </AuthCard>
  );
}

export default function InvitationPage() {
  // useSearchParams needs a Suspense boundary, otherwise the production build fails
  return (
    <Suspense fallback={<AuthCard title="Checking your invitation…">{null}</AuthCard>}>
      <AcceptInvitation />
    </Suspense>
  );
}
