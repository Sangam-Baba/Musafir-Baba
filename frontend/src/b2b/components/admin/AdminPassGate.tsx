"use client";
// MusafirBaba admins open the B2B area with a short B2B admin pass: their existing admin login +
// two-step login (7 days to set it up after getting a B2B role). The pass is kept in memory only.
import { useState, type ReactNode } from "react";

import { useAdminAuthStore } from "@/store/useAdminAuthStore";

import { B2BError, b2bWithToken } from "../../api";
import { errorMessage } from "../../messages";
import { useAdminPass } from "../../session-store";
import { FormError } from "../AuthCard";
import { inputClass, SmallButton } from "../team/ui";

type PassResponse = { adminToken: string; expiresIn: number; mfaSetupRequiredBy?: string | null; recoveryCodes?: string[] };

export function AdminPassGate({ children }: { children: (adminToken: string) => ReactNode }) {
  const existingToken = useAdminAuthStore((s) => s.accessToken);
  const { adminToken, mfaSetupRequiredBy, setPass } = useAdminPass();
  const [step, setStep] = useState<"start" | "code" | "setup">("start");
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (e) {
      if (e instanceof B2BError && e.code === "MFA_CODE_INVALID" && step === "start") setStep("code");
      else if (e instanceof B2BError && e.code === "MFA_ENROLMENT_REQUIRED") setStep("setup");
      else setError(errorMessage(e));
    }
  }
  const open = (body: Record<string, string> = {}) =>
    run(async () => {
      const r = await b2bWithToken<PassResponse>("/admin/auth/session", existingToken, { method: "POST", body });
      setPass(r.adminToken, r.mfaSetupRequiredBy ?? null);
    });

  if (adminToken) {
    return (
      <>
        {mfaSetupRequiredBy && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Set up two-step login before {new Date(mfaSetupRequiredBy).toLocaleDateString()} — after that the B2B admin area needs it.{" "}
            <button className="font-medium underline" onClick={() => { setPass(null); setStep("setup"); }}>
              Set it up now
            </button>
          </div>
        )}
        {recovery && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Save these recovery codes now (shown once): <span className="font-mono">{recovery.join("  ")}</span>
          </div>
        )}
        {children(adminToken)}
      </>
    );
  }
  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-lg font-semibold text-slate-900">B2B admin</h1>
      <p className="mt-1 text-sm text-slate-500">Clients, hotels and business users. Your admin login plus two-step login opens it for 4 hours.</p>
      <div className="mt-5 space-y-3">
        {step === "start" && <SmallButton tone="primary" onClick={() => open()}>Open B2B admin</SmallButton>}
        {step === "code" && (
          <form onSubmit={(e) => { e.preventDefault(); open({ code: code.trim() }); }} className="space-y-3">
            <input className={`${inputClass} w-full`} placeholder="6-digit code from your authenticator app" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoFocus required />
            <SmallButton tone="primary" type="submit">Verify</SmallButton>
          </form>
        )}
        {step === "setup" && !setup && (
          <SmallButton tone="primary" onClick={() => run(async () => setSetup(await b2bWithToken("/admin/auth/mfa/setup", existingToken, { method: "POST" })))}>
            Set up two-step login
          </SmallButton>
        )}
        {step === "setup" && setup && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const r = await b2bWithToken<PassResponse>("/admin/auth/mfa/enable", existingToken, { method: "POST", body: { code: code.trim() } });
                setRecovery(r.recoveryCodes ?? null);
                setPass(r.adminToken, null);
              });
            }}
            className="space-y-3"
          >
            <p className="text-sm text-slate-600">Add this key in your authenticator app, then enter the code it shows:</p>
            <p className="select-all break-all rounded-md bg-slate-100 px-3 py-2 font-mono text-sm">{setup.secret}</p>
            <input className={`${inputClass} w-full`} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" required />
            <SmallButton tone="primary" type="submit">Turn on and open</SmallButton>
          </form>
        )}
        <FormError message={error} />
      </div>
    </div>
  );
}

/** Admin calls with the pass; an expired pass sends the admin back to the gate. */
export async function adminCall<T>(path: string, token: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  try {
    return await b2bWithToken<T>(path, token, opts);
  } catch (e) {
    if (e instanceof B2BError && e.status === 401) useAdminPass.getState().setPass(null);
    throw e;
  }
}
