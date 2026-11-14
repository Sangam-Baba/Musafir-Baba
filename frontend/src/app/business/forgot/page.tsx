"use client";
// Forgot password: emailed code + new password. Every device is signed out afterwards.
import Link from "next/link";
import { useState } from "react";

import { b2b } from "@/b2b/api";
import { AuthCard, FormError } from "@/b2b/components/AuthCard";
import { Field, PrimaryButton } from "@/b2b/components/Field";
import { errorMessage } from "@/b2b/messages";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <AuthCard title="Reset your password" footer={<Link href="/business/login" className="text-[#FE5300] hover:underline">Back to sign-in</Link>}>
      {step === "email" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await b2b("/auth/password/forgot", { method: "POST", body: { email: email.trim() } });
              setStep("reset");
            });
          }}
          className="space-y-4"
        >
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus required />
          <FormError message={error} />
          <PrimaryButton type="submit" busy={busy}>
            Email me a reset code
          </PrimaryButton>
        </form>
      )}
      {step === "reset" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await b2b("/auth/password/reset", { method: "POST", body: { email: email.trim(), code: code.trim(), newPassword: password } });
              setStep("done");
            });
          }}
          className="space-y-4"
        >
          <p className="text-sm text-slate-600">If {email} has an account, a code is on its way.</p>
          <Field label="Code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" required />
          <Field label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" hint="At least 10 characters. A short phrase works well." required />
          <FormError message={error} />
          <PrimaryButton type="submit" busy={busy}>
            Set new password
          </PrimaryButton>
        </form>
      )}
      {step === "done" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-700">Your password is changed and every device has been signed out.</p>
          <Link href="/business/login" className="block rounded-lg bg-[#FE5300] px-4 py-2.5 text-center text-sm font-semibold text-white">
            Sign in
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
