"use client";
// Second sign-in step when two-step login is on: app code or a recovery code.
import { useState } from "react";

import { b2b } from "../api";
import { errorMessage } from "../messages";
import type { Tokens } from "../types";
import { FormError } from "./AuthCard";
import { Field, PrimaryButton } from "./Field";

export function MfaStep({ mfaToken, onDone }: { mfaToken: string; onDone: (tokens: Tokens) => void }) {
  const [useRecovery, setUseRecovery] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = useRecovery ? { mfaToken, recoveryCode: value.trim() } : { mfaToken, code: value.trim() };
      onDone(await b2b<Tokens>("/auth/mfa/verify", { method: "POST", body }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-[13px] text-slate-600">{useRecovery ? "Enter one of your recovery codes (each works once)." : "Enter the 6-digit code from your authenticator app."}</p>
      <Field label={useRecovery ? "Recovery code" : "App code"} value={value} onChange={(e) => setValue(e.target.value)} inputMode={useRecovery ? "text" : "numeric"} autoComplete="one-time-code" autoFocus required />
      <FormError message={error} />
      <PrimaryButton type="submit" busy={busy}>
        Verify
      </PrimaryButton>
      <button type="button" onClick={() => setUseRecovery(!useRecovery)} className="w-full text-center text-[13px] text-[#FE5300] hover:underline">
        {useRecovery ? "Use the app code instead" : "Lost your phone? Use a recovery code"}
      </button>
    </form>
  );
}
