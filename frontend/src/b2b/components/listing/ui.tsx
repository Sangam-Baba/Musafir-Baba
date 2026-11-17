"use client";
// Small form pieces for the listing screens.
import type { ReactNode } from "react";

export const inputCls = "mt-1 block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 shadow-[0_1px_1px_rgba(16,24,40,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#FE5300] focus:ring-[3px] focus:ring-[#FE5300]/15 disabled:bg-slate-50 disabled:text-slate-500";

export function Labelled({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Check({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      {label}
    </label>
  );
}

export function SaveBar({ busy, disabled, note }: { busy: boolean; disabled?: boolean; note?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <button type="submit" disabled={busy || disabled} className="rounded-md bg-[#FE5300] px-3 py-1.5 text-[13px] font-medium text-white shadow-sm hover:bg-[#e54b00] disabled:opacity-50">
        {busy ? "Saving…" : "Save"}
      </button>
      {note && <span className="text-xs text-slate-500">{note}</span>}
    </div>
  );
}
