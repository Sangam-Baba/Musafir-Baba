"use client";
// The business details, grouped like the sign-up design: organisation, key contact, registration & tax, address.
// Used by the sign-up wizard and by "Edit details" on the Verification page. Server problems show under each field.
import type { ReactNode } from "react";

import { ENTITY_TYPES, GST_STATES, type HotelDetailsInput } from "../../kyc";

const input = "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#FE5300] focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50";

export function emptyDetails(): HotelDetailsInput {
  return {
    legalName: "",
    tradeName: "",
    entityType: "",
    yearEstablished: null,
    contactName: "",
    contactDesignation: "",
    mobile: "",
    alternateMobile: "",
    email: "",
    gstRegistered: true,
    gstin: "",
    pan: "",
    address: { line1: "", line2: "", city: "", stateCode: "", pin: "" },
    propertyCount: 1,
    termsAccepted: false,
    termsVersion: "",
  };
}

/** What the API expects: optional fields left out when empty. */
/** The details as the API expects them; B2B clients have no property count (Stage 10). */
export function toRequest(v: HotelDetailsInput, termsVersion: string, kind: "HOTEL" | "CLIENT" = "HOTEL") {
  const opt = (s: string | undefined) => (s && s.trim() ? s.trim() : undefined);
  return {
    legalName: v.legalName,
    contactName: v.contactName,
    mobile: v.mobile,
    email: v.email,
    gstRegistered: v.gstRegistered,
    gstin: v.gstRegistered ? opt(v.gstin) : undefined,
    pan: v.pan,
    address: { ...v.address, line2: opt(v.address.line2) },
    ...(kind === "HOTEL" ? { propertyCount: v.propertyCount } : {}),
    termsAccepted: v.termsAccepted,
    termsVersion,
    tradeName: opt(v.tradeName),
    entityType: v.entityType || undefined,
    yearEstablished: v.yearEstablished || undefined,
    contactDesignation: opt(v.contactDesignation),
    alternateMobile: opt(v.alternateMobile),
  };
}

