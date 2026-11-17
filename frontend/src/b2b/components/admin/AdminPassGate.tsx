"use client";
// MusafirBaba admins open the B2B area with a short B2B admin pass: their existing admin login +
// two-step login (7 days to set it up after getting a B2B role). The pass is kept in memory only.
import { Building2, KeyRound, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";

import { useAdminAuthStore } from "@/store/useAdminAuthStore";

import { B2BError, b2bWithToken } from "../../api";
import { errorMessage } from "../../messages";
import { useAdminPass } from "../../session-store";
import { AdminPageHeader, FleetPage, FleetPanel, Input, inputSm, Notice, PrimaryBtn, SECTION } from "./kit";

type PassResponse = { adminToken: string; expiresIn: number; mfaSetupRequiredBy?: string | null; recoveryCodes?: string[] };

export function AdminPassGate({ children }: { children: (adminToken: string) => ReactNode }) {
  const existingToken = useAdminAuthStore((s) => s.accessToken);
  const { adminToken, mfaSetupRequiredBy, setPass } = useAdminPass();
  const [step, setStep] = useState<"start" | "code" | "setup">("start");
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (e) {
      if (e instanceof B2BError && e.code === "MFA_CODE_INVALID" && step === "start") setStep("code");
      else if (e instanceof B2BError && e.code === "MFA_ENROLMENT_REQUIRED") setStep("setup");
      else setError(errorMessage(e));
    } finally {
      setBusy(false);
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
          <div className="mx-auto mb-4 w-full max-w-7xl">
            <Notice>
              Set up two-step login before {new Date(mfaSetupRequiredBy).toLocaleDateString()} — after that the B2B admin area needs it.{" "}
              <button className="font-semibold underline" onClick={() => { setPass(null); setStep("setup"); }}>
                Set it up now
              </button>
            </Notice>
          </div>
        )}
        {recovery && (
          <div className="mx-auto mb-4 w-full max-w-7xl">
            <Notice>
              Save these recovery codes now (shown once): <span className="font-mono">{recovery.join("   ")}</span>
            </Notice>
          </div>
        )}
        {children(adminToken)}
      </>
    );
  }
  return (
    <FleetPage>
      <AdminPageHeader section={SECTION} icon={Building2} title="B2B admin" description="Client and hotel organisations, business users and their activity." />
      <FleetPanel
        title={step === "setup" ? "Set up two-step login" : "Open B2B admin"}
        description="Your admin login plus two-step login opens the B2B area for 4 hours."
        icon={step === "setup" ? ShieldCheck : KeyRound}
        className="max-w-xl"
        bodyClassName="space-y-3 p-4"
      >
        {step === "start" && (
          <PrimaryBtn onClick={() => open()} disabled={busy}>
            {busy ? "Opening…" : "Open B2B admin"}
          </PrimaryBtn>
        )}
        {step === "code" && (
          <form onSubmit={(e) => { e.preventDefault(); open({ code: code.trim() }); }} className="flex flex-wrap gap-2">
            <Input className={`${inputSm} w-56`} placeholder="6-digit code from your app" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoFocus required />
            <PrimaryBtn type="submit" disabled={busy}>Verify</PrimaryBtn>
          </form>
        )}
        {step === "setup" && !setup && (
          <PrimaryBtn disabled={busy} onClick={() => run(async () => setSetup(await b2bWithToken("/admin/auth/mfa/setup", existingToken, { method: "POST" })))}>
            Start setup
          </PrimaryBtn>
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
            <p className="text-[13px] text-slate-600">Add this key in your authenticator app (Google Authenticator, Microsoft Authenticator…), then enter the code it shows:</p>
            <p className="select-all break-all rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-800">{setup.secret}</p>
            <div className="flex flex-wrap gap-2">
              <Input className={`${inputSm} w-56`} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" required />
              <PrimaryBtn type="submit" disabled={busy}>Turn on and open</PrimaryBtn>
            </div>
          </form>
        )}
        {error && <Notice tone="red">{error}</Notice>}
      </FleetPanel>
    </FleetPage>
  );
}

/** Admin calls with the pass; an expired pass sends the admin back to the gate. */
export async function adminCall<T>(path: string, token: string, opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<T> {
  try {
    return await b2bWithToken<T>(path, token, opts);
  } catch (e) {
    if (e instanceof B2BError && e.status === 401) useAdminPass.getState().setPass(null);
    throw e;
  }
}
