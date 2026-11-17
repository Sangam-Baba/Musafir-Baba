"use client";
// The wizard sections (basic, contacts, times, policies, amenities). Location has its own file (map pin).
import { useState } from "react";

import { ID_PROOFS, type Masters, type Policies, type Property } from "../../listing";
import { Check, inputCls, Labelled, SaveBar } from "./ui";
import { useSaveSection } from "./useSaveSection";

type Props = { property: Property; masters: Masters; disabled: boolean; onSaved: (p: Property) => void };

export function BasicForm({ property, masters, disabled, onSaved }: Props) {
  const { save, busy } = useSaveSection(property, onSaved);
  const [v, setV] = useState({ name: property.name, propertyTypeKey: property.propertyTypeKey, starRating: property.starRating, description: property.description });
  return (
    <form onSubmit={(e) => (e.preventDefault(), save("basic", v))} className="grid gap-4 sm:grid-cols-2">
      <Labelled label="Property name" wide hint={property.status === "LIVE" ? "On a live listing, a new name is checked by MusafirBaba first." : undefined}>
        <input className={inputCls} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required minLength={3} maxLength={120} disabled={disabled} />
      </Labelled>
      <Labelled label="Property type">
        <select className={inputCls} value={v.propertyTypeKey} onChange={(e) => setV({ ...v, propertyTypeKey: e.target.value })} disabled={disabled}>
          {masters.propertyTypes.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </select>
      </Labelled>
      <Labelled label="Star rating">
        <select className={inputCls} value={v.starRating} onChange={(e) => setV({ ...v, starRating: Number(e.target.value) })} disabled={disabled}>
          <option value={0}>Not rated</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} star
            </option>
          ))}
        </select>
      </Labelled>
      <Labelled label="Description" wide hint={`${v.description.length} / 5000 — at least 50 characters. Plain text.`}>
        <textarea className={`${inputCls} min-h-36`} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={5000} disabled={disabled} />
      </Labelled>
      <div className="sm:col-span-2">
        <SaveBar busy={busy} disabled={disabled} />
      </div>
    </form>
  );
}

export function ContactsForm({ property, disabled, onSaved }: Props) {
  const { save, busy } = useSaveSection(property, onSaved);
  const [v, setV] = useState({ email: property.contacts.email ?? "", phone: property.contacts.phone ?? "", whatsapp: property.contacts.whatsapp ?? "" });
  return (
    <form onSubmit={(e) => (e.preventDefault(), save("contacts", { email: v.email, phone: v.phone, whatsapp: v.whatsapp.trim() || null }))} className="grid gap-4 sm:grid-cols-2">
      <p className="text-xs text-slate-500 sm:col-span-2">Where booking alerts go. Guests never see these — they book through MusafirBaba.</p>
      <Labelled label="Reservations email">
        <input type="email" className={inputCls} value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} required disabled={disabled} />
      </Labelled>
      <Labelled label="Reservations phone">
        <input className={inputCls} value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} required inputMode="tel" disabled={disabled} />
      </Labelled>
      <Labelled label="WhatsApp (optional)">
        <input className={inputCls} value={v.whatsapp} onChange={(e) => setV({ ...v, whatsapp: e.target.value })} inputMode="tel" disabled={disabled} />
      </Labelled>
      <div className="sm:col-span-2">
        <SaveBar busy={busy} disabled={disabled} />
      </div>
    </form>
  );
}

export function TimesForm({ property, disabled, onSaved }: Props) {
  const { save, busy } = useSaveSection(property, onSaved);
  const [v, setV] = useState({ checkInTime: property.checkInTime ?? "14:00", checkOutTime: property.checkOutTime ?? "11:00", timeZone: property.timeZone || "Asia/Kolkata" });
  return (
    <form onSubmit={(e) => (e.preventDefault(), save("times", v))} className="grid gap-4 sm:grid-cols-3">
      <Labelled label="Check-in from">
        <input type="time" className={inputCls} value={v.checkInTime} onChange={(e) => setV({ ...v, checkInTime: e.target.value })} required disabled={disabled} />
      </Labelled>
      <Labelled label="Check-out by">
        <input type="time" className={inputCls} value={v.checkOutTime} onChange={(e) => setV({ ...v, checkOutTime: e.target.value })} required disabled={disabled} />
      </Labelled>
      <Labelled label="Time zone">
        <input className={inputCls} value={v.timeZone} onChange={(e) => setV({ ...v, timeZone: e.target.value })} required disabled={disabled} />
      </Labelled>
      <div className="sm:col-span-3">
        <SaveBar busy={busy} disabled={disabled} note={property.status === "LIVE" ? "Check-in time and time zone changes are checked by MusafirBaba first." : undefined} />
      </div>
    </form>
  );
}

