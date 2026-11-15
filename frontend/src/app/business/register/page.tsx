"use client";
// Hotel self-registration: one form creates the account (or uses the one you're signed in with), the hotel
// and its verification application. Next: confirm the email, then add bank details and documents.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { B2BError, b2b, refreshBusinessSession } from "@/b2b/api";
import { FormError } from "@/b2b/components/AuthCard";
import { Field, PrimaryButton } from "@/b2b/components/Field";
import { emptyDetails, HotelDetailsFields, toRequest } from "@/b2b/components/kyc/HotelDetailsFields";
import { fieldErrors, TERMS_VERSION } from "@/b2b/kyc";
import { errorMessage } from "@/b2b/messages";
import { useBusinessSession } from "@/b2b/session-store";
import type { Tokens } from "@/b2b/types";

export default function HotelRegisterPage() {
  const router = useRouter();
  const token = useBusinessSession((s) => s.accessToken);
  const setToken = useBusinessSession((s) => s.setAccessToken);
  const [checked, setChecked] = useState(Boolean(token));
  const [details, setDetails] = useState(emptyDetails);
  const [owner, setOwner] = useState({ name: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (token) return setChecked(true);
    refreshBusinessSession().finally(() => setChecked(true)); // already signed in? then no new account is needed
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      const body = { details: toRequest(details, TERMS_VERSION), owner: token ? undefined : owner };
      const r = await b2b<Tokens>("/registrations/hotel", { method: "POST", body });
      setToken(r.accessToken);
      router.replace("/business/verification");
    } catch (err) {
      if (err instanceof B2BError) setErrors(fieldErrors(err.details));
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!checked) return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/business/login" className="mb-6 flex items-center justify-center gap-2 text-slate-800">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FE5300] text-sm font-bold text-white">MB</span>
          <span className="text-lg font-semibold">MusafirBaba Business</span>
        </Link>
        <form onSubmit={submit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Register your hotel</h1>
            <p className="mt-1 text-sm text-slate-500">Step 1 of 3 — business details. Next you add your bank account and documents, then we verify your hotel.</p>
          </div>
          {!token && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" value={owner.name} onChange={(e) => setOwner({ ...owner, name: e.target.value })} autoComplete="name" required maxLength={120} />
              <Field
                label="Choose a password"
                type="password"
                value={owner.password}
                onChange={(e) => setOwner({ ...owner, password: e.target.value })}
                autoComplete="new-password"
                hint="At least 10 characters."
                required
              />
            </div>
          )}
          {token && <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">You're signed in — this hotel will be added to your account.</p>}
          <HotelDetailsFields value={details} onChange={setDetails} errors={errors} />
          <FormError message={error} />
          <PrimaryButton type="submit" busy={busy}>
            Register and continue
          </PrimaryButton>
          <p className="text-center text-sm text-slate-500">
            Already registered? <Link href="/business/login" className="text-[#FE5300] hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
