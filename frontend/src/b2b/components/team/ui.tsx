"use client";
// Small building blocks for the team screens.
import type { ReactNode } from "react";

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
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
    <button {...rest} className={`rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${tones[tone]}`}>
      {children}
    </button>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="text-sm text-slate-500">{text}</p>;
}

export const inputClass = "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#FE5300] focus:ring-2 focus:ring-orange-100";
