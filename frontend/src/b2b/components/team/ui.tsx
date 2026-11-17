"use client";
// Small building blocks for the team screens.
import type { ReactNode } from "react";

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-100 px-4 py-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function SmallButton({ children, tone = "default", ...rest }: { tone?: "default" | "danger" | "primary" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const tones = {
    default: "border-slate-200 text-slate-700 hover:bg-slate-50",
    danger: "border-red-200 text-red-600 hover:bg-red-50",
    primary: "border-[#FE5300] bg-[#FE5300] text-white hover:bg-[#e54b00]",
  };
  return (
    <button {...rest} className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium shadow-[0_1px_1px_rgba(16,24,40,0.04)] transition disabled:opacity-50 ${tones[tone]}`}>
      {children}
    </button>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="text-[13px] text-slate-500">{text}</p>;
}

export const inputClass = "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] shadow-[0_1px_1px_rgba(16,24,40,0.04)] outline-none placeholder:text-slate-400 focus:border-[#FE5300] focus:ring-[3px] focus:ring-[#FE5300]/15";
