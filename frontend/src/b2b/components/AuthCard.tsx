"use client";
// Centered card used by the business sign-in pages.
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-3 py-8">
      <div className="w-full max-w-md">
        <Link href="/business/login" className="mb-6 flex items-center justify-center gap-2 text-slate-800">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FE5300] text-[13px] font-bold text-white">MB</span>
          <span className="text-[15px] font-semibold">MusafirBaba Business</span>
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-base font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-[13px] text-slate-500">{subtitle}</p>}
          <div className="mt-4">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-[13px] text-slate-500">{footer}</div>}
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-[13px] text-red-700">{message}</p>;
}
