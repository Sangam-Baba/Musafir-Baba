"use client";
// Two-step login with an authenticator app (Google Authenticator, Microsoft Authenticator, …).
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "@/b2b/api";
import { FormError } from "@/b2b/components/AuthCard";
import { BusinessShell } from "@/b2b/components/BusinessShell";
import { PageHeader } from "@/b2b/components/portal/ui";
import { Field } from "@/b2b/components/Field";
import { errorMessage } from "@/b2b/messages";

export default function SecurityPage() {
  return <BusinessShell>{(me) => <TwoStep status={me.mfa.totp} left={me.mfa.recoveryCodesLeft} />}</BusinessShell>;
}

function TwoStep({ status, left }: { status: "off" | "pending" | "on"; left: number }) {
  const queryClient = useQueryClient();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ["b2b", "me"] });
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader crumb="Settings & Security" title="Settings &" highlight="Security" subtitle="Two-step login and where you're signed in." />
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <p className="font-semibold text-slate-900">Two-step login</p>
          <p className="text-sm text-slate-500">{status === "on" ? `On · ${left} recovery codes left` : "Off — anyone with your password could sign in."}</p>
        </div>
        {codes && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">Save these recovery codes now — they are shown only once. Each works once if you lose your phone.</p>
            <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-sm text-amber-900">
              {codes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        {status !== "on" && !setup && (
          <button onClick={() => run(async () => setSetup(await b2b("/me/mfa/totp/setup", { method: "POST" })))} className="rounded-lg bg-[#FE5300] px-4 py-2 text-sm font-semibold text-white">
            Set up two-step login
          </button>
        )}
        {setup && status !== "on" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const r = await b2b<{ recoveryCodes: string[] }>("/me/mfa/totp/enable", { method: "POST", body: { code: code.trim() } });
                setCodes(r.recoveryCodes);
                setSetup(null);
                toast.success("Two-step login is on");
              });
            }}
            className="space-y-3"
          >
            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
              <li>Open your authenticator app and add an account by entering this key:</li>
            </ol>
            <p className="select-all break-all rounded-md bg-slate-100 px-3 py-2 font-mono text-sm text-slate-800">{setup.secret}</p>
            <a href={setup.otpauthUrl} className="text-sm text-[#FE5300] hover:underline">
              On this phone? Tap to add it to your authenticator app
            </a>
            <Field label="Then enter the 6-digit code it shows" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" required />
            <button type="submit" className="rounded-lg bg-[#FE5300] px-4 py-2 text-sm font-semibold text-white">
              Turn on
            </button>
          </form>
        )}
        <FormError message={error} />
      </div>
    </div>
  );
}
