"use client";
// Label + input with the business area's styling.
import type { InputHTMLAttributes } from "react";

export function Field({ label, hint, ...input }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        {...input}
        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 shadow-[0_1px_1px_rgba(16,24,40,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#FE5300] focus:ring-[3px] focus:ring-[#FE5300]/15 disabled:bg-slate-50 disabled:text-slate-500"
      />
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function PrimaryButton({ children, busy, ...rest }: { busy?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={busy || rest.disabled}
      className="inline-flex w-full items-center justify-center rounded-md bg-[#FE5300] px-3 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#e54b00] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}
