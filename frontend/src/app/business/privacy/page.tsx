"use client";
// Data requests (Stage 16, DPDP): anyone — a guest, a business user — asks MusafirBaba for a copy of their data, a
// correction, deletion, to withdraw consent, or raises a grievance. Public page; answered within 30 days.
import Link from "next/link";
import { useState } from "react";

import { B2B_API } from "@/b2b/api";

const TYPES = [
  { value: "ACCESS", label: "A copy of my data" },
  { value: "CORRECTION", label: "Correct my data" },
  { value: "ERASURE", label: "Delete my data" },
  { value: "WITHDRAW_CONSENT", label: "Withdraw my consent" },
  { value: "GRIEVANCE", label: "A complaint about how my data is used" },
] as const;

export default function PrivacyRequestPage() {
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("ACCESS");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ ref: string; dueAt: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${B2B_API}/privacy/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-B2B-Auth": "1" },
        body: JSON.stringify({ type, name: name.trim(), email: email.trim(), phone: phone.trim() || null, details: details.trim() || null }),
      });
      const body = (await res.json()) as { ref?: string; dueAt?: string; code?: string };
      if (!res.ok || !body.ref) throw new Error(body.code === "RATE_LIMITED" ? "Too many requests from here — please try again in an hour." : "Something went wrong. Please check the form and try again.");
      setDone({ ref: body.ref, dueAt: String(body.dueAt) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  const input = "mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm";
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Your data with MusafirBaba</h1>
      <p className="text-sm text-slate-600">Ask for a copy of the personal data we hold about you, a correction, its deletion, or to withdraw your consent. We answer within 30 days and may ask you to confirm it is you. Read our <Link href="/privacy-policy" className="text-[#FE5300] underline">privacy policy</Link>.</p>
      {done ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Thank you. Your request <b>{done.ref}</b> is with our team; we will reply to {email.trim()} by {new Date(done.dueAt).toLocaleDateString("en-IN")}.</div>
      ) : (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="block text-sm text-slate-700">What would you like?
            <select className={input} value={type} onChange={(e) => setType(e.target.value as typeof type)}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          </label>
          <label className="block text-sm text-slate-700">Your name<input className={input} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></label>
          <label className="block text-sm text-slate-700">Email (we reply here)<input type="email" className={input} value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block text-sm text-slate-700">Mobile (optional)<input className={input} value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} /></label>
          <label className="block text-sm text-slate-700">Details (optional — e.g. a booking reference)<textarea className="mt-1 h-24 w-full rounded-lg border border-slate-200 p-3 text-sm" value={details} maxLength={2000} onChange={(e) => setDetails(e.target.value)} /></label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button disabled={busy || name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())} onClick={send} className="w-full rounded-lg bg-[#FE5300] py-3 text-sm font-semibold text-white disabled:opacity-50">Send request</button>
        </div>
      )}
    </div>
  );
}