function Box({ label, required, error, hint, children, span = 1 }: { label: string; required?: boolean; error?: string; hint?: string; children: ReactNode; span?: 1 | 2 | 3 }) {
  return (
    <label className={`block ${span === 2 ? "sm:col-span-2" : span === 3 ? "sm:col-span-3" : ""}`}>
      <span className="text-xs font-medium text-slate-600">
        {label} {required ? <span className="text-red-500">*</span> : <span className="font-normal text-slate-400">(optional)</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="flex w-full items-center gap-3 text-sm font-semibold text-slate-900">
        {title} <span className="h-px flex-1 bg-orange-200" />
      </legend>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">{children}</div>
    </fieldset>
  );
}

export function BusinessDetailsForm({
  value,
  onChange,
  errors,
  disabled,
  panHint,
  lockEmail,
  showTerms = true,
  showPropertyCount = true,
}: {
  value: HotelDetailsInput;
  onChange: (v: HotelDetailsInput) => void;
  errors: Record<string, string>;
  disabled?: boolean;
  panHint?: string;
  lockEmail?: boolean;
  showTerms?: boolean;
  showPropertyCount?: boolean;
}) {
  const set = (patch: Partial<HotelDetailsInput>) => onChange({ ...value, ...patch });
  const setAddress = (patch: Partial<HotelDetailsInput["address"]>) => onChange({ ...value, address: { ...value.address, ...patch } });
  return (
    <div className="space-y-4">
      <Group title="Organisation information">
        <Box label="Legal name of the business" required error={errors.legalName} hint="Exactly as on your GST / PAN documents." span={2}>
          <input className={input} value={value.legalName} onChange={(e) => set({ legalName: e.target.value })} disabled={disabled} required maxLength={200} />
        </Box>
        <Box label="Trade / brand name" error={errors.tradeName}>
          <input className={input} value={value.tradeName ?? ""} onChange={(e) => set({ tradeName: e.target.value })} disabled={disabled} maxLength={120} />
        </Box>
        <Box label="Business entity type" error={errors.entityType}>
          <select className={input} value={value.entityType ?? ""} onChange={(e) => set({ entityType: e.target.value as HotelDetailsInput["entityType"] })} disabled={disabled}>
            <option value="">Choose…</option>
            {Object.entries(ENTITY_TYPES).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </Box>
        <Box label="Year of establishment" error={errors.yearEstablished}>
          <input className={input} type="number" min={1800} max={2100} placeholder="e.g. 2018" value={value.yearEstablished ?? ""} onChange={(e) => set({ yearEstablished: e.target.value ? Number(e.target.value) : null })} disabled={disabled} />
        </Box>
        {showPropertyCount && (
          <Box label="Number of properties" required error={errors.propertyCount}>
            <input className={input} type="number" min={1} max={500} value={value.propertyCount} onChange={(e) => set({ propertyCount: Number(e.target.value) })} disabled={disabled} required />
          </Box>
        )}
      </Group>

      <Group title="Key contact details">
        <Box label="Contact person" required error={errors.contactName}>
          <input className={input} value={value.contactName} onChange={(e) => set({ contactName: e.target.value })} disabled={disabled} required maxLength={120} />
        </Box>
        <Box label="Designation" error={errors.contactDesignation}>
          <input className={input} placeholder="e.g. Director, Manager" value={value.contactDesignation ?? ""} onChange={(e) => set({ contactDesignation: e.target.value })} disabled={disabled} maxLength={80} />
        </Box>
        <Box label="Mobile number" required error={errors.mobile}>
          <input className={input} inputMode="tel" placeholder="10-digit mobile" value={value.mobile} onChange={(e) => set({ mobile: e.target.value })} disabled={disabled} required maxLength={20} />
        </Box>
        <Box label="Email address" required error={errors.email} hint={lockEmail ? "Your sign-in email." : "You'll sign in with this email; we'll send a link to confirm it."} span={2}>
          <input className={input} type="email" value={value.email} onChange={(e) => set({ email: e.target.value })} disabled={disabled || lockEmail} required maxLength={254} />
        </Box>
        <Box label="Alternate number" error={errors.alternateMobile}>
          <input className={input} inputMode="tel" value={value.alternateMobile ?? ""} onChange={(e) => set({ alternateMobile: e.target.value })} disabled={disabled} maxLength={20} />
        </Box>
      </Group>

      <Group title="Registration & tax details">
        <fieldset className="sm:col-span-3">
          <legend className="text-xs font-medium text-slate-600">
            GST registration <span className="text-red-500">*</span>
          </legend>
          <div className="mt-2 flex flex-wrap gap-4 text-[13px]">
            {[true, false].map((yes) => (
              <label key={String(yes)} className="flex items-center gap-2">
                <input type="radio" className="accent-[#FE5300]" checked={value.gstRegistered === yes} onChange={() => set({ gstRegistered: yes })} disabled={disabled} />
                {yes ? "Yes (GST registered)" : "No (below the GST threshold)"}
              </label>
            ))}
          </div>
        </fieldset>
        {value.gstRegistered && (
          <Box label="GSTIN" required error={errors.gstin} hint="15 characters, e.g. 27ABCDE1234F1Z5." span={2}>
            <input className={`${input} uppercase`} value={value.gstin ?? ""} onChange={(e) => set({ gstin: e.target.value })} disabled={disabled} required maxLength={20} />
          </Box>
        )}
        <Box label="PAN" required error={errors.pan} hint={panHint ?? "10 characters, e.g. ABCDE1234F."}>
          <input className={`${input} uppercase`} value={value.pan} onChange={(e) => set({ pan: e.target.value })} disabled={disabled} required maxLength={12} />
        </Box>
      </Group>

      <Group title="Registered address">
        <Box label="Address" required error={errors["address.line1"]} span={2}>
          <input className={input} value={value.address.line1} onChange={(e) => setAddress({ line1: e.target.value })} disabled={disabled} required maxLength={200} />
        </Box>
        <Box label="Address line 2">
          <input className={input} value={value.address.line2 ?? ""} onChange={(e) => setAddress({ line2: e.target.value })} disabled={disabled} maxLength={200} />
        </Box>
        <Box label="City" required error={errors["address.city"]}>
          <input className={input} value={value.address.city} onChange={(e) => setAddress({ city: e.target.value })} disabled={disabled} required maxLength={80} />
        </Box>
        <Box label="State" required error={errors["address.stateCode"]}>
          <select className={input} value={value.address.stateCode} onChange={(e) => setAddress({ stateCode: e.target.value })} disabled={disabled} required>
            <option value="">Choose…</option>
            {GST_STATES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </Box>
        <Box label="PIN code" required error={errors["address.pin"]}>
          <input className={input} inputMode="numeric" value={value.address.pin} onChange={(e) => setAddress({ pin: e.target.value })} disabled={disabled} required maxLength={10} />
        </Box>
      </Group>

      {showTerms && (
        <label className="flex items-start gap-2 text-[13px] text-slate-700">
          <input type="checkbox" className="mt-1 accent-[#FE5300]" checked={value.termsAccepted} onChange={(e) => set({ termsAccepted: e.target.checked })} disabled={disabled} />
          <span>
            I confirm the information is true and correct, I accept the MusafirBaba hotel partner terms (net-rate contract), and I have read the <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-[#FE5300] underline">privacy policy</a>.
            {errors.termsAccepted && <span className="block text-xs text-red-600">{errors.termsAccepted}</span>}
          </span>
        </label>
      )}
    </div>
  );
}
