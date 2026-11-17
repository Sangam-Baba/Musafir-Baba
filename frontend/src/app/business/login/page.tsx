"use client";
// Business sign-in: email or phone + password, then the app code if two-step login is on.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { b2b } from "@/b2b/api";
import { AuthCard, FormError } from "@/b2b/components/AuthCard";
import { Field, PrimaryButton } from "@/b2b/components/Field";
import { MfaStep } from "@/b2b/components/MfaStep";
import { errorMessage } from "@/b2b/messages";
import { useBusinessSession } from "@/b2b/session-store";
import { isMfaChallenge, type SignInResult, type Tokens } from "@/b2b/types";

export default function BusinessLoginPage() {
  const router = useRouter();
  const setToken = useBusinessSession((s) => s.setAccessToken);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const done = (tokens: Tokens) => {
    setToken(tokens.accessToken);
    router.replace("/business");
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await b2b<SignInResult>("/auth/login", { method: "POST", body: { identifier: identifier.trim(), password } });
      if (isMfaChallenge(r)) setMfaToken(r.mfaToken);
      else done(r);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (mfaToken) {
    return (
      <AuthCard title="Two-step login" subtitle="One more step to keep your account safe.">
        <MfaStep mfaToken={mfaToken} onDone={done} />
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title="Sign in to MusafirBaba Business"
      subtitle="For B2B travel agents and hotel partners."
      footer={
        <>
          Prefer a code by email? <Link href="/business/login/code" className="text-[#FE5300] hover:underline">Sign in with a code</Link>
          <span className="mt-2 block">
            New hotel on MusafirBaba? <Link href="/business/register" className="text-[#FE5300] hover:underline">Register your hotel</Link>
          </span>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email or phone" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" autoFocus required />
        <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        <FormError message={error} />
        <PrimaryButton type="submit" busy={busy}>
          Sign in
        </PrimaryButton>
        <div className="text-right">
          <Link href="/business/forgot" className="text-[13px] text-slate-500 hover:text-[#FE5300]">
            Forgot password?
          </Link>
        </div>
      </form>
    </AuthCard>
  );
}
