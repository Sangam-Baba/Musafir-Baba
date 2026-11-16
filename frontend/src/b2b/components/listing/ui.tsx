"use client";
// Small form pieces for the listing screens.
import type { ReactNode } from "react";

export const inputCls = "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#FE5300] focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50";

export function Labelled({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Check({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      {label}
    </label>
  );
}

export function SaveBar({ busy, disabled, note }: { busy: boolean; disabled?: boolean; note?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <button type="submit" disabled={busy || disabled} className="rounded-lg bg-[#FE5300] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e54b00] disabled:opacity-50">
        {busy ? "Saving…" : "Save"}
      </button>
      {note && <span className="text-xs text-slate-500">{note}</span>}
    </div>
  );
}
