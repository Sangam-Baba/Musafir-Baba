"use client";
// Label + input with the business area's styling.
import type { InputHTMLAttributes } from "react";

export function Field({ label, hint, ...input }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        {...input}
        className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-[#FE5300] focus:ring-2 focus:ring-orange-100 disabled:bg-slate-50"
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
      className="inline-flex w-full items-center justify-center rounded-lg bg-[#FE5300] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e54b00] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}
