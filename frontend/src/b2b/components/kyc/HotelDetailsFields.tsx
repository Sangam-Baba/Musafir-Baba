"use client";
// The hotel's business details (registration and later edits). Field problems from the server appear under each field.
import { GST_STATES, type HotelDetailsInput } from "../../kyc";

const input = "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#FE5300] focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50";

export function emptyDetails(): HotelDetailsInput {
  return {
    legalName: "",
    contactName: "",
    mobile: "",
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

function Box({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function HotelDetailsFields({
  value,
  onChange,
  errors,
  disabled,
  panHint,
  lockEmail,
}: {
  value: HotelDetailsInput;
  onChange: (v: HotelDetailsInput) => void;
  errors: Record<string, string>;
  disabled?: boolean;
  panHint?: string;
  lockEmail?: boolean;
}) {
  const set = (patch: Partial<HotelDetailsInput>) => onChange({ ...value, ...patch });
  const setAddress = (patch: Partial<HotelDetailsInput["address"]>) => onChange({ ...value, address: { ...value.address, ...patch } });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Box label="Legal name of the business" error={errors.legalName} hint="Exactly as on your GST / PAN documents.">
          <input className={input} value={value.legalName} onChange={(e) => set({ legalName: e.target.value })} disabled={disabled} required maxLength={200} />
        </Box>
      </div>
      <Box label="Contact person" error={errors.contactName}>
        <input className={input} value={value.contactName} onChange={(e) => set({ contactName: e.target.value })} disabled={disabled} required maxLength={120} />
      </Box>
      <Box label="Mobile" error={errors.mobile}>
        <input className={input} value={value.mobile} onChange={(e) => set({ mobile: e.target.value })} disabled={disabled} required inputMode="tel" maxLength={20} />
      </Box>
      <div className="sm:col-span-2">
        <Box label="Email" error={errors.email} hint={lockEmail ? "Your sign-in email." : "You'll sign in with this email; we'll send a link to confirm it."}>
          <input className={input} type="email" value={value.email} onChange={(e) => set({ email: e.target.value })} disabled={disabled || lockEmail} required maxLength={254} />
        </Box>
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium text-slate-700">Is the business registered for GST?</legend>
        <div className="mt-2 flex gap-4 text-sm">
          {[true, false].map((yes) => (
            <label key={String(yes)} className="flex items-center gap-2">
              <input type="radio" checked={value.gstRegistered === yes} onChange={() => set({ gstRegistered: yes })} disabled={disabled} />
              {yes ? "Yes" : "No (below the GST threshold)"}
            </label>
          ))}
        </div>
      </fieldset>
      {value.gstRegistered && (
        <Box label="GSTIN" error={errors.gstin} hint="15 characters, e.g. 27ABCDE1234F1Z5.">
          <input className={`${input} uppercase`} value={value.gstin ?? ""} onChange={(e) => set({ gstin: e.target.value })} disabled={disabled} required maxLength={20} />
        </Box>
      )}
      <Box label="PAN" error={errors.pan} hint={panHint ?? "10 characters, e.g. ABCDE1234F."}>
        <input className={`${input} uppercase`} value={value.pan} onChange={(e) => set({ pan: e.target.value })} disabled={disabled} required maxLength={12} />
      </Box>
      <div className="sm:col-span-2">
        <Box label="Address" error={errors["address.line1"]}>
          <input className={input} value={value.address.line1} onChange={(e) => setAddress({ line1: e.target.value })} disabled={disabled} required maxLength={200} />
        </Box>
      </div>
      <div className="sm:col-span-2">
        <Box label="Address line 2 (optional)">
          <input className={input} value={value.address.line2 ?? ""} onChange={(e) => setAddress({ line2: e.target.value })} disabled={disabled} maxLength={200} />
        </Box>
      </div>
      <Box label="City" error={errors["address.city"]}>
        <input className={input} value={value.address.city} onChange={(e) => setAddress({ city: e.target.value })} disabled={disabled} required maxLength={80} />
      </Box>
      <Box label="State" error={errors["address.stateCode"]}>
        <select className={input} value={value.address.stateCode} onChange={(e) => setAddress({ stateCode: e.target.value })} disabled={disabled} required>
          <option value="">Choose…</option>
          {GST_STATES.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </Box>
      <Box label="PIN code" error={errors["address.pin"]}>
        <input className={input} value={value.address.pin} onChange={(e) => setAddress({ pin: e.target.value })} disabled={disabled} required inputMode="numeric" maxLength={10} />
      </Box>
      <Box label="Number of properties" error={errors.propertyCount}>
        <input className={input} type="number" min={1} max={500} value={value.propertyCount} onChange={(e) => set({ propertyCount: Number(e.target.value) })} disabled={disabled} required />
      </Box>
      <label className="flex items-start gap-2 text-sm text-slate-700 sm:col-span-2">
        <input type="checkbox" className="mt-1" checked={value.termsAccepted} onChange={(e) => set({ termsAccepted: e.target.checked })} disabled={disabled} />
        <span>
          I accept the MusafirBaba hotel terms (net-rate contract). {errors.termsAccepted && <span className="block text-xs text-red-600">{errors.termsAccepted}</span>}
        </span>
      </label>
    </div>
  );
}

/** What the API expects (empty optional fields left out). */
export function toRequest(v: HotelDetailsInput, termsVersion: string) {
  return {
    ...v,
    gstin: v.gstRegistered && v.gstin ? v.gstin.trim() : undefined,
    address: { ...v.address, line2: v.address.line2?.trim() ? v.address.line2.trim() : undefined },
    termsVersion,
  };
}
