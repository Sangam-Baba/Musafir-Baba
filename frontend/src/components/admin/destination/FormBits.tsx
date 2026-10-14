"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { HelpCircle, Plus, Trash2, X } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Presentational helpers for the Destination / Category SEO admin forms,
// styled after the Fleet Management pages. No data logic lives here.

export const dInput =
  "h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[13px] text-slate-800 shadow-[0_1px_2px_rgba(16,24,40,0.04)] placeholder:text-slate-400 focus:border-[#FE5300] focus:outline-none focus:ring-2 focus:ring-orange-100";
export const dTextarea =
  "min-h-[84px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 shadow-[0_1px_2px_rgba(16,24,40,0.04)] placeholder:text-slate-400 focus:border-[#FE5300] focus:outline-none focus:ring-2 focus:ring-orange-100";
export const dSelectMultiple =
  "min-h-[132px] w-full rounded-md border border-slate-200 bg-white p-1.5 text-[13px] text-slate-700 shadow-[0_1px_2px_rgba(16,24,40,0.04)] focus:border-[#FE5300] focus:outline-none focus:ring-2 focus:ring-orange-100";

export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <label className="block text-[12px] font-medium text-slate-700">{label}</label>
      {children}
      {hint && !error && <p className="text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="text-[11px] font-medium text-red-600">{error}</p>}
    </div>
  );
}

// Chip list + free-text input. Same behaviour the forms already had: the text
// is split on commas when the input loses focus, chips are removed by index.
export function TagInput({
  values,
  onChange,
  placeholder = "Type and press Tab (comma separated)",
}: {
  values?: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] focus-within:border-[#FE5300] focus-within:ring-2 focus-within:ring-orange-100">
      {values?.map((kw, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[12px] text-slate-700 ring-1 ring-inset ring-slate-200"
        >
          {kw}
          <button
            type="button"
            onClick={() => onChange((values || []).filter((_, idx) => idx !== i))}
            className="text-slate-400 hover:text-red-500"
            aria-label={`Remove ${kw}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        className="min-w-[140px] flex-1 border-none bg-transparent text-[13px] focus:outline-none focus:ring-0"
        placeholder={placeholder}
        onBlur={(e) => {
          const arr = e.target.value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
          if (arr.length > 0) {
            onChange([...(values || []), ...arr]);
            e.target.value = "";
          }
        }}
      />
    </div>
  );
}

export interface FormTab {
  value: string;
  label: string;
  icon: LucideIcon;
  hasError?: boolean;
}

export function FormTabsList({ tabs }: { tabs: FormTab[] }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <TabsList className="inline-flex h-auto w-max min-w-full justify-start gap-0.5 rounded-md bg-slate-100/80 p-0.5">
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="h-8 gap-1.5 px-3 text-[12px] font-medium">
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.hasError && <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-label="has errors" />}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}

// FAQ list editor (same add/remove behaviour as the blog "Structured Data"
// tab). The parent owns the useFieldArray and passes register() results in.
export function FaqEditor({
  fields,
  onAdd,
  onRemove,
  questionProps,
  answerProps,
}: {
  fields: { id: string }[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  questionProps: (index: number) => UseFormRegisterReturn;
  answerProps: (index: number) => UseFormRegisterReturn;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <header className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
            <HelpCircle size={14} className="text-slate-400" />
            FAQ Schema
            {fields.length > 0 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-500">
                {fields.length}
              </span>
            )}
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            Shown as an FAQ section on the page and sent to Google as FAQPage structured data. Empty rows are ignored.
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] font-medium text-slate-700 hover:border-[#FE5300] hover:text-[#FE5300]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add FAQ
        </button>
      </header>
      <div className="space-y-3 p-4">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-3 rounded-md border border-slate-200/80 bg-slate-50/60 p-3">
            <span className="mt-2 w-5 shrink-0 text-right text-[11px] font-medium tabular-nums text-slate-400">
              {index + 1}.
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <input {...questionProps(index)} placeholder="Question" className={dInput} />
              <textarea {...answerProps(index)} placeholder="Answer" className={dTextarea} />
            </div>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="mt-1.5 h-7 w-7 shrink-0 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label={`Remove FAQ ${index + 1}`}
            >
              <Trash2 className="mx-auto h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {fields.length === 0 && (
          <p className="py-6 text-center text-[12px] text-slate-400">No FAQ items added yet.</p>
        )}
      </div>
    </section>
  );
}

// Which tab a top-level form field lives in, so a failed submit can jump to
// the first tab that has an error (validation itself is unchanged).
export function firstErrorTab(
  errors: Record<string, unknown>,
  fieldTabs: Record<string, string>,
  order: string[]
): string | null {
  const tabsWithErrors = new Set(Object.keys(errors).map((k) => fieldTabs[k]).filter(Boolean));
  return order.find((t) => tabsWithErrors.has(t)) ?? null;
}
