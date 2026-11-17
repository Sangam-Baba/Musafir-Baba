"use client";
// Two-step login with an authenticator app (Google Authenticator, Microsoft Authenticator, …) — same steps as before.
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { errorMessage } from "../../messages";
import { FormError } from "../AuthCard";
import { Field } from "../Field";
import { Panel, Pill } from "../portal/ui";

export function TwoStepPanel({ status, left }: { status: "off" | "pending" | "on"; left: number }) {
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
    <Panel
      icon={ShieldCheck}
      title="Two-factor authentication (2FA)"
      subtitle="An extra code from your phone when you sign in."
      action={<Pill tone={status === "on" ? "green" : "amber"}>{status === "on" ? "On" : "Off"}</Pill>}
    >
      <div className="space-y-4">
        {status === "on" ? (
          <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-800">
            <ShieldCheck className="h-4 w-4" /> Two-step login is on · {left} recovery codes left
          </p>
        ) : (
          <p className="text-[13px] text-slate-600">Off — anyone with your password could sign in. Turn it on with an authenticator app (Google Authenticator, Microsoft Authenticator…).</p>
        )}
        {codes && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-[13px] font-medium text-amber-900">Save these recovery codes now — they are shown only once. Each works once if you lose your phone.</p>
            <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-[13px] text-amber-900">
              {codes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        {status !== "on" && !setup && (
          <button onClick={() => run(async () => setSetup(await b2b("/me/mfa/totp/setup", { method: "POST" })))} className="rounded-md bg-[#FE5300] px-3 py-1.5 text-[13px] font-medium text-white">
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
            <ol className="list-decimal space-y-1 pl-5 text-[13px] text-slate-600">
              <li>Open your authenticator app and add an account by entering this key:</li>
            </ol>
            <p className="select-all break-all rounded-md bg-slate-100 px-3 py-1.5 font-mono text-[13px] text-slate-800">{setup.secret}</p>
            <a href={setup.otpauthUrl} className="text-[13px] text-[#FE5300] hover:underline">
              On this phone? Tap to add it to your authenticator app
            </a>
            <Field label="Then enter the 6-digit code it shows" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" required />
            <button type="submit" className="rounded-md bg-[#FE5300] px-3 py-1.5 text-[13px] font-medium text-white">
              Turn on
            </button>
          </form>
        )}
        <FormError message={error} />
      </div>
    </Panel>
  );
}
