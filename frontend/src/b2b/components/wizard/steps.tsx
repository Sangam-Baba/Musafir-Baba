"use client";
// The wizard's steps 1, 3 and 5 (step 2 is the business details form, step 4 reuses the bank and documents panels).
import { BadgeCheck, Building2, FileSearch, Hotel, Layers, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { b2b } from "../../api";
import { ENTITY_TYPES, GST_STATES, type HotelDetailsInput, type KycApplication } from "../../kyc";
import { errorMessage } from "../../messages";
import { StepButtons, StepHeading } from "./WizardFrame";

export function PartnerTypeStep({ onNext }: { onNext: () => void }) {
  return (
    <form onSubmit={(e) => (e.preventDefault(), onNext())}>
      <StepHeading icon={<Building2 className="h-5 w-5" />} title="Choose your partnership type" text="Select the option that best describes your business." />
      <div className="relative overflow-hidden rounded-xl border-2 border-[#FE5300] bg-gradient-to-r from-orange-50 to-white p-4">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-[#FE5300] shadow-sm">
            <Hotel className="h-7 w-7" />
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-bold text-slate-900">Hotel & property supplier</p>
            <p className="text-[13px] text-slate-600">List your hotel, resort or homestay on MusafirBaba and sell rooms to website guests and B2B travel agents.</p>
            <ul className="mt-3 space-y-1.5 text-[13px] text-slate-700">
              {["Manage your property listings, rooms and photos", "Get verified and go live on musafirbaba.com", "Invite your team and control their access"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-[#FE5300]" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FE5300] text-xs text-white">✓</span>
        </div>
      </div>
      <StepButtons continueLabel="Continue to business details" />
    </form>
  );
}

export function ServicesStep({ value, onChange, onBack, onNext, busy }: { value: HotelDetailsInput; onChange: (v: HotelDetailsInput) => void; onBack: () => void; onNext: () => void; busy: boolean }) {
  return (
    <form onSubmit={(e) => (e.preventDefault(), onNext())}>
      <StepHeading icon={<Layers className="h-5 w-5" />} title="Select your services" text="Hotels & Resorts is available today; more services will be added to your dashboard later." />
      <div className="w-full max-w-xs overflow-hidden rounded-lg border-2 border-[#FE5300] bg-white">
        <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-orange-100 via-orange-50 to-white">
          <Hotel className="h-11 w-11 text-[#FE5300]" />
          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-md bg-[#FE5300] text-xs text-white">✓</span>
        </div>
        <p className="text-sm flex items-center gap-2 px-3 py-2.5 font-semibold text-slate-900">
          <Hotel className="h-4 w-4 text-[#FE5300]" /> Hotels & Resorts
        </p>
      </div>
      <div className="mt-4 rounded-lg bg-orange-50 p-4">
        <p className="text-sm flex items-center gap-2 font-semibold text-slate-900">
          <Hotel className="h-4 w-4 text-[#FE5300]" /> Hotels & Resorts — service details
        </p>
        <label className="mt-3 block max-w-xs">
          <span className="text-xs font-medium text-slate-600">
            Number of properties <span className="text-red-500">*</span>
          </span>
          <input type="number" min={1} max={500} required className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px]" value={value.propertyCount} onChange={(e) => onChange({ ...value, propertyCount: Number(e.target.value) })} />
        </label>
        <p className="mt-3 text-xs text-slate-600">Property types, rooms, meal plans and photos are added for each property under “My Properties” once you&apos;re registered.</p>
      </div>
      <StepButtons onBack={onBack} continueLabel="Create account & continue to documents" busy={busy} />
    </form>
  );
}

function Row({ k, v }: { k: string; v?: string | null }) {
  if (!v) return null;
  return (
    <div className="grid grid-cols-5 gap-2 py-1 text-[13px]">
      <dt className="col-span-2 text-slate-500">{k}</dt>
      <dd className="col-span-3 text-slate-900">{v}</dd>
    </div>
  );
}

export function ReviewStep({ app, emailVerified, email, onBack, onSubmitted }: { app: KycApplication; emailVerified: boolean; email: string | null; onBack: () => void; onSubmitted: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const d = app.details;
  const state = GST_STATES.find(([c]) => c === d?.address.stateCode)?.[1];
  const missing = app.missingDocuments.map((k) => app.documentSet.find((x) => x.key === k)?.label ?? k);
  const blockers = [!emailVerified && "confirm your email", !app.bank && "add your bank account", missing.length > 0 && `upload ${missing.join(", ")}`].filter(Boolean) as string[];

  async function submit() {
    setBusy(true);
    try {
      await b2b("/kyc/submit", { method: "POST", body: {} });
      toast.success("Submitted — MusafirBaba will review your business");
      onSubmitted();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      await b2b("/registrations/resend-verification", { method: "POST" });
      setSent(true);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div>
      <StepHeading icon={<FileSearch className="h-5 w-5" />} title="Application summary" text="Here's a summary of your details. You can still change them on the Verification page." />
      {!emailVerified && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
          <Mail className="h-4 w-4" />
          <span className="flex-1">Confirm your email ({email}) using the link we sent — it&apos;s needed before you can submit.</span>
          {sent ? <span>New link sent.</span> : <button onClick={resend} className="rounded-md border border-amber-300 bg-white px-3 py-1 text-xs font-medium">Send a new link</button>}
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm mb-2 font-semibold text-slate-900">Business details</p>
          <dl>
            <Row k="Legal name" v={d?.legalName} />
            <Row k="Trade / brand name" v={d?.tradeName} />
            <Row k="Business type" v={d?.entityType ? ENTITY_TYPES[d.entityType] : null} />
            <Row k="Established" v={d?.yearEstablished ? String(d.yearEstablished) : null} />
            <Row k="GST registration" v={d?.gstRegistered ? `Yes — ${d.gstin}` : "Not registered (below threshold)"} />
            <Row k="PAN" v={d ? `••••••${d.panLast4}` : null} />
          </dl>
        </section>
        <section className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm mb-2 font-semibold text-slate-900">Business contact</p>
          <dl>
            <Row k="Contact person" v={d ? `${d.contactName}${d.contactDesignation ? ` (${d.contactDesignation})` : ""}` : null} />
            <Row k="Mobile" v={d?.mobile} />
            <Row k="Email" v={d?.email} />
            <Row k="Address" v={d ? [d.address.line1, d.address.line2, d.address.city, state, d.address.pin].filter(Boolean).join(", ") : null} />
          </dl>
        </section>
        <section className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-900">Selected service</p>
          <p className="mt-2 flex items-center gap-2 text-[13px] text-slate-700">
            <Hotel className="h-4 w-4 text-[#FE5300]" /> Hotels & Resorts · {d?.propertyCount ?? 1} {d?.propertyCount === 1 ? "property" : "properties"}
          </p>
        </section>
        <section className="rounded-lg border border-slate-200 p-4 text-[13px]">
          <p className="text-sm font-semibold text-slate-900">Documents & bank</p>
          <p className="mt-2 text-slate-700">{missing.length === 0 ? "✓ All required documents uploaded" : `Still needed: ${missing.join(", ")}`}</p>
          <p className="text-slate-700">{app.bank ? `✓ ${app.bank.holderName} — account ending ${app.bank.accountLast4} · IFSC ${app.bank.ifsc}` : "Bank account not added yet"}</p>
        </section>
      </div>
      <label className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 p-4 text-[13px] text-slate-700">
        <input type="checkbox" className="mt-1 accent-[#FE5300]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        I confirm that the information provided is true and correct to the best of my knowledge.
      </label>
      {blockers.length > 0 && <p className="mt-3 text-[13px] text-amber-800">Before you submit: {blockers.join("; ")}.</p>}
      <StepButtons type="button" onBack={onBack} continueLabel="Submit application" busy={busy} disabled={!confirmed || blockers.length > 0} onContinue={submit} />
    </div>
  );
}
