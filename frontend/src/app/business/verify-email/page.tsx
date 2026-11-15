"use client";
// Opened from the confirmation email: the token is in the address fragment (#token=…), so it never reaches any server log.
import Link from "next/link";
import { useEffect, useState } from "react";

import { b2b } from "@/b2b/api";
import { AuthCard } from "@/b2b/components/AuthCard";
import { errorMessage } from "@/b2b/messages";

export default function VerifyEmailPage() {
  const [state, setState] = useState<{ done: boolean; error: string | null }>({ done: false, error: null });

  useEffect(() => {
    const match = /^#token=(.+)$/.exec(window.location.hash);
    window.history.replaceState(null, "", window.location.pathname);
    if (!match) return setState({ done: false, error: "This link is incomplete. Open it again from the email." });
    b2b("/registrations/verify-email", { method: "POST", body: { token: decodeURIComponent(match[1] ?? "") } }).then(
      () => setState({ done: true, error: null }),
      (e) => setState({ done: false, error: errorMessage(e) }),
    );
  }, []);

  return (
    <AuthCard title="Confirm your email">
      {state.error ? (
        <p className="text-sm text-red-700">{state.error}</p>
      ) : state.done ? (
        <div className="space-y-4 text-sm text-slate-700">
          <p>Thanks — your email is confirmed.</p>
          <Link href="/business/verification" className="inline-block rounded-lg bg-[#FE5300] px-4 py-2 font-semibold text-white hover:bg-[#e54b00]">
            Continue your registration
          </Link>
        </div>
      ) : (
        <p className="text-sm text-slate-500">Checking the link…</p>
      )}
    </AuthCard>
  );
}
