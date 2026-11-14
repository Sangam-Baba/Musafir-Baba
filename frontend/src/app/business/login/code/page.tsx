"use client";
// Sign in with a one-time code sent by email.
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

export default function EmailCodeLoginPage() {
  const router = useRouter();
  const setToken = useBusinessSession((s) => s.setAccessToken);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const done = (tokens: Tokens) => {
    setToken(tokens.accessToken);
    router.replace("/business");
  };

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const request = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      await b2b("/auth/otp/request", { method: "POST", body: { email: email.trim() } });
      setSent(true);
    });
  };
  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const r = await b2b<SignInResult>("/auth/otp/verify", { method: "POST", body: { email: email.trim(), code: code.trim() } });
      if (isMfaChallenge(r)) setMfaToken(r.mfaToken);
      else done(r);
    });
  };

  if (mfaToken) {
    return (
      <AuthCard title="Two-step login">
        <MfaStep mfaToken={mfaToken} onDone={done} />
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Sign in with a code" subtitle="We'll email you a 6-digit code." footer={<Link href="/business/login" className="text-[#FE5300] hover:underline">Back to password sign-in</Link>}>
      {!sent ? (
        <form onSubmit={request} className="space-y-4">
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus required />
          <FormError message={error} />
          <PrimaryButton type="submit" busy={busy}>
            Email me a code
          </PrimaryButton>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <p className="text-sm text-slate-600">If {email} has an account, a code is on its way. It works once and expires in 10 minutes.</p>
          <Field label="Code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" autoFocus required />
          <FormError message={error} />
          <PrimaryButton type="submit" busy={busy}>
            Sign in
          </PrimaryButton>
          <button type="button" onClick={() => setSent(false)} className="w-full text-center text-sm text-slate-500 hover:text-[#FE5300]">
            Use a different email or send again
          </button>
        </form>
      )}
    </AuthCard>
  );
}