const DEFAULT_POLICIES: Policies = { childrenAllowed: true, childFreeUntilAge: 5, extraBeds: false, petsAllowed: false, coupleFriendly: false, localIdAccepted: true, smoking: "NO", idProofs: ["AADHAAR"], notes: null };

export function PoliciesForm({ property, disabled, onSaved }: Props) {
  const { save, busy } = useSaveSection(property, onSaved);
  const [v, setV] = useState<Policies>(property.policies ?? DEFAULT_POLICIES);
  const toggleProof = (key: string) => setV({ ...v, idProofs: v.idProofs.includes(key) ? v.idProofs.filter((x) => x !== key) : [...v.idProofs, key] });
  return (
    <form onSubmit={(e) => (e.preventDefault(), save("policies", { ...v, notes: v.notes?.trim() || null }))} className="grid gap-4 sm:grid-cols-2">
      <Check label="Children allowed" checked={v.childrenAllowed} onChange={(x) => setV({ ...v, childrenAllowed: x })} disabled={disabled} />
      <Labelled label="Children stay free up to age">
        <input type="number" min={0} max={17} className={inputCls} value={v.childFreeUntilAge} onChange={(e) => setV({ ...v, childFreeUntilAge: Number(e.target.value) })} disabled={disabled} />
      </Labelled>
      <Check label="Extra beds available" checked={v.extraBeds} onChange={(x) => setV({ ...v, extraBeds: x })} disabled={disabled} />
      <Check label="Pets allowed" checked={v.petsAllowed} onChange={(x) => setV({ ...v, petsAllowed: x })} disabled={disabled} />
      <Check label="Couple friendly" checked={v.coupleFriendly} onChange={(x) => setV({ ...v, coupleFriendly: x })} disabled={disabled} />
      <Check label="Local ID accepted" checked={v.localIdAccepted} onChange={(x) => setV({ ...v, localIdAccepted: x })} disabled={disabled} />
      <Labelled label="Smoking">
        <select className={inputCls} value={v.smoking} onChange={(e) => setV({ ...v, smoking: e.target.value as Policies["smoking"] })} disabled={disabled}>
          <option value="NO">Not allowed</option>
          <option value="DESIGNATED">Designated areas</option>
          <option value="YES">Allowed</option>
        </select>
      </Labelled>
      <fieldset>
        <legend className="text-xs font-medium text-slate-600">ID accepted at check-in</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {ID_PROOFS.map(([key, label]) => (
            <Check key={key} label={label} checked={v.idProofs.includes(key)} onChange={() => toggleProof(key)} disabled={disabled} />
          ))}
        </div>
      </fieldset>
      <Labelled label="Other rules (optional)" wide>
        <textarea className={`${inputCls} min-h-20`} value={v.notes ?? ""} onChange={(e) => setV({ ...v, notes: e.target.value })} maxLength={2000} disabled={disabled} />
      </Labelled>
      <div className="sm:col-span-2">
        <SaveBar busy={busy} disabled={disabled} />
      </div>
    </form>
  );
}

export function AmenitiesForm({ property, masters, disabled, onSaved }: Props) {
  const { save, busy } = useSaveSection(property, onSaved);
  const [chosen, setChosen] = useState<string[]>(property.amenities);
  const options = masters.amenities.filter((a) => a.level !== "ROOM");
  const groups = [...new Set(options.map((a) => a.group))];
  return (
    <form onSubmit={(e) => (e.preventDefault(), save("amenities", { amenities: chosen }))} className="space-y-4">
      {groups.map((g) => (
        <fieldset key={g}>
          <legend className="text-[13px] font-semibold text-slate-800">{g}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {options
              .filter((a) => a.group === g)
              .map((a) => (
                <Check key={a.key} label={a.name} checked={chosen.includes(a.key)} onChange={(x) => setChosen(x ? [...chosen, a.key] : chosen.filter((k) => k !== a.key))} disabled={disabled} />
              ))}
          </div>
        </fieldset>
      ))}
      <SaveBar busy={busy} disabled={disabled || chosen.length === 0} note="Room amenities (AC, TV…) are set per room type." />
    </form>
  );
}
